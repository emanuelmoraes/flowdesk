// Hooks customizados para gerenciamento de projetos
import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { projectConverter, ticketConverter } from '@/lib/firestoreConverters';
import { getUserFacingErrorMessage } from '@/lib/errorHandling';
import { logger } from '@/lib/logger';
import { Project, Ticket } from '@/types';

// Hook para buscar projeto por ID
export const useProjectById = (projectId: string) => {
  const hasProjectId = Boolean(projectId);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(hasProjectId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasProjectId) {
      return;
    }

    const docRef = doc(db, 'projects', projectId).withConverter(projectConverter);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setProject(docSnap.data());
          setError(null);
        } else {
          setProject(null);
          setError('Projeto não encontrado');
        }

        setLoading(false);
      },
      (snapshotError) => {
        logger.error('Erro ao carregar projeto por ID', {
          action: 'load_project_by_id',
          metadata: { projectId, error: String(snapshotError) },
          page: 'useProjectById',
        });
        setError(getUserFacingErrorMessage(snapshotError, 'Erro ao carregar projeto'));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [hasProjectId, projectId]);

  return {
    project: hasProjectId ? project : null,
    loading: hasProjectId ? loading : false,
    error: hasProjectId ? error : null,
  };
};

// Hook para buscar projeto por slug (legacy - pode ser removido futuramente)
export const useProject = (slug: string) => {
  const hasSlug = Boolean(slug);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(hasSlug);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSlug) {
      return;
    }

    const q = query(
      collection(db, 'projects').withConverter(projectConverter),
      where('slug', '==', slug)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        if (!querySnapshot.empty) {
          const projectDoc = querySnapshot.docs[0];
          setProject(projectDoc.data());
          setError(null);
        } else {
          setProject(null);
          setError('Projeto não encontrado');
        }

        setLoading(false);
      },
      (snapshotError) => {
        logger.error('Erro ao carregar projeto por slug', {
          action: 'load_project_by_slug',
          metadata: { slug, error: String(snapshotError) },
          page: 'useProject',
        });
        setError(getUserFacingErrorMessage(snapshotError, 'Erro ao carregar projeto'));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [hasSlug, slug]);

  return {
    project: hasSlug ? project : null,
    loading: hasSlug ? loading : false,
    error: hasSlug ? error : null,
  };
};

export const useTickets = (projectId: string) => {
  const hasProjectId = Boolean(projectId);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(hasProjectId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasProjectId) {
      return;
    }

    const q = query(
      collection(db, 'tickets').withConverter(ticketConverter),
      where('projectId', '==', projectId),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const ticketsData = querySnapshot.docs.map((ticketDoc) => ticketDoc.data());

        setTickets(ticketsData);
        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        logger.error('Erro ao carregar tickets do projeto', {
          action: 'load_project_tickets',
          metadata: { projectId, error: String(snapshotError) },
          page: 'useTickets',
        });
        setError(getUserFacingErrorMessage(snapshotError, 'Erro ao carregar tickets'));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [hasProjectId, projectId]);

  return {
    tickets: hasProjectId ? tickets : [],
    loading: hasProjectId ? loading : false,
    error: hasProjectId ? error : null,
    setTickets,
  };
};
