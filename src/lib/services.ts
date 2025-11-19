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
    console.error('Erro ao criar projeto:', error);
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
    console.error('Erro ao atualizar projeto:', error);
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
    console.error('Erro ao criar ticket:', error);
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
    console.error('Erro ao atualizar ticket:', error);
    throw error;
  }
};

export const deleteTicket = async (ticketId: string): Promise<void> => {
  try {
    const ticketRef = doc(db, 'tickets', ticketId);
    await deleteDoc(ticketRef);
  } catch (error) {
    console.error('Erro ao deletar ticket:', error);
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
    console.error('Erro ao mover ticket:', error);
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
    console.error('Erro ao reordenar tickets:', error);
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
