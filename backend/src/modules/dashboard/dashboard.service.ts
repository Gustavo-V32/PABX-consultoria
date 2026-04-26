import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as dayjs from 'dayjs';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview(organizationId: string) {
    const today = dayjs().startOf('day').toDate();
    const yesterday = dayjs().subtract(1, 'day').startOf('day').toDate();
    const weekStart = dayjs().startOf('week').toDate();
    const monthStart = dayjs().startOf('month').toDate();

    const [
      openConversations,
      resolvedToday,
      waitingConversations,
      totalMessagesToday,
      onlineAgents,
      totalAgents,
      activeNumbers,
      activeTemplates,
      newContactsToday,
      callsToday,
      missedCallsToday,
      avgResponseTime,
      conversationsByChannel,
      conversationsByStatus,
    ] = await Promise.all([
      // Open conversations
      this.prisma.conversation.count({
        where: {
          organizationId,
          status: { in: ['WAITING', 'IN_PROGRESS'] },
        },
      }),
      // Resolved today
      this.prisma.conversation.count({
        where: {
          organizationId,
          status: { in: ['RESOLVED', 'CLOSED'] },
          resolvedAt: { gte: today },
        },
      }),
      // Waiting conversations
      this.prisma.conversation.count({
        where: { organizationId, status: 'WAITING' },
      }),
      // Messages today
      this.prisma.message.count({
        where: {
          conversation: { organizationId },
          createdAt: { gte: today },
        },
      }),
      // Online agents
      this.prisma.user.count({
        where: {
          organizationId,
          status: { in: ['ONLINE', 'BUSY', 'IN_CALL'] },
          isActive: true,
        },
      }),
      // Total agents
      this.prisma.user.count({
        where: { organizationId, role: { in: ['AGENT', 'SUPERVISOR'] }, isActive: true },
      }),
      // Active WhatsApp numbers
      this.prisma.whatsappNumber.count({
        where: { organizationId, status: 'ACTIVE' },
      }),
      // Active templates
      this.prisma.template.count({
        where: { organizationId, status: 'APPROVED' },
      }),
      // New contacts today
      this.prisma.contact.count({
        where: { organizationId, createdAt: { gte: today } },
      }),
      // Calls today
      this.prisma.call.count({
        where: {
          organizationId,
          startTime: { gte: today },
        },
      }),
      // Missed calls today
      this.prisma.call.count({
        where: {
          organizationId,
          startTime: { gte: today },
          status: 'MISSED',
        },
      }),
      // Average response time (minutes)
      this.prisma.conversation.aggregate({
        where: {
          organizationId,
          resolvedAt: { gte: monthStart },
          waitingSince: { not: null },
        },
        _avg: { priority: true }, // placeholder - real calculation below
      }),
      // Conversations by channel
      this.prisma.conversation.groupBy({
        by: ['channel'],
        where: { organizationId, createdAt: { gte: today } },
        _count: { id: true },
      }),
      // Conversations by status
      this.prisma.conversation.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { id: true },
      }),
    ]);

    return {
      conversations: {
        open: openConversations,
        resolvedToday,
        waiting: waitingConversations,
        inProgress: openConversations - waitingConversations,
      },
      messages: {
        today: totalMessagesToday,
      },
      agents: {
        online: onlineAgents,
        total: totalAgents,
        available: onlineAgents,
        busy: 0,
      },
      whatsapp: {
        activeNumbers,
        activeTemplates,
      },
      contacts: {
        newToday: newContactsToday,
      },
      calls: {
        today: callsToday,
        missed: missedCallsToday,
        answered: callsToday - missedCallsToday,
        avgDuration: 0,
      },
      channels: conversationsByChannel.map((c) => ({
        channel: c.channel,
        count: c._count.id,
      })),
      statusBreakdown: conversationsByStatus.map((c) => ({
        status: c.status,
        count: c._count.id,
      })),
    };
  }

  async getConversationsTrend(organizationId: string, days = 7) {
    const start = dayjs().subtract(days - 1, 'day').startOf('day').toDate();

    const conversations = await this.prisma.$queryRaw<any[]>`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED')) as resolved,
        channel
      FROM conversations
      WHERE organization_id = ${organizationId}
        AND created_at >= ${start}
      GROUP BY DATE(created_at), channel
      ORDER BY date ASC
    `;

    return conversations;
  }

  async getCallsTrend(organizationId: string, days = 7) {
    const start = dayjs().subtract(days - 1, 'day').startOf('day').toDate();

    const calls = await this.prisma.$queryRaw<any[]>`
      SELECT
        DATE(start_time) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as answered,
        COUNT(*) FILTER (WHERE status = 'MISSED') as missed,
        ROUND(AVG(duration)) as avg_duration
      FROM calls
      WHERE organization_id = ${organizationId}
        AND start_time >= ${start}
      GROUP BY DATE(start_time)
      ORDER BY date ASC
    `;

    return calls;
  }

  async getAgentPerformance(organizationId: string) {
    const today = dayjs().startOf('day').toDate();
    const monthStart = dayjs().startOf('month').toDate();

    const agents = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: { in: ['AGENT', 'SUPERVISOR'] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        status: true,
        assignedConversations: {
          where: {
            createdAt: { gte: today },
            status: { in: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'] },
          },
          select: {
            id: true,
            status: true,
            createdAt: true,
            resolvedAt: true,
          },
        },
      },
    });

    return agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      avatar: agent.avatar,
      status: agent.status,
      stats: {
        total: agent.assignedConversations.length,
        resolved: agent.assignedConversations.filter((c) =>
          ['RESOLVED', 'CLOSED'].includes(c.status),
        ).length,
        inProgress: agent.assignedConversations.filter(
          (c) => c.status === 'IN_PROGRESS',
        ).length,
      },
    }));
  }

  async getQueueStats(organizationId: string) {
    const queues = await this.prisma.queue.findMany({
      where: { organizationId, isActive: true },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, status: true },
            },
          },
        },
        conversations: {
          where: { status: { in: ['WAITING', 'IN_PROGRESS'] } },
          select: { id: true, status: true, waitingSince: true, createdAt: true },
        },
      },
    });

    return queues.map((queue) => ({
      id: queue.id,
      name: queue.name,
      strategy: queue.strategy,
      waiting: queue.conversations.filter((c) => c.status === 'WAITING').length,
      inProgress: queue.conversations.filter((c) => c.status === 'IN_PROGRESS').length,
      agentsOnline: queue.members.filter((m) =>
        ['ONLINE', 'BUSY'].includes(m.user.status),
      ).length,
      agentsTotal: queue.members.length,
      avgWaitTime: 0,
    }));
  }
}
