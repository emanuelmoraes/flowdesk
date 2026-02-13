// Serviços para interação com o Firestore
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  getDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { recordAuditTrail } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { canAddMember, canCreateProject, canCreateTicket, getPlan } from '@/lib/plans';
import { getPersonalWorkspaceId } from '@/lib/workspace';
import { Project, ProjectInvite, Ticket, TicketStatus, TicketPriority, TicketType } from '@/types';

type TimestampLike = {
  toDate: () => Date;
};

type BasicUserData = {
  email: string;
  displayName?: string;
};

type BasicProjectData = {
  ownerId?: string;
  members: string[];
};

type BasicInviteData = {
  projectId: string;
  email: string;
  invitedBy: string;
  status: ProjectInvite['status'];
  respondedBy?: string;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
  respondedAt?: TimestampLike;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const hasToDate = (value: unknown): value is TimestampLike => {
  return isRecord(value) && typeof value.toDate === 'function';
};

const parseBasicUserData = (value: unknown): BasicUserData | null => {
  if (!isRecord(value) || typeof value.email !== 'string') {
    return null;
  }

  return {
    email: value.email,
    displayName: typeof value.displayName === 'string' ? value.displayName : undefined,
  };
};

const parseBasicProjectData = (value: unknown): BasicProjectData | null => {
  if (!isRecord(value)) {
    return null;
  }

  const members = Array.isArray(value.members)
    ? value.members.filter((member): member is string => typeof member === 'string')
    : [];

  return {
    ownerId: typeof value.ownerId === 'string' ? value.ownerId : undefined,
    members,
  };
};

const parseBasicInviteData = (value: unknown): BasicInviteData | null => {
  if (!isRecord(value)) {
    return null;
  }

  const projectId = value.projectId;
  const email = value.email;
  const invitedBy = value.invitedBy;
  const status = value.status;

  if (
    typeof projectId !== 'string' ||
    typeof email !== 'string' ||
    typeof invitedBy !== 'string' ||
    (status !== 'pending' && status !== 'accepted' && status !== 'declined' && status !== 'canceled')
  ) {
    return null;
  }

  return {
    projectId,
    email,
    invitedBy,
    status,
    respondedBy: typeof value.respondedBy === 'string' ? value.respondedBy : undefined,
    createdAt: hasToDate(value.createdAt) ? value.createdAt : undefined,
    updatedAt: hasToDate(value.updatedAt) ? value.updatedAt : undefined,
    respondedAt: hasToDate(value.respondedAt) ? value.respondedAt : undefined,
  };
};

const PROJECT_NAME_MIN_LENGTH = 3;
const PROJECT_NAME_MAX_LENGTH = 120;
const PROJECT_SLUG_MIN_LENGTH = 3;
const PROJECT_SLUG_MAX_LENGTH = 50;
const PROJECT_DESCRIPTION_MAX_LENGTH = 10000;

const TICKET_TITLE_MIN_LENGTH = 3;
const TICKET_TITLE_MAX_LENGTH = 160;
const TICKET_DESCRIPTION_MAX_LENGTH = 10000;
const TICKET_TAG_MAX_COUNT = 10;
const TICKET_TAG_MAX_LENGTH = 30;

const ticketStatusList: TicketStatus[] = ['backlog', 'todo', 'in-progress', 'review', 'done'];
const ticketPriorityList: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];
const ticketTypeList: TicketType[] = ['bug', 'melhoria', 'tarefa', 'estoria', 'epico', 'investigacao', 'novidade', 'suporte'];

const normalizeWhitespace = (value: string): string => value.trim().replace(/\s+/g, ' ');

const normalizeDescription = (value: string): string => value.trim();

const getUserPlanId = async (userId: string): Promise<string | undefined> => {
  const userRef = doc(db, 'users', userId);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    return undefined;
  }

  const userData = userSnapshot.data();
  if (!isRecord(userData)) {
    return undefined;
  }

  return typeof userData.plan === 'string' ? userData.plan : undefined;
};

const getOwnedProjectsCount = async (ownerId: string): Promise<number> => {
  const ownedProjectsQuery = query(collection(db, 'projects'), where('ownerId', '==', ownerId));
  const ownedProjectsSnapshot = await getDocs(ownedProjectsQuery);
  return ownedProjectsSnapshot.docs.length;
};

const getProjectTicketsCount = async (projectId: string): Promise<number> => {
  const ticketsQuery = query(collection(db, 'tickets'), where('projectId', '==', projectId));
  const ticketsSnapshot = await getDocs(ticketsQuery);
  return ticketsSnapshot.docs.length;
};

