# Exemplos de Uso - FlowDesk

## 📝 Casos de Uso Comuns

### 1. Criar um Novo Projeto

```typescript
import { createProject } from '@/lib/services';

// No componente
const handleCreateProject = async () => {
  try {
    const projectId = await createProject(
      'Meu Projeto',           // Nome
      'meu-projeto',           // Slug (URL)
      'Descrição do projeto',  // Descrição
      'user-id-123'            // ID do usuário
    );
    
    console.log('Projeto criado:', projectId);
    // Redirecionar para /meu-projeto
  } catch (error) {
    console.error('Erro:', error);
  }
};
```

### 2. Criar um Novo Ticket

```typescript
import { createTicket } from '@/lib/services';

const handleCreateTicket = async () => {
  try {
    const ticketId = await createTicket(
      'project-id-123',              // ID do projeto
      'Implementar login',           // Título
      'Adicionar autenticação...',   // Descrição
      'todo',                        // Status
      'high',                        // Prioridade
      'user-id-456'                  // Assignee (opcional)
    );
    
    console.log('Ticket criado:', ticketId);
  } catch (error) {
    console.error('Erro:', error);
  }
};
```

### 3. Atualizar um Ticket

```typescript
import { updateTicket } from '@/lib/services';

const handleUpdateTicket = async () => {
  try {
    await updateTicket('ticket-id-789', {
      title: 'Novo título',
      status: 'in-progress',
      priority: 'urgent',
    });
    
    console.log('Ticket atualizado');
  } catch (error) {
    console.error('Erro:', error);
  }
};
```

### 4. Mover Ticket no Kanban

```typescript
import { moveTicket } from '@/lib/services';

const handleMoveTicket = async () => {
  try {
    await moveTicket(
      'ticket-id-789',    // ID do ticket
      'done',             // Novo status
      3                   // Nova ordem na coluna
    );
    
    console.log('Ticket movido');
  } catch (error) {
    console.error('Erro:', error);
  }
};
```

### 5. Usar Hook Customizado

```typescript
import { useProject, useTickets } from '@/hooks/useProject';

function ProjectPage() {
  const { project, loading, error } = useProject('meu-projeto');
  const { tickets, loading: ticketsLoading } = useTickets(project?.id || '');
  
  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;
  
  return (
    <div>
      <h1>{project.name}</h1>
      <p>{tickets.length} tickets</p>
    </div>
  );
}
```

## 🎨 Customizações Comuns

### Adicionar Nova Prioridade

```typescript
// src/types/index.ts
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';

// src/components/TicketCard.tsx
const priorityColors = {
  low: 'bg-gray-200 text-gray-800',
  medium: 'bg-blue-200 text-blue-800',
  high: 'bg-orange-200 text-orange-800',
  urgent: 'bg-red-200 text-red-800',
  critical: 'bg-purple-200 text-purple-800', // Nova prioridade
};
```

### Adicionar Nova Coluna no Kanban

```typescript
// src/types/index.ts
export type TicketStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'testing' | 'done';

// src/components/KanbanBoard.tsx
const columns: { id: TicketStatus; title: string }[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'A Fazer' },
  { id: 'in-progress', title: 'Em Progresso' },
  { id: 'testing', title: 'Em Teste' },      // Nova coluna
  { id: 'review', title: 'Em Revisão' },
  { id: 'done', title: 'Concluído' },
];
```

### Customizar Cores das Colunas

```typescript
// src/components/KanbanColumn.tsx
const columnColors: Record<TicketStatus, string> = {
  backlog: 'bg-gray-100 border-gray-300',
  todo: 'bg-blue-50 border-blue-300',
  'in-progress': 'bg-yellow-50 border-yellow-300',
  review: 'bg-purple-50 border-purple-300',
  done: 'bg-green-50 border-green-300',
};
```

## 🔧 Snippets Úteis

### Loading State Reutilizável

```typescript
// src/components/LoadingSpinner.tsx
export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };
  
  return (
    <div className="flex items-center justify-center">
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizes[size]}`} />
    </div>
  );
}
```

### Toast de Notificação

```typescript
// src/hooks/useToast.ts
import { useState } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const showToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36);
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };
  
  return { toasts, showToast };
};
```

### Formatação de Datas

```typescript
// src/lib/utils.ts
export const formatDate = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 7) return `${days} dias atrás`;
  
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};
```

### Validação de Slug

```typescript
// src/lib/utils.ts
export const validateSlug = (slug: string): boolean => {
  // Apenas letras minúsculas, números e hífens
  const slugRegex = /^[a-z0-9-]+$/;
  
  // Não pode começar ou terminar com hífen
  const noLeadingTrailingHyphen = !/^-|-$/.test(slug);
  
  // Não pode ter hífens consecutivos
  const noConsecutiveHyphens = !/-{2,}/.test(slug);
  
  // Tamanho mínimo e máximo
  const validLength = slug.length >= 3 && slug.length <= 50;
  
  return slugRegex.test(slug) && 
         noLeadingTrailingHyphen && 
         noConsecutiveHyphens && 
         validLength;
};

export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '')     // Remove caracteres especiais
    .replace(/\s+/g, '-')              // Substitui espaços
    .replace(/-+/g, '-')               // Remove hífens duplicados
    .replace(/^-|-$/g, '')             // Remove hífens nas pontas
    .substring(0, 50);                 // Limita tamanho
};
```

## 🚀 Padrões de Código

### Estrutura de Componente

```typescript
'use client';

import { useState, useEffect } from 'react';
import { SomeType } from '@/types';

interface ComponentProps {
  // Props aqui
}

export default function Component({ prop }: ComponentProps) {
  // Estados
  const [state, setState] = useState<SomeType>();
  
  // Effects
  useEffect(() => {
    // Side effects
  }, []);
  
  // Handlers
  const handleAction = () => {
    // Lógica
  };
  
  // Render conditions
  if (loading) return <LoadingState />;
  if (error) return <ErrorState />;
  
  // Main render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### Estrutura de Hook Customizado

```typescript
import { useState, useEffect } from 'react';

export const useCustomHook = (param: string) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch logic
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [param]);
  
  return { data, loading, error };
};
```

## 📊 Queries Firestore Úteis

### Buscar Projetos do Usuário

```typescript
const getUserProjects = async (userId: string) => {
  const q = query(
    collection(db, 'projects'),
    where('members', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};
```

### Buscar Tickets por Prioridade

```typescript
const getHighPriorityTickets = async (projectId: string) => {
  const q = query(
    collection(db, 'tickets'),
    where('projectId', '==', projectId),
    where('priority', 'in', ['high', 'urgent']),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};
```

### Contar Tickets por Status

```typescript
const countTicketsByStatus = (tickets: Ticket[]) => {
  return tickets.reduce((acc, ticket) => {
    acc[ticket.status] = (acc[ticket.status] || 0) + 1;
    return acc;
  }, {} as Record<TicketStatus, number>);
};
```

---

**Dica**: Salve estes exemplos para referência rápida durante o desenvolvimento!
