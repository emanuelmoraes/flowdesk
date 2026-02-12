# 🚀 Guia Rápido de Deploy - Firebase Hosting

## ✅ Passo a Passo

### 1️⃣ Configurar Secrets no GitHub

Acesse: `https://github.com/emanuelmoraes/flowdesk/settings/secrets/actions`

Clique em **"New repository secret"** e adicione cada um:

| Nome do Secret | Valor | Onde Encontrar |
|----------------|-------|----------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Sua API Key | Firebase Console → Project Settings → General |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | seu-projeto.firebaseapp.com | Firebase Console → Project Settings → General |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | flowdesk-fa666 | Firebase Console → Project Settings → General |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | seu-projeto.appspot.com | Firebase Console → Project Settings → General |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Seu Sender ID | Firebase Console → Project Settings → General |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Seu App ID | Firebase Console → Project Settings → General |
| `FIREBASE_PROJECT_ID` | flowdesk-fa666 | Mesmo que o Project ID |

### 2️⃣ Gerar Service Account

1. Acesse: https://console.firebase.google.com/project/flowdesk-fa666/settings/serviceaccounts/adminsdk
2. Clique em **"Generate new private key"**
3. Baixe o arquivo JSON
4. Copie **TODO O CONTEÚDO** do arquivo JSON
5. No GitHub Secrets, crie: `FIREBASE_SERVICE_ACCOUNT` e cole o JSON completo

### 3️⃣ Habilitar Firebase Hosting

1. Acesse: https://console.firebase.google.com/project/flowdesk-fa666/hosting
2. Clique em **"Get started"**
3. Siga as instruções (pode pular a instalação, já está configurado)

### 4️⃣ Fazer o Primeiro Deploy

Após configurar os secrets, faça um commit:

```bash
git add .
git commit -m "Configure CI/CD for Firebase Hosting"
git push origin main
```

### 5️⃣ Acompanhar o Deploy

1. Vá em: https://github.com/emanuelmoraes/flowdesk/actions
2. Veja o workflow "Deploy to Firebase Hosting" em execução
3. Aguarde o deploy concluir (2-5 minutos)

### 6️⃣ Acessar o Site

Após o deploy, acesse:
- **URL do Firebase**: https://flowdesk-fa666.web.app
- **URL alternativa**: https://flowdesk-fa666.firebaseapp.com

---

## 🔧 Deploy Manual (Opcional)

Se preferir fazer deploy manual do seu computador:

```bash
# 1. Instalar Firebase CLI
npm install -g firebase-tools

# 2. Login no Firebase
firebase login

# 3. Build do projeto
npm run build

# 4. Deploy
firebase deploy --only hosting
```

---

## 🐛 Troubleshooting

### ❌ Erro: "Firebase project not found"
**Solução**: Verifique se o `FIREBASE_PROJECT_ID` está correto (flowdesk-fa666)

### ❌ Erro: "Permission denied"
**Solução**: Gere uma nova service account key e atualize o secret `FIREBASE_SERVICE_ACCOUNT`

### ❌ Erro: "Build failed"
**Solução**: 
1. Teste o build localmente: `npm run build`
2. Verifique se todas as variáveis de ambiente estão nos secrets
3. Confira os logs do GitHub Actions para ver o erro específico

### ❌ Página em branco após deploy
**Solução**: 
1. Verifique se o `firebase.json` está configurado corretamente
2. Certifique-se de que o `next.config.ts` tem `output: 'export'`
3. Verifique se a pasta `out` foi gerada no build

---

## 📝 Checklist Final

- [ ] Todos os 8 secrets configurados no GitHub
- [ ] Service account key gerada e adicionada
- [ ] Firebase Hosting habilitado no console
- [ ] Commit feito e push para branch main
- [ ] Workflow executado com sucesso no GitHub Actions
- [ ] Site acessível na URL do Firebase

---

## 🎉 Pronto!

Agora toda vez que você fizer push para `main`, o deploy será automático! 🚀

**Dúvidas?** Consulte o arquivo `DEPLOYMENT.md` para instruções detalhadas.
