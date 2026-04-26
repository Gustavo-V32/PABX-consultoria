import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default organization
  const org = await prisma.organization.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'OmniSuite Demo',
      slug: 'default',
      timezone: 'America/Sao_Paulo',
      locale: 'pt-BR',
      plan: 'enterprise',
      settings: {
        maxAgents: 50,
        maxQueues: 20,
        maxWhatsappNumbers: 5,
        features: ['whatsapp', 'telephony', 'automation', 'reports'],
      },
    },
  });

  console.log(`✅ Organization: ${org.name}`);

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'admin@omnisuite.com.br' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Administrador',
      email: 'admin@omnisuite.com.br',
      password: adminPassword,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log(`✅ Admin user: ${admin.email}`);

  // Create supervisor
  const supervisorPassword = await bcrypt.hash('Supervisor@123', 12);
  await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: 'supervisor@omnisuite.com.br' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Supervisor',
      email: 'supervisor@omnisuite.com.br',
      password: supervisorPassword,
      role: UserRole.SUPERVISOR,
      isActive: true,
    },
  });

  // Create agents
  const agentPassword = await bcrypt.hash('Agent@123', 12);
  for (let i = 1; i <= 3; i++) {
    await prisma.user.upsert({
      where: {
        organizationId_email: {
          organizationId: org.id,
          email: `agente${i}@omnisuite.com.br`,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        name: `Agente ${i}`,
        email: `agente${i}@omnisuite.com.br`,
        password: agentPassword,
        role: UserRole.AGENT,
        maxChats: 5,
        isActive: true,
      },
    });
  }

  console.log(`✅ Users created`);

  // Create sectors
  const sectors = [
    { name: 'Suporte', color: '#6366f1' },
    { name: 'Vendas', color: '#22c55e' },
    { name: 'Financeiro', color: '#f59e0b' },
    { name: 'Recepção', color: '#3b82f6' },
  ];

  for (const sector of sectors) {
    await prisma.sector.upsert({
      where: { organizationId_name: { organizationId: org.id, name: sector.name } },
      update: {},
      create: { organizationId: org.id, ...sector },
    });
  }

  console.log(`✅ Sectors created`);

  // Create default queues
  const queues = [
    { name: 'Recepção Geral', description: 'Fila principal de atendimento' },
    { name: 'Suporte Técnico', description: 'Fila de suporte técnico' },
    { name: 'Vendas', description: 'Fila do comercial' },
    { name: 'Financeiro', description: 'Fila financeira' },
  ];

  for (const queue of queues) {
    await prisma.queue.upsert({
      where: { organizationId_name: { organizationId: org.id, name: queue.name } },
      update: {},
      create: {
        organizationId: org.id,
        name: queue.name,
        description: queue.description,
        strategy: 'ROUND_ROBIN',
        maxWaitTime: 300,
        maxQueueSize: 50,
        autoAssign: true,
        isActive: true,
      },
    });
  }

  console.log(`✅ Queues created`);

  // Create default tags
  const tags = [
    { name: 'Urgente', color: '#ef4444' },
    { name: 'Aguardando', color: '#f59e0b' },
    { name: 'VIP', color: '#8b5cf6' },
    { name: 'Reclamação', color: '#ec4899' },
    { name: 'Novo Cliente', color: '#22c55e' },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { organizationId_name: { organizationId: org.id, name: tag.name } },
      update: {},
      create: { organizationId: org.id, ...tag },
    });
  }

  console.log(`✅ Tags created`);

  // Create canned responses
  const cannedResponses = [
    {
      title: 'Saudação inicial',
      shortcut: '/oi',
      content: 'Olá! Sou {{agent_name}} do time de atendimento da {{company_name}}. Como posso te ajudar hoje? 😊',
    },
    {
      title: 'Aguardando retorno',
      shortcut: '/aguardo',
      content: 'Vou verificar essa informação para você. Por favor, aguarde um momento. 🙏',
    },
    {
      title: 'Encerramento',
      shortcut: '/tchau',
      content: 'Fico feliz em ter ajudado! Qualquer outra dúvida, estamos à disposição. Tenha um ótimo dia! 😊',
    },
    {
      title: 'Transferindo',
      shortcut: '/transferindo',
      content: 'Vou te transferir para o setor responsável. Por favor, aguarde um instante.',
    },
  ];

  for (const cr of cannedResponses) {
    await prisma.cannedResponse.create({
      data: { organizationId: org.id, ...cr },
    });
  }

  console.log(`✅ Canned responses created`);
  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📧 Credentials:');
  console.log('  Admin: admin@omnisuite.com.br / Admin@123');
  console.log('  Supervisor: supervisor@omnisuite.com.br / Supervisor@123');
  console.log('  Agent: agente1@omnisuite.com.br / Agent@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
