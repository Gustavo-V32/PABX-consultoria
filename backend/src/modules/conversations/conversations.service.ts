import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { AssignConversationDto } from './dto/assign-conversation.dto';
import { TransferConversationDto } from './dto/transfer-conversation.dto';
import { ConversationStatus, UserRole } from '@prisma/client';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  async findAll(organizationId: string, filters: any = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = { organizationId };

    if (filters.status) {
      const statuses = String(filters.status).split(',').map((s) => s.trim()).filter(Boolean);
      where.status = statuses.length > 1 ? { in: statuses } : statuses[0];
    }
    if (filters.channel) {
      const channels = String(filters.channel).split(',').map((s) => s.trim()).filter(Boolean);
      where.channel = channels.length > 1 ? { in: channels } : channels[0];
    }
    if (filters.agentId) where.assignedAgentId = filters.agentId;
    if (filters.queueId) where.queueId = filters.queueId;
    if (filters.sectorId) where.sectorId = filters.sectorId;
    if (filters.search) {
      where.contact = {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: {
          contact: { select: { id: true, name: true, phone: true, avatar: true } },
          assignedAgent: { select: { id: true, name: true, avatar: true, status: true } },
          queue: { select: { id: true, name: true } },
          whatsappNumber: { select: { id: true, name: true, phoneNumber: true } },
          tags: { include: { tag: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              content: true,
              type: true,
              direction: true,
              createdAt: true,
              status: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { lastMessageAt: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, organizationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId },
      include: {
        contact: true,
        assignedAgent: { select: { id: true, name: true, avatar: true, status: true, email: true } },
        queue: true,
        sector: true,
        whatsappNumber: { select: { id: true, name: true, phoneNumber: true } },
        tags: { include: { tag: true } },
        transfers: {
          include: {
            fromAgent: { select: { id: true, name: true } },
            toAgent: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        notes: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!conversation) throw new NotFoundException('Conversa não encontrada');
    return conversation;
  }

  async create(organizationId: string, dto: CreateConversationDto) {
    // Check if there's already an open conversation with this contact
    const existing = await this.prisma.conversation.findFirst({
      where: {
        organizationId,
        contactId: dto.contactId,
        status: { in: ['WAITING', 'IN_PROGRESS', 'PENDING'] },
        channel: dto.channel,
      },
    });

    if (existing) return existing;

    const conversation = await this.prisma.conversation.create({
      data: {
        organizationId,
        ...dto,
        status: 'WAITING',
        waitingSince: new Date(),
        lastMessageAt: new Date(),
      },
      include: {
        contact: true,
        queue: true,
      },
    });

    this.events.emit('conversation.created', { conversation });
    this.logger.log(`Conversation ${conversation.id} created`);

    return conversation;
  }

  async update(id: string, organizationId: string, dto: UpdateConversationDto) {
    await this.findOne(id, organizationId);

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: dto,
    });

    this.events.emit('conversation.updated', { conversation: updated });
    return updated;
  }

  async assign(id: string, organizationId: string, dto: AssignConversationDto) {
    const conversation = await this.findOne(id, organizationId);

    const agent = await this.prisma.user.findFirst({
      where: { id: dto.agentId, organizationId, isActive: true },
    });

    if (!agent) throw new NotFoundException('Agente não encontrado');

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: {
        assignedAgentId: dto.agentId,
        status: 'IN_PROGRESS',
        waitingSince: null,
      },
    });

    this.events.emit('conversation.assigned', {
      conversation: updated,
      agent,
    });

    return updated;
  }

  async transfer(
    id: string,
    organizationId: string,
    dto: TransferConversationDto,
    fromAgentId: string,
  ) {
    const conversation = await this.findOne(id, organizationId);

    await this.prisma.conversationTransfer.create({
      data: {
        conversationId: id,
        fromAgentId,
        toAgentId: dto.toAgentId,
        fromQueueId: conversation.queueId,
        toQueueId: dto.toQueueId,
        reason: dto.reason,
      },
    });

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: {
        assignedAgentId: dto.toAgentId || null,
        queueId: dto.toQueueId || conversation.queueId,
        status: dto.toAgentId ? 'IN_PROGRESS' : 'WAITING',
      },
    });

    this.events.emit('conversation.transferred', { conversation: updated, dto });
    return updated;
  }

  async resolve(id: string, organizationId: string, userId: string) {
    const conversation = await this.findOne(id, organizationId);
    if (conversation.status === 'CLOSED') throw new BadRequestException('Conversa já encerrada');

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });

    this.events.emit('conversation.resolved', { conversation: updated, userId });
    return updated;
  }

  async close(id: string, organizationId: string, userId: string) {
    const conversation = await this.findOne(id, organizationId);

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });

    this.events.emit('conversation.closed', { conversation: updated, userId });
    return updated;
  }

  async reopen(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        resolvedAt: null,
        closedAt: null,
      },
    });

    this.events.emit('conversation.reopened', { conversation: updated });
    return updated;
  }

  async addNote(id: string, organizationId: string, content: string, authorId: string, isPrivate = true) {
    await this.findOne(id, organizationId);

    return this.prisma.conversationNote.create({
      data: { conversationId: id, content, authorId, isPrivate },
    });
  }

  async autoAssign(organizationId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId },
      include: { queue: { include: { members: { include: { user: true } } } } },
    });

    if (!conversation?.queue) return null;

    const availableAgents = conversation.queue.members.filter(
      (m) => !m.isPaused && m.user.status === 'ONLINE' && m.user.isActive,
    );

    if (!availableAgents.length) return null;

    // Round robin by last assigned
    const sortedAgents = availableAgents.sort((a, b) => a.penalty - b.penalty);
    const agent = sortedAgents[0];

    return this.assign(conversationId, organizationId, { agentId: agent.userId });
  }
}
