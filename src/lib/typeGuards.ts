import { TicketPriority, TicketStatus, TicketType } from '@/types';

export const ticketStatusValues: readonly TicketStatus[] = [
  'backlog',
  'todo',
  'in-progress',
  'review',
  'done',
];

export const ticketPriorityValues: readonly TicketPriority[] = ['low', 'medium', 'high', 'urgent'];

export const ticketTypeValues: readonly TicketType[] = [
  'bug',
  'melhoria',
  'tarefa',
  'estoria',
  'epico',
  'investigacao',
  'novidade',
  'suporte',
];

const ticketStatusSet: ReadonlySet<string> = new Set(ticketStatusValues);
const ticketPrioritySet: ReadonlySet<string> = new Set(ticketPriorityValues);
const ticketTypeSet: ReadonlySet<string> = new Set(ticketTypeValues);

export const isTicketStatus = (value: string): value is TicketStatus => {
  return ticketStatusSet.has(value);
};

export const isTicketPriority = (value: string): value is TicketPriority => {
  return ticketPrioritySet.has(value);
};

export const isTicketType = (value: string): value is TicketType => {
  return ticketTypeSet.has(value);
};

export const isTicketStatusFilter = (value: string): value is TicketStatus | 'all' => {
  return value === 'all' || isTicketStatus(value);
};

export const isTicketPriorityFilter = (value: string): value is TicketPriority | 'all' => {
  return value === 'all' || isTicketPriority(value);
};

export const isTicketTypeFilter = (value: string): value is TicketType | 'all' => {
  return value === 'all' || isTicketType(value);
};

export const getSingleRouteParam = (value: string | string[] | undefined): string | null => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string' && value[0].length > 0) {
    return value[0];
  }

  return null;
};
