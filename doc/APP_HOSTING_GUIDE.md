# Guia Detalhado — Firebase App Hosting

Este documento complementa `doc/DEPLOYMENT.md`.
A estratégia oficial de deploy e ambientes está centralizada em `doc/DEPLOYMENT.md`.

## Objetivo deste guia

- Fornecer passo a passo operacional no Firebase Console
- Mostrar comandos úteis da CLI para diagnóstico e rollout manual
- Evitar repetir regras de processo já descritas no guia oficial

## Setup inicial no Firebase Console

1. Acesse `Build > App Hosting`
2. Crie (ou selecione) backend
3. Conecte o repositório `emanuelmoraes/flowdesk`
4. Configure branch/backends conforme o mapeamento oficial:
   - `develop` → `development`
   - `staging` → `staging`
   - `main` → `production`

## Secrets esperados no App Hosting

Os nomes mapeados no `apphosting.yaml` são:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Comandos CLI úteis

Criar backend:
```bash
firebase apphosting:backends:create flowdesk-backend --location=us-central1 --project=<project-id>
```

Atualizar conexão do backend:
```bash
firebase apphosting:backends:update flowdesk-backend --repo=emanuelmoraes/flowdesk --branch=main --project=<project-id>
```

Criar rollout manual:
```bash
firebase apphosting:rollouts:create flowdesk-backend --project=<project-id>
```

Listar rollouts:
```bash
firebase apphosting:rollouts:list flowdesk-backend --project=<project-id>
```

## Troubleshooting rápido

### Build falhou

- Validar variáveis de ambiente no App Hosting
- Rodar localmente: `npm run build`
- Verificar logs do rollout no Console

### Problemas de integração com GitHub

- Revogar e reconectar autorização no Firebase Console
- Confirmar branch correta ligada ao backend

### Deploy não refletiu mudanças

- Confirmar que o commit foi para a branch esperada
- Criar rollout manual para forçar publicação

## Observação

Não fixe URLs finais neste documento, pois o domínio pode variar por backend/ambiente.
Use sempre os links exibidos no Console do App Hosting.
