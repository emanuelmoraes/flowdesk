'use client';

import { TicketStatus } from '@/types';
import { isTicketStatus, ticketStatusValues } from '@/lib/typeGuards';

interface StatusSelectProps {
  value: TicketStatus;
  onChange: (value: TicketStatus) => void;
  label?: string;
  required?: boolean;
}

export const statusLabels: Record<TicketStatus, string> = {
  backlog: 'Backlog',
  todo: 'A Fazer',
  'in-progress': 'Em Progresso',
  review: 'Em Revisão',
  done: 'Concluído',
};

export default function StatusSelect({ value, onChange, label = 'Status', required = false }: StatusSelectProps) {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const nextValue = event.target.value;
    if (isTicketStatus(nextValue)) {
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
        {ticketStatusValues.map((key) => (
          <option key={key} value={key}>
            {statusLabels[key]}
          </option>
        ))}
      </select>
    </div>
  );
}
