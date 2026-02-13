'use client';

import { TicketPriority } from '@/types';
import { isTicketPriority, ticketPriorityValues } from '@/lib/typeGuards';

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
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const nextValue = event.target.value;
    if (isTicketPriority(nextValue)) {
      onChange(nextValue);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && '*'}
      </label>
      <select
        value={value}
        onChange={handleChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        required={required}
      >
        {ticketPriorityValues.map((key) => (
          <option key={key} value={key}>
            {priorityLabels[key]}
          </option>
        ))}
      </select>
    </div>
  );
}
