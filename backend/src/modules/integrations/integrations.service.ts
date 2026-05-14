import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from 'axios';
import { HttpMethod, Integration, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ExecuteIntegrationDto,
  IntegrationType,
  IxcCustomerSearchDto,
  TelegramSendMessageDto,
  UpdateIntegrationDto,
  UpsertIntegrationDto,
} from './dto/integration.dto';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  catalog() {
    return [
      {
        type: IntegrationType.HTTP,
        name: 'HTTP generico',
        description: 'Executa requests REST com token, Basic Auth, headers customizados e variaveis dinamicas.',
        configFields: ['baseUrl', 'method', 'headers', 'bearerToken', 'username', 'password', 'timeout'],
      },
      {
        type: IntegrationType.IXC,
        name: 'IXC Provedor',
        description: 'Busca dados cadastrais de clientes no IXC para enriquecer atendimento e fluxos.',
        configFields: ['baseUrl', 'token ou username/password', 'customerEndpoint', 'timeout'],
      },
      {
        type: IntegrationType.TELEGRAM,
        name: 'Telegram Bot',
        description: 'Recebe mensagens por webhook e envia respostas pelo bot Telegram.',
        configFields: ['botToken', 'webhookSecret', 'defaultChatId', 'timeout'],
      },
      {
        type: IntegrationType.WEBHOOK,
        name: 'Webhook receptor',
        description: 'Recebe eventos externos, registra payloads e permite evoluir automacoes por evento.',
        configFields: ['webhookSecret', 'source', 'eventTypePath'],
      },
    ];
  }

  findAll(organizationId: string) {
    return this.prisma.integration.findMany({
      where: { organizationId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    }).then((items) => items.map((item) => this.sanitizeIntegration(item)));
  }

  async findOne(id: string, organizationId: string) {
    return this.sanitizeIntegration(await this.getIntegration(id, organizationId));
  }

  private async getIntegration(id: string, organizationId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });

    if (!integration) throw new NotFoundException('Integracao nao encontrada');
    return integration;
  }

  async findPublicIntegration(id: string) {
    const integration = await this.prisma.integration.findFirst({ where: { id, isActive: true } });
    if (!integration) throw new NotFoundException('Integracao nao encontrada');
    return integration;
  }

  async upsert(organizationId: string, dto: UpsertIntegrationDto) {
    const integration = await this.prisma.integration.upsert({
      where: { organizationId_type: { organizationId, type: dto.type } },
      update: {
        name: dto.name,
        config: dto.config as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
      },
      create: {
        organizationId,
        type: dto.type,
        name: dto.name,
        config: dto.config as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
      },
    });

    return this.sanitizeIntegration(integration);
  }

  async update(id: string, organizationId: string, dto: UpdateIntegrationDto) {
    await this.getIntegration(id, organizationId);
    const integration = await this.prisma.integration.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        config: dto.config as Prisma.InputJsonValue,
        isActive: dto.isActive,
      },
    });

    return this.sanitizeIntegration(integration);
  }

  async markSynced(id: string, organizationId: string) {
    await this.getIntegration(id, organizationId);
    const integration = await this.prisma.integration.update({
      where: { id },
      data: { lastSyncAt: new Date() },
    });

    return this.sanitizeIntegration(integration);
  }

  async delete(id: string, organizationId: string) {
    await this.getIntegration(id, organizationId);
    const integration = await this.prisma.integration.update({
      where: { id },
      data: { isActive: false },
    });

    return this.sanitizeIntegration(integration);
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

  async execute(organizationId: string, id: string, dto: ExecuteIntegrationDto = {}) {
    const integration = await this.getIntegration(id, organizationId);
    return this.executeIntegration(integration, dto);
  }

  async testConnection(organizationId: string, id: string, dto: ExecuteIntegrationDto = {}) {
    const integration = await this.getIntegration(id, organizationId);
    return this.executeIntegration(integration, dto);
  }

  async searchIxcCustomers(organizationId: string, id: string, dto: IxcCustomerSearchDto) {
    const integration = await this.getIntegration(id, organizationId);
    if (integration.type !== IntegrationType.IXC) throw new BadRequestException('Integracao nao e do tipo IXC');

    const config = integration.config as Record<string, any>;
    const response = await this.executeIntegration(integration, {
      method: (config.customerMethod || 'POST') as HttpMethod,
      url: this.joinUrl(String(config.baseUrl || ''), String(config.customerEndpoint || '/webservice/v1/cliente')),
      headers: {
        ixcsoft: 'listar',
        'Content-Type': 'application/json',
        ...(config.headers || {}),
      },
      body: {
        qtype: dto.qtype || config.customerQtype || 'cliente.razao',
        query: dto.query,
        oper: config.customerOperator || 'L',
        page: String(dto.page || 1),
        rp: String(dto.limit || 20),
        sortname: config.customerSortName || 'cliente.id',
        sortorder: config.customerSortOrder || 'desc',
      },
    });

    const records = this.normalizeIxcRecords(response.data);
    return { ...response, records };
  }

  async sendTelegramMessage(organizationId: string, id: string, dto: TelegramSendMessageDto) {
    const integration = await this.getIntegration(id, organizationId);
    if (integration.type !== IntegrationType.TELEGRAM) throw new BadRequestException('Integracao nao e do tipo Telegram');

    const config = integration.config as Record<string, any>;
    const botToken = config.botToken;
    const chatId = dto.chatId || config.defaultChatId;
    if (!botToken) throw new BadRequestException('Token do bot Telegram nao configurado');
    if (!chatId) throw new BadRequestException('chatId nao informado');

    return this.executeIntegration(integration, {
      method: 'POST',
      url: `https://api.telegram.org/bot${botToken}/sendMessage`,
      body: {
        chat_id: chatId,
        text: dto.text,
        parse_mode: dto.options?.parseMode || config.parseMode,
        disable_web_page_preview: dto.options?.disableWebPagePreview ?? true,
      },
    });
  }

  async processTelegramWebhook(integrationId: string, body: any, headers: Record<string, string | string[] | undefined> = {}) {
    const integration = await this.findPublicIntegration(integrationId);
    if (integration.type !== IntegrationType.TELEGRAM) return this.recordWebhook(integration, body, 'telegram.ignored');

    const config = integration.config as Record<string, any>;
    if (config.webhookSecret) {
      const receivedSecret = headers['x-telegram-bot-api-secret-token'];
      if (receivedSecret !== config.webhookSecret) throw new BadRequestException('Assinatura Telegram invalida');
    }

    const telegramMessage = body.message || body.edited_message || body.callback_query?.message;
    const from = body.message?.from || body.callback_query?.from || telegramMessage?.from;
    const chat = telegramMessage?.chat;
    if (!telegramMessage || !chat) return this.recordWebhook(integration, body, 'telegram.unsupported');

    const chatId = String(chat.id);
    const externalId = `telegram:${chatId}`;
    const name = [from?.first_name, from?.last_name].filter(Boolean).join(' ') || chat.title || `Telegram ${chatId}`;
    const text = telegramMessage.text || telegramMessage.caption || `[telegram:${Object.keys(telegramMessage).join(',')}]`;

    const existingContact = await this.prisma.contact.findFirst({
      where: { organizationId: integration.organizationId, externalId },
    });
    const contactPayload = {
        name,
        customFields: {
          provider: 'telegram',
          chatId,
          username: from?.username,
          languageCode: from?.language_code,
        },
      };
    const contact = existingContact
      ? await this.prisma.contact.update({ where: { id: existingContact.id }, data: contactPayload })
      : await this.prisma.contact.create({
          data: {
            organizationId: integration.organizationId,
            externalId,
            leadSource: 'telegram',
            ...contactPayload,
          },
        });

    let conversation = await this.prisma.conversation.findFirst({
      where: {
        organizationId: integration.organizationId,
        contactId: contact.id,
        channel: 'TELEGRAM',
        status: { in: ['WAITING', 'IN_PROGRESS', 'PENDING'] },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          organizationId: integration.organizationId,
          contactId: contact.id,
          channel: 'TELEGRAM',
          status: 'WAITING',
          waitingSince: new Date(),
          lastMessageAt: new Date(),
          metadata: { integrationId: integration.id, chatId },
        },
      });
      this.events.emit('conversation.created', { conversation });
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        externalId: String(telegramMessage.message_id),
        type: telegramMessage.photo ? 'IMAGE' : telegramMessage.document ? 'DOCUMENT' : 'TEXT',
        direction: 'INBOUND',
        status: 'DELIVERED',
        content: text,
        metadata: body,
        sentAt: telegramMessage.date ? new Date(telegramMessage.date * 1000) : new Date(),
        deliveredAt: new Date(),
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    await this.recordWebhook(integration, body, 'telegram.message');
    this.events.emit('message.received', { message, conversation, contact });
    return { received: true, conversationId: conversation.id, contactId: contact.id };
  }

  async recordWebhook(integration: Integration, payload: any, eventType?: string) {
    await this.prisma.webhookLog.create({
      data: {
        organizationId: integration.organizationId,
        integrationId: integration.id,
        source: integration.type,
        eventType,
        payload: payload as Prisma.InputJsonValue,
        status: 'SUCCESS',
        processedAt: new Date(),
      },
    });

    return { received: true };
  }

  private async executeIntegration(integration: Integration, dto: ExecuteIntegrationDto = {}) {
    const config = integration.config as Record<string, any>;
    const startedAt = Date.now();
    const method = String(dto.method || config.method || 'GET').toUpperCase() as HttpMethod;
    const variables = await this.buildVariables(integration.organizationId, dto);
    const url = this.renderTemplate(String(dto.url || config.testUrl || config.url || config.baseUrl), variables);
    if (!url) throw new BadRequestException('URL da integracao nao configurada');

    const headers = this.renderTemplateDeep({
      ...(config.headers || {}),
      ...(dto.headers || {}),
      ...(config.bearerToken ? { Authorization: `Bearer ${config.bearerToken}` } : {}),
      ...(config.apiToken && config.authHeaderName ? { [config.authHeaderName]: config.apiToken } : {}),
    }, variables) as Record<string, string>;
    const body = this.renderTemplateDeep(dto.body ?? config.body, variables);
    const query = this.renderTemplateDeep(dto.query || config.query || {}, variables);

    try {
      const response = await axios.request({
        method,
        url,
        headers,
        params: query,
        data: body,
        timeout: dto.timeout || config.timeout || 10000,
        auth: config.username
          ? { username: config.username, password: config.password || '' }
          : undefined,
      });

      const log = await this.prisma.integrationLog.create({
        data: {
          organizationId: integration.organizationId,
          integrationId: integration.id,
          name: `Execucao - ${integration.name}`,
          method,
          url,
          requestHeaders: this.maskSecrets(headers) as Prisma.InputJsonValue,
          requestBody: body as Prisma.InputJsonValue,
          responseStatus: response.status,
          responseBody: response.data as Prisma.InputJsonValue,
          durationMs: Date.now() - startedAt,
          status: 'SUCCESS',
        },
      });

      return { ok: true, status: response.status, durationMs: log.durationMs, data: response.data, log };
    } catch (error) {
      const status = error.response?.status;
      const log = await this.prisma.integrationLog.create({
        data: {
          organizationId: integration.organizationId,
          integrationId: integration.id,
          name: `Execucao - ${integration.name}`,
          method,
          url,
          requestHeaders: this.maskSecrets(headers) as Prisma.InputJsonValue,
          requestBody: body as Prisma.InputJsonValue,
          responseStatus: status,
          responseBody: error.response?.data as Prisma.InputJsonValue,
          durationMs: Date.now() - startedAt,
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      this.logger.warn(`Integration ${integration.id} failed: ${error.message}`);
      return { ok: false, status, error: error.message, durationMs: log.durationMs, log };
    }
  }

  private async buildVariables(organizationId: string, dto: ExecuteIntegrationDto) {
    const variables: Record<string, unknown> = { ...(dto.variables || {}) };
    if (!dto.contactId) return variables;

    const contact = await this.prisma.contact.findFirst({
      where: { id: dto.contactId, organizationId },
      include: { variables: true },
    });
    if (!contact) throw new NotFoundException('Contato nao encontrado');

    return {
      ...variables,
      contactId: contact.id,
      nome_cliente: contact.name,
      telefone: contact.phone,
      email: contact.email,
      documento: contact.document,
      empresa: contact.company,
      externalId: contact.externalId,
      ...Object.fromEntries(contact.variables.map((variable) => [variable.key, variable.value])),
    };
  }

  private renderTemplate(value: string, variables: Record<string, unknown>) {
    return value.replace(/{{\s*([\w.-]+)\s*}}/g, (_, key) => String(variables[key] ?? ''));
  }

  private renderTemplateDeep(value: unknown, variables: Record<string, unknown>): unknown {
    if (typeof value === 'string') return this.renderTemplate(value, variables);
    if (Array.isArray(value)) return value.map((item) => this.renderTemplateDeep(item, variables));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [
          key,
          this.renderTemplateDeep(item, variables),
        ]),
      );
    }
    return value;
  }

  private sanitizeIntegration(integration: Integration) {
    return { ...integration, config: this.maskSecrets(integration.config as Record<string, unknown>) };
  }

  private maskSecrets(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.maskSecrets(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [
          key,
          /token|secret|password|authorization|senha/i.test(key) ? '********' : this.maskSecrets(item),
        ]),
      );
    }
    return value;
  }

  private joinUrl(baseUrl: string, path: string) {
    return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  }

  private normalizeIxcRecords(payload: any) {
    const rows = payload?.registros || payload?.data || payload?.rows || [];
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => ({
      id: row.id,
      name: row.razao || row.nome || row.fantasia,
      document: row.cnpj_cpf || row.cpf || row.cnpj,
      phone: row.telefone_celular || row.fone || row.telefone,
      email: row.email,
      status: row.ativo,
      contractId: row.id_contrato,
      raw: row,
    }));
  }
}
