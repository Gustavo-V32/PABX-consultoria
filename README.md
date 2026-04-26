# OmniSuite - Atendimento Omnichannel e Telefonia Corporativa

Sistema web para atendimento empresarial com WhatsApp, chat interno, automações, CRM de contatos, integrações HTTP/Google Drive e telefonia PABX com Asterisk.

## Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS e componentes shadcn/ui locais.
- Backend: NestJS, TypeScript, REST API, WebSocket, JWT, Redis/Bull e Swagger.
- Banco: PostgreSQL com Prisma ORM.
- Infraestrutura: Docker Compose, Nginx, Redis, PostgreSQL, backend, frontend e Asterisk.
- Telefonia: Asterisk com AMI, ramais, troncos, filas, URA, rotas e gravações.

## Estrutura

```text
backend/      API NestJS, Prisma, módulos de domínio e migrations
frontend/     Painel administrativo Next.js
asterisk/     Dockerfile e arquivos de configuração Asterisk
nginx/        Proxy reverso para frontend, API e WebSocket
infra/        Inicialização de infraestrutura
```

## Módulos Implementados

- Autenticação JWT, refresh token e perfis.
- Dashboard em tempo real com métricas de conversas, agentes, filas e chamadas.
- Atendimento estilo WhatsApp com mensagens, WebSocket, notas, transferência e encerramento.
- CRM de contatos com tags, variáveis personalizadas e anexos.
- Usuários, setores, filas e permissões por perfil.
- Fluxos de comunicação com nós, conexões, execuções e prévia de variáveis dinâmicas.
- WhatsApp Cloud API: números, envio, webhook e sincronização de templates.
- Integrações HTTP com configuração, teste de conexão e logs.
- Google Drive: OAuth URL, metadados de arquivos, vínculos por contato/atendimento e plano de pastas.
- Telefonia: ramais, troncos, chamadas ativas, discador, filas Asterisk, URA, rotas, grupos de toque, gravações e sessões softphone.
- Relatórios operacionais e auditoria.
- Números digitais SIP com portas, codecs, status e logs técnicos.

## Variáveis de Ambiente

Copie `.env.example` para `.env` e ajuste os segredos:

```powershell
Copy-Item .env.example .env
```

Campos críticos:

- `DATABASE_URL`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `META_VERIFY_TOKEN`
- `META_GRAPH_API_VERSION`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ASTERISK_AMI_SECRET`

## Execução Local com Docker

```powershell
docker compose up --build
```

Serviços:

- Frontend: `http://localhost`
- Backend direto: `http://localhost:3001/api`
- Swagger: `http://localhost:3001/api/docs`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Asterisk AMI: `5038`
- Asterisk HTTP/ARI: `8088`

## Execução sem Docker

Backend:

```powershell
cd backend
npm install
npm run prisma:generate
npm run build
npm run start:dev
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

## Banco de Dados

O schema está em `backend/prisma/schema.prisma`.

A migration inicial versionada está em:

```text
backend/prisma/migrations/20260415160000_init/migration.sql
```

Com Docker, o backend executa `prisma migrate deploy` antes de iniciar.

Para popular dados demo:

```powershell
cd backend
npm run prisma:seed
```

Credenciais demo:

- Admin: `admin@omnisuite.com.br` / `Admin@123`
- Supervisor: `supervisor@omnisuite.com.br` / `Supervisor@123`
- Agente: `agente1@omnisuite.com.br` / `Agent@123`

## Asterisk

Arquivos principais:

- `asterisk/conf/sip.conf`
- `asterisk/conf/extensions.conf`
- `asterisk/conf/queues.conf`
- `asterisk/conf/manager.conf`
- `asterisk/conf/ari.conf`

O backend integra com AMI usando:

- `ASTERISK_HOST`
- `ASTERISK_AMI_PORT`
- `ASTERISK_AMI_USER`
- `ASTERISK_AMI_SECRET`

## Validação

Comandos usados para validar:

```powershell
cd backend
npm run prisma:generate
npm run build
npm audit --omit=dev

cd ../frontend
npm run type-check
npm run build
npm audit --omit=dev
```

Todos os builds e audits de produção estão passando.
