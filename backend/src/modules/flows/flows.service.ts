import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FlowsService {
  constructor(private prisma: PrismaService) {}

  findAll(organizationId: string, includeInactive = false) {
    return this.prisma.communicationFlow.findMany({
      where: {
        organizationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        _count: { select: { nodes: true, connections: true, executions: true } },
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const flow = await this.prisma.communicationFlow.findFirst({
      where: { id, organizationId },
      include: {
        nodes: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        connections: true,
        executions: { orderBy: { startedAt: 'desc' }, take: 20 },
      },
    });

    if (!flow) throw new NotFoundException('Fluxo nao encontrado');
    return flow;
  }

  create(organizationId: string, dto: any) {
    const { nodes, connections, ...data } = dto;
    return this.prisma.communicationFlow.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        channel: data.channel,
        status: data.status || 'DRAFT',
        startNodeId: data.startNodeId,
        version: data.version || 1,
        isActive: data.isActive ?? true,
        nodes: nodes?.length ? { create: nodes } : undefined,
        connections: connections?.length ? { create: connections } : undefined,
      },
      include: { nodes: true, connections: true },
    });
  }

  async update(id: string, organizationId: string, dto: any) {
    await this.findOne(id, organizationId);
    const { nodes, connections, ...data } = dto;
    return this.prisma.communicationFlow.update({
      where: { id },
      data,
      include: { nodes: true, connections: true },
    });
  }

  async delete(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.communicationFlow.update({
      where: { id },
      data: { isActive: false, status: 'INACTIVE' },
    });
  }

  async addNode(flowId: string, organizationId: string, dto: any) {
    await this.findOne(flowId, organizationId);
    return this.prisma.flowNode.create({
      data: {
        flowId,
        type: dto.type,
        label: dto.label,
        position: dto.position || {},
        config: dto.config || {},
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  async updateNode(flowId: string, nodeId: string, organizationId: string, dto: any) {
    await this.findOne(flowId, organizationId);
    return this.prisma.flowNode.update({
      where: { id: nodeId },
      data: dto,
    });
  }

  async deleteNode(flowId: string, nodeId: string, organizationId: string) {
    await this.findOne(flowId, organizationId);
    return this.prisma.flowNode.delete({ where: { id: nodeId } });
  }

  async addConnection(flowId: string, organizationId: string, dto: any) {
    await this.findOne(flowId, organizationId);
    return this.prisma.flowConnection.create({
      data: {
        flowId,
        sourceNodeId: dto.sourceNodeId,
        targetNodeId: dto.targetNodeId,
        sourceHandle: dto.sourceHandle,
        targetHandle: dto.targetHandle,
        condition: dto.condition || {},
      },
    });
  }

  async deleteConnection(flowId: string, connectionId: string, organizationId: string) {
    await this.findOne(flowId, organizationId);
    return this.prisma.flowConnection.delete({ where: { id: connectionId } });
  }

  async startExecution(flowId: string, organizationId: string, dto: any) {
    const flow = await this.findOne(flowId, organizationId);
    return this.prisma.flowExecution.create({
      data: {
        flowId,
        conversationId: dto.conversationId,
        contactId: dto.contactId,
        currentNodeId: dto.currentNodeId || flow.startNodeId,
        variables: dto.variables || {},
      },
    });
  }

  async updateExecution(id: string, organizationId: string, dto: any) {
    const execution = await this.prisma.flowExecution.findFirst({
      where: { id, flow: { organizationId } },
    });
    if (!execution) throw new NotFoundException('Execucao do fluxo nao encontrada');

    return this.prisma.flowExecution.update({
      where: { id },
      data: {
        currentNodeId: dto.currentNodeId,
        variables: dto.variables,
        status: dto.status,
        errorMessage: dto.errorMessage,
        finishedAt: ['FINISHED', 'FAILED', 'CANCELLED'].includes(dto.status) ? new Date() : dto.finishedAt,
      },
    });
  }

  async variablesForContact(organizationId: string, contactId: string, agentId?: string) {
    const [contact, variables, agent] = await Promise.all([
      this.prisma.contact.findFirst({
        where: { id: contactId, organizationId },
        include: { responsibleUser: true, conversations: { orderBy: { createdAt: 'desc' }, take: 1, include: { queue: true } } },
      }),
      this.prisma.customerVariable.findMany({ where: { contactId } }),
      agentId ? this.prisma.user.findFirst({ where: { id: agentId, organizationId } }) : null,
    ]);

    if (!contact) throw new NotFoundException('Contato nao encontrado');

    const currentConversation = contact.conversations[0];
    const firstName = contact.name?.split(' ')[0] || '';
    const now = new Date();
    const context: Record<string, string> = {
      nome_cliente: contact.name || '',
      primeiro_nome: firstName,
      telefone: contact.phone || '',
      email: contact.email || '',
      empresa: contact.company || '',
      protocolo: currentConversation?.id?.slice(0, 8).toUpperCase() || contact.id.slice(0, 8).toUpperCase(),
      agente_nome: agent?.name || contact.responsibleUser?.name || '',
      fila_nome: currentConversation?.queue?.name || '',
      data_atual: now.toLocaleDateString('pt-BR'),
      hora_atual: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    for (const variable of variables) {
      context[variable.key] = variable.value || '';
    }

    return context;
  }

  async previewMessage(organizationId: string, dto: { contactId: string; agentId?: string; template: string }) {
    const variables = await this.variablesForContact(organizationId, dto.contactId, dto.agentId);
    const rendered = dto.template.replace(/{{\s*([\w.-]+)\s*}}/g, (_, key) => variables[key] ?? '');
    return { variables, rendered };
  }
}
