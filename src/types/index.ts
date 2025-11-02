// Tipos principais do FlowDesk

export type TicketStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  id: string;
  title: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
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
  createdAt: Date;
}
