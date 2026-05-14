import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import * as net from 'net';

interface AmiEvent {
  Event: string;
  [key: string]: string;
}

@Injectable()
export class TelephonyService implements OnModuleInit {
  private readonly logger = new Logger(TelephonyService.name);
  private amiClient: net.Socket | null = null;
  private amiConnected = false;
  private amiConnecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageBuffer = '';
  private actionCallbacks = new Map<string, (response: any) => void>();

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private events: EventEmitter2,
  ) {}

  async onModuleInit() {
    const enabled = this.config.get<string>('ASTERISK_AMI_ENABLED', 'true') !== 'false';
    if (!enabled) {
      this.logger.warn('AMI integration disabled by ASTERISK_AMI_ENABLED=false');
      return;
    }

    await this.connectAMI();
  }

  private async connectAMI() {
    if (this.amiConnected || this.amiConnecting) return;

    const host = this.config.get<string>('ASTERISK_HOST', 'asterisk');
    const port = this.config.get<number>('ASTERISK_AMI_PORT', 5038);
    const user = this.config.get<string>('ASTERISK_AMI_USER', 'omni_ami');
    const secret = this.config.get<string>('ASTERISK_AMI_SECRET', '');

    try {
      this.amiConnecting = true;
      this.clearReconnect();
      this.amiClient?.destroy();
      this.amiClient = new net.Socket();

      this.amiClient.connect(port, host, () => {
        this.logger.log(`AMI connected to ${host}:${port}`);
        this.amiConnecting = false;
      });

      this.amiClient.on('data', (data) => {
        this.messageBuffer += data.toString();
        this.processMessages();
      });

      this.amiClient.on('connect', () => {
        this.login(user, secret);
      });

      this.amiClient.on('error', (err) => {
        this.logger.error(`AMI error: ${err.message}`);
        this.amiConnected = false;
        this.amiConnecting = false;
        this.scheduleReconnect();
      });

      this.amiClient.on('close', () => {
        this.logger.warn('AMI connection closed, reconnecting...');
        this.amiConnected = false;
        this.amiConnecting = false;
        this.scheduleReconnect();
      });
    } catch (err) {
      this.logger.error(`AMI connect failed: ${err.message}`);
      this.amiConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connectAMI();
    }, 5000);
  }

  private clearReconnect() {
    if (!this.reconnectTimer) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private login(user: string, secret: string) {
    this.sendAction({
      Action: 'Login',
      Username: user,
      Secret: secret,
      Events: 'on',
    });
  }

  private processMessages() {
    const messages = this.messageBuffer.split('\r\n\r\n');
    this.messageBuffer = messages.pop() || '';

    for (const msg of messages) {
      if (!msg.trim()) continue;
      const parsed = this.parseMessage(msg);
      this.handleMessage(parsed);
    }
  }

  private parseMessage(raw: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = raw.split('\r\n');
    for (const line of lines) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const key = line.substring(0, idx).trim();
        const value = line.substring(idx + 1).trim();
        result[key] = value;
      }
    }
    return result;
  }

  private handleMessage(msg: Record<string, string>) {
    if (msg.Response === 'Success' && msg.Message === 'Authentication accepted') {
      this.amiConnected = true;
      this.logger.log('AMI authenticated');
    }

    // Handle callbacks
    if (msg.ActionID && this.actionCallbacks.has(msg.ActionID)) {
      const cb = this.actionCallbacks.get(msg.ActionID)!;
      cb(msg);
      this.actionCallbacks.delete(msg.ActionID);
    }

    // Emit AMI events
    if (msg.Event) {
      this.handleAmiEvent(msg as unknown as AmiEvent);
    }
  }

  private async handleAmiEvent(event: AmiEvent) {
    switch (event.Event) {
      case 'Newchannel':
        await this.onNewChannel(event);
        break;
      case 'Hangup':
        await this.onHangup(event);
        break;
      case 'AgentCalled':
      case 'AgentConnect':
        await this.onAgentConnect(event);
        break;
      case 'QueueMemberAdded':
      case 'QueueMemberRemoved':
        this.events.emit('queue.member.changed', event);
        break;
      case 'AgentLogin':
      case 'AgentLogoff':
        this.events.emit('agent.status.changed', event);
        break;
    }
  }

  private async resolveCallOwner(event: AmiEvent) {
    const candidates = [
      event.Exten,
      event.CallerIDNum,
      event.ConnectedLineNum,
      event.DestCallerIDNum,
    ].filter(Boolean);

    if (candidates.length === 0) return {};

    const extension = await this.prisma.extension.findFirst({
      where: { number: { in: candidates } },
      select: {
        organizationId: true,
        user: { select: { id: true } },
      },
    });

    if (!extension) return {};

    return {
      organizationId: extension.organizationId,
      agentId: extension.user?.id,
    };
  }

  private async onNewChannel(event: AmiEvent) {
    const owner = await this.resolveCallOwner(event);

    const call = await this.prisma.call.upsert({
      where: { uniqueId: event.Uniqueid },
      update: { status: 'RINGING', ...owner },
      create: {
        ...owner,
        uniqueId: event.Uniqueid,
        linkedId: event.Linkedid,
        channel: event.Channel,
        callerIdNum: event.CallerIDNum,
        callerIdName: event.CallerIDName,
        destinationNum: event.Exten,
        direction: 'INBOUND',
        status: 'RINGING',
        startTime: new Date(),
      },
    });

    this.events.emit('call.ringing', { call });
  }

  private async onHangup(event: AmiEvent) {
    await this.prisma.call.updateMany({
      where: { uniqueId: event.Uniqueid },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
        hangupCause: event.Cause,
      },
    });

    this.events.emit('call.ended', { uniqueId: event.Uniqueid });
  }

  private async onAgentConnect(event: AmiEvent) {
    await this.prisma.call.updateMany({
      where: { uniqueId: event.Uniqueid },
      data: { status: 'IN_PROGRESS', answerTime: new Date() },
    });

    this.events.emit('call.answered', { event });
  }

  sendAction(action: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.amiConnected && action.Action !== 'Login') {
        return reject(new Error('AMI not connected'));
      }

      const actionId = `omni_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const actionWithId = { ...action, ActionID: actionId };

      const message = Object.entries(actionWithId)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n') + '\r\n\r\n';

      this.actionCallbacks.set(actionId, resolve);
      setTimeout(() => {
        if (this.actionCallbacks.has(actionId)) {
          this.actionCallbacks.delete(actionId);
          reject(new Error('AMI action timeout'));
        }
      }, 10000);

      this.amiClient?.write(message);
    });
  }

  async originateCall(from: string, to: string, context: string = 'from-internal') {
    return this.sendAction({
      Action: 'Originate',
      Channel: `SIP/${from}`,
      Exten: to,
      Context: context,
      Priority: '1',
      CallerID: from,
      Timeout: '30000',
      Async: 'true',
    });
  }

  async hangupCall(channel: string) {
    return this.sendAction({ Action: 'Hangup', Channel: channel });
  }

  async holdCall(channel: string) {
    return this.sendAction({
      Action: 'AGI',
      Channel: channel,
      Command: 'HOLD',
    });
  }

  async transferCall(channel: string, extension: string, context = 'from-internal') {
    return this.sendAction({
      Action: 'Redirect',
      Channel: channel,
      Exten: extension,
      Context: context,
      Priority: '1',
    });
  }

  async addToQueue(queue: string, extension: string, penalty = 0) {
    return this.sendAction({
      Action: 'QueueAdd',
      Queue: queue,
      Interface: `SIP/${extension}`,
      Penalty: penalty.toString(),
      MemberName: extension,
    });
  }

  async removeFromQueue(queue: string, extension: string) {
    return this.sendAction({
      Action: 'QueueRemove',
      Queue: queue,
      Interface: `SIP/${extension}`,
    });
  }

  async pauseQueueMember(queue: string, extension: string, reason = '') {
    return this.sendAction({
      Action: 'QueuePause',
      Queue: queue,
      Interface: `SIP/${extension}`,
      Paused: '1',
      Reason: reason,
    });
  }

  async unpauseQueueMember(queue: string, extension: string) {
    return this.sendAction({
      Action: 'QueuePause',
      Queue: queue,
      Interface: `SIP/${extension}`,
      Paused: '0',
    });
  }

  async getQueueStatus(queue?: string) {
    return this.sendAction({
      Action: 'QueueStatus',
      ...(queue ? { Queue: queue } : {}),
    });
  }

  async command(command: string) {
    return this.sendAction({
      Action: 'Command',
      Command: command,
    });
  }

  async getActiveCalls(organizationId?: string) {
    return this.prisma.call.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        status: { in: ['RINGING', 'IN_PROGRESS', 'ON_HOLD'] },
      },
      include: { agent: { select: { id: true, name: true } } },
      orderBy: { startTime: 'asc' },
    });
  }

  isConnected() {
    return this.amiConnected;
  }
}
