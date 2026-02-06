'use client';

import { TicketPriority, TicketStatus, TicketType } from '@/types';
import TicketTypeSelect from './TicketTypeSelect';
import PrioritySelect from './PrioritySelect';
import StatusSelect from './StatusSelect';

interface TicketFormFieldsProps {
  title: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  tags: string;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  progress?: number;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTypeChange: (value: TicketType) => void;
  onPriorityChange: (value: TicketPriority) => void;
  onStatusChange: (value: TicketStatus) => void;
  onTagsChange: (value: string) => void;
  onStartDateChange?: (value: string) => void;
  onDueDateChange?: (value: string) => void;
  onEstimatedHoursChange?: (value: number | undefined) => void;
  onProgressChange?: (value: number) => void;
  statusLabel?: string;
  showDateFields?: boolean;
}

export default function TicketFormFields({
  title,
  description,
  type,
  priority,
  status,
  tags,
  startDate = '',
  dueDate = '',
  estimatedHours,
  progress = 0,
  onTitleChange,
  onDescriptionChange,
  onTypeChange,
  onPriorityChange,
  onStatusChange,
  onTagsChange,
  onStartDateChange,
  onDueDateChange,
  onEstimatedHoursChange,
  onProgressChange,
  statusLabel = 'Status',
  showDateFields = true,
}: TicketFormFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Título */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Título *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Digite o título do ticket"
          required
        />
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          placeholder="Descreva o ticket (opcional)"
        />
      </div>

      {/* Tipo e Prioridade */}
      <div className="grid grid-cols-2 gap-4">
        <TicketTypeSelect value={type} onChange={onTypeChange} required />
        <PrioritySelect value={priority} onChange={onPriorityChange} />
      </div>

      {/* Status e Tags */}
      <div className="grid grid-cols-2 gap-4">
        <StatusSelect value={status} onChange={onStatusChange} label={statusLabel} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => onTagsChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Separe por vírgula"
          />
          <p className="text-xs text-gray-500 mt-1">
            Separe múltiplas tags com vírgula
          </p>
        </div>
      </div>

      {/* Campos de Data e Progresso */}
      {showDateFields && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange?.(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Entrega
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => onDueDateChange?.(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horas Estimadas
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={estimatedHours ?? ''}
                onChange={(e) => onEstimatedHoursChange?.(e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: 8"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Progresso: {progress}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                onChange={(e) => onProgressChange?.(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
