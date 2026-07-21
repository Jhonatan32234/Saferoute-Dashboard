import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, CircleMarker } from 'react-leaflet';
import { DivIcon, Map as LeafletMap } from 'leaflet';
import { getToken, toWebSocketURL } from '../../api/client';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

type EstadoViaje = 'activo' | 'desviado' | 'contacto_perdido' | 'parada_tecnica' | string;

type ViajeActivo = {
  viaje_id: string;
  user_id: string;
  nombre_conductor: string;
  ruta_id: string;
  origen_lat: number;
  origen_lon: number;
  destino_lat: number;
  destino_lon: number;
  polyline_ruta: string;
  estado: EstadoViaje;
  ultimo_heartbeat: string;
  ultima_latitud: number;
  ultima_longitud: number;
  ultima_velocidad_kmh: number;
};

type AlertToast = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  lat: number;
  lon: number;
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Decodifica una encoded polyline usando el algoritmo de Google Polyline sin dependencias */
function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

function decodeRoutePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  try {
    return decodePolyline(encoded);
  } catch (err) {
    console.warn('decodeRoutePolyline failed', err);
    return [];
  }
}

function timeAgo(isoString: string): string {
  if (!isoString) return '--';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  return `Hace ${Math.floor(mins / 60)} h`;
}

// ─────────────────────────────────────────────
// Colores y estilos por estado
// ─────────────────────────────────────────────

const estadoColor: Record<string, string> = {
  activo:          '#34d399',   // verde
  desviado:        '#f87171',   // rojo
  contacto_perdido:'#9ca3af',  // gris
  parada_tecnica:  '#fbbf24',   // amarillo
  default:         '#60a5fa',   // azul
};

const estadoLabel: Record<string, string> = {
  activo:          'En ruta',
  desviado:        'Desviado ⚠️',
  contacto_perdido:'Sin señal 🚨',
  parada_tecnica:  'Parada técnica',
};

