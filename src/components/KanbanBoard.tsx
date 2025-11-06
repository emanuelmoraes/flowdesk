'use client';

import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import TicketCard from './TicketCard';
import { Ticket, TicketStatus } from '@/types';
import { moveTicket } from '@/lib/services';

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
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = tickets.find((t) => t.id === event.active.id);
    if (ticket) {
      setActiveTicket(ticket);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTicket = tickets.find((t) => t.id === activeId);
    if (!activeTicket) return;

    // Se está sobre uma coluna
    if (columns.some((col) => col.id === overId)) {
      const newStatus = overId as TicketStatus;
      if (activeTicket.status !== newStatus) {
        const updatedTickets = tickets.map((t) =>
          t.id === activeId ? { ...t, status: newStatus } : t
        );
        onTicketsUpdate(updatedTickets);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTicket = tickets.find((t) => t.id === activeId);
    const overTicket = tickets.find((t) => t.id === overId);

    if (!activeTicket) return;

    let newStatus = activeTicket.status;
    let newOrder = activeTicket.order;

    // Se foi dropado sobre uma coluna
    if (columns.some((col) => col.id === overId)) {
      newStatus = overId as TicketStatus;
      const ticketsInColumn = ticketsByStatus[newStatus];
      newOrder = ticketsInColumn.length > 0 ? ticketsInColumn.length + 1 : 1;
    } 
    // Se foi dropado sobre outro ticket
    else if (overTicket) {
      newStatus = overTicket.status;
      const ticketsInColumn = ticketsByStatus[newStatus];
      const oldIndex = ticketsInColumn.findIndex((t) => t.id === activeId);
      const newIndex = ticketsInColumn.findIndex((t) => t.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(ticketsInColumn, oldIndex, newIndex);
        const updatedTickets = tickets.map((t) => {
          const indexInReordered = reordered.findIndex((rt) => rt.id === t.id);
          if (indexInReordered !== -1) {
            return { ...t, status: newStatus, order: indexInReordered + 1 };
          }
          return t;
        });
        onTicketsUpdate(updatedTickets);
        
        // Atualiza no Firebase
        try {
          await moveTicket(activeId, newStatus, newIndex + 1);
        } catch (error) {
          console.error('Erro ao mover ticket:', error);
        }
        return;
      }
    }

    // Atualiza o ticket no Firebase
    if (activeTicket.status !== newStatus || activeTicket.order !== newOrder) {
      try {
        await moveTicket(activeId, newStatus, newOrder);
        const updatedTickets = tickets.map((t) =>
          t.id === activeId ? { ...t, status: newStatus, order: newOrder } : t
        );
        onTicketsUpdate(updatedTickets);
      } catch (error) {
        console.error('Erro ao mover ticket:', error);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            status={column.id}
            title={column.title}
            tickets={ticketsByStatus[column.id]}
            onEditTicket={onEditTicket}
            onTicketDoubleClick={onTicketDoubleClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTicket ? <TicketCard ticket={activeTicket} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
