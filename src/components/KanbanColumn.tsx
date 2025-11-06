'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TicketCard from './TicketCard';
import { Ticket, TicketStatus } from '@/types';

interface KanbanColumnProps {
  status: TicketStatus;
  title: string;
  tickets: Ticket[];
  onEditTicket?: (ticket: Ticket) => void;
  onTicketDoubleClick?: (ticket: Ticket) => void;
}

const columnColors: Record<TicketStatus, string> = {
  backlog: 'bg-gray-100 border-gray-300',
  todo: 'bg-blue-50 border-blue-300',
  'in-progress': 'bg-yellow-50 border-yellow-300',
  review: 'bg-purple-50 border-purple-300',
  done: 'bg-green-50 border-green-300',
};

export default function KanbanColumn({ status, title, tickets, onEditTicket, onTicketDoubleClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[300px] rounded-lg border-2 ${columnColors[status]} ${
        isOver ? 'ring-2 ring-blue-500' : ''
      } transition-all`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800 text-lg">{title}</h2>
          <span className="bg-white px-2 py-1 rounded-full text-sm font-semibold text-gray-600">
            {tickets.length}
          </span>
        </div>
        
        <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 min-h-[200px]">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} onEdit={onEditTicket} onDoubleClick={onTicketDoubleClick} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
