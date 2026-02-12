# Guia de Desenvolvimento - FlowDesk

## 🎯 Próximas Implementações Recomendadas

### 1. Autenticação Firebase (Alta Prioridade)
- Implementar Firebase Authentication
- Criar contexto de autenticação global
- Adicionar login com Google/Email
- Proteger rotas privadas
- Associar projetos aos usuários autenticados

### 2. Sincronização em Tempo Real
- Substituir `getDocs` por `onSnapshot` no Firestore
- Atualizar automaticamente quando outros usuários fizerem mudanças
- Adicionar indicadores de usuários online

### 3. Edição de Tickets
- Modal de edição de tickets existentes
- Permitir alterar todos os campos
- Histórico de alterações

### 4. Gestão de Membros
- Adicionar/remover membros do projeto
- Sistema de permissões (owner, admin, member, viewer)
- Atribuir tickets a membros específicos

### 5. Melhorias de UX
- Busca e filtros de tickets
- Ordenação personalizada
- Tags/Labels customizáveis
- Comentários nos tickets
- Anexos de arquivos

## 🔒 Segurança

### Regras do Firestore (Produção)

Substitua as regras temporárias por estas quando implementar autenticação:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Função auxiliar para verificar se usuário é membro
    function isMember(projectId) {
      return request.auth != null && 
             request.auth.uid in get(/databases/$(database)/documents/projects/$(projectId)).data.members;
    }
    
    // Função auxiliar para verificar se usuário é owner
    function isOwner(projectId) {
      return request.auth != null && 
             request.auth.uid == get(/databases/$(database)/documents/projects/$(projectId)).data.ownerId;
    }
    
    // Projetos
    match /projects/{projectId} {
      // Qualquer um autenticado pode ler (para permitir descoberta)
      allow read: if request.auth != null;
      
      // Apenas usuário autenticado pode criar (e será o owner)
      allow create: if request.auth != null && 
                      request.resource.data.ownerId == request.auth.uid;
      
      // Apenas owner pode atualizar
      allow update: if isOwner(projectId);
      
      // Apenas owner pode deletar
      allow delete: if isOwner(projectId);
    }
    
    // Tickets
    match /tickets/{ticketId} {
      // Apenas membros do projeto podem ler
      allow read: if isMember(resource.data.projectId);
      
      // Apenas membros podem criar tickets
      allow create: if request.auth != null && 
                      isMember(request.resource.data.projectId);
      
      // Apenas membros podem atualizar
      allow update: if isMember(resource.data.projectId);
      
      // Apenas membros podem deletar
      allow delete: if isMember(resource.data.projectId);
    }
    
    // Usuários
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🏗️ Arquitetura de Componentes

### Estado Global (Recomendado)
Considere implementar um gerenciador de estado global:

**Opção 1: Context API + useReducer**
- Simples e nativo do React
- Bom para aplicações pequenas/médias

**Opção 2: Zustand**
- Leve e moderno
- Recomendado para este projeto

```bash
npm install zustand
```

Exemplo de store:
```typescript
// src/store/useProjectStore.ts
import { create } from 'zustand';

interface ProjectStore {
  currentProject: Project | null;
  tickets: Ticket[];
  setProject: (project: Project) => void;
  setTickets: (tickets: Ticket[]) => void;
  addTicket: (ticket: Ticket) => void;
  updateTicket: (id: string, updates: Partial<Ticket>) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  currentProject: null,
  tickets: [],
  setProject: (project) => set({ currentProject: project }),
  setTickets: (tickets) => set({ tickets }),
  addTicket: (ticket) => set((state) => ({ 
    tickets: [...state.tickets, ticket] 
  })),
  updateTicket: (id, updates) => set((state) => ({
    tickets: state.tickets.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
}));
```

## 📊 Otimizações de Performance

### 1. Lazy Loading
```typescript
// Carregamento lazy de componentes pesados
const KanbanBoard = dynamic(() => import('@/components/KanbanBoard'), {
  loading: () => <LoadingSpinner />
});
```

### 2. Memoização
```typescript
// Evitar re-renders desnecessários
const ticketsByStatus = useMemo(() => {
  // ... lógica de agrupamento
}, [tickets]);
```

### 3. Índices do Firestore
Crie índices compostos para queries frequentes:
- `projects` por `slug`
- `tickets` por `projectId` + `status` + `order`

## 🎨 Melhorias de UI/UX

### Componentes a Criar
- [ ] `<LoadingSpinner />` - Indicador de carregamento consistente
- [ ] `<EmptyState />` - Estado vazio quando não há tickets
- [ ] `<ErrorBoundary />` - Tratamento de erros global
- [ ] `<Toast />` - Notificações temporárias
- [ ] `<ConfirmDialog />` - Diálogo de confirmação
- [ ] `<Header />` - Cabeçalho global com navegação
- [ ] `<UserMenu />` - Menu de usuário no header

### Biblioteca de Componentes Recomendada
```bash
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
```

## 🧪 Testes

### Setup de Testes
```bash
npm install -D @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom
```

Arquivos a testar:
- Componentes de UI (TicketCard, KanbanColumn)
- Hooks customizados (useProject, useTickets)
- Funções de serviço (services.ts)

## 📱 Responsividade

Melhorias mobile:
- Gestos touch para drag-and-drop
- Menu hamburguer
- Bottom sheet para formulários
- Layout de coluna única em mobile

## 🚀 Deploy

### Vercel (Recomendado)
```bash
npm install -g vercel
vercel
```

Configurações necessárias:
1. Adicionar variáveis de ambiente no painel da Vercel
2. Configurar domínio customizado
3. Habilitar Analytics

### Variáveis de Ambiente Necessárias
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID

## 📈 Analytics

Considere adicionar:
- Google Analytics
- Posthog (open source)
- Vercel Analytics

## 🐛 Debug

### Ferramentas Úteis
- React DevTools
- Redux DevTools (se usar Redux)
- Firebase Emulator Suite (para testes locais)

### Logs
Implementar sistema de logs estruturado:
```typescript
// src/lib/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data);
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
    // Enviar para serviço de monitoramento (Sentry, etc)
  },
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data);
  },
};
```

## 📚 Recursos Adicionais

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [dnd-kit Documentation](https://docs.dndkit.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**Mantenha este arquivo atualizado conforme o projeto evolui!**
