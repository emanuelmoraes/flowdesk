'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project, Ticket } from '@/types';
import { ProjectCardSkeleton } from '@/components/ui/Skeletons';
import { calculateProjectProgress, getTicketsByProject } from '@/lib/services';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';
import { FaClipboardList } from 'react-icons/fa6';

interface ProjectWithProgress extends Project {
  progress: number;
  totalTickets: number;
  completedTickets: number;
}

export default function ProjetosPage() {
  return (
    <ProtectedRoute>
      <ProjetosContent />
    </ProtectedRoute>
  );
}

function ProjetosContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Buscar projetos onde o usuário é membro
      const projectsQuery = query(
        collection(db, 'projects'),
        where('members', 'array-contains', user.uid),
        orderBy('updatedAt', 'desc')
      );
      const projectsSnapshot = await getDocs(projectsQuery);
      
      const projectsData = projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Project[];
      
      if (projectsData.length === 0) {
        setProjects([]);
        setLoading(false);
        return;
      }
      
      // Buscar TODOS os tickets de uma vez
      const projectIds = projectsData.map(p => p.id);
      const ticketsQuery = query(
        collection(db, 'tickets'),
        where('projectId', 'in', projectIds.slice(0, 10)) // Firestore limita 'in' a 10 itens
      );
      const ticketsSnapshot = await getDocs(ticketsQuery);
      
      const allTickets = ticketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Ticket[];
      
      // Agrupar tickets por projeto (no cliente) usando função utilitária
      const ticketsByProject = getTicketsByProject(allTickets);
      
      // Calcular progresso para cada projeto usando função utilitária
      const projectsWithProgress = projectsData.map(project => {
        const tickets = ticketsByProject[project.id] || [];
        const progressData = calculateProjectProgress(tickets);
        
        return {
          ...project,
          ...progressData,
        } as ProjectWithProgress;
      });
      
      setProjects(projectsWithProgress);
    } catch (error) {
      logger.error('Erro ao carregar projetos', {
        action: 'load_projects',
        metadata: { error: String(error) },
        page: 'projetos',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <AppLayout showNewProject>
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 text-blue-600 flex justify-center">
              <FaClipboardList />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Nenhum projeto encontrado</h2>
            <p className="text-gray-600 mb-6">Comece criando seu primeiro projeto!</p>
            <button
              onClick={() => router.push('/criar-projeto')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Criar Primeiro Projeto
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow border border-gray-200 overflow-hidden"
              >
                <div className="p-6">
                  {/* Nome do Projeto */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">
                    {project.name}
                  </h3>
                  
                  {/* Descrição do Projeto */}
                  {project.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  
                  {/* Progresso do Projeto */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Progresso</span>
                      <span className="text-sm font-bold text-blue-600">{project.progress}%</span>
                    </div>
                    
                    {/* Barra de Progresso */}
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          project.progress === 100
                            ? 'bg-green-600'
                            : project.progress >= 75
                            ? 'bg-blue-600'
                            : project.progress >= 50
                            ? 'bg-yellow-500'
                            : project.progress >= 25
                            ? 'bg-orange-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                    
                    {/* Informação de Tickets */}
                    <p className="text-xs text-gray-500 mt-1">
                      {project.completedTickets} de {project.totalTickets} tickets concluídos
                    </p>
                  </div>
                  
                  {/* Data de Atualização */}
                  <p className="text-xs text-gray-500 mb-4">
                    Atualizado em {formatDate(project.updatedAt)}
                  </p>
                  
                  {/* Botões de Ação */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/projetos/editar/${project.id}`)}
                      className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                    >
                      Editar
                    </button>
                    
                    <button
                      onClick={() => router.push(`/projetos/editar/${project.id}/tickets`)}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                    >
                      Tickets
                    </button>

                    <button
                      onClick={() => router.push(`/projetos/${project.id}`)}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                    >
                      Kanban
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </AppLayout>
  );
}
