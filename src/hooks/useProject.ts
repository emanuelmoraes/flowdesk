// Hooks customizados para gerenciamento de projetos
import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc,
  serverTimestamp,
  orderBy 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project, Ticket } from '@/types';

export const useProject = (slug: string) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'projects'),
          where('slug', '==', slug)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setProject({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
          } as Project);
        } else {
          setError('Projeto não encontrado');
        }
      } catch (err) {
        setError('Erro ao carregar projeto');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchProject();
    }
  }, [slug]);

  return { project, loading, error };
};

export const useTickets = (projectId: string) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'tickets'),
          where('projectId', '==', projectId),
          orderBy('order', 'asc')
        );
        const querySnapshot = await getDocs(q);
        
        const ticketsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        })) as Ticket[];
        
        setTickets(ticketsData);
      } catch (err) {
        console.error('Erro ao carregar tickets:', err);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchTickets();
    }
  }, [projectId]);

  return { tickets, loading, setTickets };
};
