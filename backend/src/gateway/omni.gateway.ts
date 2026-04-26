import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  namespace: '/',
})
export class OmniGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OmniGateway.name);
  private connectedUsers = new Map<string, { socketId: string; orgId: string; userId: string }>();

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });

      client.data.userId = payload.sub;
      client.data.orgId = payload.organizationId;
      client.data.role = payload.role;

      // Join organization room
      client.join(`org:${payload.organizationId}`);
      client.join(`user:${payload.sub}`);

      this.connectedUsers.set(payload.sub, {
        socketId: client.id,
        orgId: payload.organizationId,
        userId: payload.sub,
      });

      // Notify org about user online
      this.server
        .to(`org:${payload.organizationId}`)
        .emit('user:online', { userId: payload.sub });

      this.logger.log(`Client connected: ${payload.email} (${client.id})`);
    } catch (err) {
      this.logger.warn(`Unauthorized WS connection: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    const orgId = client.data?.orgId;

    if (userId) {
      this.connectedUsers.delete(userId);
      if (orgId) {
        this.server.to(`org:${orgId}`).emit('user:offline', { userId });
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('conversation:join')
  handleJoinConversation(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    client.join(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('conversation:leave')
  handleLeaveConversation(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    client.leave(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('agent:status')
  handleAgentStatus(@ConnectedSocket() client: Socket, @MessageBody() data: { status: string }) {
    const { userId, orgId } = client.data;
    this.server.to(`org:${orgId}`).emit('agent:status:changed', { userId, status: data.status });
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    client.to(`conversation:${data.conversationId}`).emit('typing:start', {
      userId: client.data.userId,
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    client.to(`conversation:${data.conversationId}`).emit('typing:stop', {
      userId: client.data.userId,
      conversationId: data.conversationId,
    });
  }

  // Event handlers - broadcast to appropriate rooms
  @OnEvent('message.received')
  handleMessageReceived(payload: any) {
    const { message, conversation } = payload;
    this.server
      .to(`conversation:${conversation.id}`)
      .to(`org:${conversation.organizationId}`)
      .emit('message:new', { message, conversation });
  }

  @OnEvent('message.sent')
  handleMessageSent(payload: any) {
    const { message, conversation } = payload;
    this.server
      .to(`conversation:${conversation.id}`)
      .emit('message:sent', { message });
  }

  @OnEvent('message.status.updated')
  handleMessageStatus(payload: any) {
    this.server
      .to(`conversation:${payload.conversationId}`)
      .emit('message:status', payload);
  }

  @OnEvent('conversation.created')
  handleConversationCreated(payload: any) {
    const { conversation } = payload;
    this.server
      .to(`org:${conversation.organizationId}`)
      .emit('conversation:new', conversation);
  }

  @OnEvent('conversation.assigned')
  handleConversationAssigned(payload: any) {
    const { conversation, agent } = payload;
    this.server
      .to(`org:${conversation.organizationId}`)
      .to(`user:${agent.id}`)
      .emit('conversation:assigned', { conversation, agent });
  }

  @OnEvent('conversation.resolved')
  handleConversationResolved(payload: any) {
    const { conversation } = payload;
    this.server
      .to(`org:${conversation.organizationId}`)
      .emit('conversation:resolved', conversation);
  }

  @OnEvent('conversation.transferred')
  handleConversationTransferred(payload: any) {
    const { conversation } = payload;
    this.server
      .to(`org:${conversation.organizationId}`)
      .emit('conversation:transferred', conversation);
  }

  @OnEvent('call.ringing')
  handleCallRinging(payload: any) {
    const { call } = payload;
    this.server.emit('call:ringing', call);
  }

  @OnEvent('call.answered')
  handleCallAnswered(payload: any) {
    this.server.emit('call:answered', payload);
  }

  @OnEvent('call.ended')
  handleCallEnded(payload: any) {
    this.server.emit('call:ended', payload);
  }

  // Send notification to specific user
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Send to all users in organization
  sendToOrg(orgId: string, event: string, data: any) {
    this.server.to(`org:${orgId}`).emit(event, data);
  }

  getOnlineUsers(orgId: string): string[] {
    const online: string[] = [];
    this.connectedUsers.forEach((v, userId) => {
      if (v.orgId === orgId) online.push(userId);
    });
    return online;
  }
}
