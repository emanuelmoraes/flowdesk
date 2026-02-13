# FlowDesk

FlowDesk é uma plataforma de gestão de projetos com Kanban, autenticação e controle de permissões por projeto.

## Documentação oficial

Para evitar duplicidade, a documentação técnica foi centralizada em `doc/`:

- Desenvolvimento: `doc/DEVELOPMENT.md`
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

## Observação

Regras e índices do Firestore devem ser gerenciados pelos arquivos versionados na raiz (`firestore.rules` e `firestore.indexes.json`), seguindo o fluxo descrito em `doc/DEPLOYMENT.md`.
