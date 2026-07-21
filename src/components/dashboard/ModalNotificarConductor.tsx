import { useState, useMemo } from 'react';
import { api } from '../../api/client';
import type { ConductorEnRuta } from '../../hooks/useAdminWebSocket';
import { getTipoLabel, timeAgo } from '../../utils/formatters';

// ─── Tipos ───────────────────────────────────

interface IncidenteSeleccionado {
  id: string;
  tipo: string;
  lat: number;
  lon: number;
  descripcion: string;
}

interface ModalNotificarConductorProps {
  isOpen: boolean;
  onClose: () => void;
  incidente: IncidenteSeleccionado | null;
  conductores: ConductorEnRuta[];
}

// ─── Helpers (fuera del componente, no son hooks) ───

function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getIconoTipo(tipo: string): string {
  const icons: Record<string, string> = {
    'inundacion': '🌊',
    'accidente': '🚗',
    'bache': '🕳️',
    'derrumbe': '⛰️',
    'bloqueo': '🚧',
    'sin_luz': '💡',
    'niebla': '🌫️',
    'otro': '⚠️',
  };
  return icons[tipo] || '⚠️';
}

const coloresEstado: Record<string, string> = {
  'EN_RUTA': '#10b981',
  'DESVIADO': '#f59e0b',
  'DESCONECTADO': '#ef4444',
  'SIN_SESION': '#94a3b8',
};

const labelsEstado: Record<string, string> = {
  'EN_RUTA': 'En ruta',
  'DESVIADO': 'Desviado',
  'DESCONECTADO': 'Sin señal',
  'SIN_SESION': 'Sin sesión',
};

// ─── Componente ──────────────────────────────

