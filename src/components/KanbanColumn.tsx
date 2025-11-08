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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const columnColors: Record<TicketStatus, string> = {
  backlog: 'bg-gray-100 border-gray-300',
  todo: 'bg-blue-50 border-blue-300',
  'in-progress': 'bg-yellow-50 border-yellow-300',
  review: 'bg-purple-50 border-purple-300',
  done: 'bg-green-50 border-green-300',
};

export default function KanbanColumn({ 
  status, 
  title, 
  tickets, 
  onEditTicket, 
  onTicketDoubleClick,
  isCollapsed = false,
  onToggleCollapse
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${
        isCollapsed ? 'w-16' : 'flex-1'
      } rounded-lg border-2 ${columnColors[status]} ${
        isOver ? 'ring-2 ring-blue-500' : ''
      } transition-all duration-300 overflow-hidden`}
    >
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          {isCollapsed ? (
            <div className="flex flex-col items-center w-full gap-2">
              <button
                onClick={onToggleCollapse}
                className="text-gray-600 hover:text-gray-900 transition-colors p-1 hover:bg-white rounded"
                title={`Expandir ${title}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div className="writing-mode-vertical text-sm font-bold text-gray-700 whitespace-nowrap" style={{ writingMode: 'vertical-rl' }}>
                {title}
              </div>
              <span className="bg-white px-1.5 py-0.5 rounded-full text-xs font-semibold text-gray-600">
                {tickets.length}
              </span>
            </div>
          ) : (
            <>
              <h2 className="font-bold text-gray-800 text-lg">{title}</h2>
              <div className="flex items-center gap-2">
                <span className="bg-white px-2 py-1 rounded-full text-sm font-semibold text-gray-600">
                  {tickets.length}
                </span>
                {onToggleCollapse && (
                  <button
                    onClick={onToggleCollapse}
                    className="text-gray-600 hover:text-gray-900 transition-colors p-1 hover:bg-white rounded"
                    title={`Minimizar ${title}`}
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
          <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3 flex-1 overflow-y-auto">
              {tickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} onEdit={onEditTicket} onDoubleClick={onTicketDoubleClick} />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}
