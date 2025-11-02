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
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project, Ticket, TicketStatus, TicketPriority } from '@/types';

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
      description,
      status,
      priority,
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
    await updateDoc(ticketRef, {
      ...updates,
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
