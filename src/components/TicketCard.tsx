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
  bug: '🐛 Bug',
  melhoria: '✨ Melhoria',
  tarefa: '📋 Tarefa',
  estoria: '📖 Estória',
  epico: '🎯 Épico',
  investigacao: '🔍 Investigação',
  novidade: '🚀 Novidade',
  suporte: '🛟 Suporte',
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
      {/* Tipo do Ticket */}
      <div className="mb-2">
        <span className={`text-xs px-2 py-1 rounded border ${typeColors[ticket.type]}`}>
          {typeLabels[ticket.type]}
        </span>
      </div>

      <h3 className="font-semibold text-gray-900 mb-2">{ticket.title}</h3>
      
      {/* Tags */}
      {ticket.tags && ticket.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {ticket.tags.map((tag, index) => (
            <span
              key={index}
              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full border border-gray-300"
            >
              #{tag}
            </span>
          ))}
        </div>
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
