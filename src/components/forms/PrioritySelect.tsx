'use client';

import { TicketPriority } from '@/types';

interface PrioritySelectProps {
  value: TicketPriority;
  onChange: (value: TicketPriority) => void;
  label?: string;
  required?: boolean;
}

export const priorityLabels: Record<TicketPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

export default function PrioritySelect({ value, onChange, label = 'Prioridade', required = false }: PrioritySelectProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && '*'}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TicketPriority)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        required={required}
      >
        {(Object.entries(priorityLabels) as [TicketPriority, string][]).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
