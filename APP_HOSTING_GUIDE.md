# 🚀 Guia de Deploy - Firebase App Hosting

## ✅ Pré-requisitos

1. **Firebase CLI instalado**
```bash
npm install -g firebase-tools
```

2. **Login no Firebase**
```bash
firebase login
```

3. **Projeto Firebase no Blaze Plan** (pay-as-you-go)
   - Acesse: https://console.firebase.google.com/project/flowdesk-fa666/usage/details
   - Upgrade para Blaze Plan se necessário

---

## 📋 Passo a Passo - Deploy via Firebase Console

### 1️⃣ Acessar Firebase App Hosting

1. Vá para: https://console.firebase.google.com/project/flowdesk-fa666/apphosting
2. Clique em **"Get Started"** ou **"Add Backend"**

### 2️⃣ Conectar ao GitHub

1. Clique em **"Connect to GitHub"**
2. Autorize o Firebase a acessar seu repositório
3. Selecione: **emanuelmoraes/flowdesk**
4. Branch: **main**

### 3️⃣ Configurar o Backend

1. **Repository**: emanuelmoraes/flowdesk
2. **Branch**: main
3. **Root directory**: / (raiz do projeto)
4. **Framework**: Next.js (detectado automaticamente)

### 4️⃣ Configurar Variáveis de Ambiente (Secrets)

No console do App Hosting, adicione os seguintes secrets:

| Nome do Secret | Valor |
|----------------|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Sua API Key do Firebase |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | flowdesk-fa666.firebaseapp.com |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | flowdesk-fa666 |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | flowdesk-fa666.appspot.com |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Seu Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Seu App ID |

**Onde encontrar esses valores:**
- Firebase Console → Project Settings → General → Your apps

### 5️⃣ Deploy Inicial

1. Clique em **"Deploy"**
2. Aguarde o build (5-10 minutos)
3. Acompanhe os logs na tela

### 6️⃣ Acessar o Site

Após o deploy, seu site estará em:
```
https://flowdesk-fa666.web.app
```

---

## 🔄 Deploy Automático

Após a configuração inicial, **todo commit no branch `main`** fará deploy automático!

```bash
git add .
git commit -m "Update"
git push origin main
```

O Firebase App Hosting detecta automaticamente e faz o deploy.

---

## 🛠️ Deploy via Firebase CLI (Alternativo)

Se preferir fazer deploy pela linha de comando:

### 1. Inicializar App Hosting

```bash
firebase apphosting:backends:create flowdesk-backend \
  --location=us-central1 \
  --project=flowdesk-fa666
```

### 2. Conectar ao GitHub

```bash
firebase apphosting:backends:update flowdesk-backend \
  --repo=emanuelmoraes/flowdesk \
  --branch=main \
  --project=flowdesk-fa666
```

### 3. Deploy Manual

```bash
firebase apphosting:rollouts:create flowdesk-backend \
  --project=flowdesk-fa666
```

---

## 📊 Monitoramento

### Ver Logs
```bash
firebase apphosting:rollouts:list flowdesk-backend --project=flowdesk-fa666
```

### Ver Status
https://console.firebase.google.com/project/flowdesk-fa666/apphosting

### Métricas do Cloud Run
https://console.cloud.google.com/run?project=flowdesk-fa666

---

## 🐛 Troubleshooting

### ❌ Erro: "Project not on Blaze plan"
**Solução**: Upgrade para Blaze plan no Firebase Console

### ❌ Erro: "GitHub authorization failed"
**Solução**: 
1. Revogue permissões do Firebase no GitHub
2. Reconecte novamente

### ❌ Erro: "Build failed"
**Solução**:
1. Verifique os logs no console
2. Teste o build localmente: `npm run build`
3. Certifique-se que todas as variáveis de ambiente estão configuradas

### ❌ Página em branco
**Solução**:
1. Verifique se o `apphosting.yaml` está correto
2. Confirme que o `next.config.ts` não tem `output: 'export'`

---

## 💰 Custos Estimados

Firebase App Hosting usa:
- **Cloud Build**: ~$0.003/minuto de build
- **Cloud Run**: Cota gratuita generosa
  - 2 milhões de requisições/mês grátis
  - 360.000 GB-segundos/mês grátis
- **Cloud CDN**: ~$0.08/GB após cota gratuita

**Para um projeto pequeno/médio**: ~$0-5/mês

---

## ✅ Checklist

- [ ] Projeto no Blaze Plan
- [ ] App Hosting habilitado
- [ ] GitHub conectado
- [ ] Secrets configurados
- [ ] Deploy inicial concluído
- [ ] Site acessível
- [ ] Deploy automático funcionando

---

## 🎉 Pronto!

Agora você tem:
- ✅ Deploy automático a cada commit
- ✅ Suporte a rotas dinâmicas
- ✅ Integração total com Firebase
- ✅ CDN global
- ✅ Zero configuração de servidor

**Dúvidas?** Consulte: https://firebase.google.com/docs/app-hosting
