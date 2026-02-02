'use client';

import { TicketType } from '@/types';
import { 
  FaBug, 
  FaClipboardList, 
  FaBookOpen, 
  FaBullseye, 
  FaMagnifyingGlass, 
  FaRocket, 
  FaLifeRing,
} from 'react-icons/fa6';
import { HiSparkles } from 'react-icons/hi2';
import { IconType } from 'react-icons';

// Mapeamento de tipos de ticket para ícones React
export const ticketTypeIcons: Record<TicketType, IconType> = {
  bug: FaBug,
  melhoria: HiSparkles,
  tarefa: FaClipboardList,
  estoria: FaBookOpen,
  epico: FaBullseye,
  investigacao: FaMagnifyingGlass,
  novidade: FaRocket,
  suporte: FaLifeRing,
};

// Labels de texto para tipos de ticket (sem emoji)
export const ticketTypeLabels: Record<TicketType, string> = {
  bug: 'Bug',
  melhoria: 'Melhoria',
  tarefa: 'Tarefa',
  estoria: 'Estória',
  epico: 'Épico',
  investigacao: 'Investigação',
  novidade: 'Novidade',
  suporte: 'Suporte',
};

interface TicketTypeIconProps {
  type: TicketType;
  className?: string;
  showLabel?: boolean;
}

// Componente que renderiza o ícone do tipo de ticket
export function TicketTypeIcon({ type, className = '', showLabel = false }: TicketTypeIconProps) {
  const Icon = ticketTypeIcons[type];
  const label = ticketTypeLabels[type];
  
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Icon className="inline-block" />
      {showLabel && <span>{label}</span>}
    </span>
  );
}

// Labels com ícone para exibição (usado em badges, etc)
export function getTicketTypeLabelWithIcon(type: TicketType): React.ReactNode {
  const Icon = ticketTypeIcons[type];
  const label = ticketTypeLabels[type];
  
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="inline-block" />
      <span>{label}</span>
    </span>
  );
}
