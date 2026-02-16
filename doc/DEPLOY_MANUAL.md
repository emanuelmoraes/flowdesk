# Deploy Manual — Firebase App Hosting (FlowDesk)

Este guia cobre **somente deploy manual** para quando o backend App Hosting já existe e você quer publicar uma nova versão sob demanda.

> Nota técnica: no App Hosting, publicar via CLI usa rollout (`apphosting:rollouts:create`). Se você não quiser executar esse comando manualmente, use as opções de deploy por integração Git/GitHub abaixo.

## 1) Quando usar este guia

Use deploy manual quando você precisar:

- Publicar uma correção urgente sem esperar o fluxo automático
- Publicar um commit específico
- Reexecutar publicação após ajuste de variável/secrets
- Fazer rollback rápido para um commit estável

## 2) Pré-requisitos

1. Firebase CLI instalado

```bash
npm install -g firebase-tools
```

2. Login ativo

```bash
firebase login
```

3. Projeto e backend existentes no Firebase App Hosting
4. Permissão no projeto Firebase (Editor ou Owner)

## 3) Contexto do projeto atual

No projeto `flowdesk-fa666`, o backend identificado é `flowdesk`.

Comando para listar e confirmar:

```bash
firebase apphosting:backends:list -P flowdesk-fa666
```

> Importante: o nome do backend para comandos de rollout é o valor da coluna **Backend** (ex.: `flowdesk`).

## 4) Fluxo recomendado de deploy manual

### Passo 1 — Garantir projeto ativo

```bash
firebase use flowdesk-fa666
```

Alternativa sem `firebase use`: passar `-P flowdesk-fa666` em todos os comandos.

### Passo 2 — Validar qualidade local antes do deploy

```bash
npm run lint
npm run type-check
npm run test
npm run build
```

### Passo 3 — Criar rollout manual

#### Opção A: Deploy pela branch

```bash
firebase apphosting:rollouts:create flowdesk -b main -P flowdesk-fa666 -f
```

- `flowdesk`: backend App Hosting
- `-b main`: branch a ser publicada
- `-f`: pula confirmação interativa

#### Opção B: Deploy por commit específico

```bash
firebase apphosting:rollouts:create flowdesk -g <SHA_DO_COMMIT> -P flowdesk-fa666 -f
```

Use esta opção para publicar exatamente um commit já validado.

### Passo 4 — Verificar se atualizou

```bash
firebase apphosting:backends:get flowdesk -P flowdesk-fa666
```

Valide o campo **Updated Date** e teste a aplicação publicada.

URL atual do backend:

- `https://flowdesk--flowdesk-fa666.us-east4.hosted.app`

## 5) Rollback rápido (contingência)

Se a versão atual apresentou problema, publique o último commit estável:

```bash
firebase apphosting:rollouts:create flowdesk -g <SHA_ESTAVEL> -P flowdesk-fa666 -f
```

Depois, valide novamente:

```bash
firebase apphosting:backends:get flowdesk -P flowdesk-fa666
```

## 6) Deploy sem comando de rollout (alternativas práticas)

Se o objetivo é **não rodar** `apphosting:rollouts:create` manualmente no terminal, use um destes caminhos:

### Opção A: Deploy por push na branch conectada

Quando o backend está conectado ao GitHub no Firebase Console, um push na branch configurada dispara build/deploy automático.

```bash
git checkout main
git pull
git add .
git commit -m "chore: deploy manual para testes"
git push origin main
```

Após o push, acompanhe no Firebase Console (App Hosting) até o término da publicação.

### Opção B: Disparar workflow de deploy do GitHub

Se você já usa o workflow `.github/workflows/deploy-apphosting.yml`, pode disparar manualmente:

```bash
gh workflow run deploy-apphosting.yml --ref main
gh run watch
```

Esse caminho evita rollout manual no seu terminal e mantém o mesmo padrão de qualidade (lint, type-check, test, build) do pipeline.

### Opção C: Redeploy sem novo commit (GitHub UI)

Na aba **Actions** do GitHub:

1. Abra o workflow **Deploy App Hosting**
2. Clique em **Run workflow**
3. Selecione a branch (`main`, `staging` ou `develop`)
4. Execute

## 7) Limitação importante (App Hosting)

No CLI atual, não existe comando de publicação direta do App Hosting que não envolva rollout no backend. As alternativas “sem rollout” acima significam apenas **sem executar rollout manualmente por você**; o deploy continuará sendo aplicado pelo mecanismo de rollout no serviço.

## 8) Erros comuns e correções

### Erro: `unknown option '--repo=...'`

Causa: comando desatualizado (`apphosting:backends:update --repo --branch`) não é suportado na versão atual do CLI.

Correção: usar `apphosting:rollouts:create` para publicar manualmente.

### Erro: backend não encontrado

- Confira o backend real com `apphosting:backends:list`
- Use exatamente o nome da coluna **Backend**

### Erro de permissão/autorização

- Refaça login: `firebase login`
- Confirme projeto correto: `firebase use flowdesk-fa666`
- Verifique permissão no projeto Firebase

### Build/deploy não reflete mudanças esperadas

- Verifique se branch/commit informado é o correto
- Refaça rollout por commit fixo (`-g`) para eliminar dúvida de referência

## 9) Sobre conexão com GitHub (repo/branch)

A configuração de conexão de repositório/branch do backend deve ser feita no **Firebase Console** (App Hosting), não via `apphosting:backends:update` na versão atual do CLI.

## 10) Comandos de referência (copiar e colar)

```bash
# Listar backends
firebase apphosting:backends:list -P flowdesk-fa666

# Ver backend específico
firebase apphosting:backends:get flowdesk -P flowdesk-fa666

# Deploy manual pela branch main
firebase apphosting:rollouts:create flowdesk -b main -P flowdesk-fa666 -f

# Deploy manual por commit
firebase apphosting:rollouts:create flowdesk -g <SHA_DO_COMMIT> -P flowdesk-fa666 -f

# Deploy sem rollout manual (via GitHub Actions)
gh workflow run deploy-apphosting.yml --ref main
gh run watch
```

## 11) Checklist de execução manual

- [ ] Estou no projeto correto (`flowdesk-fa666`)
- [ ] Backend correto identificado (`flowdesk`)
- [ ] Qualidade local validada (`lint`, `type-check`, `test`, `build`)
- [ ] Rollout criado com branch ou commit correto
- [ ] Backend atualizado (Updated Date) e aplicação testada
- [ ] Plano de rollback pronto (SHA estável definido)
