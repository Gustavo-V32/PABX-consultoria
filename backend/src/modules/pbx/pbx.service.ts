import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CallRouteDestinationType, Prisma } from '@prisma/client';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { TelephonyService } from '../telephony/telephony.service';
import {
  CreateCallRouteDto,
  CreateIvrDto,
  CreateRecordingDto,
  CreateRingGroupDto,
  CreateRingGroupMemberDto,
  IvrOptionDto,
  RegisterSoftphoneSessionDto,
  SoftphoneHeartbeatDto,
  UpdateCallRouteDto,
  UpdateIvrDto,
  UpdateRingGroupDto,
} from './dto/pbx.dto';

@Injectable()
export class PbxService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private telephony: TelephonyService,
  ) {}

  async getReadiness(organizationId: string) {
    const [ivrs, routes, ringGroups, recordings, sessions, digitalNumbers, queues, extensions, trunks] =
      await Promise.all([
        this.prisma.ivrFlow.findMany({ where: { organizationId, isActive: true }, include: { options: true } }),
        this.prisma.callRoute.findMany({ where: { organizationId, isActive: true } }),
        this.prisma.ringGroup.findMany({ where: { organizationId, isActive: true }, include: { members: true } }),
        this.prisma.callRecording.count({ where: { organizationId } }),
        this.prisma.softphoneSession.count({ where: { organizationId, endedAt: null } }),
        this.prisma.digitalNumber.findMany({
          where: { organizationId, isActive: true },
          select: { id: true, name: true, status: true, registrationStatus: true },
        }),
        this.prisma.queue.count({ where: { organizationId, isActive: true } }),
        this.prisma.extension.count({ where: { organizationId, isActive: true } }),
        this.prisma.sipTrunk.count({ where: { organizationId, isActive: true } }),
      ]);

    const warnings: Array<{ severity: 'critical' | 'warning' | 'info'; area: string; message: string }> = [];
    const inboundRoutes = routes.filter((route) => route.direction === 'INBOUND');
    const outboundRoutes = routes.filter((route) => route.direction === 'OUTBOUND');

    if (!digitalNumbers.length) {
      warnings.push({ severity: 'critical', area: 'Numeros digitais', message: 'Nenhum numero SIP ativo cadastrado.' });
    }

    for (const number of digitalNumbers) {
      if (number.status !== 'REGISTERED') {
        warnings.push({
          severity: 'warning',
          area: 'Numeros digitais',
          message: `${number.name} esta ${number.status}${number.registrationStatus ? `: ${number.registrationStatus}` : ''}.`,
        });
      }
    }

    if (!ivrs.length) {
      warnings.push({ severity: 'warning', area: 'URA', message: 'Nenhuma URA ativa para atendimento de entrada.' });
    }

    for (const ivr of ivrs) {
      if (!ivr.options.length) {
        warnings.push({ severity: 'warning', area: 'URA', message: `${ivr.name} nao possui opcoes DTMF.` });
      }
      if (!ivr.options.some((option) => option.isFallback || ['timeout', 'invalid'].includes(option.digit))) {
        warnings.push({
          severity: 'info',
          area: 'URA',
          message: `${ivr.name} nao possui fallback para timeout ou opcao invalida.`,
        });
      }
    }

    if (!inboundRoutes.length) {
      warnings.push({ severity: 'critical', area: 'Rotas', message: 'Nenhuma rota de entrada ativa.' });
    }

    if (!outboundRoutes.length) {
      warnings.push({ severity: 'warning', area: 'Rotas', message: 'Nenhuma rota de saida ativa.' });
    }

    if (!queues) {
      warnings.push({ severity: 'warning', area: 'Filas', message: 'Nenhuma fila ativa para transbordo ou distribuicao.' });
    }

    if (!extensions) {
      warnings.push({ severity: 'warning', area: 'Ramais', message: 'Nenhum ramal ativo cadastrado.' });
    }

    if (!trunks) {
      warnings.push({ severity: 'warning', area: 'Troncos', message: 'Nenhum tronco SIP ativo cadastrado.' });
    }

    for (const group of ringGroups) {
      if (!group.members.length) {
        warnings.push({ severity: 'info', area: 'Grupos', message: `${group.name} nao possui ramais vinculados.` });
      }
    }

    return {
      status: warnings.some((warning) => warning.severity === 'critical')
        ? 'ACTION_REQUIRED'
        : warnings.length
          ? 'ATTENTION'
          : 'READY',
      summary: {
        activeIvrs: ivrs.length,
        activeInboundRoutes: inboundRoutes.length,
        activeOutboundRoutes: outboundRoutes.length,
        activeRingGroups: ringGroups.length,
        activeDigitalNumbers: digitalNumbers.length,
        registeredDigitalNumbers: digitalNumbers.filter((number) => number.status === 'REGISTERED').length,
        activeQueues: queues,
        activeExtensions: extensions,
        activeTrunks: trunks,
        recordings,
        activeSoftphoneSessions: sessions,
      },
      warnings,
    };
  }

  async previewAsteriskConfig(organizationId: string) {
    return this.buildAsteriskConfig(organizationId);
  }

  async applyAsteriskConfig(organizationId: string) {
    const generated = await this.buildAsteriskConfig(organizationId);
    const configPath = this.config.get<string>('ASTERISK_CONFIG_PATH', '/app/asterisk-conf');

    await mkdir(configPath, { recursive: true });
    await Promise.all([
      writeFile(join(configPath, 'sip_omni.conf'), generated.files.sip, 'utf8'),
      writeFile(join(configPath, 'extensions_omni.conf'), generated.files.extensions, 'utf8'),
      writeFile(join(configPath, 'queues_omni.conf'), generated.files.queues, 'utf8'),
    ]);

    const reloads: Array<{ command: string; response: unknown }> = [];
    for (const command of ['sip reload', 'dialplan reload', 'queue reload all']) {
      reloads.push({ command, response: await this.telephony.command(command) });
    }

    return {
      appliedAt: new Date().toISOString(),
      configPath,
      summary: generated.summary,
      reloads,
    };
  }

  listIvrs(organizationId: string) {
    return this.prisma.ivrFlow.findMany({
      where: { organizationId },
      include: { options: { orderBy: { digit: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async createIvr(organizationId: string, dto: CreateIvrDto) {
    const { options, ...data } = dto;
    await this.validateIvrOptions(organizationId, options || []);
    return this.prisma.ivrFlow.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        nodes: (data.nodes || []) as Prisma.InputJsonValue,
        edges: (data.edges || []) as Prisma.InputJsonValue,
        entryPoint: data.entryPoint,
        audioFile: data.audioFile,
        ttsText: data.ttsText,
        afterHoursMessage: data.afterHoursMessage,
        isActive: data.isActive ?? true,
        options: options?.length ? { create: options.map((option) => this.toIvrOptionCreateInput(option)) } : undefined,
      },
      include: { options: true },
    });
  }

  async updateIvr(id: string, organizationId: string, dto: UpdateIvrDto) {
    await this.ensureIvr(id, organizationId);
    const { options, ...data } = dto;
    if (options) await this.validateIvrOptions(organizationId, options);

    return this.prisma.$transaction(async (tx) => {
      const ivr = await tx.ivrFlow.update({
        where: { id },
        data: data as Prisma.IvrFlowUpdateInput,
        include: { options: true },
      });

      if (options) {
        await tx.ivrOption.deleteMany({ where: { ivrFlowId: id } });
        await tx.ivrOption.createMany({
          data: options.map((option) => ({ ...this.toIvrOptionCreateInput(option), ivrFlowId: id })),
        });
      }

      return tx.ivrFlow.findUnique({ where: { id }, include: { options: { orderBy: { digit: 'asc' } } } }) || ivr;
    });
  }

  async addIvrOption(ivrFlowId: string, organizationId: string, dto: IvrOptionDto) {
    await this.ensureIvr(ivrFlowId, organizationId);
    await this.validateIvrOptions(organizationId, [dto]);
    return this.prisma.ivrOption.create({
      data: {
        ivrFlowId,
        digit: dto.digit,
        label: dto.label,
        destinationType: dto.destinationType,
        destinationValue: dto.destinationValue,
        schedule: (dto.schedule || {}) as Prisma.InputJsonValue,
        isFallback: dto.isFallback ?? false,
      },
    });
  }

  async updateIvrOption(ivrFlowId: string, optionId: string, organizationId: string, dto: IvrOptionDto) {
    await this.ensureIvr(ivrFlowId, organizationId);
    await this.ensureIvrOption(ivrFlowId, optionId);
    await this.validateIvrOptions(organizationId, [dto]);
    return this.prisma.ivrOption.update({ where: { id: optionId }, data: this.toIvrOptionCreateInput(dto) });
  }

  async deleteIvrOption(ivrFlowId: string, optionId: string, organizationId: string) {
    await this.ensureIvr(ivrFlowId, organizationId);
    await this.ensureIvrOption(ivrFlowId, optionId);
    return this.prisma.ivrOption.delete({ where: { id: optionId } });
  }

  async deleteIvr(id: string, organizationId: string) {
    await this.ensureIvr(id, organizationId);
    return this.prisma.ivrFlow.update({ where: { id }, data: { isActive: false } });
  }

  listRoutes(organizationId: string, direction?: any) {
    return this.prisma.callRoute.findMany({
      where: { organizationId, ...(direction ? { direction } : {}) },
      include: { trunk: { select: { id: true, name: true, provider: true, host: true } } },
      orderBy: [{ direction: 'asc' }, { priority: 'asc' }, { name: 'asc' }],
    });
  }

  async createRoute(organizationId: string, dto: CreateCallRouteDto) {
    await this.validateRouteDestination(organizationId, dto.destinationType, dto.destinationValue);
    if (dto.trunkId) await this.ensureTrunk(dto.trunkId, organizationId);
    return this.prisma.callRoute.create({
      data: {
        organizationId,
        trunkId: dto.trunkId,
        direction: dto.direction,
        name: dto.name,
        pattern: dto.pattern,
        destinationType: dto.destinationType,
        destinationValue: dto.destinationValue,
        priority: dto.priority || 1,
        schedule: (dto.schedule || {}) as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateRoute(id: string, organizationId: string, dto: UpdateCallRouteDto) {
    const route = await this.ensureRoute(id, organizationId);
    const destinationType = dto.destinationType || route.destinationType;
    const destinationValue = dto.destinationValue === undefined ? route.destinationValue : dto.destinationValue;
    await this.validateRouteDestination(organizationId, destinationType, destinationValue);
    if (dto.trunkId) await this.ensureTrunk(dto.trunkId, organizationId);
    return this.prisma.callRoute.update({ where: { id }, data: dto as Prisma.CallRouteUncheckedUpdateInput });
  }

  async deleteRoute(id: string, organizationId: string) {
    await this.ensureRoute(id, organizationId);
    return this.prisma.callRoute.update({ where: { id }, data: { isActive: false } });
  }

  listRingGroups(organizationId: string) {
    return this.prisma.ringGroup.findMany({
      where: { organizationId },
      include: {
        members: {
          include: { extension: { select: { id: true, number: true, name: true, isActive: true } } },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createRingGroup(organizationId: string, dto: CreateRingGroupDto) {
    const { members, ...data } = dto;
    if (members?.length) await this.ensureExtensions(members.map((member) => member.extensionId), organizationId);
    return this.prisma.ringGroup.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        strategy: data.strategy || 'RING_ALL',
        timeout: data.timeout || 30,
        isActive: data.isActive ?? true,
        members: members?.length ? { create: members } : undefined,
      },
      include: { members: true },
    });
  }

  async updateRingGroup(id: string, organizationId: string, dto: UpdateRingGroupDto) {
    await this.ensureRingGroup(id, organizationId);
    const { members, ...data } = dto;
    if (members?.length) await this.ensureExtensions(members.map((member) => member.extensionId), organizationId);

    return this.prisma.$transaction(async (tx) => {
      const group = await tx.ringGroup.update({ where: { id }, data });

      if (members) {
        await tx.ringGroupMember.deleteMany({ where: { ringGroupId: id } });
        await tx.ringGroupMember.createMany({ data: members.map((member) => ({ ...member, ringGroupId: id })) });
      }

      return tx.ringGroup.findUnique({
        where: { id },
        include: {
          members: {
            include: { extension: { select: { id: true, number: true, name: true, isActive: true } } },
            orderBy: { order: 'asc' },
          },
        },
      }) || group;
    });
  }

  async addRingGroupMember(ringGroupId: string, organizationId: string, dto: CreateRingGroupMemberDto) {
    await this.ensureRingGroup(ringGroupId, organizationId);
    await this.ensureExtensions([dto.extensionId], organizationId);
    return this.prisma.ringGroupMember.upsert({
      where: { ringGroupId_extensionId: { ringGroupId, extensionId: dto.extensionId } },
      update: { order: dto.order || 0, penalty: dto.penalty || 0 },
      create: {
        ringGroupId,
        extensionId: dto.extensionId,
        order: dto.order || 0,
        penalty: dto.penalty || 0,
      },
    });
  }

  async removeRingGroupMember(ringGroupId: string, extensionId: string, organizationId: string) {
    await this.ensureRingGroup(ringGroupId, organizationId);
    return this.prisma.ringGroupMember.delete({
      where: { ringGroupId_extensionId: { ringGroupId, extensionId } },
    });
  }

  async deleteRingGroup(id: string, organizationId: string) {
    await this.ensureRingGroup(id, organizationId);
    return this.prisma.ringGroup.update({ where: { id }, data: { isActive: false } });
  }

  listRecordings(organizationId: string, filters: any = {}) {
    return this.prisma.callRecording.findMany({
      where: {
        organizationId,
        ...(filters.callId ? { callId: filters.callId } : {}),
      },
      include: { call: true },
      orderBy: { createdAt: 'desc' },
      take: filters.limit ? +filters.limit : 100,
    });
  }

  async createRecording(organizationId: string, dto: CreateRecordingDto) {
    const call = await this.prisma.call.findFirst({ where: { id: dto.callId, organizationId } });
    if (!call) throw new NotFoundException('Chamada nao encontrada');

    return this.prisma.callRecording.create({
      data: {
        organizationId,
        callId: dto.callId,
        storagePath: dto.storagePath,
        publicUrl: dto.publicUrl,
        duration: dto.duration,
        size: dto.size,
        checksum: dto.checksum,
      },
    });
  }

  listSoftphoneSessions(organizationId: string) {
    return this.prisma.softphoneSession.findMany({
      where: { organizationId, endedAt: null },
      include: {
        user: { select: { id: true, name: true, status: true } },
        extension: { select: { id: true, number: true, name: true } },
      },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async registerSoftphoneSession(organizationId: string, userId: string, dto: RegisterSoftphoneSessionDto) {
    if (dto.extensionId) await this.ensureExtensions([dto.extensionId], organizationId);

    return this.prisma.softphoneSession.upsert({
      where: { sessionId: dto.sessionId },
      update: {
        status: dto.status || 'REGISTERED',
        lastSeenAt: new Date(),
        endedAt: null,
      },
      create: {
        organizationId,
        userId,
        extensionId: dto.extensionId,
        sessionId: dto.sessionId,
        userAgent: dto.userAgent,
        ipAddress: dto.ipAddress,
        status: dto.status || 'REGISTERED',
      },
    });
  }

  heartbeatSoftphoneSession(sessionId: string, organizationId: string, dto: SoftphoneHeartbeatDto = {}) {
    return this.prisma.softphoneSession.updateMany({
      where: { sessionId, organizationId },
      data: { status: dto.status || 'REGISTERED', lastSeenAt: new Date() },
    });
  }

  unregisterSoftphoneSession(sessionId: string, organizationId: string) {
    return this.prisma.softphoneSession.updateMany({
      where: { sessionId, organizationId },
      data: { status: 'UNREGISTERED', endedAt: new Date(), lastSeenAt: new Date() },
    });
  }

  private async buildAsteriskConfig(organizationId: string) {
    const [extensions, trunks, queues, ivrs, routes, ringGroups] = await Promise.all([
      this.prisma.extension.findMany({ where: { organizationId, isActive: true }, orderBy: { number: 'asc' } }),
      this.prisma.sipTrunk.findMany({ where: { organizationId, isActive: true }, orderBy: { name: 'asc' } }),
      this.prisma.queue.findMany({
        where: { organizationId, isActive: true },
        include: { members: { include: { user: { include: { extension: true } } } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.ivrFlow.findMany({
        where: { organizationId, isActive: true },
        include: { options: { orderBy: { digit: 'asc' } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.callRoute.findMany({
        where: { organizationId, isActive: true },
        orderBy: [{ direction: 'asc' }, { priority: 'asc' }],
      }),
      this.prisma.ringGroup.findMany({
        where: { organizationId, isActive: true },
        include: { members: { include: { extension: true }, orderBy: { order: 'asc' } } },
        orderBy: { name: 'asc' },
      }),
    ]);

    const queueById = new Map(queues.map((queue) => [queue.id, queue]));
    const extensionById = new Map(extensions.map((extension) => [extension.id, extension]));
    const ivrById = new Map(ivrs.map((ivr) => [ivr.id, ivr]));
    const ringGroupById = new Map(ringGroups.map((group) => [group.id, group]));
    const trunkById = new Map(trunks.map((trunk) => [trunk.id, trunk]));

    return {
      summary: {
        extensions: extensions.length,
        trunks: trunks.length,
        queues: queues.length,
        ivrs: ivrs.length,
        routes: routes.length,
        ringGroups: ringGroups.length,
      },
      files: {
        sip: this.renderSipConfig(extensions, trunks),
        queues: this.renderQueuesConfig(queues),
        extensions: this.renderDialplanConfig({
          extensions,
          trunks,
          queues,
          ivrs,
          routes,
          ringGroups,
          queueById,
          extensionById,
          ivrById,
          ringGroupById,
          trunkById,
        }),
      },
    };
  }

  private renderSipConfig(extensions: any[], trunks: any[]) {
    const lines = this.header('sip_omni.conf');

    lines.push('[omni_extension_template](!)');
    lines.push('type=friend');
    lines.push('host=dynamic');
    lines.push('context=from-internal');
    lines.push('disallow=all');
    lines.push('allow=alaw');
    lines.push('allow=ulaw');
    lines.push('allow=g722');
    lines.push('nat=force_rport,comedia');
    lines.push('directmedia=no');
    lines.push('qualify=yes');
    lines.push('dtmfmode=rfc2833');
    lines.push('callcounter=yes');
    lines.push('busylevel=1');
    lines.push('');

    for (const extension of extensions) {
      lines.push(`[${this.cleanSection(extension.number)}](omni_extension_template)`);
      lines.push(`secret=${this.cleanValue(extension.secret)}`);
      lines.push(`context=${this.cleanValue(extension.context || 'from-internal')}`);
      lines.push(`callerid="${this.cleanCallerId(extension.name)}" <${this.cleanValue(extension.number)}>`);
      lines.push(`mailbox=${this.cleanValue(extension.number)}@default`);
      lines.push('');
    }

    for (const trunk of trunks) {
      const codecs = Array.isArray(trunk.codecs) && trunk.codecs.length ? trunk.codecs : ['alaw', 'ulaw'];
      lines.push(`[${this.trunkName(trunk)}]`);
      lines.push('type=friend');
      lines.push(`host=${this.cleanValue(trunk.host)}`);
      lines.push(`port=${trunk.port || 5060}`);
      if (trunk.username) lines.push(`username=${this.cleanValue(trunk.username)}`);
      if (trunk.secret) lines.push(`secret=${this.cleanValue(trunk.secret)}`);
      if (trunk.fromUser) lines.push(`fromuser=${this.cleanValue(trunk.fromUser)}`);
      if (trunk.fromDomain) lines.push(`fromdomain=${this.cleanValue(trunk.fromDomain)}`);
      lines.push('insecure=port,invite');
      lines.push('nat=force_rport,comedia');
      lines.push('qualify=yes');
      lines.push('directmedia=no');
      lines.push('disallow=all');
      for (const codec of codecs) lines.push(`allow=${this.cleanValue(codec)}`);
      lines.push(`context=${this.cleanValue(trunk.context || 'from-trunk')}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private renderQueuesConfig(queues: any[]) {
    const lines = this.header('queues_omni.conf');

    lines.push('[omni_queue_template](!)');
    lines.push('musicclass=default');
    lines.push('announce-position=yes');
    lines.push('announce-holdtime=yes');
    lines.push('joinempty=yes');
    lines.push('leavewhenempty=no');
    lines.push('ringinuse=no');
    lines.push('autopause=yes');
    lines.push('');

    for (const queue of queues) {
      lines.push(`[${this.queueName(queue)}](omni_queue_template)`);
      lines.push(`strategy=${this.queueStrategy(queue.strategy)}`);
      lines.push(`timeout=${queue.maxWaitTime || 30}`);
      lines.push(`wrapuptime=${queue.wrapUpTime || 5}`);
      lines.push(`maxlen=${queue.maxQueueSize || 50}`);
      for (const member of queue.members || []) {
        const extension = member.user?.extension;
        if (extension?.number) {
          lines.push(`member => SIP/${this.cleanValue(extension.number)},${member.penalty || 0},${this.cleanCallerId(member.user.name)}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private renderDialplanConfig(context: any) {
    const lines = this.header('extensions_omni.conf');

    lines.push('[omni-from-internal]');
    lines.push('exten => _X.,1,Goto(from-internal,${EXTEN},1)');
    lines.push('');

    lines.push('[from-internal-custom]');
    for (const extension of context.extensions) {
      lines.push(`exten => ${this.cleanExten(extension.number)},1,Verbose(1,OmniSuite ramal ${this.cleanValue(extension.number)})`);
      lines.push(` same => n,Dial(SIP/${this.cleanValue(extension.number)},30,tTkK)`);
      lines.push(' same => n,Hangup()');
    }
    lines.push('');

    lines.push('[omni-inbound]');
    for (const route of context.routes.filter((route: any) => route.direction === 'INBOUND')) {
      lines.push(`exten => ${this.cleanPattern(route.pattern)},1,Verbose(1,OmniSuite rota entrada ${this.cleanCallerId(route.name)})`);
      lines.push(` same => n,Set(CHANNEL(language)=pt_BR)`);
      lines.push(...this.destinationLines(route.destinationType, route.destinationValue, context));
      lines.push('');
    }
    lines.push('exten => _X.,1,Verbose(1,OmniSuite entrada sem rota especifica)');
    lines.push(' same => n,Goto(ivr-main,s,1)');
    lines.push('');

    lines.push('[omni-outbound]');
    for (const route of context.routes.filter((route: any) => route.direction === 'OUTBOUND')) {
      const trunk = route.trunkId ? context.trunkById.get(route.trunkId) : context.trunks[0];
      const patterns = this.outboundPatterns(route.pattern);
      for (const pattern of patterns) {
        lines.push(`exten => ${pattern.pattern},1,Verbose(1,OmniSuite rota saida ${this.cleanCallerId(route.name)}: \${CALLERID(num)} -> \${EXTEN${pattern.strip ? `:${pattern.strip}` : ''}})`);
        lines.push(' same => n,Set(CDR(userfield)=external_outbound)');
        if (trunk) {
          lines.push(` same => n,Dial(SIP/${this.trunkName(trunk)}/\${EXTEN${pattern.strip ? `:${pattern.strip}` : ''}},60,tTkK)`);
        } else {
          lines.push(' same => n,Congestion()');
        }
        lines.push(' same => n,Hangup()');
        lines.push('');
      }
      if (!patterns.length) {
        lines.push(`exten => ${this.cleanPattern(route.pattern)},1,Verbose(1,OmniSuite rota saida ${this.cleanCallerId(route.name)})`);
        lines.push(' same => n,Set(CDR(userfield)=external_outbound)');
      if (trunk) {
        lines.push(` same => n,Dial(SIP/${this.trunkName(trunk)}/\${EXTEN},60,tTkK)`);
      } else {
        lines.push(' same => n,Congestion()');
      }
      lines.push(' same => n,Hangup()');
      lines.push('');
      }
    }

    for (const ivr of context.ivrs) {
      lines.push(`[${this.ivrContext(ivr)}]`);
      lines.push('exten => s,1,Answer()');
      lines.push(' same => n,Wait(1)');
      if (ivr.audioFile) {
        lines.push(` same => n,Playback(${this.cleanPlayback(ivr.audioFile)})`);
      } else if (ivr.ttsText) {
        lines.push(` same => n,Verbose(1,URA ${this.cleanCallerId(ivr.name)}: ${this.cleanCallerId(ivr.ttsText)})`);
      }
      lines.push(' same => n,WaitExten(8)');
      lines.push(' same => n,Goto(t,1)');
      for (const option of ivr.options || []) {
        const digit = option.digit === 'timeout' ? 't' : option.digit === 'invalid' ? 'i' : option.digit;
        lines.push(`exten => ${this.cleanExten(digit)},1,Verbose(1,Opcao URA ${this.cleanCallerId(option.label)})`);
        lines.push(...this.destinationLines(option.destinationType, option.destinationValue, context));
      }
      lines.push('exten => h,1,Hangup()');
      lines.push('');
    }

    for (const group of context.ringGroups) {
      lines.push(`[${this.ringGroupContext(group)}]`);
      lines.push(`exten => s,1,Verbose(1,Grupo de toque ${this.cleanCallerId(group.name)})`);
      const targets = (group.members || [])
        .map((member: any) => member.extension?.number)
        .filter(Boolean)
        .map((number: string) => `SIP/${this.cleanValue(number)}`)
        .join('&');
      lines.push(targets ? ` same => n,Dial(${targets},${group.timeout || 30},tTkK)` : ' same => n,Congestion()');
      lines.push(' same => n,Hangup()');
      lines.push('');
    }

    return lines.join('\n');
  }

  private destinationLines(type: CallRouteDestinationType, value: string | null | undefined, context: any) {
    if (type === 'HANGUP') return [' same => n,Hangup()'];
    if (type === 'EXTERNAL_NUMBER') return [` same => n,Dial(SIP/\${TRUNK}/${this.cleanValue(value || '')},60,tTkK)`, ' same => n,Hangup()'];
    if (type === 'EXTENSION') {
      const extension = context.extensionById.get(value);
      return extension ? [` same => n,Dial(SIP/${this.cleanValue(extension.number)},30,tTkK)`, ' same => n,Hangup()'] : [' same => n,Congestion()'];
    }
    if (type === 'QUEUE') {
      const queue = context.queueById.get(value);
      return queue ? [` same => n,Queue(${this.queueName(queue)},tTHhc,,,${queue.maxWaitTime || 300})`, ' same => n,Hangup()'] : [' same => n,Congestion()'];
    }
    if (type === 'IVR') {
      const ivr = context.ivrById.get(value);
      return ivr ? [` same => n,Goto(${this.ivrContext(ivr)},s,1)`] : [' same => n,Congestion()'];
    }
    if (type === 'RING_GROUP') {
      const group = context.ringGroupById.get(value);
      return group ? [` same => n,Goto(${this.ringGroupContext(group)},s,1)`] : [' same => n,Congestion()'];
    }
    return [' same => n,Congestion()'];
  }

  private header(fileName: string) {
    return [
      '; ============================================================',
      `; OmniSuite generated file: ${fileName}`,
      `; Generated at: ${new Date().toISOString()}`,
      '; Do not edit manually. Changes are overwritten by PABX Admin.',
      '; ============================================================',
      '',
    ];
  }

  private queueStrategy(strategy: string) {
    const map: Record<string, string> = {
      RING_ALL: 'ringall',
      ROUND_ROBIN: 'rrmemory',
      LEAST_RECENT: 'leastrecent',
      FEWEST_CALLS: 'fewestcalls',
      RANDOM: 'random',
      WEIGHTED_RANDOM: 'wrandom',
      RRMEMORY: 'rrmemory',
      LINEAR: 'linear',
    };
    return map[strategy] || 'rrmemory';
  }

  private queueName(queue: any) {
    return `omni_q_${this.slug(queue.name).slice(0, 40) || queue.id.slice(0, 8)}`;
  }

  private trunkName(trunk: any) {
    return `omni_trunk_${this.slug(trunk.name).slice(0, 40) || trunk.id.slice(0, 8)}`;
  }

  private ivrContext(ivr: any) {
    return `omni-ivr-${ivr.id.slice(0, 8)}`;
  }

  private ringGroupContext(group: any) {
    return `omni-ring-${group.id.slice(0, 8)}`;
  }

  private slug(value: string) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  }

  private cleanSection(value: string) {
    return String(value || '').replace(/[\]\[\r\n;]/g, '');
  }

  private cleanValue(value: string) {
    return String(value || '').replace(/[\r\n;]/g, '').trim();
  }

  private cleanCallerId(value: string) {
    return this.cleanValue(value).replace(/"/g, "'");
  }

  private cleanExten(value: string) {
    return String(value || 's').replace(/[\r\n;]/g, '').trim();
  }

  private cleanPattern(value: string) {
    return this.cleanExten(value || '_X.');
  }

  private cleanPlayback(value: string) {
    return this.cleanValue(value).replace(/\.(wav|gsm|ulaw|alaw)$/i, '');
  }

  private outboundPatterns(pattern: string) {
    const clean = this.cleanPattern(pattern);
    if (clean !== '_X.') return [];
    return [
      { pattern: '_9X.', strip: 1 },
      { pattern: '_0X.', strip: 0 },
      { pattern: '_[2-9]XXXXXXX.', strip: 0 },
    ];
  }

  private async ensureIvr(id: string, organizationId: string) {
    const ivr = await this.prisma.ivrFlow.findFirst({ where: { id, organizationId } });
    if (!ivr) throw new NotFoundException('URA nao encontrada');
    return ivr;
  }

  private async ensureIvrOption(ivrFlowId: string, optionId: string) {
    const option = await this.prisma.ivrOption.findFirst({ where: { id: optionId, ivrFlowId } });
    if (!option) throw new NotFoundException('Opcao de URA nao encontrada');
    return option;
  }

  private async ensureRoute(id: string, organizationId: string) {
    const route = await this.prisma.callRoute.findFirst({ where: { id, organizationId } });
    if (!route) throw new NotFoundException('Rota nao encontrada');
    return route;
  }

  private async ensureRingGroup(id: string, organizationId: string) {
    const group = await this.prisma.ringGroup.findFirst({ where: { id, organizationId } });
    if (!group) throw new NotFoundException('Grupo de toque nao encontrado');
    return group;
  }

  private async ensureTrunk(id: string, organizationId: string) {
    const trunk = await this.prisma.sipTrunk.findFirst({ where: { id, organizationId, isActive: true } });
    if (!trunk) throw new NotFoundException('Tronco SIP nao encontrado');
    return trunk;
  }

  private async ensureExtensions(ids: string[], organizationId: string) {
    const uniqueIds = [...new Set(ids)];
    const extensions = await this.prisma.extension.findMany({
      where: { id: { in: uniqueIds }, organizationId, isActive: true },
      select: { id: true },
    });

    if (extensions.length !== uniqueIds.length) {
      throw new NotFoundException('Um ou mais ramais nao foram encontrados');
    }
  }

  private async validateIvrOptions(organizationId: string, options: IvrOptionDto[]) {
    const digits = new Set<string>();
    for (const option of options) {
      if (digits.has(option.digit)) throw new BadRequestException(`Digito duplicado na URA: ${option.digit}`);
      digits.add(option.digit);
      await this.validateRouteDestination(organizationId, option.destinationType, option.destinationValue);
    }
  }

  private async validateRouteDestination(
    organizationId: string,
    destinationType: CallRouteDestinationType,
    destinationValue?: string | null,
  ) {
    if (destinationType === 'HANGUP') return;
    if (!destinationValue) throw new BadRequestException('Destino obrigatorio para este tipo de rota');

    if (destinationType === 'EXTERNAL_NUMBER') {
      if (!/^\+?[0-9]{8,15}$/.test(destinationValue)) {
        throw new BadRequestException('Numero externo deve conter entre 8 e 15 digitos');
      }
      return;
    }

    const existsByType: Record<Exclude<CallRouteDestinationType, 'HANGUP' | 'EXTERNAL_NUMBER'>, () => Promise<unknown>> = {
      QUEUE: () => this.prisma.queue.findFirst({ where: { id: destinationValue, organizationId, isActive: true } }),
      EXTENSION: () =>
        this.prisma.extension.findFirst({ where: { id: destinationValue, organizationId, isActive: true } }),
      IVR: () => this.prisma.ivrFlow.findFirst({ where: { id: destinationValue, organizationId, isActive: true } }),
      RING_GROUP: () =>
        this.prisma.ringGroup.findFirst({ where: { id: destinationValue, organizationId, isActive: true } }),
    };

    if (!(await existsByType[destinationType]())) {
      throw new NotFoundException('Destino da rota nao encontrado ou inativo');
    }
  }

  private toIvrOptionCreateInput(option: IvrOptionDto) {
    return {
      digit: option.digit,
      label: option.label,
      destinationType: option.destinationType,
      destinationValue: option.destinationValue,
      schedule: (option.schedule || {}) as Prisma.InputJsonValue,
      isFallback: option.isFallback ?? false,
    };
  }
}
