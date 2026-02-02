'use client';

import { TicketType } from '@/types';
import { ticketTypeIcons, ticketTypeLabels } from '@/components/icons/TicketTypeIcons';

interface TicketTypeSelectProps {
  value: TicketType;
  onChange: (value: TicketType) => void;
  label?: string;
  required?: boolean;
}

// Re-export para manter compatibilidade com imports existentes
export const typeLabels = ticketTypeLabels;

export default function TicketTypeSelect({ value, onChange, label = 'Tipo', required = false }: TicketTypeSelectProps) {
  const selectedIcon = ticketTypeIcons[value];
  const SelectedIcon = selectedIcon;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && '*'}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as TicketType)}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
          required={required}
        >
          {(Object.entries(ticketTypeLabels) as [TicketType, string][]).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
          <SelectedIcon />
        </div>
      </div>
    </div>
  );
}