export const generateSlug = (value: string): string => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, PROJECT_SLUG_MAX_LENGTH);
};

const sanitizeTags = (tags: string[]): string[] => {
  const uniqueTags = new Set<string>();

  for (const tag of tags) {
    const normalizedTag = normalizeWhitespace(tag);
    if (!normalizedTag) continue;
    uniqueTags.add(normalizedTag);
    if (uniqueTags.size >= TICKET_TAG_MAX_COUNT) break;
  }

  return Array.from(uniqueTags);
};

const validateProjectName = (name: string): { valid: boolean; error?: string } => {
  if (name.length < PROJECT_NAME_MIN_LENGTH) {
    return { valid: false, error: `O nome do projeto deve ter pelo menos ${PROJECT_NAME_MIN_LENGTH} caracteres` };
  }

  if (name.length > PROJECT_NAME_MAX_LENGTH) {
    return { valid: false, error: `O nome do projeto deve ter no máximo ${PROJECT_NAME_MAX_LENGTH} caracteres` };
  }

  return { valid: true };
};

const validateProjectDescription = (description: string): { valid: boolean; error?: string } => {
  if (description.length > PROJECT_DESCRIPTION_MAX_LENGTH) {
    return { valid: false, error: `A descrição deve ter no máximo ${PROJECT_DESCRIPTION_MAX_LENGTH} caracteres` };
  }

  return { valid: true };
};

const validateTicketTitle = (title: string): { valid: boolean; error?: string } => {
  if (title.length < TICKET_TITLE_MIN_LENGTH) {
    return { valid: false, error: `O título deve ter pelo menos ${TICKET_TITLE_MIN_LENGTH} caracteres` };
  }

  if (title.length > TICKET_TITLE_MAX_LENGTH) {
    return { valid: false, error: `O título deve ter no máximo ${TICKET_TITLE_MAX_LENGTH} caracteres` };
  }

  return { valid: true };
};

const validateTicketDescription = (description: string): { valid: boolean; error?: string } => {
  if (description.length > TICKET_DESCRIPTION_MAX_LENGTH) {
    return { valid: false, error: `A descrição deve ter no máximo ${TICKET_DESCRIPTION_MAX_LENGTH} caracteres` };
  }

  return { valid: true };
};

const validateTicketTags = (tags: string[]): { valid: boolean; error?: string } => {
  if (tags.length > TICKET_TAG_MAX_COUNT) {
    return { valid: false, error: `Você pode adicionar no máximo ${TICKET_TAG_MAX_COUNT} tags` };
  }

  for (const tag of tags) {
    if (tag.length > TICKET_TAG_MAX_LENGTH) {
      return { valid: false, error: `Cada tag deve ter no máximo ${TICKET_TAG_MAX_LENGTH} caracteres` };
    }
  }

  return { valid: true };
};

const validateTicketEnums = (
  status: TicketStatus,
  priority: TicketPriority,
  type: TicketType
): { valid: boolean; error?: string } => {
  if (!ticketStatusList.includes(status)) {
    return { valid: false, error: 'Status inválido' };
  }

  if (!ticketPriorityList.includes(priority)) {
    return { valid: false, error: 'Prioridade inválida' };
  }

  if (!ticketTypeList.includes(type)) {
    return { valid: false, error: 'Tipo de ticket inválido' };
  }

  return { valid: true };
};

