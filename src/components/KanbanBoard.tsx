'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import KanbanColumn from './KanbanColumn';
import { Ticket, TicketStatus } from '@/types';
import { reorderTickets } from '@/lib/services';
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

export default function KanbanBoard({ tickets, onTicketsUpdate, onEditTicket, onTicketDoubleClick }: KanbanBoardProps) {
  const [collapsedColumns, setCollapsedColumns] = useState<Set<TicketStatus>>(new Set());
  const columnRefs = useRef<Map<TicketStatus, HTMLDivElement>>(new Map());
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const registerColumnRef = useCallback((status: TicketStatus, ref: HTMLDivElement | null) => {
    if (ref) {
      columnRefs.current.set(status, ref);
    } else {
      columnRefs.current.delete(status);
    }
  }, []);

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

    // Ordena por order
    Object.keys(grouped).forEach((status) => {
      grouped[status as TicketStatus].sort((a, b) => a.order - b.order);
    });

    return grouped;
  }, [tickets]);

  // Detecta qual coluna está sob o ponto usando coordenadas reais
  const getColumnAtPoint = (x: number, y: number): TicketStatus | null => {
    for (const [status, element] of columnRefs.current.entries()) {
      const rect = element.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return status;
      }
    }
    return null;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // Pega as coordenadas finais do ponteiro
    const pointerX = (event.activatorEvent as PointerEvent)?.clientX + (event.delta?.x || 0);
    const pointerY = (event.activatorEvent as PointerEvent)?.clientY + (event.delta?.y || 0);
    
    // Detecta a coluna usando coordenadas reais (fallback se over não funcionar)
    let targetStatus: TicketStatus | null = null;
    
    if (over && columns.some(col => col.id === over.id)) {
      targetStatus = over.id as TicketStatus;
    } else {
      // Fallback: detectar manualmente
      targetStatus = getColumnAtPoint(pointerX, pointerY);
    }

    if (!targetStatus) return;

    const activeId = active.id as string;
    const activeTicket = tickets.find((t) => t.id === activeId);
    if (!activeTicket) return;

    if (activeTicket.status !== targetStatus) {
      const sourceStatus = activeTicket.status;
      const sourceTicketsWithoutMoved = ticketsByStatus[sourceStatus]
        .filter((t) => t.id !== activeId)
        .map((t, index) => ({ ...t, order: index + 1 }));

      const targetTicketsWithMoved = [
        ...ticketsByStatus[targetStatus].map((t) => ({ ...t })),
        { ...activeTicket, status: targetStatus },
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

      const dedupedBatchUpdates = Object.values(
        batchUpdates.reduce((acc, update) => {
          acc[update.id] = update;
          return acc;
        }, {} as Record<string, { id: string; order: number; status: TicketStatus }>)
      );
      
      // Atualiza localmente primeiro para feedback imediato
      onTicketsUpdate(updatedTickets);
      
      try {
        await reorderTickets(dedupedBatchUpdates);
      } catch (error) {
        logger.error('Erro ao mover ticket', {
          action: 'move_ticket',
          metadata: { activeId, sourceStatus, targetStatus, error: String(error) },
          page: 'kanban',
        });
        // Reverte em caso de erro
        onTicketsUpdate(tickets);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      {/* Desktop: colunas ajustadas com collapse */}
      <div className="hidden lg:flex gap-4 h-[calc(100vh-200px)]">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            status={column.id}
            title={column.title}
            tickets={ticketsByStatus[column.id]}
            onEditTicket={onEditTicket}
            onTicketDoubleClick={onTicketDoubleClick}
            isCollapsed={collapsedColumns.has(column.id)}
            onToggleCollapse={() => toggleColumnCollapse(column.id)}
            onRegisterRef={registerColumnRef}
          />
        ))}
      </div>

      {/* Mobile: scroll horizontal tradicional */}
      <div className="flex lg:hidden gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            status={column.id}
            title={column.title}
            tickets={ticketsByStatus[column.id]}
            onEditTicket={onEditTicket}
            onTicketDoubleClick={onTicketDoubleClick}
            onRegisterRef={registerColumnRef}
          />
        ))}
      </div>
    </DndContext>
  );
}
