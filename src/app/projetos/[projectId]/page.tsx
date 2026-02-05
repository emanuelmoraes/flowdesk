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
import AppHeader from '@/components/AppHeader';
import { FaGear } from 'react-icons/fa6';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando projeto...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-8">Projeto não encontrado</p>
          <Link href="/projetos" className="text-blue-600 hover:underline">
            Voltar para projetos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader 
        title={project.name}
        subtitle={project.description}
        rightContent={
          <>
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
          </>
        }
      />

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
    </div>
  );
}