// Funções para Projetos
export const createProject = async (
  name: string, 
  slug: string, 
  description: string, 
  ownerId: string
): Promise<string> => {
  try {
    const normalizedName = normalizeWhitespace(name);
    const normalizedSlug = generateSlug(slug);
    const normalizedDescription = normalizeDescription(description);

    const nameValidation = validateProjectName(normalizedName);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error || 'Nome do projeto inválido');
    }

    const slugValidation = validateSlug(normalizedSlug);
    if (!slugValidation.valid) {
      throw new Error(slugValidation.error || 'Slug inválido');
    }

    const descriptionValidation = validateProjectDescription(normalizedDescription);
    if (!descriptionValidation.valid) {
      throw new Error(descriptionValidation.error || 'Descrição inválida');
    }

    const ownerPlanId = await getUserPlanId(ownerId);
    const ownerProjectsCount = await getOwnedProjectsCount(ownerId);
    if (!canCreateProject(ownerPlanId, ownerProjectsCount)) {
      const plan = getPlan(ownerPlanId);
      throw new Error(`Limite do plano ${plan.name} atingido para criação de projetos`);
    }

    const workspaceId = getPersonalWorkspaceId(ownerId);

    // Verifica se o slug já existe
    const q = query(collection(db, 'projects'), where('slug', '==', normalizedSlug));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      throw new Error('Este slug já está em uso');
    }

    const docRef = await addDoc(collection(db, 'projects'), {
      workspaceId,
      name: normalizedName,
      slug: normalizedSlug,
      description: normalizedDescription,
      ownerId,
      members: [ownerId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await recordAuditTrail({
      actorId: ownerId,
      action: 'project.created',
      resourceType: 'project',
      resourceId: docRef.id,
      projectId: docRef.id,
      metadata: {
        workspaceId,
        slug: normalizedSlug,
      },
      page: 'services',
    });
    
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const updateProject = async (
  projectId: string, 
  updates: Partial<Project>
): Promise<void> => {
  try {
    const projectRef = doc(db, 'projects', projectId);

    const normalizedUpdates: Partial<Project> = { ...updates };

    if (typeof updates.name === 'string') {
      const normalizedName = normalizeWhitespace(updates.name);
      const nameValidation = validateProjectName(normalizedName);
      if (!nameValidation.valid) {
        throw new Error(nameValidation.error || 'Nome do projeto inválido');
      }
      normalizedUpdates.name = normalizedName;
    }

    if (typeof updates.description === 'string') {
      const normalizedDescription = normalizeDescription(updates.description);
      const descriptionValidation = validateProjectDescription(normalizedDescription);
      if (!descriptionValidation.valid) {
        throw new Error(descriptionValidation.error || 'Descrição inválida');
      }
      normalizedUpdates.description = normalizedDescription;
    }

    await updateDoc(projectRef, {
      ...normalizedUpdates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

// Funções para Tickets
export const createTicket = async (
  projectId: string,
  title: string,
  description: string,
  status: TicketStatus,
  priority: TicketPriority,
  type: TicketType,
  tags: string[],
  assignee?: string
): Promise<string> => {
  try {
    const normalizedTitle = normalizeWhitespace(title);
    const normalizedDescription = normalizeDescription(description || '');
    const normalizedTags = sanitizeTags(tags);

    const titleValidation = validateTicketTitle(normalizedTitle);
    if (!titleValidation.valid) {
      throw new Error(titleValidation.error || 'Título inválido');
    }

    const descriptionValidation = validateTicketDescription(normalizedDescription);
    if (!descriptionValidation.valid) {
      throw new Error(descriptionValidation.error || 'Descrição inválida');
    }

    const tagsValidation = validateTicketTags(normalizedTags);
    if (!tagsValidation.valid) {
      throw new Error(tagsValidation.error || 'Tags inválidas');
    }

    const enumsValidation = validateTicketEnums(status, priority, type);
    if (!enumsValidation.valid) {
      throw new Error(enumsValidation.error || 'Dados do ticket inválidos');
    }

    const projectRef = doc(db, 'projects', projectId);
    const projectSnapshot = await getDoc(projectRef);
    if (!projectSnapshot.exists()) {
      throw new Error('Projeto não encontrado');
    }

    const projectData = parseBasicProjectData(projectSnapshot.data());
    const ownerId = projectData?.ownerId;
    if (!ownerId) {
      throw new Error('Projeto inválido para criação de ticket');
    }

    const ownerPlanId = await getUserPlanId(ownerId);
    const currentTicketsCount = await getProjectTicketsCount(projectId);
    if (!canCreateTicket(ownerPlanId, currentTicketsCount)) {
      const plan = getPlan(ownerPlanId);
      throw new Error(`Limite do plano ${plan.name} atingido para criação de tickets neste projeto`);
    }

    // Busca o maior order atual (consulta otimizada)
    const q = query(
      collection(db, 'tickets'),
      where('projectId', '==', projectId),
      where('status', '==', status),
      orderBy('order', 'desc'),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    const maxOrder = querySnapshot.empty
      ? 0
      : (() => {
          const firstDocData = querySnapshot.docs[0].data();
          if (!isRecord(firstDocData) || typeof firstDocData.order !== 'number') {
            return 0;
          }

          return firstDocData.order;
        })();

    const docRef = await addDoc(collection(db, 'tickets'), {
      projectId,
      title: normalizedTitle,
      description: normalizedDescription,
      status,
      priority,
      type,
      tags: normalizedTags,
      assignee: assignee || null,
      order: maxOrder + 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const updateTicket = async (
  ticketId: string, 
  updates: Partial<Ticket>
): Promise<void> => {
  try {
    const ticketRef = doc(db, 'tickets', ticketId);

    const normalizedUpdates: Partial<Ticket> = { ...updates };

    if (typeof updates.title === 'string') {
      const normalizedTitle = normalizeWhitespace(updates.title);
      const titleValidation = validateTicketTitle(normalizedTitle);
      if (!titleValidation.valid) {
        throw new Error(titleValidation.error || 'Título inválido');
      }
      normalizedUpdates.title = normalizedTitle;
    }

    if (typeof updates.description === 'string') {
      const normalizedDescription = normalizeDescription(updates.description);
      const descriptionValidation = validateTicketDescription(normalizedDescription);
      if (!descriptionValidation.valid) {
        throw new Error(descriptionValidation.error || 'Descrição inválida');
      }
      normalizedUpdates.description = normalizedDescription;
    }

    if (Array.isArray(updates.tags)) {
      const normalizedTags = sanitizeTags(updates.tags);
      const tagsValidation = validateTicketTags(normalizedTags);
      if (!tagsValidation.valid) {
        throw new Error(tagsValidation.error || 'Tags inválidas');
      }
      normalizedUpdates.tags = normalizedTags;
    }

    if (updates.status || updates.priority || updates.type) {
      const safeStatus = updates.status ?? 'backlog';
      const safePriority = updates.priority ?? 'medium';
      const safeType = updates.type ?? 'tarefa';
      const enumsValidation = validateTicketEnums(safeStatus, safePriority, safeType);
      if (!enumsValidation.valid) {
        throw new Error(enumsValidation.error || 'Dados do ticket inválidos');
      }
    }
    
    const filteredUpdates: Record<string, unknown> = {};
    Object.entries(normalizedUpdates).forEach(([key, value]) => {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    });

    await updateDoc(ticketRef, {
      ...filteredUpdates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

export const deleteTicket = async (ticketId: string): Promise<void> => {
  try {
    const ticketRef = doc(db, 'tickets', ticketId);
    await deleteDoc(ticketRef);
  } catch (error) {
    throw error;
  }
};

export const moveTicket = async (
  ticketId: string,
  newStatus: TicketStatus,
  newOrder: number
): Promise<void> => {
  try {
    const ticketRef = doc(db, 'tickets', ticketId);
    await updateDoc(ticketRef, {
      status: newStatus,
      order: newOrder,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

// Nova função para reordenar múltiplos tickets atomicamente
export const reorderTickets = async (
  updates: Array<{ id: string; order: number; status?: TicketStatus }>
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    updates.forEach(({ id, order, status }) => {
      const ticketRef = doc(db, 'tickets', id);
      const updateData: Record<string, unknown> = {
        order,
        updatedAt: serverTimestamp(),
      };
      
      if (status !== undefined) {
        updateData.status = status;
      }
      
      batch.update(ticketRef, updateData);
    });
    
    await batch.commit();
  } catch (error) {
    throw error;
  }
};

// Funções utilitárias de análise
export const calculateProjectProgress = (tickets: Ticket[]): {
  progress: number;
  totalTickets: number;
  completedTickets: number;
} => {
  const totalTickets = tickets.length;
  const completedTickets = tickets.filter(ticket => ticket.status === 'done').length;
  const progress = totalTickets > 0 ? Math.round((completedTickets * 100) / totalTickets) : 0;
  
  return { progress, totalTickets, completedTickets };
};

export const getTicketsByProject = (tickets: Ticket[]): Record<string, Ticket[]> => {
  const groupedTickets: Record<string, Ticket[]> = {};

  tickets.forEach((ticket) => {
    if (!groupedTickets[ticket.projectId]) {
      groupedTickets[ticket.projectId] = [];
    }
    groupedTickets[ticket.projectId].push(ticket);
  });

  return groupedTickets;
};

export const validateSlug = (slug: string): { valid: boolean; error?: string } => {
  const normalizedSlug = generateSlug(slug);

  if (normalizedSlug.length < PROJECT_SLUG_MIN_LENGTH) {
    return { valid: false, error: 'O slug deve ter pelo menos 3 caracteres' };
  }
  
  if (normalizedSlug.length > PROJECT_SLUG_MAX_LENGTH) {
    return { valid: false, error: 'O slug deve ter no máximo 50 caracteres' };
  }
  
  // Deve começar com letra, terminar com letra ou número, e conter apenas letras minúsculas, números e hífens
  const slugRegex = /^[a-z][a-z0-9-]*[a-z0-9]$/;
  if (!slugRegex.test(normalizedSlug)) {
    return { 
      valid: false, 
      error: 'O slug deve começar com uma letra, terminar com letra ou número, e conter apenas letras minúsculas, números e hífens' 
    };
  }
  
  // Não permite múltiplos hífens consecutivos
  if (normalizedSlug.includes('--')) {
    return { valid: false, error: 'O slug não pode conter hífens consecutivos' };
  }
  
  return { valid: true };
};

// === Funções para Gerenciamento de Membros ===

/**
 * Busca um usuário pelo email
 */
export const getUserByEmail = async (email: string): Promise<{
  id: string;
  email: string;
  displayName: string;
} | null> => {
  try {
    const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const userDoc = querySnapshot.docs[0];
    const data = parseBasicUserData(userDoc.data());
    if (!data) {
      return null;
    }
    
    return {
      id: userDoc.id,
      email: data.email,
      displayName: data.displayName || data.email.split('@')[0],
    };
  } catch {
    throw new Error('Erro ao buscar usuário');
  }
};

/**
 * Busca informações de múltiplos usuários pelos IDs
 */
export const getUsersByIds = async (userIds: string[]): Promise<Array<{
  id: string;
  email: string;
  displayName: string;
}>> => {
  if (!userIds.length) return [];
  
  try {
    const users: Array<{ id: string; email: string; displayName: string }> = [];
    
    // Busca cada usuário individualmente (Firestore não suporta 'in' com mais de 10 itens)
    for (const userId of userIds.slice(0, 10)) {
      const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', userId)));
      if (!userDoc.empty) {
        const doc = userDoc.docs[0];
        const data = parseBasicUserData(doc.data());
        if (!data) {
          continue;
        }

        users.push({
          id: doc.id,
          email: data.email,
          displayName: data.displayName || data.email?.split('@')[0] || 'Usuário',
        });
      }
    }
    
    return users;
  } catch (error) {
    logger.error('Erro ao buscar usuários por IDs', {
      action: 'get_users_by_ids',
      metadata: { userIds, error: String(error) },
      page: 'services',
    });
    throw new Error('Erro ao carregar membros do projeto');
  }
};

/**
 * Adiciona um membro ao projeto
 */
export const addProjectMember = async (projectId: string, userId: string): Promise<void> => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);

    if (!projectDoc.exists()) {
      throw new Error('Projeto não encontrado');
    }

    const project = parseBasicProjectData(projectDoc.data());
    const members = project?.members || [];
    const ownerId = project?.ownerId;

    if (!ownerId) {
      throw new Error('Projeto inválido para gestão de membros');
    }
    
    if (members.includes(userId)) {
      throw new Error('Usuário já é membro deste projeto');
    }

    const ownerPlanId = await getUserPlanId(ownerId);
    if (!canAddMember(ownerPlanId, members.length)) {
      const plan = getPlan(ownerPlanId);
      throw new Error(`Limite do plano ${plan.name} atingido para membros neste projeto`);
    }
    
    await updateDoc(projectRef, {
      members: [...members, userId],
      updatedAt: serverTimestamp(),
    });

    await recordAuditTrail({
      actorId: ownerId,
      action: 'member.added',
      resourceType: 'member',
      resourceId: userId,
      projectId,
      targetUserId: userId,
      metadata: {
        membersCount: members.length + 1,
      },
      page: 'services',
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Remove um membro do projeto
 */
export const removeProjectMember = async (
  projectId: string, 
  userId: string, 
  ownerId: string
): Promise<void> => {
  try {
    if (userId === ownerId) {
      throw new Error('Não é possível remover o dono do projeto');
    }
    
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDocs(query(collection(db, 'projects'), where('__name__', '==', projectId)));
    
    if (projectDoc.empty) {
      throw new Error('Projeto não encontrado');
    }
    
    const project = parseBasicProjectData(projectDoc.docs[0].data());
    const members = (project?.members || []).filter((id) => id !== userId);
    
    await updateDoc(projectRef, {
      members,
      updatedAt: serverTimestamp(),
    });

    await recordAuditTrail({
      actorId: ownerId,
      action: 'member.removed',
      resourceType: 'member',
      resourceId: userId,
      projectId,
      targetUserId: userId,
      metadata: {
        membersCount: members.length,
      },
      page: 'services',
    });
  } catch (error) {
    throw error;
  }
};

export const createProjectInvitation = async (
  projectId: string,
  email: string,
  invitedBy: string
): Promise<string> => {
  const normalizedEmail = email.toLowerCase().trim();

  if (!normalizedEmail) {
    throw new Error('Email do convite é obrigatório');
  }

  const projectRef = doc(db, 'projects', projectId);
  const projectSnapshot = await getDoc(projectRef);

  if (!projectSnapshot.exists()) {
    throw new Error('Projeto não encontrado');
  }

  const projectData = parseBasicProjectData(projectSnapshot.data());
  const ownerId = projectData?.ownerId;
  const members: string[] = projectData?.members || [];

  if (ownerId !== invitedBy) {
    throw new Error('Apenas o dono do projeto pode convidar membros');
  }

  const usersByEmailSnapshot = await getDocs(
    query(collection(db, 'users'), where('email', '==', normalizedEmail))
  );

  if (!usersByEmailSnapshot.empty) {
    const invitedUserId = usersByEmailSnapshot.docs[0].id;
    if (members.includes(invitedUserId)) {
      throw new Error('Este usuário já é membro deste projeto');
    }
  }

  const invitesSnapshot = await getDocs(
    query(collection(db, 'projectInvites'), where('projectId', '==', projectId))
  );

  const alreadyPending = invitesSnapshot.docs.some((inviteDoc) => {
    const inviteData = parseBasicInviteData(inviteDoc.data());
    if (!inviteData) {
      return false;
    }

    return inviteData.email === normalizedEmail && inviteData.status === 'pending';
  });

  if (alreadyPending) {
    throw new Error('Já existe um convite pendente para este email');
  }

  const inviteRef = await addDoc(collection(db, 'projectInvites'), {
    projectId,
    email: normalizedEmail,
    invitedBy,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await recordAuditTrail({
    actorId: invitedBy,
    action: 'invite.created',
    resourceType: 'invite',
    resourceId: inviteRef.id,
    projectId,
    metadata: {
      email: normalizedEmail,
    },
    page: 'services',
  });

  return inviteRef.id;
};

export const listProjectInvitations = async (projectId: string): Promise<ProjectInvite[]> => {
  const invitesSnapshot = await getDocs(
    query(collection(db, 'projectInvites'), where('projectId', '==', projectId))
  );

  return invitesSnapshot.docs
    .map((inviteDoc) => {
      const inviteData = parseBasicInviteData(inviteDoc.data());
      if (!inviteData) {
        return null;
      }

      const parsedInvite: ProjectInvite = {
        id: inviteDoc.id,
        projectId: inviteData.projectId,
        email: inviteData.email,
        invitedBy: inviteData.invitedBy,
        status: inviteData.status,
        respondedBy: inviteData.respondedBy,
        createdAt: inviteData.createdAt?.toDate() || new Date(),
        updatedAt: inviteData.updatedAt?.toDate() || new Date(),
        respondedAt: inviteData.respondedAt?.toDate(),
      };

      return parsedInvite;
    })
    .filter((invite): invite is ProjectInvite => invite !== null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const cancelProjectInvitation = async (
  inviteId: string,
  actorId: string
): Promise<void> => {
  const inviteRef = doc(db, 'projectInvites', inviteId);
  const inviteSnapshot = await getDoc(inviteRef);

  if (!inviteSnapshot.exists()) {
    throw new Error('Convite não encontrado');
  }

  const inviteData = parseBasicInviteData(inviteSnapshot.data());
  if (!inviteData) {
    throw new Error('Convite inválido');
  }

  if (inviteData.status !== 'pending') {
    throw new Error('Somente convites pendentes podem ser cancelados');
  }

  const projectRef = doc(db, 'projects', inviteData.projectId);
  const projectSnapshot = await getDoc(projectRef);

  if (!projectSnapshot.exists()) {
    throw new Error('Projeto não encontrado');
  }

  const projectData = parseBasicProjectData(projectSnapshot.data());
  if (projectData?.ownerId !== actorId) {
    throw new Error('Apenas o dono do projeto pode cancelar convites');
  }

  await updateDoc(inviteRef, {
    status: 'canceled',
    respondedBy: actorId,
    respondedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await recordAuditTrail({
    actorId,
    action: 'invite.canceled',
    resourceType: 'invite',
    resourceId: inviteId,
    projectId: inviteData.projectId,
    metadata: {
      email: inviteData.email,
    },
    page: 'services',
  });
};
