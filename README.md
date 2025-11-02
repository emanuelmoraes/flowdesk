# FlowDesk 📋

Sistema de gerenciamento de projetos com Kanban drag-and-drop, onde cada projeto tem sua própria URL dedicada.

## 🚀 Tecnologias

- **Next.js 16** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Firebase** - Backend (Firestore + Authentication)
- **Tailwind CSS** - Estilização
- **@dnd-kit** - Drag and drop para o Kanban

## 📋 Funcionalidades

- ✅ Criação de projetos com URL dedicada (`flowdesk.com/seu-projeto`)
- ✅ Visualização Kanban com drag-and-drop
- ✅ Gestão de tickets com prioridades e status
- ✅ Interface responsiva e moderna
- 🔄 Sincronização em tempo real (próxima versão)
- 👥 Autenticação de usuários (próxima versão)

## 🛠️ Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Ative o **Firestore Database**
3. Copie as credenciais do Firebase
4. Crie o arquivo `.env.local` na raiz do projeto:

```bash
cp .env.local.example .env.local
```

5. Edite `.env.local` e adicione suas credenciais:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
```

### 3. Configurar regras do Firestore

No Firebase Console, vá em **Firestore Database > Rules** e adicione:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Projetos
    match /projects/{projectId} {
      allow read: if true;
      allow write: if true; // Temporário - adicionar autenticação depois
    }
    
    // Tickets
    match /tickets/{ticketId} {
      allow read: if true;
      allow write: if true; // Temporário - adicionar autenticação depois
    }
  }
}
```

⚠️ **Nota**: As regras acima são temporárias para desenvolvimento. Implemente autenticação antes de ir para produção!

### 4. Rodar o projeto

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── [projectSlug]/      # Rota dinâmica para projetos
│   │   └── page.tsx         # Página do Kanban
│   ├── criar-projeto/       # Página de criação de projeto
│   │   └── page.tsx
│   ├── page.tsx             # Home
│   └── layout.tsx
├── components/
│   ├── KanbanBoard.tsx      # Board completo com DnD
│   ├── KanbanColumn.tsx     # Coluna do Kanban
│   └── TicketCard.tsx       # Card individual do ticket
├── hooks/
│   └── useProject.ts        # Hooks para buscar dados
├── lib/
│   ├── firebase.ts          # Config do Firebase
│   └── services.ts          # Funções CRUD
└── types/
    └── index.ts             # TypeScript interfaces
```

## 🎯 Como Usar

### Criar um Projeto

1. Acesse a home e clique em "Criar Meu Primeiro Projeto"
2. Preencha o nome e slug do projeto
3. O slug será usado na URL: `flowdesk.com/seu-slug`

### Gerenciar Tickets

1. Acesse seu projeto via URL: `http://localhost:3000/seu-slug`
2. Clique em "+ Novo Ticket"
3. Preencha título, descrição, status e prioridade
4. Arraste e solte os tickets entre as colunas

### Colunas do Kanban

- **Backlog**: Ideias e tickets futuros
- **A Fazer**: Pronto para começar
- **Em Progresso**: Sendo trabalhado
- **Em Revisão**: Aguardando revisão
- **Concluído**: Finalizado

## 🔄 Próximos Passos

- [ ] Implementar autenticação Firebase Auth
- [ ] Adicionar sincronização em tempo real (onSnapshot)
- [ ] Sistema de membros e permissões
- [ ] Edição de tickets existentes
- [ ] Filtros e busca de tickets
- [ ] Dark mode
- [ ] Exportação de dados
- [ ] Notificações

## 📝 Estrutura do Banco de Dados

### Collection: `projects`
```typescript
{
  id: string,
  name: string,
  slug: string,
  description?: string,
  ownerId: string,
  members: string[],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Collection: `tickets`
```typescript
{
  id: string,
  title: string,
  description?: string,
  status: 'backlog' | 'todo' | 'in-progress' | 'review' | 'done',
  priority: 'low' | 'medium' | 'high' | 'urgent',
  projectId: string,
  assignee?: string,
  order: number,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## 🤝 Contribuindo

Este é um projeto em desenvolvimento inicial. Sinta-se livre para sugerir melhorias!

## 📄 Licença

Este projeto está sob a licença especificada no arquivo LICENSE.

---

**Desenvolvido com ❤️ usando Next.js e Firebase**
