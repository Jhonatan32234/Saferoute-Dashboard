import type { ZonaPredicha } from '../../types';

interface PanelZonasListaProps {
  zonas: ZonaPredicha[];
  onCentrar: (index: number) => void;
  onCerrar: () => void;
}

function getNivelColor(nivel: string): string {
  switch (nivel) {
    case 'critico': return '#ef4444';
    case 'alto': return '#f59e0b';
    case 'medio': return '#eab308';
    default: return '#10b981';
  }
}

export default function PanelZonasLista({ zonas, onCentrar, onCerrar }: PanelZonasListaProps) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#e8eef5]">Zonas Predichas ({zonas.length})</h3>
        <button onClick={onCerrar} className="text-[#627d98] hover:text-[#e8eef5]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="text-xs text-[#627d98] mb-3">Click en una zona para centrar el mapa</p>

      <div className="space-y-2">
        {zonas.map((zona, index) => (
          <button
            key={index}
            onClick={() => onCentrar(index)}
            className="w-full text-left p-3 bg-[#0f1f3a] border border-[#2a4070]/30 rounded-lg hover:border-[#0ea5e9]/30 transition-all"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#e8eef5] truncate">{zona.nombre_zona}</p>
                <p className="text-xs text-[#94a3b8] truncate">{zona.tipo_riesgo_predominante}</p>
              </div>
              <span className="text-sm font-bold flex-shrink-0" style={{ color: getNivelColor(zona.nivel) }}>
                {(zona.probabilidad_incidente * 100).toFixed(0)}%
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}