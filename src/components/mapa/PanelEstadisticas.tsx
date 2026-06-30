interface PanelEstadisticasProps {
  stats: {
    totalZonas: number;
    zonasCriticas: number;
    totalReportes: number;
    nivelDominante: string;
  };
  onCerrar: () => void;
}

export default function PanelEstadisticas({ stats, onCerrar }: PanelEstadisticasProps) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#e8eef5]">Estadisticas del Mapa</h3>
        <button onClick={onCerrar} className="text-[#627d98] hover:text-[#e8eef5]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0f1f3a] border border-[#2a4070]/30 rounded-lg p-3 text-center">
          <span className="text-xl font-bold text-[#0ea5e9] block">{stats.totalReportes}</span>
          <span className="text-xs text-[#627d98]">Reportes</span>
        </div>
        <div className="bg-[#0f1f3a] border border-[#2a4070]/30 rounded-lg p-3 text-center">
          <span className="text-xl font-bold text-[#0ea5e9] block">{stats.totalZonas}</span>
          <span className="text-xs text-[#627d98]">Zonas Pred.</span>
        </div>
        <div className="bg-[#0f1f3a] border border-[#2a4070]/30 rounded-lg p-3 text-center">
          <span className="text-xl font-bold text-[#ef4444] block">{stats.zonasCriticas}</span>
          <span className="text-xs text-[#627d98]">Criticas</span>
        </div>
        <div className="bg-[#0f1f3a] border border-[#2a4070]/30 rounded-lg p-3 text-center">
          <span className="text-sm font-bold text-[#f59e0b] block truncate">{stats.nivelDominante}</span>
          <span className="text-xs text-[#627d98]">Dominante</span>
        </div>
      </div>
    </div>
  );
}