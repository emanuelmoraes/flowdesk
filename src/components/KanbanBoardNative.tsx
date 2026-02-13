'use client';

import React, { useState, useMemo } from 'react';
import { Ticket, TicketStatus } from '@/types';
import { reorderTickets } from '@/lib/services';
import { executeOptimisticUpdate } from '@/lib/optimistic';
import { logger } from '@/lib/logger';

interface KanbanBoardProps {
  tickets: Ticket[];
  onTicketsUpdate: (tickets: Ticket[]) => void;
  onEditTicket?: (ticket: Ticket) => void;
  onTicketDoubleClick?: (ticket: Ticket) => void;
}

const columns: { id: TicketStatus; title: string }[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'A Fazer' },
  { id: 'in-progress', title: 'Em Progresso' },
  { id: 'review', title: 'Em Revisão' },
  { id: 'done', title: 'Concluído' },
];

const columnColors: Record<TicketStatus, string> = {
  backlog: 'bg-gray-100 border-gray-300',
  todo: 'bg-blue-50 border-blue-300',
  'in-progress': 'bg-yellow-50 border-yellow-300',
  review: 'bg-purple-50 border-purple-300',
  done: 'bg-green-50 border-green-300',
};

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

export default function KanbanBoardNative({ tickets, onTicketsUpdate, onEditTicket, onTicketDoubleClick }: KanbanBoardProps) {
  const [collapsedColumns, setCollapsedColumns] = useState<Set<TicketStatus>>(new Set());
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TicketStatus | null>(null);

  const toggleColumnCollapse = (status: TicketStatus) => {
    setCollapsedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  const ticketsByStatus = useMemo(() => {
    const grouped: Record<TicketStatus, Ticket[]> = {
      backlog: [],
      todo: [],
      'in-progress': [],
      review: [],
      done: [],
    };

    tickets.forEach((ticket) => {
      grouped[ticket.status]?.push(ticket);
    });

    columns.forEach(({ id }) => {
      grouped[id].sort((a, b) => a.order - b.order);
    });

    return grouped;
  }, [tickets]);

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    setDraggedTicketId(ticketId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ticketId);
  };

  const handleDragEnd = () => {
    setDraggedTicketId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, status: TicketStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TicketStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    const ticketId = e.dataTransfer.getData('text/plain');
    if (!ticketId) return;

    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket || ticket.status === targetStatus) return;

    const sourceStatus = ticket.status;
    const sourceTicketsWithoutMoved = ticketsByStatus[sourceStatus]
      .filter((t) => t.id !== ticketId)
      .map((t, index) => ({ ...t, order: index + 1 }));

    const targetTicketsWithMoved = [
      ...ticketsByStatus[targetStatus].map((t) => ({ ...t })),
      { ...ticket, status: targetStatus },
    ].map((t, index) => ({ ...t, order: index + 1 }));

    const updatedTickets = tickets.map((t) => {
      const sourceMatch = sourceTicketsWithoutMoved.find((st) => st.id === t.id);
      if (sourceMatch) {
        return { ...t, status: sourceStatus, order: sourceMatch.order };
      }

      const targetMatch = targetTicketsWithMoved.find((tt) => tt.id === t.id);
      if (targetMatch) {
        return { ...t, status: targetStatus, order: targetMatch.order };
      }

      return t;
    });

    const batchUpdates = [
      ...sourceTicketsWithoutMoved.map((t) => ({ id: t.id, order: t.order, status: sourceStatus })),
      ...targetTicketsWithMoved.map((t) => ({ id: t.id, order: t.order, status: targetStatus })),
    ];

    const dedupedMap: Record<string, { id: string; order: number; status: TicketStatus }> = {};
    batchUpdates.forEach((update) => {
      dedupedMap[update.id] = update;
    });
    const dedupedBatchUpdates = Object.values(dedupedMap);

    await executeOptimisticUpdate({
      applyOptimistic: () => onTicketsUpdate(updatedTickets),
      commit: async () => reorderTickets(dedupedBatchUpdates),
      rollback: () => onTicketsUpdate(tickets),
      onError: (error) => {
        logger.error('Erro ao mover ticket', {
          action: 'move_ticket',
          metadata: { ticketId, sourceStatus, targetStatus, error: String(error) },
          page: 'kanban',
        });
      },
    });
  };

  const renderTicketCard = (ticket: Ticket) => {
    const isDragging = draggedTicketId === ticket.id;
    
    return (
      <div
        key={ticket.id}
        draggable
        onDragStart={(e) => handleDragStart(e, ticket.id)}
        onDragEnd={handleDragEnd}
        className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${
          isDragging ? 'opacity-50' : ''
        }`}
        onDoubleClick={() => onTicketDoubleClick?.(ticket)}
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-gray-900 flex-1 pr-2">{ticket.title}</h3>
          {onEditTicket && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditTicket(ticket);
              }}
              className="text-gray-400 hover:text-blue-600 transition-colors p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>

        {ticket.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {ticket.type && (
            <span className={`text-xs px-2 py-0.5 rounded border ${typeColors[ticket.type]}`}>
              {typeLabels[ticket.type]}
            </span>
          )}
          {ticket.priority && (
            <span className={`text-xs px-2 py-0.5 rounded ${priorityColors[ticket.priority]}`}>
              {priorityLabels[ticket.priority]}
            </span>
          )}
        </div>

        {ticket.tags && ticket.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {ticket.tags.map((tag, index) => (
              <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderColumn = (column: { id: TicketStatus; title: string }, showCollapse: boolean) => {
    const isCollapsed = collapsedColumns.has(column.id);
    const isOver = dragOverColumn === column.id;
    const columnTickets = ticketsByStatus[column.id];

    return (
      <div
        key={column.id}
        onDragOver={(e) => handleDragOver(e, column.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, column.id)}
        className={`${
          isCollapsed ? 'w-16' : 'flex-1 min-w-[300px] lg:min-w-0'
        } rounded-lg border-2 ${columnColors[column.id]} ${
          isOver ? 'ring-2 ring-blue-500 bg-blue-50' : ''
        } transition-all duration-300`}
      >
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            {isCollapsed ? (
              <div className="flex flex-col items-center w-full gap-2">
                <button
                  onClick={() => toggleColumnCollapse(column.id)}
                  className="text-gray-600 hover:text-gray-900 transition-colors p-1 hover:bg-white rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="text-sm font-bold text-gray-700 whitespace-nowrap" style={{ writingMode: 'vertical-rl' }}>
                  {column.title}
                </div>
                <span className="bg-white px-1.5 py-0.5 rounded-full text-xs font-semibold text-gray-600">
                  {columnTickets.length}
                </span>
              </div>
            ) : (
              <>
                <h2 className="font-bold text-gray-800 text-lg">{column.title}</h2>
                <div className="flex items-center gap-2">
                  <span className="bg-white px-2 py-1 rounded-full text-sm font-semibold text-gray-600">
                    {columnTickets.length}
                  </span>
                  {showCollapse && (
                    <button
                      onClick={() => toggleColumnCollapse(column.id)}
                      className="text-gray-600 hover:text-gray-900 transition-colors p-1 hover:bg-white rounded"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {!isCollapsed && (
            <div className="space-y-3 flex-1 min-h-[200px]">
              {columnTickets.map(renderTicketCard)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex gap-4 min-h-[500px]">
        {columns.map((column) => renderColumn(column, true))}
      </div>

      {/* Mobile */}
      <div className="flex lg:hidden gap-4 overflow-x-auto pb-4">
        {columns.map((column) => renderColumn(column, false))}
      </div>
    </>
  );
}
