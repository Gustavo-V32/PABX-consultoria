import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as dayjs from 'dayjs';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private getRange(from?: string, to?: string) {
    return {
      start: from ? dayjs(from).startOf('day').toDate() : dayjs().subtract(30, 'day').startOf('day').toDate(),
      end: to ? dayjs(to).endOf('day').toDate() : dayjs().endOf('day').toDate(),
    };
  }

  async summary(organizationId: string, from?: string, to?: string) {
    const { start, end } = this.getRange(from, to);

    const [
      conversationsTotal,
      conversationsResolved,
      messagesInbound,
      messagesOutbound,
      callsTotal,
      callsMissed,
      callsCompleted,
      activeAgents,
    ] = await Promise.all([
      this.prisma.conversation.count({
        where: { organizationId, createdAt: { gte: start, lte: end } },
      }),
      this.prisma.conversation.count({
        where: {
          organizationId,
          status: { in: ['RESOLVED', 'CLOSED'] },
          resolvedAt: { gte: start, lte: end },
        },
      }),
      this.prisma.message.count({
        where: {
          direction: 'INBOUND',
          createdAt: { gte: start, lte: end },
          conversation: { organizationId },
        },
      }),
      this.prisma.message.count({
        where: {
          direction: 'OUTBOUND',
          createdAt: { gte: start, lte: end },
          conversation: { organizationId },
        },
      }),
      this.prisma.call.count({
        where: { organizationId, startTime: { gte: start, lte: end } },
      }),
      this.prisma.call.count({
        where: { organizationId, status: 'MISSED', startTime: { gte: start, lte: end } },
      }),
      this.prisma.call.count({
        where: { organizationId, status: 'COMPLETED', startTime: { gte: start, lte: end } },
      }),
      this.prisma.user.count({
        where: {
          organizationId,
          isActive: true,
          role: { in: ['AGENT', 'SUPERVISOR', 'TELEPHONY_OPERATOR'] },
        },
      }),
    ]);

    return {
      range: { from: start, to: end },
      conversations: {
        total: conversationsTotal,
        resolved: conversationsResolved,
        resolutionRate: conversationsTotal
          ? Number(((conversationsResolved / conversationsTotal) * 100).toFixed(2))
          : 0,
      },
      messages: {
        inbound: messagesInbound,
        outbound: messagesOutbound,
        total: messagesInbound + messagesOutbound,
      },
      calls: {
        total: callsTotal,
        completed: callsCompleted,
        missed: callsMissed,
        missedRate: callsTotal ? Number(((callsMissed / callsTotal) * 100).toFixed(2)) : 0,
      },
      agents: { active: activeAgents },
    };
  }

  async conversationsByDay(organizationId: string, from?: string, to?: string) {
    const { start, end } = this.getRange(from, to);
    return this.prisma.$queryRaw<any[]>`
      SELECT
        DATE(created_at) AS date,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED'))::int AS resolved,
        COUNT(*) FILTER (WHERE status = 'WAITING')::int AS waiting
      FROM conversations
      WHERE organization_id = ${organizationId}
        AND created_at BETWEEN ${start} AND ${end}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
  }

  async callsByDay(organizationId: string, from?: string, to?: string) {
    const { start, end } = this.getRange(from, to);
    return this.prisma.$queryRaw<any[]>`
      SELECT
        DATE(start_time) AS date,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'MISSED')::int AS missed,
        COALESCE(ROUND(AVG(duration)), 0)::int AS avg_duration
      FROM calls
      WHERE organization_id = ${organizationId}
        AND start_time BETWEEN ${start} AND ${end}
      GROUP BY DATE(start_time)
      ORDER BY date ASC
    `;
  }

  async agentPerformance(organizationId: string, from?: string, to?: string) {
    const { start, end } = this.getRange(from, to);
    const agents = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: { in: ['AGENT', 'SUPERVISOR', 'TELEPHONY_OPERATOR'] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        assignedConversations: {
          where: {
            createdAt: { gte: start, lte: end },
          },
          select: {
            status: true,
            createdAt: true,
            resolvedAt: true,
          },
        },
        sentMessages: {
          where: { createdAt: { gte: start, lte: end } },
          select: { id: true },
        },
        callsHandled: {
          where: { startTime: { gte: start, lte: end } },
          select: { status: true, duration: true },
        },
      },
    });

    return agents.map((agent) => {
      const resolved = agent.assignedConversations.filter((c) =>
        ['RESOLVED', 'CLOSED'].includes(c.status),
      );
      const handleTimes = resolved
        .filter((c) => c.resolvedAt)
        .map((c) => Math.max(0, Math.round((c.resolvedAt!.getTime() - c.createdAt.getTime()) / 60_000)));

      return {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        status: agent.status,
        conversations: {
          total: agent.assignedConversations.length,
          resolved: resolved.length,
          active: agent.assignedConversations.filter((c) => c.status === 'IN_PROGRESS').length,
          avgHandleMinutes: handleTimes.length
            ? Math.round(handleTimes.reduce((sum, value) => sum + value, 0) / handleTimes.length)
            : 0,
        },
        messages: { sent: agent.sentMessages.length },
        calls: {
          total: agent.callsHandled.length,
          completed: agent.callsHandled.filter((c) => c.status === 'COMPLETED').length,
          avgDurationSeconds: agent.callsHandled.length
            ? Math.round(
                agent.callsHandled.reduce((sum, call) => sum + (call.duration || 0), 0) /
                  agent.callsHandled.length,
              )
            : 0,
        },
      };
    });
  }

  async queuePerformance(organizationId: string, from?: string, to?: string) {
    const { start, end } = this.getRange(from, to);
    const queues = await this.prisma.queue.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        strategy: true,
        isActive: true,
        conversations: {
          where: { createdAt: { gte: start, lte: end } },
          select: { status: true, createdAt: true, resolvedAt: true, waitingSince: true },
        },
        calls: {
          where: { startTime: { gte: start, lte: end } },
          select: { status: true, waitTime: true, duration: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return queues.map((queue) => {
      const waits = queue.conversations
        .filter((c) => c.waitingSince)
        .map((c) => Math.max(0, Math.round((c.createdAt.getTime() - c.waitingSince!.getTime()) / 1000)));
      return {
        id: queue.id,
        name: queue.name,
        strategy: queue.strategy,
        isActive: queue.isActive,
        conversations: {
          total: queue.conversations.length,
          resolved: queue.conversations.filter((c) => ['RESOLVED', 'CLOSED'].includes(c.status)).length,
          waiting: queue.conversations.filter((c) => c.status === 'WAITING').length,
          avgWaitSeconds: waits.length
            ? Math.round(waits.reduce((sum, value) => sum + value, 0) / waits.length)
            : 0,
        },
        calls: {
          total: queue.calls.length,
          completed: queue.calls.filter((c) => c.status === 'COMPLETED').length,
          missed: queue.calls.filter((c) => c.status === 'MISSED').length,
          avgDurationSeconds: queue.calls.length
            ? Math.round(queue.calls.reduce((sum, call) => sum + (call.duration || 0), 0) / queue.calls.length)
            : 0,
        },
      };
    });
  }
}