const createTripIcon = (estado: string) =>
  new DivIcon({
    className: `trip-marker trip-marker--${estado}`,
    html: `<div class="trip-marker__pin"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────

export default function AdminMonitorView() {
  const [viajes, setViajes] = useState<ViajeActivo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<AlertToast | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [alertTripId, setAlertTripId] = useState<string | null>(null);
  const [timeoutMarker, setTimeoutMarker] = useState<{ lat: number; lon: number } | null>(null);

  const mapRef = useRef<LeafletMap | null>(null);
  const token = useMemo(() => getToken(), []);

  // ── Centro inicial del mapa ────────────────

  const initialCenter = useMemo<[number, number]>(() => {
    if (viajes.length > 0) {
      const first = viajes[0];
      if (first.ultima_latitud && first.ultima_longitud) {
        return [first.ultima_latitud, first.ultima_longitud];
      }
    }
    return [16.753, -93.115]; // Tuxtla Gutiérrez por defecto
  }, [viajes]);

  // ── Polilíneas decodificadas ───────────────

  const viajesConRuta = useMemo(
    () =>
      viajes.map((viaje) => ({
        ...viaje,
        rutaCoords:
          viaje.polyline_ruta?.length > 0
            ? decodeRoutePolyline(viaje.polyline_ruta)
            : ([[viaje.origen_lat, viaje.origen_lon], [viaje.destino_lat, viaje.destino_lon]] as [number, number][]),
      })),
    [viajes],
  );

  // ── Utilidades del mapa ────────────────────

  const flyTo = useCallback((lat: number, lon: number) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([lat, lon], 14, { duration: 1.2 });
  }, []);

  const playAlertSound = useCallback((critical: boolean) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = critical ? 660 : 440;
      gain.gain.value = critical ? 0.3 : 0.18;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch { /* El navegador puede bloquear el autoplay de audio */ }
  }, []);

  const showAlert = useCallback(
    (alert: AlertToast) => {
      setToast(alert);
      setAlertTripId(alert.id);
      flyTo(alert.lat, alert.lon);
      playAlertSound(alert.type === 'critical');
      window.setTimeout(() => {
        setToast((current) => (current?.id === alert.id ? null : current));
      }, 7000);
    },
    [flyTo, playAlertSound],
  );

  // ── Actualizar viaje por user_id o ruta_id ─

  const actualizarViaje = useCallback(
    (update: Partial<ViajeActivo> & { user_id?: string; ruta_id?: string }) => {
      setViajes((prev) =>
        prev.map((viaje) => {
          const matchUser = update.user_id && viaje.user_id === update.user_id;
          const matchRuta = update.ruta_id && viaje.ruta_id === update.ruta_id;
          if (matchUser || matchRuta) return { ...viaje, ...update };
          return viaje;
        }),
      );
    },
    [],
  );

  // ── Carga inicial REST ─────────────────────

  useEffect(() => {
    async function cargarViajes() {
      setIsLoading(true);
      setError('');
      try {
        const { api } = await import('../../api/client');
        const data = await api.get<ViajeActivo[]>('/api/admin/viajes/activos');
        setViajes(Array.isArray(data) ? data : []);
        console.log(`✅ [AdminMonitorView] ${data?.length ?? 0} viajes activos cargados`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar viajes activos');
      } finally {
        setIsLoading(false);
      }
    }
    cargarViajes();
  }, []);

  // ── WebSocket admin-monitor ────────────────

  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    // Si hay API_URL configurada como URL absoluta, usarla; sino usar el host actual
    const apiBase = (import.meta as any).env?.VITE_API_URL as string | undefined;
    const wsBase = apiBase
      ? apiBase.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')
      : `${proto}://${window.location.host}`;

    const params = new URLSearchParams({ user_id: 'admin' });
    if (token) params.set('token', token);
    const wsUrl = `${wsBase}/ws/alertas/admin-monitor?${params.toString()}`;

    console.log(`🔌 [AdminMonitorView] Conectando WebSocket: ${wsUrl}`);
    const socket = new WebSocket(wsUrl);

    socket.addEventListener('open', () => {
      console.log('✅ [AdminMonitorView] WS admin-monitor conectado');
    });

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data as string);
        console.log(payload);
        

        // ── Telemetría: actualización de ubicación en tiempo real ──
        if (payload.tipo === 'telemetria') {
          actualizarViaje({
            user_id:             payload.user_id,
            ruta_id:             payload.ruta_id,
            ultima_latitud:      Number(payload.lat),
            ultima_longitud:     Number(payload.lon),
            ultima_velocidad_kmh: Number(payload.velocidad_kmh ?? 0),
            estado:              payload.estado_viaje || 'activo',
            ultimo_heartbeat:    payload.timestamp,
          });
          return;
        }

        // ── Alerta de desvío ───────────────────────────────────────
        if (payload.tipo === 'alerta_desvio') {
          actualizarViaje({
            user_id:        payload.user_id,
            ruta_id:        payload.ruta_id,
            ultima_latitud: Number(payload.lat),
            ultima_longitud:Number(payload.lon),
            estado:         'desviado',
          });
          showAlert({
            id:      payload.user_id,
            title:   '⚠️ Conductor desviado',
            message: payload.mensaje ?? `El conductor ${payload.user_id?.slice(0, 8)} se desvió de la ruta`,
            type:    'warning',
            lat:     Number(payload.lat),
            lon:     Number(payload.lon),
          });
          return;
        }

        // ── Pérdida de señal / timeout ─────────────────────────────
        if (payload.tipo === 'alerta_timeout') {
          actualizarViaje({
            user_id:         payload.user_id,
            ultima_latitud:  Number(payload.lat ?? 0),
            ultima_longitud: Number(payload.lon ?? 0),
            estado:          'contacto_perdido',
            ultimo_heartbeat: payload.ultimo_contacto_time ?? '',
          });

          if (payload.lat && payload.lon) {
            setTimeoutMarker({ lat: Number(payload.lat), lon: Number(payload.lon) });
          }

          showAlert({
            id:      payload.viaje_id ?? payload.user_id,
            title:   '🚨 Señal perdida',
            message: payload.mensaje ?? `Se perdió la señal de ${payload.nombre_conductor ?? payload.user_id}`,
            type:    'critical',
            lat:     Number(payload.lat ?? 0),
            lon:     Number(payload.lon ?? 0),
          });
          return;
        }
      } catch (err) {
        console.warn('[AdminMonitorView] WS message parse failed', err);
      }
    });

    socket.addEventListener('close', () => {
      console.log('[AdminMonitorView] WS admin-monitor desconectado');
    });

    socket.addEventListener('error', (event) => {
      console.warn('[AdminMonitorView] WS error', event);
    });

    return () => { socket.close(); };
  }, [token, actualizarViaje, showAlert]);

  // ── Render ─────────────────────────────────

  return (
    <Card title="Mapa de Monitoreo de Conductores">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .trip-marker { transition: transform 0.35s ease; }
            .trip-marker__pin {
              width: 20px; height: 20px; border-radius: 50%;
              border: 2.5px solid #fff;
              box-shadow: 0 0 0 4px rgba(255,255,255,0.12);
            }
            .trip-marker--activo .trip-marker__pin          { background: ${estadoColor.activo}; }
            .trip-marker--desviado .trip-marker__pin         { background: ${estadoColor.desviado}; animation: blink 1.2s infinite; }
            .trip-marker--contacto_perdido .trip-marker__pin { background: ${estadoColor.contacto_perdido}; }
            .trip-marker--parada_tecnica .trip-marker__pin   { background: ${estadoColor.parada_tecnica}; }
            @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
            .admin-monitor__toast {
              position: absolute; top: 1rem; right: 1rem; z-index: 1000;
              max-width: 330px; border-radius: 0.75rem; padding: 1rem;
              color: #f8fafc; backdrop-filter: blur(10px);
              box-shadow: 0 24px 80px rgba(15,23,42,0.3);
              animation: slideIn 0.3s ease;
            }
            @keyframes slideIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
            .admin-monitor__toast.info     { background: rgba(56,189,248,0.95); }
            .admin-monitor__toast.warning  { background: rgba(251,191,36,0.97); color: #0f172a; }
            .admin-monitor__toast.critical { background: rgba(239,68,68,0.97); }
          `,
        }}
      />

      <div className="grid lg:grid-cols-[1.5fr_0.9fr] gap-6">

        {/* ── Mapa ── */}
        <div className="relative rounded-xl overflow-hidden border border-slate-700">
          {toast && (
            <div className={`admin-monitor__toast ${toast.type}`}>
              <p className="font-semibold text-sm">{toast.title}</p>
              <p className="text-xs mt-1 opacity-90">{toast.message}</p>
            </div>
          )}

          {isLoading ? (
            <div className="p-6">
              <LoadingSpinner message="Cargando viajes activos..." />
            </div>
          ) : error ? (
            <div className="p-6 bg-red-900/20 border border-red-500/40 rounded-2xl text-red-100 text-sm">
              {error}
            </div>
          ) : (
            <MapContainer
              className="h-[580px] w-full"
              center={initialCenter}
              zoom={12}
              scrollWheelZoom
              ref={(map) => { if (map) mapRef.current = map; }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Polilíneas de ruta planificada */}
              {viajesConRuta.map((viaje) => (
                <Polyline
                  key={`poly-${viaje.viaje_id}`}
                  positions={viaje.rutaCoords}
                  pathOptions={{
                    color:   estadoColor[viaje.estado] ?? estadoColor.default,
                    weight:  5,
                    opacity: 0.7,
                    dashArray: viaje.estado === 'desviado' ? '10 6' : undefined,
                  }}
                />
              ))}

              {/* Marcadores de posición actual */}
              {viajesConRuta.map((viaje) => (
                <Marker
                  key={`marker-${viaje.viaje_id}`}
                  position={[viaje.ultima_latitud, viaje.ultima_longitud]}
                  icon={createTripIcon(viaje.estado)}
                >
                  <Popup>
                    <div className="space-y-1 text-sm">
                      <strong>{viaje.nombre_conductor}</strong>
                      <p className="text-xs text-gray-500">Ruta: {viaje.ruta_id}</p>
                      <p className="text-xs">
                        Estado:{' '}
                        <span style={{ color: estadoColor[viaje.estado] ?? estadoColor.default }}>
                          {estadoLabel[viaje.estado] ?? viaje.estado}
                        </span>
                      </p>
                      <p className="text-xs">Velocidad: {viaje.ultima_velocidad_kmh?.toFixed(1)} km/h</p>
                      <p className="text-xs text-gray-500">
                        Última señal: {timeAgo(viaje.ultimo_heartbeat)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Marcadores de destino */}
              {viajesConRuta.map((viaje) => (
                <CircleMarker
                  key={`dest-${viaje.viaje_id}`}
                  center={[viaje.destino_lat, viaje.destino_lon]}
                  radius={7}
                  pathOptions={{ color: '#fff', fillColor: estadoColor[viaje.estado] ?? estadoColor.default, fillOpacity: 0.9, weight: 2 }}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong>Destino</strong> — {viaje.nombre_conductor}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

              {/* Marcador de última posición conocida tras timeout */}
              {timeoutMarker && (
                <Marker
                  position={[timeoutMarker.lat, timeoutMarker.lon]}
                  icon={new DivIcon({
                    className: 'trip-marker trip-marker--contacto_perdido',
                    html: `<div class="trip-marker__pin" style="box-shadow:0 0 0 5px rgba(156,163,175,0.4);"></div>`,
                    iconSize: [26, 26],
                    iconAnchor: [13, 13],
                    popupAnchor: [0, -14],
                  })}
                >
                  <Popup>
                    <p className="text-xs text-gray-500">🚨 Última posición conocida</p>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          )}
        </div>

        {/* ── Panel lateral de conductores ── */}
        <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
          <div className="rounded-2xl border border-slate-700 bg-slate-950/80 p-4">
            <h3 className="font-semibold text-slate-100">
              Conductores activos ({viajes.length})
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Monitoreo en tiempo real · desvíos y pérdida de señal
            </p>
            {/* Leyenda de estados */}
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-400">
              {Object.entries(estadoLabel).map(([key, label]) => (
                <span key={key} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: estadoColor[key] }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {viajes.length === 0 && !isLoading && (
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              No hay conductores en ruta en este momento
            </div>
          )}

          {viajes.map((viaje) => {
            const color = estadoColor[viaje.estado] ?? estadoColor.default;
            const isAlert = viaje.viaje_id === alertTripId;
            const isSelected = viaje.viaje_id === selectedTripId;

            return (
              <button
                key={viaje.viaje_id}
                type="button"
                onClick={() => {
                  setSelectedTripId(viaje.viaje_id);
                  flyTo(viaje.ultima_latitud, viaje.ultima_longitud);
                }}
                className={`w-full text-left rounded-2xl border p-4 transition-all ${
                  isAlert
                    ? 'border-red-400/60 bg-red-600/10 ring-1 ring-red-400/40'
                    : isSelected
                    ? 'border-sky-400/50 bg-sky-500/10'
                    : 'border-slate-700 bg-slate-950/70 hover:border-slate-500'
                }`}
              >
                {/* Encabezado */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: color,
                        boxShadow: viaje.estado === 'desviado' ? `0 0 8px ${color}` : undefined,
                      }}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-100 text-sm truncate">
                        {viaje.nombre_conductor}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">{viaje.ruta_id}</p>
                    </div>
                  </div>
                  <span
                    className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: `${color}22`, color }}
                  >
                    {estadoLabel[viaje.estado] ?? viaje.estado}
                  </span>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-400">
                  <span>🚀 {viaje.ultima_velocidad_kmh?.toFixed(1) ?? '0'} km/h</span>
                  <span>🕐 {timeAgo(viaje.ultimo_heartbeat)}</span>
                  <span className="truncate" title={`${viaje.origen_lat.toFixed(5)}, ${viaje.origen_lon.toFixed(5)}`}>
                    📍 Orig: {viaje.origen_lat.toFixed(4)}, {viaje.origen_lon.toFixed(4)}
                  </span>
                  <span className="truncate" title={`${viaje.destino_lat.toFixed(5)}, ${viaje.destino_lon.toFixed(5)}`}>
                    🏁 Dest: {viaje.destino_lat.toFixed(4)}, {viaje.destino_lon.toFixed(4)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}