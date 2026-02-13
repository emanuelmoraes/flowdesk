'use client';

import { useMemo, useState } from 'react';
import { Ticket } from '@/types';
import { FaCircle, FaCircleCheck, FaFilter } from 'react-icons/fa6';
import { ticketTypeLabels, ticketTypeIcons } from '@/components/icons/TicketTypeIcons';

interface TimelineViewProps {
  tickets: Ticket[];
  onTicketClick?: (ticket: Ticket) => void;
}

const statusLabels: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'A Fazer',
  'in-progress': 'Em Progresso',
  review: 'Em Revisão',
  done: 'Concluído',
};

const priorityLabels: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

const priorityColors: Record<string, string> = {
  low: 'border-gray-300 bg-gray-50',
  medium: 'border-blue-300 bg-blue-50',
  high: 'border-orange-300 bg-orange-50',
  urgent: 'border-red-300 bg-red-50',
};

const priorityDots: Record<string, string> = {
  low: 'text-gray-400',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
};

type GroupBy = 'day' | 'week' | 'month';

const groupByOptions: readonly GroupBy[] = ['day', 'week', 'month'];

export default function TimelineView({ tickets, onTicketClick }: TimelineViewProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [showCompleted, setShowCompleted] = useState(true);

  // Agrupa por data de criação
  const groupedTickets = useMemo(() => {
    const filtered = showCompleted 
      ? tickets 
      : tickets.filter(t => t.status !== 'done');

    const sorted = [...filtered].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const groups = new Map<string, Ticket[]>();

    sorted.forEach(ticket => {
      const date = new Date(ticket.createdAt);
      let key: string;

      if (groupBy === 'day') {
        key = date.toLocaleDateString('pt-BR', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });
      } else if (groupBy === 'week') {
        // Início da semana
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        key = `${weekStart.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      } else {
        key = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(ticket);
    });

    return Array.from(groups.entries());
  }, [tickets, groupBy, showCompleted]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header com filtros */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FaFilter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">Agrupar por:</span>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {groupByOptions.map((option) => (
              <button
                key={option}
                onClick={() => setGroupBy(option)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  groupBy === option
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {option === 'day' ? 'Dia' : option === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Mostrar concluídos
        </label>
      </div>

      {/* Timeline */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {groupedTickets.length === 0 ? (
          <div className="text-center py-8 text-gray-500 space-y-1">
            <p>Nenhum ticket encontrado para os filtros atuais.</p>
            <p className="text-sm text-gray-400">Ajuste os filtros ou crie um novo ticket para preencher a timeline.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Linha vertical da timeline */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

            {groupedTickets.map(([groupKey, groupTickets], groupIndex) => (
              <div key={groupKey} className="mb-6 last:mb-0">
                {/* Header do grupo */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center z-10">
                    <span className="text-blue-600 font-semibold text-xs">
                      {groupTickets.length}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 capitalize">
                    {groupKey}
                  </h3>
                </div>

                {/* Tickets do grupo */}
                <div className="ml-12 space-y-3">
                  {groupTickets.map((ticket) => {
                    const TypeIcon = ticketTypeIcons[ticket.type];
                    
                    return (
                      <div
                        key={ticket.id}
                        onClick={() => onTicketClick?.(ticket)}
                        className={`p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-shadow ${priorityColors[ticket.priority]}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {ticket.status === 'done' ? (
                              <FaCircleCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <FaCircle className={`w-3 h-3 flex-shrink-0 ${priorityDots[ticket.priority]}`} />
                            )}
                            <span className="font-medium text-gray-900 truncate">
                              {ticket.title}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {getRelativeTime(ticket.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-2 ml-5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                            <TypeIcon className="w-3 h-3" />
                            {ticketTypeLabels[ticket.type]}
                          </span>
                          
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            ticket.status === 'done' 
                              ? 'bg-green-100 text-green-700'
                              : ticket.status === 'in-progress'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {statusLabels[ticket.status]}
                          </span>

                          <span className="text-xs text-gray-500">
                            {priorityLabels[ticket.priority]}
                          </span>

                          {ticket.dueDate && (
                            <span className={`text-xs ${
                              new Date(ticket.dueDate) < new Date() && ticket.status !== 'done'
                                ? 'text-red-600 font-medium'
                                : 'text-gray-500'
                            }`}>
                              Entrega: {new Date(ticket.dueDate).toLocaleDateString('pt-BR')}
                            </span>
                          )}

                          {ticket.progress !== undefined && ticket.progress > 0 && (
                            <span className="text-xs text-gray-500">
                              {ticket.progress}% concluído
                            </span>
                          )}
                        </div>

                        {ticket.tags && ticket.tags.length > 0 && (
                          <div className="flex gap-1 mt-2 ml-5 flex-wrap">
                            {ticket.tags.slice(0, 3).map((tag, i) => (
                              <span
                                key={i}
                                className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {ticket.tags.length > 3 && (
                              <span className="text-xs text-gray-400">
                                +{ticket.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 p-3 border-t border-gray-200">
        {tickets.length} ticket(s) no total • {tickets.filter(t => t.status === 'done').length} concluído(s)
      </div>
    </div>
  );
}
