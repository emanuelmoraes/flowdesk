// Tipos principais do FlowDesk

// === Tipos de Usuário e Permissões ===

/**
 * Perfis de usuário disponíveis no sistema
 * - user: Usuário padrão com acesso básico
 * - admin: Administrador com acesso total (futuro)
 * - manager: Gerente de projetos (futuro)
 */
export type UserRole = 'user' | 'admin' | 'manager';

/**
 * Configuração de permissões por role
 * Estrutura preparada para expansão futura
 */
export const ROLE_PERMISSIONS: Record<UserRole, {
  label: string;
  description: string;
  canManageUsers: boolean;
  canManageAllProjects: boolean;
  canDeleteProjects: boolean;
}> = {
  user: {
    label: 'Usuário',
    description: 'Acesso básico ao sistema',
    canManageUsers: false,
    canManageAllProjects: false,
    canDeleteProjects: false,
  },
  admin: {
    label: 'Administrador',
    description: 'Acesso total ao sistema',
    canManageUsers: true,
    canManageAllProjects: true,
    canDeleteProjects: true,
  },
  manager: {
    label: 'Gerente',
    description: 'Gerenciamento de projetos e equipes',
    canManageUsers: false,
    canManageAllProjects: true,
    canDeleteProjects: true,
  },
};

/**
 * Retorna o role padrão para novos usuários
 */
export const DEFAULT_USER_ROLE: UserRole = 'user';

/**
 * Verifica se um role é válido
 */
export function isValidRole(role: string): role is UserRole {
  return ['user', 'admin', 'manager'].includes(role);
}

/**
 * Retorna as permissões de um role (com fallback para 'user')
 */
export function getRolePermissions(role: string) {
  if (isValidRole(role)) {
    return ROLE_PERMISSIONS[role];
  }
  return ROLE_PERMISSIONS.user;
}

// === Tipos de Ticket ===

export type TicketStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketType = 'bug' | 'melhoria' | 'tarefa' | 'estoria' | 'epico' | 'investigacao' | 'novidade' | 'suporte';

export interface Ticket {
  id: string;
  title: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  tags: string[];
  assignee?: string;
  createdAt: Date;
  updatedAt: Date;
  order: number;
  projectId: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  members?: string[];
}

export interface Column {
  id: TicketStatus;
  title: string;
  tickets: Ticket[];
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt: Date;
  lastLogin?: Date;
}
