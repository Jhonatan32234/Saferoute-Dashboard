import type { TipoReporte } from '../../types';
import { getTipoLabel } from '../../utils/formatters';

interface BadgeProps {
  tipo: TipoReporte | string;
  size?: 'sm' | 'md';
}

const colorMap: Record<string, string> = {
  inundacion: 'bg-[rgba(14,165,233,0.15)] text-[#0ea5e9] border-[rgba(14,165,233,0.3)]',
  accidente: 'bg-[rgba(239,68,68,0.15)] text-[#ef4444] border-[rgba(239,68,68,0.3)]',
  bache: 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b] border-[rgba(245,158,11,0.3)]',
  derrumbe: 'bg-[rgba(139,92,246,0.15)] text-[#8b5cf6] border-[rgba(139,92,246,0.3)]',
  sin_luz: 'bg-[rgba(139,92,246,0.15)] text-[#8b5cf6] border-[rgba(139,92,246,0.3)]',
  niebla: 'bg-[rgba(139,92,246,0.15)] text-[#8b5cf6] border-[rgba(139,92,246,0.3)]',
  bloqueo: 'bg-[rgba(239,68,68,0.15)] text-[#ef4444] border-[rgba(239,68,68,0.3)]',
  otro: 'bg-[rgba(139,92,246,0.15)] text-[#8b5cf6] border-[rgba(139,92,246,0.3)]',
};

export default function Badge({ tipo, size = 'sm' }: BadgeProps) {
  const colorClass = colorMap[tipo] || colorMap.otro;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[0.65rem]' : 'px-3 py-1 text-xs';
  
  return (
    <span className={`
      inline-flex items-center ${sizeClass} rounded-full font-bold uppercase tracking-wider border
      ${colorClass}
    `}>
      {getTipoLabel(tipo)}
    </span>
  );
}