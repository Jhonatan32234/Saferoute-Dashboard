import type { ConductorEnRuta } from '../../hooks/useAdminWebSocket';

interface PanelConductoresProps {
  conductores: ConductorEnRuta[];
  onCentrar: (userID: string) => void;
  onEnviarAlerta: (userID: string, lat: number, lon: number) => void;
  onCerrar: () => void;
}

export default function PanelConductores({ conductores, onCentrar, onEnviarAlerta, onCerrar }: PanelConductoresProps) {
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'DESVIADO': return '#ef4444';
      case 'DESCONECTADO': return '#6b7280';
      case 'EN_RUTA': return '#10b981';
      default: return '#0ea5e9';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'DESVIADO': return 'Desviado';
      case 'DESCONECTADO': return 'Desconectado';
      case 'EN_RUTA': return 'En ruta';
      default: return estado;
    }
  };

  const timeSince = (timestamp: string) => {
    if (!timestamp) return '--';
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins}min`;
    return `Hace ${Math.floor(mins / 60)}h`;
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#e8eef5]">
          Conductores Activos ({conductores.length})
        </h3>
        <button onClick={onCerrar} className="text-[#627d98] hover:text-[#e8eef5]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {conductores.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[#94a3b8] text-sm">No hay conductores activos</p>
          <p className="text-[#627d98] text-xs mt-1">Esperando conexiones...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conductores.map(conductor => (
            <div
              key={conductor.user_id}
              className="bg-[#0f1f3a] border border-[#2a4070]/30 rounded-lg p-3 hover:border-[#0ea5e9]/30 transition-all"
            >
              {/* Cabecera */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: getEstadoColor(conductor.estado) }}
                  />
                  <span className="text-xs font-medium text-[#e8eef5]">
                    {conductor.user_id?.substring(0, 10)}...
                  </span>
                </div>
                <span className="text-xs" style={{ color: getEstadoColor(conductor.estado) }}>
                  {getEstadoLabel(conductor.estado)}
                </span>
              </div>

              {/* Info */}
              <div className="space-y-1 text-xs text-[#94a3b8] mb-3">
                <div className="flex justify-between">
                  <span>Ruta:</span>
                  <span className="text-[#e8eef5]">{conductor.ruta_id}</span>
                </div>
                {conductor.velocidad_kmh !== undefined && (
                  <div className="flex justify-between">
                    <span>Velocidad:</span>
                    <span className="text-[#e8eef5]">{conductor.velocidad_kmh.toFixed(1)} km/h</span>
                  </div>
                )}
                {conductor.desviado && conductor.distancia_desvio_m !== undefined && (
                  <div className="flex justify-between">
                    <span>Desvío:</span>
                    <span className="text-[#ef4444]">{conductor.distancia_desvio_m.toFixed(0)}m</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Última señal:</span>
                  <span className="text-[#e8eef5]">{timeSince(conductor.last_telemetry_at || conductor.timestamp)}</span>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-2">
                <button
                  onClick={() => onCentrar(conductor.user_id)}
                  className="flex-1 px-2 py-1.5 bg-[#0ea5e9]/10 text-[#0ea5e9] text-xs rounded-lg hover:bg-[#0ea5e9]/20 transition-colors"
                >
                  Centrar
                </button>
                <button
                  onClick={() => onEnviarAlerta(conductor.user_id, conductor.lat, conductor.lon)}
                  className="flex-1 px-2 py-1.5 bg-[#ef4444]/10 text-[#ef4444] text-xs rounded-lg hover:bg-[#ef4444]/20 transition-colors"
                >
                  Alerta
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}