'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useProjectById, useTickets } from '@/hooks/useProject';
import KanbanBoardNative from '@/components/KanbanBoardNative';
import Modal from '@/components/ui/Modal';
import TicketFormFields from '@/components/forms/TicketFormFields';
import { KanbanBoardSkeleton } from '@/components/ui/Skeletons';
import { Ticket, TicketPriority, TicketStatus, TicketType } from '@/types';
import { createTicket, updateTicket } from '@/lib/services';
import { logger } from '@/lib/logger';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { FaGear, FaTableColumns, FaCalendarDays, FaTimeline } from 'react-icons/fa6';

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

export default function ProjectKanbanPage() {
  return (
    <ProtectedRoute>
      <ProjectKanbanContent />
    </ProtectedRoute>
  );
}

function ProjectKanbanContent() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const { project, loading: projectLoading, error } = useProjectById(projectId);
  const { tickets, loading: ticketsLoading, setTickets } = useTickets(projectId);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketDescription, setNewTicketDescription] = useState('');
  const [newTicketPriority, setNewTicketPriority] = useState<TicketPriority>('medium');
  const [newTicketStatus, setNewTicketStatus] = useState<TicketStatus>('backlog');
  const [newTicketType, setNewTicketType] = useState<TicketType>('tarefa');
  const [newTicketTags, setNewTicketTags] = useState<string>('');

  const handleCreateTicket = async () => {
    if (!project || !newTicketTitle.trim()) return;

    try {
      // Processa as tags
      const tagsArray = newTicketTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const ticketId = await createTicket(
        project.id,
        newTicketTitle,
        newTicketDescription,
        newTicketStatus,
        newTicketPriority,
        newTicketType,
        tagsArray
      );

      // Adiciona o novo ticket localmente
      const newTicket: Ticket = {
        id: ticketId,
        title: newTicketTitle,
        description: newTicketDescription,
        status: newTicketStatus,
        priority: newTicketPriority,
        type: newTicketType,
        tags: tagsArray,
        projectId: project.id,
        order: tickets.filter(t => t.status === newTicketStatus).length + 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setTickets([...tickets, newTicket]);
      
      // Limpa o formulário
      setNewTicketTitle('');
      setNewTicketDescription('');
      setNewTicketPriority('medium');
      setNewTicketStatus('backlog');
      setNewTicketType('tarefa');
      setNewTicketTags('');
      setShowCreateModal(false);
    } catch (error) {
      logger.error('Erro ao criar ticket', {
        action: 'create_ticket',
        metadata: { projectId: project.id, error: String(error) },
        page: 'kanban',
      });
    }
  };

  const handleEditTicket = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setNewTicketTitle(ticket.title);
    setNewTicketDescription(ticket.description || '');
    setNewTicketPriority(ticket.priority || 'medium');
    setNewTicketStatus(ticket.status || 'backlog');
    setNewTicketType(ticket.type || 'tarefa');
    setNewTicketTags(ticket.tags?.join(', ') || '');
    setShowEditModal(true);
  };

  const handleUpdateTicket = async () => {
    if (!editingTicket || !newTicketTitle.trim()) return;

    try {
      const tagsArray = newTicketTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await updateTicket(editingTicket.id, {
        title: newTicketTitle.trim(),
        description: newTicketDescription.trim() || '',
        priority: newTicketPriority || 'medium',
        status: newTicketStatus || 'backlog',
        type: newTicketType || 'tarefa',
        tags: tagsArray.length > 0 ? tagsArray : [],
      });

      const updatedTickets = tickets.map(t =>
        t.id === editingTicket.id
          ? {
              ...t,
              title: newTicketTitle.trim(),
              description: newTicketDescription.trim() || '',
              priority: newTicketPriority,
              status: newTicketStatus,
              type: newTicketType,
              tags: tagsArray,
            }
          : t
      );
      setTickets(updatedTickets);

      setShowEditModal(false);
      setEditingTicket(null);
      setNewTicketTitle('');
      setNewTicketDescription('');
      setNewTicketPriority('medium');
      setNewTicketStatus('backlog');
      setNewTicketType('tarefa');
      setNewTicketTags('');
    } catch (error) {
      logger.error('Erro ao atualizar ticket', {
        action: 'update_ticket',
        metadata: { ticketId: editingTicket.id, error: String(error) },
        page: 'kanban',
      });
    }
  };

  if (projectLoading) {
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
      subtitle={project.description}
      headerRightContent={
        <div className="flex items-center gap-2">
          {/* Navegação entre visualizações */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 mr-2">
            <span className="px-3 py-1.5 text-sm rounded-md bg-white text-blue-600 shadow-sm" title="Kanban">
              <FaTableColumns className="w-4 h-4" />
            </span>
            <Link
              href={`/projetos/${projectId}/gantt`}
              className="px-3 py-1.5 text-sm rounded-md text-gray-600 hover:text-gray-900 transition-colors"
              title="Gantt"
            >
              <FaChartGantt className="w-4 h-4" />
            </Link>
            <Link
              href={`/projetos/${projectId}/calendar`}
              className="px-3 py-1.5 text-sm rounded-md text-gray-600 hover:text-gray-900 transition-colors"
              title="Calendário"
            >
              <FaCalendarDays className="w-4 h-4" />
            </Link>
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
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Configurações do Projeto"
          >
            <FaGear className="w-5 h-5" />
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Novo Ticket
          </button>
        </div>
      }
    >

      {/* Kanban Board */}
      <main className="container mx-auto px-4 py-6">
        {ticketsLoading ? (
          <KanbanBoardSkeleton />
        ) : (
          <KanbanBoardNative
            tickets={tickets}
            onTicketsUpdate={setTickets}
            onEditTicket={handleEditTicket}
          />
        )}
      </main>

      {/* Modal de criação de ticket */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Novo Ticket"
      >
        <TicketFormFields
          title={newTicketTitle}
          description={newTicketDescription}
          type={newTicketType}
          priority={newTicketPriority}
          status={newTicketStatus}
          tags={newTicketTags}
          onTitleChange={setNewTicketTitle}
          onDescriptionChange={setNewTicketDescription}
          onTypeChange={setNewTicketType}
          onPriorityChange={setNewTicketPriority}
          onStatusChange={setNewTicketStatus}
          onTagsChange={setNewTicketTags}
        />
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowCreateModal(false)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateTicket}
            disabled={!newTicketTitle.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Criar
          </button>
        </div>
      </Modal>

      {/* Modal de edição de ticket */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTicket(null);
        }}
        title="Editar Ticket"
      >
        <TicketFormFields
          title={newTicketTitle}
          description={newTicketDescription}
          type={newTicketType}
          priority={newTicketPriority}
          status={newTicketStatus}
          tags={newTicketTags}
          onTitleChange={setNewTicketTitle}
          onDescriptionChange={setNewTicketDescription}
          onTypeChange={setNewTicketType}
          onPriorityChange={setNewTicketPriority}
          onStatusChange={setNewTicketStatus}
          onTagsChange={setNewTicketTags}
        />
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => {
              setShowEditModal(false);
              setEditingTicket(null);
            }}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpdateTicket}
            disabled={!newTicketTitle.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Salvar
          </button>
        </div>
      </Modal>
    </AppLayout>
  );
}
