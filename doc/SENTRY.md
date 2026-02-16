# Guia do Sentry — FlowDesk

Este documento explica como configurar, validar e operar o Sentry no projeto.

## O que já está instrumentado

- Captura global de erro da aplicação (App Router)
- Captura de exceções em rotas API críticas (`billing` e `invitations`)
- Captura automática via `logger.error(...)`
- Tags de ownership para triagem (`owner_area` e `owner_team`)

## Variáveis de ambiente

### Obrigatórias para captura de erros

| Variável | Onde usa | Para que serve | Exemplo |
|---|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Browser (client) | Envia erros do frontend para o Sentry | `https://abc123@o000.ingest.sentry.io/111111` |
| `SENTRY_DSN` | Server/Edge | Envia erros de API e runtime server/edge | `https://abc123@o000.ingest.sentry.io/222222` |
| `SENTRY_ENVIRONMENT` | Server/Edge | Nome do ambiente para segmentar eventos | `development`, `staging`, `production` |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Browser (client) | Mesmo conceito do ambiente, no client | `development` |

### Recomendadas

| Variável | Para que serve | Exemplo |
|---|---|---|
| `SENTRY_RELEASE` | Agrupa eventos por versão/release (facilita regressão) | `flowdesk@2026.02.16+sha.abc123` |

### Opcionais de amostragem (performance/replay)

| Variável | Intervalo | Para que serve | Exemplo |
|---|---|---|---|
| `SENTRY_TRACES_SAMPLE_RATE` | `0.0` a `1.0` | Taxa de tracing no server/edge | `0.1` |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | `0.0` a `1.0` | Taxa de tracing no client | `0.1` |
| `SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` | `0.0` a `1.0` | Replay apenas em sessões com erro | `0.2` |
| `SENTRY_REPLAYS_SESSION_SAMPLE_RATE` | `0.0` a `1.0` | Replay de sessões gerais | `0.0` |

### Opcionais para sourcemaps no build/deploy

| Variável | Para que serve | Exemplo |
|---|---|---|
| `SENTRY_ORG` | Organização no Sentry para upload de sourcemap | `minha-org` |
| `SENTRY_PROJECT` | Projeto no Sentry para upload de sourcemap | `flowdesk-web` |
| `SENTRY_AUTH_TOKEN` | Token com permissão de release/upload | `sntrys_xxxxxxxxx` |

## Exemplos prontos de configuração

### Exemplo 1: ambiente local (mínimo)

```env
NEXT_PUBLIC_SENTRY_DSN=https://abc123@o000.ingest.sentry.io/111111
SENTRY_DSN=https://abc123@o000.ingest.sentry.io/222222
SENTRY_ENVIRONMENT=development
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=flowdesk@local
```

### Exemplo 2: staging (com tracing)

```env
NEXT_PUBLIC_SENTRY_DSN=https://abc123@o000.ingest.sentry.io/111111
SENTRY_DSN=https://abc123@o000.ingest.sentry.io/222222
SENTRY_ENVIRONMENT=staging
NEXT_PUBLIC_SENTRY_ENVIRONMENT=staging
SENTRY_RELEASE=flowdesk@2026.02.16-rc.1
SENTRY_TRACES_SAMPLE_RATE=0.2
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.2
SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=0.2
SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.0
```

### Exemplo 3: produção (com sourcemaps)

```env
NEXT_PUBLIC_SENTRY_DSN=https://abc123@o000.ingest.sentry.io/111111
SENTRY_DSN=https://abc123@o000.ingest.sentry.io/222222
SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=flowdesk@2026.02.16+sha.abc123
SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=0.1
SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.0
SENTRY_ORG=minha-org
SENTRY_PROJECT=flowdesk-web
SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxx
```

## Como validar se está funcionando

### 1) Erro no frontend

Com a aplicação rodando, execute no console do navegador:

```js
setTimeout(() => {
  throw new Error('Sentry smoke test - client');
}, 0);
```

### 2) Erro no backend/API

- Gere uma chamada para uma rota instrumentada com payload inválido.
- Confirme no Sentry se o evento chegou com tags:
  - `flowdesk_area: api`
  - `owner_area` (ex.: `billing`)
  - `owner_team` (ex.: `growth`)

### 3) Erro via logger

Qualquer `logger.error(...)` também envia evento para o Sentry, mantendo o log no Firestore.

## Como ler as tags de ownership

As tags ajudam na triagem e no roteamento de alerta:

- `owner_area`: domínio técnico/funcional (`billing`, `invitations`, `projects`, `auth`, `platform`)
- `owner_team`: time responsável (`growth`, `core-collaboration`, `core-workspace`, `core-auth`, `platform`)

Exemplos de filtros úteis no Sentry:

- `tags.owner_team:growth`
- `tags.owner_area:billing`
- `tags.flowdesk_area:api`

## Problemas comuns

- **Evento não chega no Sentry:** verifique DSN e ambiente no `.env.local`.
- **Erro server sem stack legível em produção:** confirme `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` no pipeline de build.
- **Volume alto de eventos:** reduza `SENTRY_TRACES_SAMPLE_RATE` e mantenha replay de sessão geral em `0.0`.

## Checklist rápido

- `.env.local` preenchido com DSNs corretos
- Ambiente (`SENTRY_ENVIRONMENT`) configurado
- Release (`SENTRY_RELEASE`) no deploy
- Smoke test client validado
- Filtros por `owner_area`/`owner_team` funcionando no dashboard
