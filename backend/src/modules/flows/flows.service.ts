import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FlowsService {
  constructor(private prisma: PrismaService) {}

  blueprints() {
    return [
      {
        key: 'customer-identification',
        name: 'Identificacao e triagem',
        description: 'Coleta documento, identifica cliente e encaminha para fila conforme necessidade.',
        channel: 'WHATSAPP',
        nodes: 6,
      },
      {
        key: 'ixc-support',
        name: 'Suporte com consulta IXC',
        description: 'Solicita CPF/CNPJ, chama integracao IXC e personaliza resposta antes do transbordo.',
        channel: 'WHATSAPP',
        nodes: 7,
      },
      {
        key: 'telegram-entry',
        name: 'Entrada Telegram',
        description: 'Recebe cliente do Telegram, qualifica assunto e direciona atendimento humano.',
        channel: 'TELEGRAM',
        nodes: 5,
      },
    ];
  }

  async createFromBlueprint(organizationId: string, key: string, dto: any = {}) {
    const blueprint = this.buildBlueprint(key, dto);
    if (!blueprint) throw new NotFoundException('Modelo de fluxo nao encontrado');
    return this.create(organizationId, blueprint);
  }

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

  private buildBlueprint(key: string, dto: any) {
    const name = dto.name || this.blueprints().find((blueprint) => blueprint.key === key)?.name;
    const base = {
      name,
      description: dto.description,
      status: 'DRAFT',
      version: 1,
      isActive: true,
    };

    const blueprints: Record<string, any> = {
      'customer-identification': {
        ...base,
        channel: dto.channel || 'WHATSAPP',
        startNodeId: 'start',
        nodes: [
          this.node('start', 'START', 'Inicio', 0, { trigger: 'MESSAGE_RECEIVED' }),
          this.node('welcome', 'MESSAGE', 'Saudacao', 1, {
            text: 'Ola, {{primeiro_nome}}. Para agilizar seu atendimento, informe CPF/CNPJ ou protocolo.',
          }),
          this.node('document', 'CAPTURE_DOCUMENT', 'Capturar documento', 2, { variable: 'documento_cliente' }),
          this.node('menu', 'NUMERIC_MENU', 'Menu principal', 3, {
            text: 'Digite 1 para financeiro, 2 para suporte tecnico ou 3 para comercial.',
            options: { '1': 'financeiro', '2': 'suporte', '3': 'comercial' },
          }),
          this.node('queue', 'TRANSFER_QUEUE', 'Encaminhar fila', 4, { queueMapVariable: 'opcao_menu' }),
          this.node('end', 'END', 'Fim', 5, { reason: 'transferred' }),
        ],
        connections: [
          this.connection('start', 'welcome'),
          this.connection('welcome', 'document'),
          this.connection('document', 'menu'),
          this.connection('menu', 'queue'),
          this.connection('queue', 'end'),
        ],
      },
      'ixc-support': {
        ...base,
        channel: dto.channel || 'WHATSAPP',
        startNodeId: 'start',
        nodes: [
          this.node('start', 'START', 'Inicio', 0, { trigger: 'MESSAGE_RECEIVED' }),
          this.node('document', 'CAPTURE_DOCUMENT', 'Documento do assinante', 1, { variable: 'documento_cliente' }),
          this.node('ixc', 'WEBHOOK', 'Consultar IXC', 2, {
            integrationType: 'IXC',
            operation: 'customers.search',
            query: '{{documento_cliente}}',
            saveAs: 'cliente_ixc',
          }),
          this.node('condition', 'CONDITION', 'Cliente encontrado?', 3, {
            expression: 'cliente_ixc.records.length > 0',
          }),
          this.node('message', 'MESSAGE', 'Resposta personalizada', 4, {
            text: 'Localizei seu cadastro, {{primeiro_nome}}. Vou encaminhar seu atendimento com o historico em tela.',
          }),
          this.node('queue', 'TRANSFER_QUEUE', 'Fila suporte', 5, { queueName: dto.queueName || 'Suporte' }),
          this.node('end', 'END', 'Fim', 6, { reason: 'transferred' }),
        ],
        connections: [
          this.connection('start', 'document'),
          this.connection('document', 'ixc'),
          this.connection('ixc', 'condition'),
          this.connection('condition', 'message', 'true'),
          this.connection('message', 'queue'),
          this.connection('queue', 'end'),
        ],
      },
      'telegram-entry': {
        ...base,
        channel: 'TELEGRAM',
        startNodeId: 'start',
        nodes: [
          this.node('start', 'START', 'Mensagem Telegram', 0, { trigger: 'MESSAGE_RECEIVED' }),
          this.node('welcome', 'MESSAGE', 'Boas-vindas', 1, {
            text: 'Recebemos sua mensagem pelo Telegram. Escolha o assunto para continuar.',
          }),
          this.node('menu', 'NUMERIC_MENU', 'Assunto', 2, {
            text: '1 Financeiro\n2 Suporte\n3 Comercial',
            options: { '1': 'financeiro', '2': 'suporte', '3': 'comercial' },
          }),
          this.node('queue', 'TRANSFER_QUEUE', 'Direcionar atendimento', 3, { queueMapVariable: 'opcao_menu' }),
          this.node('end', 'END', 'Fim', 4, { reason: 'transferred' }),
        ],
        connections: [
          this.connection('start', 'welcome'),
          this.connection('welcome', 'menu'),
          this.connection('menu', 'queue'),
          this.connection('queue', 'end'),
        ],
      },
    };

    return blueprints[key];
  }

  private node(id: string, type: string, label: string, sortOrder: number, config: Record<string, unknown>) {
    return {
      id,
      type,
      label,
      sortOrder,
      position: { x: 120 + sortOrder * 220, y: sortOrder % 2 === 0 ? 120 : 260 } as Prisma.InputJsonValue,
      config: config as Prisma.InputJsonValue,
    };
  }

  private connection(sourceNodeId: string, targetNodeId: string, sourceHandle?: string) {
    return {
      sourceNodeId,
      targetNodeId,
      sourceHandle,
      condition: (sourceHandle ? { value: sourceHandle } : {}) as Prisma.InputJsonValue,
    };
  }
}
