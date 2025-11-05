'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useProject, useTickets } from '@/hooks/useProject';
import KanbanBoard from '@/components/KanbanBoard';
import { Ticket, TicketPriority, TicketStatus, TicketType } from '@/types';
import { createTicket } from '@/lib/services';

export default function ProjectPage() {
  const params = useParams();
  const slug = params.projectSlug as string;
  
  const { project, loading: projectLoading, error } = useProject(slug);
  const { tickets, loading: ticketsLoading, setTickets } = useTickets(project?.id || '');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketDescription, setNewTicketDescription] = useState('');
  const [newTicketPriority, setNewTicketPriority] = useState<TicketPriority>('medium');
  const [newTicketStatus, setNewTicketStatus] = useState<TicketStatus>('backlog');
  const [newTicketType, setNewTicketType] = useState<TicketType>('tarefa');
  const [newTicketTags, setNewTicketTags] = useState<string>('');
  const [tagInput, setTagInput] = useState<string>('');

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
      console.error('Erro ao criar ticket:', error);
      alert('Erro ao criar ticket. Tente novamente.');
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
          <a href="/" className="text-blue-600 hover:underline">
            Voltar para home
          </a>
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
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + Novo Ticket
            </button>
          </div>
          
          
        </div>
      </header>

      {/* Kanban Board */}
      <main className="container mx-auto px-4 py-6">
        {ticketsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando tickets...</p>
          </div>
        ) : (
          <KanbanBoard
            tickets={tickets}
            onTicketsUpdate={setTickets}
          />
        )}
      </main>

      {/* Modal de criação de ticket */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Novo Ticket</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={newTicketTitle}
                  onChange={(e) => setNewTicketTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite o título do ticket"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={newTicketDescription}
                  onChange={(e) => setNewTicketDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Descreva o ticket (opcional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={newTicketType}
                    onChange={(e) => setNewTicketType(e.target.value as TicketType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="bug">🐛 Bug</option>
                    <option value="melhoria">✨ Melhoria</option>
                    <option value="tarefa">📋 Tarefa</option>
                    <option value="estoria">📖 Estória</option>
                    <option value="epico">🎯 Épico</option>
                    <option value="investigacao">🔍 Investigação</option>
                    <option value="novidade">🚀 Novidade</option>
                    <option value="suporte">🛟 Suporte</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={newTicketPriority}
                    onChange={(e) => setNewTicketPriority(e.target.value as TicketPriority)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={newTicketStatus}
                  onChange={(e) => setNewTicketStatus(e.target.value as TicketStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">A Fazer</option>
                  <option value="in-progress">Em Progresso</option>
                  <option value="review">Em Revisão</option>
                  <option value="done">Concluído</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={newTicketTags}
                  onChange={(e) => setNewTicketTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite as tags separadas por vírgula (ex: frontend, urgente, design)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separe múltiplas tags com vírgula
                </p>
              </div>
            </div>
            
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
          </div>
        </div>
      )}
    </div>
  );
}
