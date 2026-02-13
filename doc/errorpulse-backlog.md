# ErrorPulse — Backlog Técnico Executável

## Objetivo
Planejar a execução do projeto ErrorPulse (uso interno para FlowDesk e Praxis) em etapas pequenas, com critérios de aceite claros e baixo risco.

## Premissas
- Stack alvo: NestJS + PostgreSQL + Redis/BullMQ + Prisma.
- Escopo inicial: monitoramento de erros (não incluir tracing distribuído avançado no MVP).
- Execução futura (este documento é planejamento).

---

## Milestone 0 — Fundação do projeto

### Epic 0.1 — Bootstrap e estrutura
- [ ] Criar repositório base com NestJS (TypeScript strict).
- [ ] Definir estrutura modular (`auth`, `projects`, `ingest`, `issues`, `events`, `alerts`, `health`).
- [ ] Configurar ESLint + Prettier + scripts de qualidade.

**Critérios de aceite**
- App sobe em dev sem erros.
- `lint`, `type-check` e `test` executam localmente.

### Epic 0.2 — Infra local
- [ ] Criar `docker-compose` com `postgres`, `redis` e app.
- [ ] Criar `.env.example` com todas as variáveis obrigatórias.
- [ ] Adicionar health endpoints (`/health/live`, `/health/ready`).

**Critérios de aceite**
- `docker compose up` sobe tudo.
- Healthcheck retorna status OK com dependências disponíveis.

---

## Milestone 1 — Modelo de dados e persistência

### Epic 1.1 — Modelagem Prisma
- [ ] Modelar entidades: `Project`, `Environment`, `Release`, `Issue`, `Event`, `User`, `AlertRule`, `NotificationDelivery`.
- [ ] Incluir auditoria (`createdAt`, `updatedAt`, `deletedAt` quando aplicável).
- [ ] Definir índices essenciais (busca por projeto/ambiente/status/lastSeenAt).

**Critérios de aceite**
- Migração Prisma aplicada sem erro.
- Seed com projetos `flowdesk` e `praxis` disponível.

### Epic 1.2 — Repositórios/serviços
- [ ] Criar camada de acesso a dados por módulo.
- [ ] Adicionar testes unitários de regras de persistência críticas.

**Critérios de aceite**
- Criação/leitura de `Issue` e `Event` cobertas por testes.

---

## Milestone 2 — Ingestão de eventos

### Epic 2.1 — Endpoint de ingest
- [ ] Implementar `POST /ingest/events`.
- [ ] Validar payload (schema com class-validator ou Zod).
- [ ] Autenticar por `projectKey`.
- [ ] Aplicar limite de payload e rate limit por projeto.

**Critérios de aceite**
- Requisição válida gera evento persistido.
- Requisição inválida retorna erro padronizado.

### Epic 2.2 — Sanitização e segurança
- [ ] Remover/mascarar dados sensíveis (headers, tokens, cookies, PII comum).
- [ ] Definir lista de campos proibidos para persistência.

**Critérios de aceite**
- Nenhum segredo aparece em payload persistido nos testes.

---

## Milestone 3 — Agrupamento de issues

### Epic 3.1 — Fingerprint e deduplicação
- [ ] Implementar cálculo de fingerprint: `exception.type + top frame + normalized message`.
- [ ] Criar lógica de upsert de issue por fingerprint.
- [ ] Atualizar contadores e `firstSeenAt/lastSeenAt`.

**Critérios de aceite**
- Eventos semelhantes agrupam na mesma issue.
- Eventos diferentes criam issues distintas.

### Epic 3.2 — Ciclo de vida
- [ ] Estados: `open`, `ignored`, `resolved`, `regressed`.
- [ ] Regra de regressão ao receber novo evento de issue resolvida.

**Critérios de aceite**
- Transições de estado validadas por testes.

---

## Milestone 4 — Processamento assíncrono

### Epic 4.1 — Fila de processamento
- [ ] Enfileirar processamento pós-ingest (BullMQ/Bull).
- [ ] Separar ingest síncrono (rápido) de processamento pesado.
- [ ] Implementar retry com backoff e dead-letter strategy.

**Critérios de aceite**
- Endpoint responde rápido e processamento ocorre via worker.
- Falhas transitórias são reprocessadas automaticamente.

---

## Milestone 5 — API administrativa

### Epic 5.1 — Auth e RBAC
- [ ] Implementar autenticação JWT para admin.
- [ ] Perfis mínimos: `admin`, `viewer`.

**Critérios de aceite**
- Endpoints sensíveis protegidos e testados.

### Epic 5.2 — Endpoints de gestão
- [ ] Listar issues por filtros (`project`, `env`, `status`, `level`, período).
- [ ] Exibir detalhe da issue com eventos recentes.
- [ ] Ações: resolver, ignorar, reabrir.

**Critérios de aceite**
- Fluxo completo de leitura e mudança de estado disponível por API.

---

## Milestone 6 — Dashboard MVP

### Epic 6.1 — Interface mínima
- [ ] Tela de listagem de issues.
- [ ] Tela de detalhe com stacktrace e contexto.
- [ ] KPIs: abertas, críticas 24h, regressões.

**Critérios de aceite**
- Operação básica possível sem usar ferramenta externa.

---

## Milestone 7 — Alertas

### Epic 7.1 — Regras
- [ ] Regra: erro fatal novo.
- [ ] Regra: regressão de issue.
- [ ] Regra: spike por janela de tempo.

### Epic 7.2 — Canais
- [ ] Envio por webhook (Discord/Slack genérico).
- [ ] Envio por email (SMTP configurável).
- [ ] Registrar entregas em `NotificationDelivery`.

**Critérios de aceite**
- Pelo menos 1 alerta real entregue por webhook em ambiente local/teste.

---

## Milestone 8 — SDK interno

### Epic 8.1 — SDK TypeScript
- [ ] `captureException(error, context)`.
- [ ] Captura global Node (`uncaughtException`, `unhandledRejection`).
- [ ] Captura global browser (`window.onerror`, `unhandledrejection`).
- [ ] Retry simples e envio assíncrono.

**Critérios de aceite**
- FlowDesk e Praxis conseguem enviar eventos com integração mínima.

---

## Milestone 9 — Qualidade e operação

### Epic 9.1 — Testes
- [ ] Unitários para fingerprint, transições de issue e sanitização.
- [ ] Integração para ingest e workflow principal.

### Epic 9.2 — CI
- [ ] Pipeline com `lint`, `type-check`, `test`, `build`.

### Epic 9.3 — Runbook
- [ ] Guia de operação local e troubleshooting básico.
- [ ] Política inicial de retenção e limpeza de eventos antigos.

**Critérios de aceite**
- Projeto pronto para uso contínuo interno com validação automática.

---

## Priorização recomendada (ordem)
1. Milestones 0, 1, 2
2. Milestones 3 e 4
3. Milestones 5 e 6
4. Milestone 7
5. Milestones 8 e 9

---

## Definição de pronto do MVP
- [ ] Ingest funcionando para FlowDesk e Praxis.
- [ ] Issues agrupadas corretamente com estados.
- [ ] Dashboard básico operacional.
- [ ] Alertas críticos entregues por webhook.
- [ ] Qualidade mínima automatizada no CI.

---

## Pós-MVP (não iniciar agora)
- Source maps avançados e symbolication robusta.
- Session replay.
- Tracing distribuído completo.
- Multi-organização avançada e billing.
