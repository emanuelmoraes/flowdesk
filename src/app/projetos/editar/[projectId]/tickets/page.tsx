'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ticket, Project, TicketStatus, TicketPriority, TicketType } from '@/types';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { useNotification } from '@/hooks/useNotification';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';
import { createTicket, updateTicket, deleteTicket } from '@/lib/services';
import { ticketTypeLabels, ticketTypeIcons } from '@/components/icons/TicketTypeIcons';
import { FaTicket } from 'react-icons/fa6';

export default function GerenciarTicketsPage() {
  return (
    <ProtectedRoute>
      <GerenciarTicketsContent />
    </ProtectedRoute>
  );
}

function GerenciarTicketsContent() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const { user } = useAuth();
  const { showError } = useNotification();

  const [project, setProject] = useState<Project | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TicketPriority | 'all'>('all');
  const [filterType, setFilterType] = useState<TicketType | 'all'>('all');
  const [canManageTickets, setCanManageTickets] = useState(false);

  useEffect(() => {
    fetchProjectAndTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user?.uid]);

  const fetchProjectAndTickets = async () => {
    try {
      setLoading(true);
      
      // Buscar projeto
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (projectDoc.exists()) {
        const projectData = {
          id: projectDoc.id,
          ...projectDoc.data(),
          createdAt: projectDoc.data().createdAt?.toDate(),
          updatedAt: projectDoc.data().updatedAt?.toDate(),
        } as Project;

        setProject(projectData);

        const isMember = !!user && (projectData.members || []).includes(user.uid);
        setCanManageTickets(isMember);

        if (!isMember) {
          setTickets([]);
          return;
        }
      }

      // Buscar tickets
      const q = query(
        collection(db, 'tickets'),
        where('projectId', '==', projectId)
      );
      const querySnapshot = await getDocs(q);
      
      const ticketsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Ticket[];
      
      ticketsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setTickets(ticketsData);
    } catch (error) {
      setCanManageTickets(false);
      logger.error('Erro ao carregar dados', {
        action: 'load_tickets',
        metadata: { projectId, error: String(error) },
        page: 'gerenciar_tickets',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!canManageTickets) {
      showError('Você não tem permissão para excluir tickets deste projeto.');
      return;
    }

    try {
      await deleteTicket(ticketId);
      setTickets(tickets.filter(t => t.id !== ticketId));
      setDeleteConfirm(null);
      logger.success('Ticket deletado', {
        action: 'delete_ticket',
        metadata: { ticketId },
        page: 'gerenciar_tickets',
      });
    } catch (error) {
      logger.error('Erro ao deletar ticket', {
        action: 'delete_ticket',
        metadata: { ticketId, error: String(error) },
        page: 'gerenciar_tickets',
      });
    }
  };

  const statusLabels: Record<TicketStatus, string> = {
    'backlog': 'Backlog',
    'todo': 'A Fazer',
    'in-progress': 'Em Progresso',
    'review': 'Em Revisão',
    'done': 'Concluído',
  };

  const priorityLabels: Record<TicketPriority, string> = {
    'low': 'Baixa',
    'medium': 'Média',
    'high': 'Alta',
    'urgent': 'Urgente',
  };

  const statusColors: Record<TicketStatus, string> = {
    'backlog': 'bg-gray-100 text-gray-800',
    'todo': 'bg-blue-100 text-blue-800',
    'in-progress': 'bg-yellow-100 text-yellow-800',
    'review': 'bg-purple-100 text-purple-800',
    'done': 'bg-green-100 text-green-800',
  };

  const priorityColors: Record<TicketPriority, string> = {
    'low': 'bg-gray-200 text-gray-800',
    'medium': 'bg-blue-200 text-blue-800',
    'high': 'bg-orange-200 text-orange-800',
    'urgent': 'bg-red-200 text-red-800',
  };

  // Alias para typeLabels
  const typeLabels = ticketTypeLabels;

  const typeColors: Record<TicketType, string> = {
    'bug': 'bg-red-100 text-red-700',
    'melhoria': 'bg-green-100 text-green-700',
    'tarefa': 'bg-blue-100 text-blue-700',
    'estoria': 'bg-purple-100 text-purple-700',
    'epico': 'bg-yellow-100 text-yellow-700',
    'investigacao': 'bg-orange-100 text-orange-700',
    'novidade': 'bg-pink-100 text-pink-700',
    'suporte': 'bg-cyan-100 text-cyan-700',
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

  const filteredTickets = tickets.filter(ticket => {
    if (filterStatus !== 'all' && ticket.status !== filterStatus) return false;
    if (filterPriority !== 'all' && ticket.priority !== filterPriority) return false;
    if (filterType !== 'all' && ticket.type !== filterType) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout 
      title="Gerenciar Tickets" 
      subtitle={project?.name}
      headerRightContent={
        <>
          <button
            onClick={() => {
              if (!canManageTickets) {
                showError('Você não tem permissão para criar tickets neste projeto.');
                return;
              }
              setShowCreateModal(true);
            }}
            disabled={!canManageTickets}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Novo Ticket
          </button>
          <button
            onClick={() => router.push(`/projetos/${projectId}`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Ver Kanban
          </button>
        </>
      }
    >
      {!canManageTickets && (
        <div className="mx-4 mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Você não tem permissão para gerenciar tickets neste projeto.
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white border-b border-gray-200 mt-5">
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as TicketStatus | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos</option>
                <option value="backlog">Backlog</option>
                <option value="todo">A Fazer</option>
                <option value="in-progress">Em Progresso</option>
                <option value="review">Em Revisão</option>
                <option value="done">Concluído</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">Prioridade:</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as TicketPriority | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todas</option>
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">Tipo:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as TicketType | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos</option>
                {(Object.entries(ticketTypeLabels) as [TicketType, string][]).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="ml-auto text-sm text-gray-600 flex items-center">
              {filteredTickets.length} de {tickets.length} tickets
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Tickets */}
      <main className="container mx-auto px-4 py-6">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <div className="text-6xl mb-4 text-blue-600 flex justify-center">
              <FaTicket />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Nenhum ticket encontrado</h2>
            <p className="text-gray-600">
              {filterStatus !== 'all' || filterPriority !== 'all' || filterType !== 'all'
                ? 'Tente ajustar os filtros' 
                : 'Crie tickets pelo Kanban'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prioridade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{ticket.title}</span>
                        {ticket.description && (
                          <span className="text-sm text-gray-500 line-clamp-1">{ticket.description}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${typeColors[ticket.type]}`}>
                        {typeLabels[ticket.type]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[ticket.status]}`}>
                        {statusLabels[ticket.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${priorityColors[ticket.priority]}`}>
                        {priorityLabels[ticket.priority]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {ticket.tags && ticket.tags.length > 0 ? (
                          ticket.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full border border-gray-300"
                            >
                              #{tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(ticket.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          if (!canManageTickets) {
                            showError('Você não tem permissão para editar tickets deste projeto.');
                            return;
                          }
                          setEditingTicket(ticket);
                        }}
                        disabled={!canManageTickets}
                        className="text-blue-600 hover:text-blue-900 mr-4 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          if (!canManageTickets) {
                            showError('Você não tem permissão para excluir tickets deste projeto.');
                            return;
                          }
                          setDeleteConfirm(ticket.id);
                        }}
                        disabled={!canManageTickets}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Deletar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal de Edição */}
      {editingTicket && (
        <EditTicketModal
          ticket={editingTicket}
          canManageTickets={canManageTickets}
          onClose={() => setEditingTicket(null)}
          onSave={() => {
            fetchProjectAndTickets();
            setEditingTicket(null);
          }}
        />
      )}

      {/* Modal de Criação */}
      {showCreateModal && (
        <CreateTicketModal
          projectId={projectId}
          canManageTickets={canManageTickets}
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            fetchProjectAndTickets();
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Confirmar Exclusão</h2>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja deletar este ticket? Esta ação não pode ser desfeita.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteTicket(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// Modal de Edição de Ticket
function EditTicketModal({ 
  ticket, 
  canManageTickets,
  onClose, 
  onSave 
}: { 
  ticket: Ticket; 
  canManageTickets: boolean;
  onClose: () => void; 
  onSave: () => void; 
}) {
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description || '');
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
  const [type, setType] = useState<TicketType>(ticket.type);
  const [tags, setTags] = useState<string>(ticket.tags?.join(', ') || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canManageTickets) {
      return;
    }

    setSaving(true);

    try {
      // Processa as tags
      const tagsArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const ticketRef = doc(db, 'tickets', ticket.id);
      await updateTicket(ticket.id, {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        type,
        tags: tagsArray,
      });
      onSave();
    } catch (error) {
      logger.error('Erro ao atualizar ticket', {
        action: 'update_ticket',
        metadata: { ticketId: ticket.id, error: String(error) },
        page: 'gerenciar_tickets',
      });
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Editar Ticket</h2>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TicketType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {(Object.entries(ticketTypeLabels) as [TicketType, string][]).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
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
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Separe por vírgula"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal de Criação de Ticket
function CreateTicketModal({ 
  projectId, 
  canManageTickets,
  onClose, 
  onSave 
}: { 
  projectId: string; 
  canManageTickets: boolean;
  onClose: () => void; 
  onSave: () => void; 
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TicketStatus>('backlog');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [type, setType] = useState<TicketType>('tarefa');
  const [tags, setTags] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canManageTickets) {
      return;
    }
    
    if (!title.trim()) {
      alert('O título é obrigatório.');
      return;
    }

    setSaving(true);

    try {
      // Processa as tags
      const tagsArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await createTicket(
        projectId,
        title.trim(),
        description.trim(),
        status,
        priority,
        type,
        tagsArray
      );
      onSave();
    } catch (error) {
      logger.error('Erro ao criar ticket', {
        action: 'create_ticket',
        metadata: { projectId, error: String(error) },
        page: 'gerenciar_tickets',
      });
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Criar Novo Ticket</h2>
        
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Digite o título do ticket"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Descreva os detalhes do ticket (opcional)"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TicketType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {(Object.entries(ticketTypeLabels) as [TicketType, string][]).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status Inicial
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Separe por vírgula"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? 'Criando...' : 'Criar Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
