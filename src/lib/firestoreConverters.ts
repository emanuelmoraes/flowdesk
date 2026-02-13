import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  Timestamp,
  WithFieldValue,
} from 'firebase/firestore';
import { Project, ProjectInvite, Ticket, TicketPriority, TicketStatus, TicketType } from '@/types';

type DateLike = {
  toDate: () => Date;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const hasToDate = (value: unknown): value is DateLike => {
  return isRecord(value) && typeof value.toDate === 'function';
};

const getString = (value: unknown, fallback = ''): string => {
  return typeof value === 'string' ? value : fallback;
};

const getStringArray = (value: unknown): string[] => {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
};

const getNumber = (value: unknown, fallback = 0): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const getDate = (value: unknown, fallback = new Date()): Date => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  if (hasToDate(value)) {
    return value.toDate();
  }

  return fallback;
};

const validStatuses: TicketStatus[] = ['backlog', 'todo', 'in-progress', 'review', 'done'];
const validPriorities: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];
const validTypes: TicketType[] = ['bug', 'melhoria', 'tarefa', 'estoria', 'epico', 'investigacao', 'novidade', 'suporte'];

const isTicketStatus = (value: unknown): value is TicketStatus => {
  return (
    value === 'backlog' ||
    value === 'todo' ||
    value === 'in-progress' ||
    value === 'review' ||
    value === 'done'
  );
};

const isTicketPriority = (value: unknown): value is TicketPriority => {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'urgent';
};

const isTicketType = (value: unknown): value is TicketType => {
  return (
    value === 'bug' ||
    value === 'melhoria' ||
    value === 'tarefa' ||
    value === 'estoria' ||
    value === 'epico' ||
    value === 'investigacao' ||
    value === 'novidade' ||
    value === 'suporte'
  );
};

const getTicketStatus = (value: unknown): TicketStatus => {
  return isTicketStatus(value) && validStatuses.includes(value) ? value : 'backlog';
};

const getTicketPriority = (value: unknown): TicketPriority => {
  return isTicketPriority(value) && validPriorities.includes(value) ? value : 'medium';
};

const getTicketType = (value: unknown): TicketType => {
  return isTicketType(value) && validTypes.includes(value) ? value : 'tarefa';
};

export const projectConverter: FirestoreDataConverter<Project> = {
  toFirestore(project: WithFieldValue<Project>): DocumentData {
    return {
      name: project.name,
      slug: project.slug,
      description: project.description,
      ownerId: project.ownerId,
      workspaceId: project.workspaceId,
      members: project.members,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project {
    const data = snapshot.data(options);

    return {
      id: snapshot.id,
      name: getString(data.name),
      slug: getString(data.slug),
      description: typeof data.description === 'string' ? data.description : undefined,
      ownerId: getString(data.ownerId),
      workspaceId: typeof data.workspaceId === 'string' ? data.workspaceId : undefined,
      members: getStringArray(data.members),
      createdAt: getDate(data.createdAt),
      updatedAt: getDate(data.updatedAt),
    };
  },
};

export const ticketConverter: FirestoreDataConverter<Ticket> = {
  toFirestore(ticket: WithFieldValue<Ticket>): DocumentData {
    return {
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      type: ticket.type,
      tags: ticket.tags,
      assignee: ticket.assignee,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      order: ticket.order,
      projectId: ticket.projectId,
      startDate: ticket.startDate,
      dueDate: ticket.dueDate,
      estimatedHours: ticket.estimatedHours,
      progress: ticket.progress,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Ticket {
    const data = snapshot.data(options);

    return {
      id: snapshot.id,
      title: getString(data.title),
      description: typeof data.description === 'string' ? data.description : '',
      status: getTicketStatus(data.status),
      priority: getTicketPriority(data.priority),
      type: getTicketType(data.type),
      tags: getStringArray(data.tags),
      assignee: typeof data.assignee === 'string' ? data.assignee : undefined,
      createdAt: getDate(data.createdAt),
      updatedAt: getDate(data.updatedAt),
      order: getNumber(data.order),
      projectId: getString(data.projectId),
      startDate: data.startDate ? getDate(data.startDate) : undefined,
      dueDate: data.dueDate ? getDate(data.dueDate) : undefined,
      estimatedHours: typeof data.estimatedHours === 'number' ? data.estimatedHours : undefined,
      progress: typeof data.progress === 'number' ? data.progress : undefined,
    };
  },
};

export const projectInviteConverter: FirestoreDataConverter<ProjectInvite> = {
  toFirestore(invite: WithFieldValue<ProjectInvite>): DocumentData {
    return {
      projectId: invite.projectId,
      email: invite.email,
      invitedBy: invite.invitedBy,
      status: invite.status,
      respondedBy: invite.respondedBy,
      createdAt: invite.createdAt,
      updatedAt: invite.updatedAt,
      respondedAt: invite.respondedAt,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): ProjectInvite {
    const data = snapshot.data(options);
    const statusRaw = data.status;
    const status: ProjectInvite['status'] =
      statusRaw === 'pending' || statusRaw === 'accepted' || statusRaw === 'declined' || statusRaw === 'canceled'
        ? statusRaw
        : 'pending';

    return {
      id: snapshot.id,
      projectId: getString(data.projectId),
      email: getString(data.email),
      invitedBy: getString(data.invitedBy),
      status,
      respondedBy: typeof data.respondedBy === 'string' ? data.respondedBy : undefined,
      createdAt: getDate(data.createdAt),
      updatedAt: getDate(data.updatedAt),
      respondedAt: data.respondedAt ? getDate(data.respondedAt) : undefined,
    };
  },
};
