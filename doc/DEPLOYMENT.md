# Deploy Oficial — Firebase App Hosting

Este projeto adota **Firebase App Hosting** como estratégia oficial de deploy.

## Motivo da decisão

- Compatível com Next.js App Router sem exportação estática
- Suporte nativo a rotas dinâmicas e SSR
- Integração direta com `apphosting.yaml` já existente no repositório

## Pré-requisitos

1. `firebase-tools` instalado
```bash
npm install -g firebase-tools
```

2. Login no Firebase
```bash
firebase login
```

3. Projeto no Blaze Plan

## Configuração inicial

### 1) Habilitar App Hosting no Firebase Console

- Acesse o painel do projeto em `Build > App Hosting`
- Crie o backend e conecte ao repositório

### 2) Conectar GitHub

- Repositório: `emanuelmoraes/flowdesk`
- Branch: `main`
- Root directory: `/`

### 3) Configurar secrets (App Hosting)

Variáveis obrigatórias:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Obs.: o mapeamento dessas variáveis já está definido em `apphosting.yaml`.

## Fluxo de deploy

- Push/merge na `main` dispara deploy automático no App Hosting
- O serviço executa build e publica nova revisão

## Ambientes separados (dev/staging/prod)

O repositório agora possui workflow dedicado para deploy por ambiente em `.github/workflows/deploy-apphosting.yml`.

Mapeamento padrão:

- `develop` -> environment `development`
- `staging` -> environment `staging`
- `main` -> environment `production`

Cada environment do GitHub deve ter variáveis e segredo próprios (isolamento):

- **Variables**
	- `FIREBASE_PROJECT_ID`
	- `APPHOSTING_BACKEND`
- **Secrets**
	- `FIREBASE_TOKEN`

Recomendação: usar um projeto Firebase por ambiente (ex.: `flowdesk-dev`, `flowdesk-staging`, `flowdesk-prod`) e configurar os mesmos nomes de secrets do `apphosting.yaml` em cada projeto.

## Comandos úteis (CLI)

Criar backend:
```bash
firebase apphosting:backends:create flowdesk-backend --location=us-central1 --project=flowdesk-fa666
```

Atualizar conexão com repositório:
```bash
firebase apphosting:backends:update flowdesk-backend --repo=emanuelmoraes/flowdesk --branch=main --project=flowdesk-fa666
```

Criar rollout manual:
```bash
firebase apphosting:rollouts:create flowdesk-backend --project=flowdesk-fa666
```

## Troubleshooting rápido

### Build falhou

- Validar variáveis de ambiente no App Hosting
- Executar `npm run build` localmente

### Erro de autorização no GitHub

- Revogar e reconectar a integração GitHub no Firebase

### Projeto não está no Blaze

- Atualizar plano do projeto para Blaze no Firebase Console

## Referências

- Guia detalhado: `doc/APP_HOSTING_GUIDE.md`
- Config de runtime/env: `apphosting.yaml`

## Checklist de Readiness para Produção

Use este checklist antes de cada lançamento relevante.

### Segurança

- [ ] Regras do Firestore publicadas e sem permissões abertas
- [ ] Papéis (`user`, `manager`, `admin`) validados em cenário real
- [ ] Campos temporais persistidos como `Timestamp` (`serverTimestamp`)
- [ ] Secrets revisados no App Hosting (sem valores expostos em repositório)

### Qualidade

- [ ] `npm run build` executa sem erro localmente
- [ ] Fluxos críticos validados: login, criar projeto, criar/editar/mover ticket
- [ ] Erros de permissão tratados com mensagem amigável na interface

### Dados e performance

- [ ] Índices Firestore aplicados e sincronizados com `firestore.indexes.json`
- [ ] Reordenação de tickets validada com atualização em lote atômica
- [ ] Queries principais com ordenação no servidor (sem varredura desnecessária)

### Deploy e operação

- [ ] Backends de App Hosting conectados às branches corretas (`develop`, `staging`, `main`)
- [ ] Deploy automático testado após merge
- [ ] Rollout manual de contingência validado (CLI)
- [ ] Observabilidade mínima ativa (logs e monitoramento de falhas)

### Go/No-Go

- [ ] Critérios acima aprovados pelo responsável técnico
- [ ] Release aprovada para produção
