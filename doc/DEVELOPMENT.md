# Guia de Desenvolvimento — FlowDesk

Este documento é a referência oficial de desenvolvimento local.

## Estado atual (Fev/2026)

- Autenticação Firebase com email/senha ativa
- Papéis de usuário (`user`, `manager`, `admin`) em uso
- Regras de Firestore de produção versionadas em `firestore.rules`
- Hooks principais de projeto/tickets em modo real-time (`onSnapshot`)
- Convenção de estado otimista + rollback aplicada nos fluxos críticos de Kanban
- Base de testes com Vitest ativa

## Pré-requisitos

- Node.js 20+
- npm 10+
- Projeto Firebase configurado

## Setup local

1. Instalar dependências
```bash
npm install
```

2. Criar arquivo de ambiente local
```bash
cp .env.local.example .env.local
```

3. Preencher variáveis Firebase no `.env.local`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

4. (Opcional) Configurar Sentry no `.env.local`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ENVIRONMENT` (ex.: `development`, `staging`, `production`)
- `NEXT_PUBLIC_SENTRY_ENVIRONMENT`
- `SENTRY_ORG` (opcional, para sourcemaps em build)
- `SENTRY_PROJECT` (opcional, para sourcemaps em build)
- `SENTRY_AUTH_TOKEN` (opcional, para sourcemaps em build)

Para detalhes de cada variável e exemplos completos por ambiente, consulte `doc/SENTRY.md`.

5. Rodar aplicação
```bash
npm run dev
```

### Validação rápida do Sentry

Com a aplicação rodando, abra o console do navegador e execute:

```js
setTimeout(() => {
  throw new Error('Sentry smoke test - client');
}, 0);
```

Depois confirme no painel do Sentry se o evento foi recebido.

## Qualidade de engenharia

- Testes unitários:
```bash
npm run test
```

- Cobertura (áreas críticas):
```bash
npm run test:coverage
```

- Lint:
```bash
npm run lint
```

- Type-check:
```bash
npm run type-check
```

- Build:
```bash
npm run build
```

## Convenções aplicadas

- Mensagens de erro padronizadas em `src/lib/errorHandling.ts`
- Operações otimistas com rollback em `src/lib/optimistic.ts`
- Serviços centralizados em `src/lib/services.ts`
- Operações em Firestore sempre com `serverTimestamp()` no cliente

## Segurança e dados

- Não usar regras abertas no Firestore
- Não documentar ou commitar credenciais reais
- Alterações em regras/índices devem ser feitas via arquivos versionados:
  - `firestore.rules`
  - `firestore.indexes.json`

## Referências relacionadas

- Deploy oficial: `doc/DEPLOYMENT.md`
- Guia detalhado App Hosting: `doc/APP_HOSTING_GUIDE.md`
- Roadmap e progresso: `doc/melhorias.md`
