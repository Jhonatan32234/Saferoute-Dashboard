import type { ConductorEnRuta, EstadoConductor } from '../../hooks/useAdminWebSocket';

interface PanelConductoresProps {
  conductores: ConductorEnRuta[];
  onCentrar: (userID: string) => void;
  onEnviarAlerta: (userID: string, lat: number, lon: number) => void;
  onCerrar: () => void;
}

const estadoMeta: Record<EstadoConductor, { label: string; color: string; bg: string }> = {
  EN_RUTA: { label: 'En ruta', color: '#10b981', bg: 'bg-[#10b981]/10' },
  DESVIADO: { label: 'Desviado', color: '#f59e0b', bg: 'bg-[#f59e0b]/10' },
  DESCONECTADO: { label: 'Sin señal', color: '#ef4444', bg: 'bg-[#ef4444]/10' },
  SIN_SESION: { label: 'Sin sesión', color: '#94a3b8', bg: 'bg-[#94a3b8]/10' },
};

function getEstadoMeta(estado?: string) {
  return estadoMeta[(estado as EstadoConductor) || 'EN_RUTA'] || estadoMeta.EN_RUTA;
}

function timeSince(timestamp?: string) {
  if (!timestamp) return '--';
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) return '--';
  const diff = Date.now() - time;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  return `Hace ${Math.floor(mins / 60)} h`;
}

function shortID(value?: string) {
  if (!value) return 'sin-id';
  return value.length > 12 ? `${value.slice(0, 10)}...` : value;
}

export default function PanelConductores({
  conductores,
  onCentrar,
  onEnviarAlerta,
  onCerrar,
}: PanelConductoresProps) {
  const ordenados = [...conductores].sort((a, b) => {
    const prioridad = (c: ConductorEnRuta) => {
      if (c.estado === 'DESCONECTADO') return 0;
      if (c.estado === 'DESVIADO') return 1;
      if (c.alerta_pendiente) return 2;
      return 3;
    };
    return prioridad(a) - prioridad(b);
  });

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#e8eef5]">
            Conductores ({conductores.length})
          </h3>
          <p className="mt-0.5 text-xs text-[#627d98]">
            Monitoreo en vivo de rutas, desvíos y alertas críticas
          </p>
        </div>
        <button onClick={onCerrar} className="text-[#627d98] hover:text-[#e8eef5]" title="Cerrar">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {conductores.length === 0 ? (
        <div className="rounded-lg border border-[#2a4070]/40 bg-[#0f1f3a] px-4 py-8 text-center">
          <p className="text-sm text-[#94a3b8]">No hay conductores activos</p>
          <p className="mt-1 text-xs text-[#627d98]">Esperando eventos del canal admin-monitor</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ordenados.map(conductor => {
            const meta = getEstadoMeta(conductor.estado);
            const ultimaSenal = conductor.last_telemetry_at || conductor.timestamp;
            const alertaPendiente = Boolean(conductor.alerta_pendiente);

            return (
              <div
                key={conductor.user_id}
                className="rounded-lg border border-[#2a4070]/40 bg-[#0f1f3a] p-3 transition-colors hover:border-[#0ea5e9]/40"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      <span className="truncate text-xs font-semibold text-[#e8eef5]">
                        {shortID(conductor.user_id)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-[#627d98]">{conductor.ruta_id}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${meta.bg}`}
                    style={{ color: meta.color }}
                  >
                    {meta.label}
                  </span>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-[#0a1628] px-2 py-1.5">
                    <span className="block text-[#627d98]">Velocidad</span>
                    <span className="font-medium text-[#e8eef5]">
                      {(conductor.velocidad_kmh || 0).toFixed(1)} km/h
                    </span>
                  </div>
                  <div className="rounded bg-[#0a1628] px-2 py-1.5">
                    <span className="block text-[#627d98]">Última señal</span>
                    <span className="font-medium text-[#e8eef5]">{timeSince(ultimaSenal)}</span>
                  </div>
                  <div className="rounded bg-[#0a1628] px-2 py-1.5">
                    <span className="block text-[#627d98]">Desvío</span>
                    <span className="font-medium text-[#e8eef5]">
                      {conductor.distancia_desvio_m ? `${conductor.distancia_desvio_m.toFixed(0)} m` : '0 m'}
                    </span>
                  </div>
                  <div className="rounded bg-[#0a1628] px-2 py-1.5">
                    <span className="block text-[#627d98]">Señal perdida</span>
                    <span className="font-medium text-[#e8eef5]">
                      {conductor.segundos_sin_senal ? `${conductor.segundos_sin_senal}s` : '--'}
                    </span>
                  </div>
                </div>

                {conductor.ultima_alerta_id && (
                  <div
                    className={`mb-3 rounded border px-2 py-2 text-xs ${
                      alertaPendiente
                        ? 'border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#fbbf24]'
                        : 'border-[#10b981]/30 bg-[#10b981]/10 text-[#34d399]'
                    }`}
                  >
                    {alertaPendiente
                      ? `Alerta pendiente: ${shortID(conductor.ultima_alerta_id)}`
                      : `Alerta confirmada ${timeSince(conductor.alerta_confirmada_at)}`}
                  </div>
                )}

                <div className="mb-3 text-[11px] text-[#627d98]">
                  {conductor.lat.toFixed(5)}, {conductor.lon.toFixed(5)}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
