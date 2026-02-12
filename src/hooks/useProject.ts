// Hooks customizados para gerenciamento de projetos
import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { Project, Ticket } from '@/types';

// Hook para buscar projeto por ID
export const useProjectById = (projectId: string) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, 'projects', projectId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProject({
            id: docSnap.id,
            ...docSnap.data(),
            createdAt: docSnap.data().createdAt?.toDate(),
            updatedAt: docSnap.data().updatedAt?.toDate(),
          } as Project);
        } else {
          setError('Projeto não encontrado');
        }
      } catch (error) {
        logger.error('Erro ao carregar projeto por ID', {
          action: 'load_project_by_id',
          metadata: { projectId, error: String(error) },
          page: 'useProjectById',
        });
        setError('Erro ao carregar projeto');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  return { project, loading, error };
};

// Hook para buscar projeto por slug (legacy - pode ser removido futuramente)
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
      } catch (error) {
        logger.error('Erro ao carregar projeto por slug', {
          action: 'load_project_by_slug',
          metadata: { slug, error: String(error) },
          page: 'useProject',
        });
        setError('Erro ao carregar projeto');
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        setError(null);
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
      } catch (fetchError) {
        logger.error('Erro ao carregar tickets do projeto', {
          action: 'load_project_tickets',
          metadata: { projectId, error: String(fetchError) },
          page: 'useTickets',
        });
        setError('Erro ao carregar tickets');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchTickets();
    }
  }, [projectId]);

  return { tickets, loading, error, setTickets };
};
