'use client';

import { useMemo, useState } from 'react';
import { Ticket } from '@/types';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

interface CalendarViewProps {
  tickets: Ticket[];
  onTicketClick?: (ticket: Ticket) => void;
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 border-gray-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
};

const priorityDots: Record<string, string> = {
  low: 'bg-gray-400',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function CalendarView({ tickets, onTicketClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const { year, month } = useMemo(() => ({
    year: currentDate.getFullYear(),
    month: currentDate.getMonth(),
  }), [currentDate]);

  // Gera os dias do mês
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    const days: Array<{ date: Date | null; isCurrentMonth: boolean }> = [];
    
    // Dias do mês anterior
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ date, isCurrentMonth: false });
    }
    
    // Dias do mês atual
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }
    
    // Preencher até 42 dias (6 semanas)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }
    
    return days;
  }, [year, month]);

  // Agrupa tickets por data de entrega
  const ticketsByDate = useMemo(() => {
    const map = new Map<string, Ticket[]>();
    
    tickets.forEach(ticket => {
      if (ticket.dueDate) {
        const dateKey = new Date(ticket.dueDate).toDateString();
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(ticket);
      }
    });
    
    return map;
  }, [tickets]);

  const navigatePrev = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const navigateNext = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPast = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header com navegação */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={navigatePrev}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Mês anterior"
          >
            <FaChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={navigateNext}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Próximo mês"
          >
            <FaChevronRight className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
          >
            Hoje
          </button>
        </div>
        
        <h2 className="text-lg font-semibold text-gray-900 capitalize">
          {monthName}
        </h2>
        
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-gray-600">Urgente</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            <span className="text-gray-600">Alta</span>
          </div>
        </div>
      </div>

      {/* Grid do calendário */}
      <div className="p-4">
        {/* Header dos dias da semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, index) => (
            <div
              key={day}
              className={`text-center text-sm font-medium py-2 ${
                index === 0 || index === 6 ? 'text-gray-400' : 'text-gray-700'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid dos dias */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(({ date, isCurrentMonth }, index) => {
            const dayTickets = date ? ticketsByDate.get(date.toDateString()) || [] : [];
            const hasOverdue = isPast(date) && dayTickets.some(t => t.status !== 'done');
            
            return (
              <div
                key={index}
                className={`min-h-[100px] p-1.5 rounded-lg border transition-colors ${
                  isCurrentMonth 
                    ? isToday(date)
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-gray-100 hover:border-gray-200'
                    : 'bg-gray-50 border-gray-50'
                } ${hasOverdue ? 'border-red-200' : ''}`}
              >
                {/* Número do dia */}
                <div className={`text-sm font-medium mb-1 ${
                  isCurrentMonth
                    ? isToday(date)
                      ? 'text-blue-600'
                      : 'text-gray-900'
                    : 'text-gray-400'
                }`}>
                  {date?.getDate()}
                </div>

                {/* Tickets do dia */}
                <div className="space-y-1">
                  {dayTickets.slice(0, 3).map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => onTicketClick?.(ticket)}
                      className={`text-xs px-1.5 py-1 rounded border cursor-pointer truncate ${priorityColors[ticket.priority]} hover:shadow-sm transition-shadow`}
                      title={ticket.title}
                    >
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${priorityDots[ticket.priority]}`}></span>
                      {ticket.title}
                    </div>
                  ))}
                  
                  {dayTickets.length > 3 && (
                    <div className="text-xs text-gray-500 px-1.5">
                      +{dayTickets.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 p-3 border-t border-gray-200 flex justify-between">
        <span>{tickets.filter(t => t.dueDate).length} ticket(s) com data de entrega</span>
        <span className="text-red-500">
          {tickets.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'done').length} atrasado(s)
        </span>
      </div>
    </div>
  );
}