export default function ModalNotificarConductor({
  isOpen,
  onClose,
  incidente,
  conductores,
}: ModalNotificarConductorProps) {
  // ─── TODOS LOS HOOKS DEBEN IR AQUÍ, ANTES DE CUALQUIER CONDICIÓN ───
  
  const [conductorSeleccionado, setConductorSeleccionado] = useState<string>('');
  const [mensajePersonalizado, setMensajePersonalizado] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ tipo: 'exito' | 'error' | 'info'; mensaje: string } | null>(null);
  const [paso, setPaso] = useState<'seleccionar' | 'mensaje' | 'resultado'>('seleccionar');

  // useMemo con valores seguros (incluso si incidente es null)
  const conductoresOrdenados = useMemo(() => {
    if (!incidente) return []; // 👈 Manejar caso null dentro del hook
    
    return [...conductores]
      .filter(c => c.estado === 'EN_RUTA' || c.estado === 'DESVIADO')
      .map(c => ({
        ...c,
        distancia: calcularDistancia(incidente.lat, incidente.lon, c.lat, c.lon),
      }))
      .sort((a, b) => a.distancia - b.distancia);
  }, [conductores, incidente]);

  const conductorInfo = conductoresOrdenados.find(c => c.user_id === conductorSeleccionado);

  // ─── AHORA SÍ, podemos hacer early return ───
  
  if (!isOpen || !incidente) return null;

  const handleEnviar = async () => {
    if (!conductorSeleccionado || !conductorInfo) {
      setResultado({ tipo: 'error', mensaje: 'Selecciona un conductor primero' });
      return;
    }

    setEnviando(true);
    setResultado(null);

    try {
      const payload = {
        conductor_id: conductorSeleccionado,
        reporte_id: incidente.id,
        tipo_incidente: incidente.tipo,
        latitud: incidente.lat,
        longitud: incidente.lon,
        mensaje: mensajePersonalizado.trim(),
        distancia_km: conductorInfo.distancia,
      };

      const response = await api.post('/api/admin/notificar-conductor', payload);

      setResultado({
        tipo: 'exito',
        mensaje: response.mensaje || '✅ Alerta enviada exitosamente',
      });
      setPaso('resultado');

      setTimeout(() => {
        onClose();
        setTimeout(() => {
          setConductorSeleccionado('');
          setMensajePersonalizado('');
          setResultado(null);
          setPaso('seleccionar');
        }, 300);
      }, 3000);

    } catch (err: any) {
      setResultado({
        tipo: 'error',
        mensaje: err.message || 'Error al enviar la notificación',
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" style={{ zIndex: 9999 }} >
      <div className="bg-[#0d1b33] border border-[#2a4070] rounded-2xl w-[520px] max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        
        {/* ── Encabezado ── */}
        <div className="flex-shrink-0 bg-[#0f1a2e] border-b border-[#2a4070] p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              Notificar a Conductor
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Alerta personalizada sobre incidente detectado
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white hover:bg-[#2a4070]/30 rounded-lg p-1.5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Contenido scrolleable ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Info del incidente */}
          <div className="bg-red-900/15 border border-red-500/25 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{getIconoTipo(incidente.tipo)}</span>
              <div>
                <span className="font-semibold text-red-300 text-sm">
                  {getTipoLabel(incidente.tipo)}
                </span>
                <p className="text-[10px] text-gray-500 font-mono">
                  ID: {incidente.id.substring(0, 12)}...
                </p>
              </div>
              <span className="ml-auto text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-full">
                Activo
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-2 line-clamp-3">
              {incidente.descripcion || 'Sin descripción adicional'}
            </p>
            <div className="flex gap-4 mt-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                {incidente.lat.toFixed(5)}, {incidente.lon.toFixed(5)}
              </span>
            </div>
          </div>

          {/* ── Paso 1: Seleccionar conductor ── */}
          {paso === 'seleccionar' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">
                  Selecciona el conductor a notificar:
                </label>
                
                {conductoresOrdenados.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No hay conductores activos en este momento</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {conductoresOrdenados.map(conductor => {
                      const isSelected = conductorSeleccionado === conductor.user_id;
                      const color = coloresEstado[conductor.estado] || '#94a3b8';
                      
                      return (
                        <button
                          key={conductor.user_id}
                          onClick={() => setConductorSeleccionado(conductor.user_id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                            isSelected
                              ? 'border-blue-400 bg-blue-500/10 shadow-lg shadow-blue-500/5'
                              : 'border-[#2a4070] bg-[#0f1f3a] hover:border-blue-400/40 hover:bg-[#132544]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div 
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                                  style={{ backgroundColor: `${color}20` }}
                                >
                                  
                                </div>
                                {isSelected && (
                                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">
                                  {conductor.nombre_conductor || `Conductor ${conductor.user_id.substring(0, 8)}`}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                  {conductor.ruta_id}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span 
                                className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium"
                                style={{ backgroundColor: `${color}20`, color }}
                              >
                                {labelsEstado[conductor.estado]}
                              </span>
                              <p className="text-xs text-blue-400 font-medium mt-1">
                                {conductor.distancia < 1 
                                  ? `${(conductor.distancia * 1000).toFixed(0)} m` 
                                  : `${conductor.distancia.toFixed(1)} km`}
                              </p>
                            </div>
                          </div>
                          
                          {isSelected && (
                            <div className="mt-2 pt-2 border-t border-[#2a4070]/50 grid grid-cols-3 gap-2 text-[10px] text-gray-400">
                              <span>{conductor.velocidad_kmh?.toFixed(0) || 0} km/h</span>
                              <span>{conductor.lat.toFixed(4)}, {conductor.lon.toFixed(4)}</span>
                              <span>{timeAgo(conductor.last_telemetry_at || conductor.timestamp)}</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {conductorSeleccionado && (
                <button
                  onClick={() => setPaso('mensaje')}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                >
                  Continuar →
                </button>
              )}
            </>
          )}

          {/* ── Paso 2: Mensaje personalizado ── */}
          {paso === 'mensaje' && conductorInfo && (
            <>
              <div className="bg-blue-900/15 border border-blue-500/25 rounded-xl p-3">
                <p className="text-xs text-blue-300">
                  Notificando a:{' '}
                  <span className="font-semibold">
                    {conductorInfo.nombre_conductor || conductorInfo.user_id.substring(0, 8)}
                  </span>
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Distancia al incidente: {conductorInfo.distancia < 1 
                    ? `${(conductorInfo.distancia * 1000).toFixed(0)} metros` 
                    : `${conductorInfo.distancia.toFixed(1)} km`}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">
                  Mensaje personalizado (opcional):
                </label>
                <textarea
                  value={mensajePersonalizado}
                  onChange={e => setMensajePersonalizado(e.target.value)}
                  placeholder={`Ej: "Toma la carretera 190 como ruta alterna para evitar el ${getTipoLabel(incidente.tipo).toLowerCase()}"`}
                  className="w-full bg-[#0f1f3a] border border-[#2a4070] rounded-xl px-4 py-3 text-white text-sm h-28 resize-none placeholder-gray-500 focus:border-blue-400 focus:outline-none transition-colors"
                  rows={4}
                  autoFocus
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Si no escribes nada, se enviará un mensaje automático con los detalles del incidente.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setPaso('seleccionar')}
                  className="flex-1 py-2.5 rounded-xl bg-[#0f1f3a] border border-[#2a4070] text-gray-400 hover:text-white text-sm font-medium transition-colors"
                >
                  ← Volver
                </button>
                <button
                  onClick={handleEnviar}
                  disabled={enviando}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    enviando
                      ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                      : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20'
                  }`}
                >
                  {enviando ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Enviando...
                    </span>
                  ) : 'Enviar Alerta'}
                </button>
              </div>
            </>
          )}

          {/* ── Resultado ── */}
          {paso === 'resultado' && resultado && (
            <div className={`p-4 rounded-xl border ${
              resultado.tipo === 'exito' 
                ? 'bg-green-900/20 border-green-500/30' 
                : resultado.tipo === 'error'
                ? 'bg-red-900/20 border-red-500/30'
                : 'bg-blue-900/20 border-blue-500/30'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {resultado.tipo === 'exito' ? '✅' : resultado.tipo === 'error' ? '❌' : 'ℹ️'}
                </span>
                <p className={`text-sm ${
                  resultado.tipo === 'exito' ? 'text-green-300' : 
                  resultado.tipo === 'error' ? 'text-red-300' : 'text-blue-300'
                }`}>
                  {resultado.mensaje}
                </p>
              </div>
              {resultado.tipo === 'exito' && (
                <p className="text-xs text-gray-400 mt-2">Cerrando automáticamente...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}