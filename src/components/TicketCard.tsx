'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Ticket } from '@/types';

interface TicketCardProps {
  ticket: Ticket;
  onEdit?: (ticket: Ticket) => void;
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

export default function TicketCard({ ticket, onEdit }: TicketCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
      onClick={() => onEdit?.(ticket)}
    >
      <h3 className="font-semibold text-gray-900 mb-2">{ticket.title}</h3>
      
      {ticket.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {ticket.description}
        </p>
      )}
      
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[ticket.priority]}`}>
          {priorityLabels[ticket.priority]}
        </span>
        
        {ticket.assignee && (
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
            {ticket.assignee.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}
