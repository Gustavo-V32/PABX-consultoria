import { Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.integration.findMany({
      where: { organizationId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });

    if (!integration) throw new NotFoundException('Integracao nao encontrada');
    return integration;
  }

  upsert(
    organizationId: string,
    dto: { type: string; name: string; config: any; isActive?: boolean },
  ) {
    return this.prisma.integration.upsert({
      where: { organizationId_type: { organizationId, type: dto.type } },
      update: {
        name: dto.name,
        config: dto.config,
        isActive: dto.isActive ?? true,
      },
      create: {
        organizationId,
        type: dto.type,
        name: dto.name,
        config: dto.config,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, organizationId: string, dto: { name?: string; config?: any; isActive?: boolean }) {
    await this.findOne(id, organizationId);
    return this.prisma.integration.update({
      where: { id },
      data: dto,
    });
  }

  async markSynced(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.integration.update({
      where: { id },
      data: { lastSyncAt: new Date() },
    });
  }

  async delete(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.integration.update({
      where: { id },
      data: { isActive: false },
    });
  }

  logs(organizationId: string, integrationId?: string, limit = 100) {
    return this.prisma.integrationLog.findMany({
      where: {
        organizationId,
        ...(integrationId ? { integrationId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async testConnection(organizationId: string, id: string, dto: any = {}) {
    const integration = await this.findOne(id, organizationId);
    const config = integration.config as any;
    const startedAt = Date.now();
    const method = (dto.method || config.method || 'GET').toUpperCase();
    const url = dto.url || config.testUrl || config.baseUrl || config.url;
    const headers = {
      ...(config.headers || {}),
      ...(dto.headers || {}),
      ...(config.bearerToken ? { Authorization: `Bearer ${config.bearerToken}` } : {}),
    };

    try {
      const response = await axios.request({
        method,
        url,
        headers,
        data: dto.body || config.body,
        timeout: dto.timeout || config.timeout || 10000,
        auth: config.username
          ? { username: config.username, password: config.password || '' }
          : undefined,
      });

      const log = await this.prisma.integrationLog.create({
        data: {
          organizationId,
          integrationId: integration.id,
          name: `Teste de conexao - ${integration.name}`,
          method,
          url,
          requestHeaders: headers,
          requestBody: dto.body || config.body,
          responseStatus: response.status,
          responseBody: response.data,
          durationMs: Date.now() - startedAt,
          status: 'SUCCESS',
        },
      });

      return { ok: true, status: response.status, durationMs: log.durationMs, log };
    } catch (error) {
      const status = error.response?.status;
      const log = await this.prisma.integrationLog.create({
        data: {
          organizationId,
          integrationId: integration.id,
          name: `Teste de conexao - ${integration.name}`,
          method,
          url,
          requestHeaders: headers,
          requestBody: dto.body || config.body,
          responseStatus: status,
          responseBody: error.response?.data,
          durationMs: Date.now() - startedAt,
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      return { ok: false, status, error: error.message, durationMs: log.durationMs, log };
    }
  }
}
