// Serviços para interação com o Firestore
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp,
  query,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project, Ticket, TicketStatus, TicketPriority, TicketType } from '@/types';

// Funções para Projetos
export const createProject = async (
  name: string, 
  slug: string, 
  description: string, 
  ownerId: string
): Promise<string> => {
  try {
    // Verifica se o slug já existe
    const q = query(collection(db, 'projects'), where('slug', '==', slug));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      throw new Error('Este slug já está em uso');
    }

    const docRef = await addDoc(collection(db, 'projects'), {
      name,
      slug,
      description,
      ownerId,
      members: [ownerId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
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
    await updateDoc(projectRef, {
      ...updates,
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
    // Busca o maior order atual
    const q = query(
      collection(db, 'tickets'),
      where('projectId', '==', projectId),
      where('status', '==', status)
    );
    const querySnapshot = await getDocs(q);
    const maxOrder = querySnapshot.docs.reduce(
      (max, doc) => Math.max(max, doc.data().order || 0), 
      0
    );

    const docRef = await addDoc(collection(db, 'tickets'), {
      projectId,
      title,
      description: description || '',
      status,
      priority,
      type,
      tags,
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
    
    // Remove campos undefined do objeto updates
    const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    await updateDoc(ticketRef, {
      ...cleanUpdates,
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
      const updateData: Record<string, any> = {
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
  return tickets.reduce((acc, ticket) => {
    if (!acc[ticket.projectId]) {
      acc[ticket.projectId] = [];
    }
    acc[ticket.projectId].push(ticket);
    return acc;
  }, {} as Record<string, Ticket[]>);
};

export const validateSlug = (slug: string): { valid: boolean; error?: string } => {
  if (slug.length < 3) {
    return { valid: false, error: 'O slug deve ter pelo menos 3 caracteres' };
  }
  
  if (slug.length > 50) {
    return { valid: false, error: 'O slug deve ter no máximo 50 caracteres' };
  }
  
  // Deve começar com letra, terminar com letra ou número, e conter apenas letras minúsculas, números e hífens
  const slugRegex = /^[a-z][a-z0-9-]*[a-z0-9]$/;
  if (!slugRegex.test(slug)) {
    return { 
      valid: false, 
      error: 'O slug deve começar com uma letra, terminar com letra ou número, e conter apenas letras minúsculas, números e hífens' 
    };
  }
  
  // Não permite múltiplos hífens consecutivos
  if (slug.includes('--')) {
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
    const data = userDoc.data();
    
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
        const data = doc.data();
        users.push({
          id: doc.id,
          email: data.email,
          displayName: data.displayName || data.email?.split('@')[0] || 'Usuário',
        });
      }
    }
    
    return users;
  } catch {
    return [];
  }
};

/**
 * Adiciona um membro ao projeto
 */
export const addProjectMember = async (projectId: string, userId: string): Promise<void> => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDocs(query(collection(db, 'projects'), where('__name__', '==', projectId)));
    
    if (projectDoc.empty) {
      throw new Error('Projeto não encontrado');
    }
    
    const project = projectDoc.docs[0].data();
    const members = project.members || [];
    
    if (members.includes(userId)) {
      throw new Error('Usuário já é membro deste projeto');
    }
    
    await updateDoc(projectRef, {
      members: [...members, userId],
      updatedAt: serverTimestamp(),
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
    
    const project = projectDoc.docs[0].data();
    const members = (project.members || []).filter((id: string) => id !== userId);
    
    await updateDoc(projectRef, {
      members,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};
