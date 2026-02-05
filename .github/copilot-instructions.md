# FlowDesk - Copilot Instructions

## Preferências de Interação

- **Idioma**: Manter toda comunicação em português brasileiro
- **Layout**: Preservar o layout e estrutura visual existente nos componentes
- **Escopo de alterações**: Não alterar código fora do contexto da conversa. Se identificar problemas em código não relacionado, apenas notificar sem modificar
- **Documentação**: Não criar arquivos de documentação sem solicitação explícita
- **Datas/horas**: Sempre usar `Timestamp` do Firestore para campos temporais (compatibilidade com Firebase)
- **Ícones**: Evitar emojis no código, preferir React Icons (`react-icons`)
- **Dúvidas**: Perguntar ao usuário quando houver incertezas antes de prosseguir

## Project Overview
FlowDesk is a Kanban project management system built with **Next.js 16** (App Router), **TypeScript**, **Firebase** (Firestore + Auth), and **Tailwind CSS 4**. Projects are accessed via `/projetos/[projectId]` (authenticated) and features drag-and-drop using `@dnd-kit`.

## Architecture

### Routes
- `/para-voce` - Projetos e tickets recentes (requer autenticação)
- `/projetos` - Lista de projetos do usuário (requer autenticação)
- `/projetos/[projectId]` - Kanban do projeto
- `/projetos/editar/[projectId]` - Configurações do projeto
- `/criar-projeto` - Criar novo projeto
- `/planos` - Opções de planos/assinatura
- `/settings` - Configurações do usuário
- `/login` - Autenticação (login/cadastro)

## Architecture

### Data Flow
```
Firebase Firestore → Custom Hooks (useProject, useTickets) → React Components
                                  ↓
                   Services (lib/services.ts) → Firestore mutations
```

### Key Directories
- **`src/app/`** - Next.js App Router pages; dynamic routes use `[slug]` folders
- **`src/components/`** - React components; forms in `forms/`, shared UI in `ui/`
- **`src/hooks/`** - Custom hooks: `useAuth`, `useProject`, `useNotification`
- **`src/lib/`** - Core utilities: `firebase.ts` (config), `services.ts` (CRUD), `logger.ts`
- **`src/types/index.ts`** - All TypeScript types (Ticket, Project, Column, etc.)

### Core Types (src/types/index.ts)
- `TicketStatus`: `'backlog' | 'todo' | 'in-progress' | 'review' | 'done'`
- `TicketPriority`: `'low' | 'medium' | 'high' | 'urgent'`
- `TicketType`: `'bug' | 'melhoria' | 'tarefa' | 'estoria' | 'epico' | 'investigacao' | 'novidade' | 'suporte'`

## Coding Patterns

### Client Components
All interactive components must use `'use client';` directive. Server components are only for layout/metadata.

### Firebase Services Pattern
Use `src/lib/services.ts` for all Firestore operations. Example:
```typescript
import { createTicket, updateTicket, moveTicket } from '@/lib/services';
```

### Optimistic Updates
Apply local state changes immediately, then sync with Firebase. Revert on error:
```typescript
onTicketsUpdate(updatedTickets); // Immediate feedback
await moveTicket(id, status, order); // Server sync
```

### Logging & Notifications
Use the unified logger and notification system:
```typescript
import { logger } from '@/lib/logger';
import { useNotification } from '@/hooks/useNotification';

logger.error('Error message', { action: 'action_name', metadata: {...} });
showError('User-facing message');
```

### Protected Routes
Wrap protected pages with `<ProtectedRoute>` component from `src/components/ProtectedRoute.tsx`.

### Form Components
Reuse form field components from `src/components/forms/`:
- `TicketFormFields` - Complete ticket form
- `PrioritySelect`, `StatusSelect`, `TicketTypeSelect` - Dropdowns

## Development Commands
```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

## Firebase Configuration
Environment variables in `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
```

## UI Conventions
- **Tailwind CSS 4** for all styling (no CSS modules)
- **react-icons** for icons (prefer `react-icons/md`, `react-icons/fa6`)
- **Tiptap** for rich text editing (`RichTextEditor` component)
- Portuguese labels for user-facing text (e.g., "Título", "Descrição")

## Component Patterns
- Drag-and-drop: Use `@dnd-kit/core` hooks (`useDraggable`, `useDroppable`)
- Modals: Use `src/components/ui/Modal.tsx`
- Loading states: Use `src/components/ui/Skeletons.tsx`

### AppLayout (Layout com Sidebar)
Todas as páginas autenticadas devem usar o componente `AppLayout` que inclui:
- **Sidebar** (menu lateral esquerdo colapsável)
- **AppHeader** (cabeçalho padrão com logo e navegação)

```tsx
import AppLayout from '@/components/AppLayout';

// Uso básico (página principal /projetos)
<AppLayout showNewProject>
  {/* Conteúdo da página */}
</AppLayout>

// Com título e subtítulo (páginas internas)
<AppLayout title="Nome do Projeto" subtitle="Descrição opcional">
  {/* Conteúdo da página */}
</AppLayout>

// Com conteúdo adicional no header
<AppLayout 
  title="Projeto" 
  headerRightContent={<button>Ação</button>}
>
  {/* Conteúdo da página */}
</AppLayout>
```

**Props disponíveis:**
- `title?: string` - Título exibido no header
- `subtitle?: string` - Subtítulo abaixo do título
- `headerRightContent?: ReactNode` - Elementos adicionais no lado direito do header
- `showNewProject?: boolean` - Mostra botão "+ Novo Projeto" no header

### Sidebar (Menu Lateral)
O `Sidebar` é renderizado automaticamente pelo `AppLayout` e contém:
- **Para você** (`/para-voce`) - Projetos e tickets recentes
- **Projetos** (`/projetos`) - Lista de projetos
- **Planos** (`/planos`) - Opções de planos/assinatura

O estado colapsado é persistido em `localStorage` (chave: `sidebar-collapsed`).

**Larguras:**
- Expandido: 224px (w-56)
- Colapsado: 64px (w-16)

