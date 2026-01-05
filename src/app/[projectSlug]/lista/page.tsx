'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useProject, useTickets } from '@/hooks/useProject';
import TicketListView from '@/components/TicketListView';
import Modal from '@/components/ui/Modal';
import TicketFormFields from '@/components/forms/TicketFormFields';
import { Ticket, TicketPriority, TicketStatus, TicketType } from '@/types';
import { createTicket, updateTicket } from '@/lib/services';
import { logger } from '@/lib/logger';

export default function ProjectListPage() {
  const params = useParams();
  const slug = params.projectSlug as string;
  
  const { project, loading: projectLoading, error } = useProject(slug);
  const { tickets, loading: ticketsLoading, setTickets } = useTickets(project?.id || '');
  
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
        page: 'lista',
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
        page: 'lista',
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
          <Link href="/" className="text-blue-600 hover:underline">
            Voltar para home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-sm text-gray-500">flowdesk.com/{slug}</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Toggle de visualização */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Link
                  href={`/${slug}`}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-md transition-colors"
                >
                  Kanban
                </Link>
                <span className="px-3 py-1.5 text-sm font-medium bg-white text-blue-600 rounded-md shadow-sm">
                  Lista
                </span>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                + Novo Ticket
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Lista de Tickets */}
      <main className="container mx-auto px-4 py-6">
        {ticketsLoading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 rounded w-full"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        ) : (
          <TicketListView
            tickets={tickets}
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
