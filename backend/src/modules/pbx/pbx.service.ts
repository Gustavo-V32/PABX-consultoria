import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PbxService {
  constructor(private prisma: PrismaService) {}

  listIvrs(organizationId: string) {
    return this.prisma.ivrFlow.findMany({
      where: { organizationId },
      include: { options: { orderBy: { digit: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  createIvr(organizationId: string, dto: any) {
    const { options, ...data } = dto;
    return this.prisma.ivrFlow.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        nodes: data.nodes || [],
        edges: data.edges || [],
        entryPoint: data.entryPoint,
        audioFile: data.audioFile,
        ttsText: data.ttsText,
        afterHoursMessage: data.afterHoursMessage,
        isActive: data.isActive ?? true,
        options: options?.length ? { create: options } : undefined,
      },
      include: { options: true },
    });
  }

  async updateIvr(id: string, organizationId: string, dto: any) {
    await this.ensureIvr(id, organizationId);
    const { options, ...data } = dto;
    return this.prisma.ivrFlow.update({
      where: { id },
      data,
      include: { options: true },
    });
  }

  async addIvrOption(ivrFlowId: string, organizationId: string, dto: any) {
    await this.ensureIvr(ivrFlowId, organizationId);
    return this.prisma.ivrOption.create({
      data: {
        ivrFlowId,
        digit: dto.digit,
        label: dto.label,
        destinationType: dto.destinationType,
        destinationValue: dto.destinationValue,
        schedule: dto.schedule || {},
        isFallback: dto.isFallback ?? false,
      },
    });
  }

  async updateIvrOption(ivrFlowId: string, optionId: string, organizationId: string, dto: any) {
    await this.ensureIvr(ivrFlowId, organizationId);
    return this.prisma.ivrOption.update({ where: { id: optionId }, data: dto });
  }

  async deleteIvrOption(ivrFlowId: string, optionId: string, organizationId: string) {
    await this.ensureIvr(ivrFlowId, organizationId);
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

  createRoute(organizationId: string, dto: any) {
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
        schedule: dto.schedule || {},
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateRoute(id: string, organizationId: string, dto: any) {
    await this.ensureRoute(id, organizationId);
    return this.prisma.callRoute.update({ where: { id }, data: dto });
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

  createRingGroup(organizationId: string, dto: any) {
    const { members, ...data } = dto;
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

  async updateRingGroup(id: string, organizationId: string, dto: any) {
    await this.ensureRingGroup(id, organizationId);
    return this.prisma.ringGroup.update({ where: { id }, data: dto });
  }

  async addRingGroupMember(ringGroupId: string, organizationId: string, dto: any) {
    await this.ensureRingGroup(ringGroupId, organizationId);
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

  createRecording(organizationId: string, dto: any) {
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

  registerSoftphoneSession(organizationId: string, userId: string, dto: any) {
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

  heartbeatSoftphoneSession(sessionId: string, organizationId: string, dto: any = {}) {
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

  private async ensureIvr(id: string, organizationId: string) {
    const ivr = await this.prisma.ivrFlow.findFirst({ where: { id, organizationId } });
    if (!ivr) throw new NotFoundException('URA nao encontrada');
    return ivr;
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
}
