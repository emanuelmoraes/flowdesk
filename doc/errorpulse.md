# Prompt Mestre — Mini Sentry (NestJS)

Use o prompt abaixo em uma IA para gerar um projeto completo do **ErrorPulse** focado em uso interno para dois sistemas (FlowDesk e Praxis).

## Prompt para IA

Você é um arquiteto e engenheiro sênior. Crie um projeto completo chamado **ErrorPulse** para monitoramento de erros e incidentes, com backend em **NestJS**, pronto para desenvolvimento local e evolução para produção.

### Contexto
- O sistema será usado inicialmente por 2 produtos internos: **FlowDesk** e **Praxis**.
- Não é um SaaS público neste momento; foco é confiabilidade interna, baixo custo e velocidade.
- Deve ter base sólida para crescer no futuro (multi-projeto, alertas, retenção, governança).

### Objetivo do MVP
Implementar um sistema funcional que faça:
1. Ingestão de erros via API HTTP (frontend e backend).
2. Agrupamento de erros por fingerprint (issue grouping).
3. Persistência de eventos e issues.
4. Dashboard web básico para listar issues, eventos e detalhes.
5. Alertas (email e webhook/Discord) para erros críticos.
6. Autenticação simples para painel administrativo.
7. Documentação e scripts para rodar localmente com Docker.

### Stack obrigatória
- **Backend:** NestJS + TypeScript
- **Banco:** PostgreSQL
- **Fila:** Redis + BullMQ (ou Bull no Nest)
- **ORM:** Prisma (preferencial)
- **Painel/Admin API:** no próprio NestJS (REST)
- **Frontend admin (MVP):** pode ser SSR simples com templates, ou Next.js separado (escolha uma abordagem e justifique)
- **Infra local:** Docker Compose
- **Qualidade:** ESLint + Prettier + testes (unit + integração)
- **Observabilidade interna:** logs estruturados + healthcheck + métricas básicas

### Requisitos funcionais detalhados
#### 1) Entidades mínimas
Modele no banco:
- `Project` (flowdesk, praxis)
- `Environment` (development, staging, production)
- `Release`
- `Issue` (agrupador)
- `Event` (ocorrência individual)
- `User` (admin)
- `AlertRule`
- `NotificationDelivery`

Inclua campos de auditoria: `createdAt`, `updatedAt`, `deletedAt` (quando fizer sentido).

#### 2) Ingestão de eventos
Criar endpoint de ingestão:
- `POST /ingest/events`

Payload mínimo:
- `projectKey`
- `environment`
- `message`
- `level` (error/warn/fatal)
- `timestamp`
- `exception` (type, value, stacktrace)
- `request` (url, method, headers sanitizados)
- `user` (id/email opcional)
- `tags` e `extra`
- `release`

Implementar:
- validação de payload com class-validator/zod
- idempotência básica opcional por hash
- fingerprint para agrupar erros em `Issue`
- rate limit por projeto
- sanitização de dados sensíveis (PII)

#### 3) Agrupamento de issues
- Estratégia inicial: hash de `exception.type + top stack frame + normalized message`.
- Se issue existente: incrementar contadores e atualizar `lastSeenAt`.
- Se nova issue: criar issue com status `open`.
- Estados da issue: `open`, `ignored`, `resolved`, `regressed`.

#### 4) Dashboard/Admin
Rotas/API para:
- listar issues por projeto/ambiente/período
- ver detalhe da issue + últimos eventos
- resolver/reabrir/ignorar issue
- filtro por `level`, `status`, `release`, `tag`

UI mínima:
- tabela de issues
- página de detalhe
- indicadores: total issues abertas, críticas últimas 24h

#### 5) Alertas
- Regras por projeto:
  - erro fatal novo
  - regressão de issue resolvida
  - spike de eventos em janela de tempo
- Canais:
  - Email (SMTP fake/local no dev)
  - Webhook (Discord/Slack genérico)
- Registrar histórico de envio e falhas.

#### 6) Segurança
- API de ingestão autenticada por `projectKey` secreto.
- Painel admin com JWT e RBAC simples (admin/viewer).
- Sanitização de PII em campos sensíveis.
- CORS e Helmet configurados.
- Limite de payload e proteção contra abuso.

#### 7) SDKs mínimos (interno)
Crie um pacote cliente simples em TypeScript com:
- captura manual: `captureException(error, context)`
- captura global para Node.js (uncaughtException/unhandledRejection)
- helper para frontend (window.onerror/unhandledrejection)
- envio assíncrono com retry simples

### Requisitos não funcionais
- Estrutura limpa por módulos Nest (`ingest`, `issues`, `events`, `alerts`, `auth`, `projects`).
- Código fortemente tipado (strict TS).
- Tratamento de erro padronizado.
- Migrações versionadas no Prisma.
- Testes:
  - unitários para fingerprint/agrupamento
  - integração para endpoint de ingestão
- CI mínima com lint + typecheck + test.

### Entregáveis esperados
1. Projeto completo com código-fonte.
2. `docker-compose.yml` com app + postgres + redis.
3. `.env.example` completo.
4. `README.md` com setup e comandos.
5. Scripts npm:
   - `dev`, `build`, `start`
   - `test`, `test:e2e`
   - `lint`, `type-check`
   - `db:migrate`, `db:seed`
6. Coleção de requests (HTTPie/curl ou Postman) para testar ingestão.

### Critérios de aceite do MVP
- Consigo subir tudo com `docker compose up` e um comando de migração.
- Consigo registrar evento de erro e vê-lo agrupado em uma issue.
- Consigo abrir painel e marcar issue como resolvida.
- Consigo receber alerta por webhook quando ocorre erro fatal.
- Testes principais passando.

### Plano de execução (a IA deve seguir)
Fase 1:
- scaffold Nest + Prisma + Docker + módulos base

Fase 2:
- ingestão + validação + persistência + agrupamento

Fase 3:
- painel/admin + auth

Fase 4:
- alertas + webhooks/email

Fase 5:
- SDK interno + testes + CI + hardening

### Restrições
- Não superengenheirar no MVP.
- Não implementar tracing distribuído avançado nesta primeira versão.
- Não criar recursos enterprise (SSO/SAML/multi-org avançado) por enquanto.

### Saída esperada da IA
- Gere primeiro a árvore de pastas.
- Depois gere os arquivos essenciais em blocos organizados.
- Explique como rodar localmente.
- Inclua exemplos reais de payload de ingestão e resposta da API.
- Finalize com checklist de validação manual.

---

## Prompt curto (alternativo)

Crie um projeto NestJS chamado ErrorPulse com PostgreSQL, Redis e BullMQ para ingestão, agrupamento e monitoramento de erros de dois projetos internos (FlowDesk e Praxis). Entregue API de ingestão, agrupamento em issues por fingerprint, painel admin básico, alertas por email/webhook, autenticação JWT para admin, SDK TS interno para frontend/backend, testes unit/integr, Docker Compose e documentação completa. Foque em MVP robusto, sem overengineering.
