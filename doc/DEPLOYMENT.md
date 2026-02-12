# Firebase Hosting

## Configuração Inicial

### 1. Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Fazer login no Firebase

```bash
firebase login
```

### 3. Inicializar Firebase no projeto (se ainda não foi feito)

```bash
firebase init hosting
```

Selecione:
- Use existing project
- Public directory: `out`
- Configure as single-page app: `Yes`
- Set up automatic builds with GitHub: `No` (já temos o workflow)

### 4. Configurar Secrets no GitHub

Vá para o repositório no GitHub: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

Adicione os seguintes secrets:

#### Secrets do Firebase (variáveis de ambiente):
```
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
```

#### Secret do Firebase Service Account:

1. No Firebase Console, vá em `Project Settings` → `Service Accounts`
2. Clique em `Generate new private key`
3. Copie todo o conteúdo do arquivo JSON baixado
4. Crie um secret chamado `FIREBASE_SERVICE_ACCOUNT` com o conteúdo do JSON

#### Secret do Firebase Project ID:
```
FIREBASE_PROJECT_ID=seu_project_id
```

### 5. Habilitar Firebase Hosting

No Firebase Console:
1. Vá em `Build` → `Hosting`
2. Clique em `Get Started`
3. Siga as instruções para habilitar o Hosting

### 6. Ajustar Next.js para exportação estática

O arquivo `next.config.ts` precisa ser configurado para exportação estática.

## Como Funciona

1. **Push no branch main** → Dispara o workflow automaticamente
2. **Workflow executa**:
   - Instala dependências
   - Cria arquivo .env.local com secrets
   - Faz build do Next.js
   - Deploy no Firebase Hosting
3. **Deploy completo** → Site disponível na URL do Firebase

## Comandos Úteis

### Deploy manual local:
```bash
npm run build
firebase deploy --only hosting
```

### Testar localmente:
```bash
npm run build
firebase serve
```

### Ver logs do deployment:
```bash
firebase hosting:channel:list
```

## Troubleshooting

### Erro: "Firebase project not found"
- Verifique se o `FIREBASE_PROJECT_ID` secret está correto
- Certifique-se de que o projeto existe no Firebase Console

### Erro: "Permission denied"
- Verifique se o `FIREBASE_SERVICE_ACCOUNT` está correto
- Certifique-se de que a service account tem permissões de deploy

### Erro no build do Next.js
- Verifique se todas as variáveis de ambiente estão configuradas
- Teste o build localmente: `npm run build`

## URLs

Após o deploy, seu site estará disponível em:
- URL do Firebase: `https://seu-projeto-id.web.app`
- URL customizada (se configurada): `https://seu-dominio.com`

## Próximos Passos

- [ ] Configurar domínio customizado no Firebase Hosting
- [ ] Adicionar SSL certificate (automático pelo Firebase)
- [ ] Configurar preview channels para PRs
- [ ] Adicionar testes automatizados no CI/CD
