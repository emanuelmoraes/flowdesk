'use client';

import { TicketType } from '@/types';

interface TicketTypeSelectProps {
  value: TicketType;
  onChange: (value: TicketType) => void;
  label?: string;
  required?: boolean;
}

export const typeLabels: Record<TicketType, string> = {
  bug: '🐛 Bug',
  melhoria: '✨ Melhoria',
  tarefa: '📋 Tarefa',
  estoria: '📖 Estória',
  epico: '🎯 Épico',
  investigacao: '🔍 Investigação',
  novidade: '🚀 Novidade',
  suporte: '🛟 Suporte',
};

export default function TicketTypeSelect({ value, onChange, label = 'Tipo', required = false }: TicketTypeSelectProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && '*'}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TicketType)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        required={required}
      >
        {(Object.entries(typeLabels) as [TicketType, string][]).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
