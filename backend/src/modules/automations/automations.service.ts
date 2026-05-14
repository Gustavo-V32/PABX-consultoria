import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { AutomationTrigger, Prisma } from '@prisma/client';
import { Allow, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateAutomationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(AutomationTrigger)
  trigger: AutomationTrigger;

  @IsOptional()
  @Allow()
  triggerConfig?: any;

  @IsOptional()
  @Allow()
  conditions?: any;

  @Allow()
  actions: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAutomationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(AutomationTrigger)
  trigger?: AutomationTrigger;

  @IsOptional()
  @Allow()
  triggerConfig?: any;

  @IsOptional()
  @Allow()
  conditions?: any;

  @IsOptional()
  @Allow()
  actions?: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Injectable()
export class AutomationsService {
  constructor(private prisma: PrismaService) {}

  @OnEvent('message.received')
  async onMessageReceived(payload: any) {
    await this.executeByTrigger('MESSAGE_RECEIVED', payload);
    await this.executeKeywordAutomations(payload);
  }

  @OnEvent('conversation.created')
  async onConversationCreated(payload: any) {
    await this.executeByTrigger('CONVERSATION_OPENED', payload);
  }

  @OnEvent('conversation.closed')
  async onConversationClosed(payload: any) {
    await this.executeByTrigger('CONVERSATION_CLOSED', payload);
  }

  findAll(organizationId: string, includeInactive = false) {
    return this.prisma.automation.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id, organizationId },
    });

    if (!automation) throw new NotFoundException('Automacao nao encontrada');
    return automation;
  }

  create(organizationId: string, dto: CreateAutomationDto) {
    return this.prisma.automation.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        trigger: dto.trigger,
        triggerConfig: dto.triggerConfig || {},
        conditions: dto.conditions || [],
        actions: dto.actions,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, organizationId: string, dto: UpdateAutomationDto) {
    await this.findOne(id, organizationId);
    return this.prisma.automation.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.automation.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async registerRun(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.automation.update({
      where: { id },
      data: {
        runCount: { increment: 1 },
        lastRunAt: new Date(),
      },
    });
  }

  private async executeKeywordAutomations(payload: any) {
    const text = String(payload.message?.content || '').toLowerCase();
    if (!text || !payload.conversation?.organizationId) return;

    const automations = await this.prisma.automation.findMany({
      where: {
        organizationId: payload.conversation.organizationId,
        trigger: 'KEYWORD_MATCH',
        isActive: true,
      },
    });

    for (const automation of automations) {
      const config = automation.triggerConfig as any;
      const keywords = Array.isArray(config?.keywords) ? config.keywords : [];
      if (keywords.some((keyword: string) => text.includes(String(keyword).toLowerCase()))) {
        await this.executeAutomation(automation, payload);
      }
    }
  }

  private async executeByTrigger(trigger: AutomationTrigger, payload: any) {
    const organizationId = payload.conversation?.organizationId || payload.organizationId;
    if (!organizationId) return;

    const automations = await this.prisma.automation.findMany({
      where: { organizationId, trigger, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    for (const automation of automations) {
      await this.executeAutomation(automation, payload);
    }
  }

  private async executeAutomation(automation: any, payload: any) {
    if (!this.matchesConditions(automation.conditions, payload)) return;

    const actions = Array.isArray(automation.actions) ? automation.actions : [];
    for (const action of actions) {
      await this.executeAction(automation.organizationId, action, payload);
    }

    await this.prisma.automation.update({
      where: { id: automation.id },
      data: { runCount: { increment: 1 }, lastRunAt: new Date() },
    });
  }

  private matchesConditions(conditions: any, payload: any) {
    const list = Array.isArray(conditions) ? conditions : [];
    if (!list.length) return true;

    return list.every((condition) => {
      const value = this.readPath(payload, condition.path || condition.field);
      switch (condition.operator || 'equals') {
        case 'contains':
          return String(value || '').toLowerCase().includes(String(condition.value || '').toLowerCase());
        case 'not_equals':
          return value !== condition.value;
        case 'exists':
          return value !== undefined && value !== null && value !== '';
        default:
          return value === condition.value;
      }
    });
  }

  private async executeAction(organizationId: string, action: any, payload: any) {
    const type = String(action.type || '');
    const config = action.config || action;
    const conversationId = payload.conversation?.id || config.conversationId;
    const contactId = payload.contact?.id || payload.conversation?.contactId || config.contactId;

    switch (type) {
      case 'SEND_MESSAGE':
        if (!conversationId || !config.text) return;
        await this.prisma.message.create({
          data: {
            conversationId,
            type: 'TEXT',
            direction: 'OUTBOUND',
            status: 'SENT',
            content: this.render(config.text, payload),
            metadata: { automation: true } as Prisma.InputJsonValue,
            sentAt: new Date(),
          },
        });
        await this.prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });
        return;
      case 'ASSIGN_QUEUE':
        if (!conversationId || !config.queueId) return;
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: { queueId: config.queueId, status: 'WAITING', waitingSince: new Date() },
        });
        return;
      case 'ASSIGN_AGENT':
        if (!conversationId || !config.agentId) return;
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: { assignedAgentId: config.agentId, status: 'IN_PROGRESS', waitingSince: null },
        });
        return;
      case 'ADD_TAG':
        if (!config.tagId) return;
        if (conversationId) {
          await this.prisma.conversationTag.upsert({
            where: { conversationId_tagId: { conversationId, tagId: config.tagId } },
            update: {},
            create: { conversationId, tagId: config.tagId },
          });
        }
        if (contactId) {
          await this.prisma.contactTag.upsert({
            where: { contactId_tagId: { contactId, tagId: config.tagId } },
            update: {},
            create: { contactId, tagId: config.tagId },
          });
        }
        return;
      case 'SET_VARIABLE':
        if (!contactId || !config.key) return;
        await this.prisma.customerVariable.upsert({
          where: { contactId_key: { contactId, key: config.key } },
          update: { value: this.render(String(config.value ?? ''), payload), type: config.valueType || 'string' },
          create: {
            organizationId,
            contactId,
            key: config.key,
            value: this.render(String(config.value ?? ''), payload),
            type: config.valueType || 'string',
            isSystem: false,
          },
        });
        return;
      case 'CLOSE_CONVERSATION':
        if (!conversationId) return;
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: { status: 'CLOSED', closedAt: new Date() },
        });
        return;
      case 'WEBHOOK_CALL':
        if (!config.url) return;
        await axios.request({
          method: config.method || 'POST',
          url: this.render(config.url, payload),
          headers: config.headers || {},
          data: config.body || payload,
          timeout: config.timeout || 10000,
        });
        return;
    }
  }

  private render(template: string, payload: any) {
    return template.replace(/{{\s*([\w.-]+)\s*}}/g, (_, key) => String(this.readPath(payload, key) ?? ''));
  }

  private readPath(source: any, path?: string) {
    if (!path) return undefined;
    const aliases: Record<string, string> = {
      primeiro_nome: 'contact.name',
      nome_cliente: 'contact.name',
      telefone: 'contact.phone',
      mensagem: 'message.content',
    };
    const normalized = aliases[path] || path;
    const value = normalized.split('.').reduce((acc, key) => acc?.[key], source);
    if (path === 'primeiro_nome') return String(value || '').split(' ')[0];
    return value;
  }
}
