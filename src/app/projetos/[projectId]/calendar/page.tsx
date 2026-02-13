'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProjectById, useTickets } from '@/hooks/useProject';
import CalendarView from '@/components/CalendarView';
import { KanbanBoardSkeleton } from '@/components/ui/Skeletons';
import { Ticket } from '@/types';
import { getSingleRouteParam } from '@/lib/typeGuards';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { FaGear, FaTableColumns, FaCalendarDays, FaTimeline } from 'react-icons/fa6';

export default function ProjectCalendarPage() {
  return (
    <ProtectedRoute>
      <ProjectCalendarContent />
    </ProtectedRoute>
  );
}

function ProjectCalendarContent() {
  const params = useParams();
  const router = useRouter();
  const projectId = getSingleRouteParam(params.projectId);

  if (!projectId) {
    return (
      <AppLayout title="Erro">
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-600">Identificador de projeto inválido.</p>
        </div>
      </AppLayout>
    );
  }
  
  const { project, loading: projectLoading, error } = useProjectById(projectId);
  const { tickets, loading: ticketsLoading } = useTickets(projectId);

  const handleTicketClick = (ticket: Ticket) => {
    router.push(`/projetos/editar/${projectId}/tickets`);
  };

  if (projectLoading || ticketsLoading) {
    return (
      <AppLayout title="Carregando...">
        <KanbanBoardSkeleton />
      </AppLayout>
    );
  }

  if (error || !project) {
    return (
      <AppLayout title="Erro">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Projeto não encontrado</h1>
            <p className="text-gray-600 mb-6">{error || 'O projeto solicitado não existe.'}</p>
            <Link href="/projetos" className="text-blue-600 hover:underline text-sm">
              Voltar para projetos
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title={project.name} 
      subtitle="Calendário"
      headerRightContent={
        <div className="flex items-center gap-2">
          {/* Navegação entre visualizações */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 mr-2">
            <Link
              href={`/projetos/${projectId}`}
              className="px-3 py-1.5 text-sm rounded-md text-gray-600 hover:text-gray-900 transition-colors"
              title="Kanban"
            >
              <FaTableColumns className="w-4 h-4" />
            </Link>
            <Link
              href={`/projetos/${projectId}/gantt`}
              className="px-3 py-1.5 text-sm rounded-md text-gray-600 hover:text-gray-900 transition-colors"
              title="Gantt"
            >
              <FaChartGantt className="w-4 h-4" />
            </Link>
            <span className="px-3 py-1.5 text-sm rounded-md bg-white text-blue-600 shadow-sm">
              <FaCalendarDays className="w-4 h-4" />
            </span>
            <Link
              href={`/projetos/${projectId}/timeline`}
              className="px-3 py-1.5 text-sm rounded-md text-gray-600 hover:text-gray-900 transition-colors"
              title="Timeline"
            >
              <FaTimeline className="w-4 h-4" />
            </Link>
          </div>
          
          <Link
            href={`/projetos/editar/${projectId}`}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Configurações do projeto"
          >
            <FaGear className="w-5 h-5" />
          </Link>
        </div>
      }
    >
      <div className="p-6">
        <CalendarView 
          tickets={tickets} 
          onTicketClick={handleTicketClick}
        />
      </div>
    </AppLayout>
  );
}

// Ícone de Gantt customizado
function FaChartGantt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="4" width="8" height="3" rx="0.5" />
      <rect x="6" y="9" width="12" height="3" rx="0.5" />
      <rect x="4" y="14" width="6" height="3" rx="0.5" />
      <rect x="8" y="19" width="10" height="3" rx="0.5" />
    </svg>
  );
}
