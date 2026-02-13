'use client';

import React from 'react';
import { Ticket } from '@/types';
import { MdEdit } from 'react-icons/md';

interface TicketListViewProps {
  tickets: Ticket[];
  onEditTicket: (ticket: Ticket) => void;
}

const priorityColors = {
  low: 'bg-gray-200 text-gray-800',
  medium: 'bg-blue-200 text-blue-800',
  high: 'bg-orange-200 text-orange-800',
  urgent: 'bg-red-200 text-red-800',
};

const priorityLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

const typeColors = {
  bug: 'bg-red-100 text-red-700 border-red-300',
  melhoria: 'bg-green-100 text-green-700 border-green-300',
  tarefa: 'bg-blue-100 text-blue-700 border-blue-300',
  estoria: 'bg-purple-100 text-purple-700 border-purple-300',
  epico: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  investigacao: 'bg-orange-100 text-orange-700 border-orange-300',
  novidade: 'bg-pink-100 text-pink-700 border-pink-300',
  suporte: 'bg-cyan-100 text-cyan-700 border-cyan-300',
};

const typeLabels = {
  bug: 'Bug',
  melhoria: 'Melhoria',
  tarefa: 'Tarefa',
  estoria: 'Estória',
  epico: 'Épico',
  investigacao: 'Investigação',
  novidade: 'Novidade',
  suporte: 'Suporte',
};

const statusColors = {
  backlog: 'bg-gray-100 text-gray-700',
  todo: 'bg-blue-100 text-blue-700',
  'in-progress': 'bg-yellow-100 text-yellow-700',
  review: 'bg-purple-100 text-purple-700',
  done: 'bg-green-100 text-green-700',
};

const statusLabels = {
  backlog: 'Backlog',
  todo: 'A Fazer',
  'in-progress': 'Em Progresso',
  review: 'Revisão',
  done: 'Concluído',
};

export default function TicketListView({ tickets, onEditTicket }: TicketListViewProps) {
  // Ordena tickets por status e depois por ordem
  const sortedTickets = [...tickets].sort((a, b) => {
    const statusOrder = ['backlog', 'todo', 'in-progress', 'review', 'done'];
    const statusDiff = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
    if (statusDiff !== 0) return statusDiff;
    return a.order - b.order;
  });

  if (tickets.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Ainda não há tickets neste projeto.</p>
        <p className="text-gray-400 text-sm mt-2">
          Clique em "+ Novo Ticket" para registrar a primeira tarefa e começar o fluxo do time.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Título
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prioridade
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-xs px-2 py-1 rounded border ${typeColors[ticket.type]}`}>
                    {typeLabels[ticket.type]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">{ticket.title}</div>
                  {ticket.description && (
                    <div className="text-sm text-gray-500 truncate max-w-md">
                      {ticket.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-xs px-2 py-1 rounded ${statusColors[ticket.status]}`}>
                    {statusLabels[ticket.status]}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-xs px-2 py-1 rounded ${priorityColors[ticket.priority]}`}>
                    {priorityLabels[ticket.priority]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {ticket.tags && ticket.tags.length > 0 ? (
                      ticket.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                    {ticket.tags && ticket.tags.length > 3 && (
                      <span className="text-xs text-gray-400">
                        +{ticket.tags.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <button
                    onClick={() => onEditTicket(ticket)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
                    title="Editar ticket"
                  >
                    <MdEdit size={16} />
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
