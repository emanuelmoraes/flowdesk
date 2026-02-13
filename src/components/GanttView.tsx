'use client';

import { useMemo, useState } from 'react';
import { Ticket } from '@/types';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

interface GanttViewProps {
  tickets: Ticket[];
  onTicketClick?: (ticket: Ticket) => void;
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-400',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const statusColors: Record<string, string> = {
  backlog: 'bg-gray-300',
  todo: 'bg-yellow-400',
  'in-progress': 'bg-blue-500',
  review: 'bg-purple-500',
  done: 'bg-green-500',
};

export default function GanttView({ tickets, onTicketClick }: GanttViewProps) {
  const [viewStart, setViewStart] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() - 7); // Começa 7 dias antes de hoje
    return today;
  });
  
  const daysToShow = 28; // 4 semanas

  // Filtra tickets que têm datas definidas
  const ticketsWithDates = useMemo(() => {
    return tickets.filter(t => t.startDate || t.dueDate);
  }, [tickets]);

  // Gera os dias para o header
  const days = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(viewStart);
      date.setDate(date.getDate() + i);
      result.push(date);
    }
    return result;
  }, [viewStart]);

  const viewEnd = useMemo(() => {
    const end = new Date(viewStart);
    end.setDate(end.getDate() + daysToShow - 1);
    return end;
  }, [viewStart]);

  // Calcula a posição e largura de uma barra de ticket
  const getBarStyle = (ticket: Ticket) => {
    const start = ticket.startDate ? new Date(ticket.startDate) : new Date(ticket.createdAt);
    const end = ticket.dueDate ? new Date(ticket.dueDate) : start;
    
    // Calcula dias desde o início da visualização
    const startDiff = Math.floor((start.getTime() - viewStart.getTime()) / (1000 * 60 * 60 * 24));
    const endDiff = Math.floor((end.getTime() - viewStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // Limita dentro da visualização
    const barStart = Math.max(0, startDiff);
    const barEnd = Math.min(daysToShow - 1, endDiff);
    const barWidth = Math.max(1, barEnd - barStart + 1);
    
    // Se está completamente fora da visualização
    if (endDiff < 0 || startDiff >= daysToShow) {
      return null;
    }
    
    return {
      left: `${(barStart / daysToShow) * 100}%`,
      width: `${(barWidth / daysToShow) * 100}%`,
    };
  };

  const navigatePrev = () => {
    const newStart = new Date(viewStart);
    newStart.setDate(newStart.getDate() - 7);
    setViewStart(newStart);
  };

  const navigateNext = () => {
    const newStart = new Date(viewStart);
    newStart.setDate(newStart.getDate() + 7);
    setViewStart(newStart);
  };

  const goToToday = () => {
    const today = new Date();
    today.setDate(today.getDate() - 7);
    setViewStart(today);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { month: 'short' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  if (ticketsWithDates.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <p className="text-gray-500 mb-2">Nenhum ticket com datas definidas.</p>
        <p className="text-sm text-gray-400">
          Defina data de início e entrega nos tickets para visualizar cronograma e antecipar atrasos.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header com navegação */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={navigatePrev}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Semana anterior"
          >
            <FaChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={navigateNext}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Próxima semana"
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
        
        <div className="text-sm text-gray-600">
          {formatDate(viewStart)} - {formatDate(viewEnd)}
        </div>
        
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-500"></span>
            <span className="text-gray-600">Em progresso</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500"></span>
            <span className="text-gray-600">Concluído</span>
          </div>
        </div>
      </div>

      {/* Grid do Gantt */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header dos dias */}
          <div className="flex border-b border-gray-200">
            {/* Coluna de títulos */}
            <div className="w-64 flex-shrink-0 p-3 bg-gray-50 border-r border-gray-200 font-medium text-sm text-gray-700">
              Ticket
            </div>
            
            {/* Dias */}
            <div className="flex-1 flex">
              {days.map((day, index) => (
                <div
                  key={index}
                  className={`flex-1 min-w-[30px] p-1 text-center text-xs border-r border-gray-100 ${
                    isToday(day) ? 'bg-blue-50' : isWeekend(day) ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="text-gray-400">{formatMonth(day)}</div>
                  <div className={`font-medium ${isToday(day) ? 'text-blue-600' : 'text-gray-700'}`}>
                    {day.getDate()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Linhas de tickets */}
          {ticketsWithDates.map((ticket) => {
            const barStyle = getBarStyle(ticket);
            
            return (
              <div
                key={ticket.id}
                className="flex border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                {/* Info do ticket */}
                <div 
                  className="w-64 flex-shrink-0 p-3 border-r border-gray-200 cursor-pointer"
                  onClick={() => onTicketClick?.(ticket)}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${priorityColors[ticket.priority]}`}></span>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {ticket.title}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-white text-[10px] ${statusColors[ticket.status]}`}>
                      {ticket.status}
                    </span>
                    {ticket.progress !== undefined && ticket.progress > 0 && (
                      <span>{ticket.progress}%</span>
                    )}
                  </div>
                </div>
                
                {/* Área da barra */}
                <div className="flex-1 relative h-16">
                  {/* Grid de fundo */}
                  <div className="absolute inset-0 flex">
                    {days.map((day, index) => (
                      <div
                        key={index}
                        className={`flex-1 border-r border-gray-50 ${
                          isToday(day) ? 'bg-blue-50/50' : isWeekend(day) ? 'bg-gray-50/50' : ''
                        }`}
                      />
                    ))}
                  </div>
                  
                  {/* Barra do ticket */}
                  {barStyle && (
                    <div
                      className="absolute top-3 h-10 flex items-center cursor-pointer group"
                      style={barStyle}
                      onClick={() => onTicketClick?.(ticket)}
                    >
                      <div 
                        className={`w-full h-6 rounded-md ${statusColors[ticket.status]} opacity-80 group-hover:opacity-100 transition-opacity shadow-sm`}
                      >
                        {/* Barra de progresso */}
                        {ticket.progress !== undefined && ticket.progress > 0 && (
                          <div 
                            className="h-full bg-white/30 rounded-l-md"
                            style={{ width: `${ticket.progress}%` }}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Linha de hoje */}
      <div className="text-xs text-gray-500 p-3 border-t border-gray-200">
        {ticketsWithDates.length} ticket(s) com datas definidas
      </div>
    </div>
  );
}
