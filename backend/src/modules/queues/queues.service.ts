import { Injectable, NotFoundException } from '@nestjs/common';
import { PartialType } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueStrategy } from '@prisma/client';
import { Allow, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateQueueDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  sectorId?: string;

  @IsOptional()
  @IsEnum(QueueStrategy)
  strategy?: QueueStrategy;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(86400)
  maxWaitTime?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxQueueSize?: number;

  @IsOptional()
  @IsString()
  greetingMessage?: string;

  @IsOptional()
  @IsString()
  waitMessage?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3600)
  wrapUpTime?: number;

  @IsOptional()
  @IsBoolean()
  autoAssign?: boolean;

  @IsOptional()
  @Allow()
  settings?: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateQueueDto extends PartialType(CreateQueueDto) {}

@Injectable()
export class QueuesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, includeInactive = false) {
    return this.prisma.queue.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        sector: { select: { id: true, name: true, color: true } },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, status: true, avatar: true },
            },
          },
          orderBy: { penalty: 'asc' },
        },
        _count: {
          select: {
            conversations: true,
            calls: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const queue = await this.prisma.queue.findFirst({
      where: { id, organizationId },
      include: {
        sector: true,
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, status: true, maxChats: true },
            },
          },
          orderBy: { penalty: 'asc' },
        },
        conversations: {
          where: { status: { in: ['WAITING', 'IN_PROGRESS', 'PENDING'] } },
          include: {
            contact: { select: { id: true, name: true, phone: true } },
            assignedAgent: { select: { id: true, name: true, status: true } },
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!queue) throw new NotFoundException('Fila nao encontrada');
    return queue;
  }

  create(organizationId: string, dto: CreateQueueDto) {
    return this.prisma.queue.create({
      data: {
        organizationId,
        ...dto,
      },
    });
  }

  async update(id: string, organizationId: string, dto: UpdateQueueDto) {
    await this.findOne(id, organizationId);
    return this.prisma.queue.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.queue.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async addMember(
    queueId: string,
    organizationId: string,
    userId: string,
    penalty = 0,
  ) {
    await this.findOne(queueId, organizationId);
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId, isActive: true },
    });

    if (!user) throw new NotFoundException('Usuario nao encontrado');

    return this.prisma.queueMember.upsert({
      where: { queueId_userId: { queueId, userId } },
      update: { penalty, isPaused: false, pauseReason: null },
      create: { queueId, userId, penalty },
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
      },
    });
  }

  async updateMember(
    queueId: string,
    organizationId: string,
    userId: string,
    data: { penalty?: number; isPaused?: boolean; pauseReason?: string | null },
  ) {
    await this.findOne(queueId, organizationId);
    return this.prisma.queueMember.update({
      where: { queueId_userId: { queueId, userId } },
      data,
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
      },
    });
  }

  async removeMember(queueId: string, organizationId: string, userId: string) {
    await this.findOne(queueId, organizationId);
    return this.prisma.queueMember.delete({
      where: { queueId_userId: { queueId, userId } },
    });
  }

  async stats(organizationId: string) {
    const queues = await this.prisma.queue.findMany({
      where: { organizationId, isActive: true },
      include: {
        members: { include: { user: { select: { status: true } } } },
        conversations: {
          where: { status: { in: ['WAITING', 'IN_PROGRESS', 'PENDING'] } },
          select: { status: true, waitingSince: true, createdAt: true },
        },
        calls: {
          where: { status: { in: ['RINGING', 'IN_PROGRESS', 'ON_HOLD'] } },
          select: { id: true, status: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return queues.map((queue) => {
      const waiting = queue.conversations.filter((c) => c.status === 'WAITING');
      const waitTimes = waiting.map((c) => {
        const since = c.waitingSince || c.createdAt;
        return Math.max(0, Math.round((Date.now() - since.getTime()) / 1000));
      });

      return {
        id: queue.id,
        name: queue.name,
        strategy: queue.strategy,
        waiting: waiting.length,
        inProgress: queue.conversations.filter((c) => c.status === 'IN_PROGRESS').length,
        pending: queue.conversations.filter((c) => c.status === 'PENDING').length,
        callsActive: queue.calls.length,
        agentsOnline: queue.members.filter((m) =>
          ['ONLINE', 'BUSY', 'IN_CALL'].includes(m.user.status),
        ).length,
        agentsTotal: queue.members.length,
        avgWaitSeconds: waitTimes.length
          ? Math.round(waitTimes.reduce((sum, value) => sum + value, 0) / waitTimes.length)
          : 0,
      };
    });
  }
}
