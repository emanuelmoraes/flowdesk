# FlowDesk

FlowDesk é uma plataforma de gestão de projetos com Kanban, autenticação e controle de permissões por projeto.

## Documentação oficial

Para evitar duplicidade, a documentação técnica foi centralizada em `doc/`:

- Desenvolvimento: `doc/DEVELOPMENT.md`
- Sentry (configuração e operação): `doc/SENTRY.md`
- Deploy oficial: `doc/DEPLOYMENT.md`
- Guia detalhado de App Hosting: `doc/APP_HOSTING_GUIDE.md`
- Plano de evolução: `doc/melhorias.md`

## Setup rápido

1. Instalar dependências
```bash
npm install
```

2. Configurar ambiente local
```bash
cp .env.local.example .env.local
```

3. Rodar em desenvolvimento
```bash
npm run dev
```

## Scripts principais

- `npm run dev`
- `npm run test`
- `npm run test:coverage`
- `npm run build`
- `npm run lint`
- `npm run type-check`

## Configuração do Sentry

Para habilitar monitoramento de erros no projeto:

1. Instale as dependências (caso ainda não tenha feito):
```bash
npm install
```

2. Configure as variáveis no `.env.local`:
```env
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=

# opcionais (tuning de amostragem)
SENTRY_TRACES_SAMPLE_RATE=
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=
SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=
SENTRY_REPLAYS_SESSION_SAMPLE_RATE=

# opcionais (necessárias para upload de sourcemaps em build/release)
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

3. Execute o projeto/build normalmente:
```bash
npm run dev
# ou
npm run build
```

### Como validar rapidamente

- No browser (app rodando), dispare um erro no console:
```js
setTimeout(() => {
	throw new Error('Sentry smoke test - client');
}, 0);
```
- Verifique no painel do Sentry se o evento foi recebido.

### Observações

- Sem `NEXT_PUBLIC_SENTRY_DSN` (client) e/ou `SENTRY_DSN` (server/edge), a integração correspondente fica desabilitada.
- `SENTRY_ORG`, `SENTRY_PROJECT` e `SENTRY_AUTH_TOKEN` são usados no pipeline de build para upload de sourcemaps (recomendado para produção).

## Observação

Regras e índices do Firestore devem ser gerenciados pelos arquivos versionados na raiz (`firestore.rules` e `firestore.indexes.json`), seguindo o fluxo descrito em `doc/DEPLOYMENT.md`.
