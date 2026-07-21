import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getToken, toWebSocketURL } from '../api/client';
import polyline from '@mapbox/polyline';

// ─────────────────────────────────────────────
// Tipos base (sin cambios)
// ─────────────────────────────────────────────

export interface Coordenada {
  lat: number;
  lon: number;
}

export type EstadoConductor = 'EN_RUTA' | 'DESVIADO' | 'DESCONECTADO' | 'SIN_SESION';

const ESTADO_BACKEND_A_DASHBOARD: Record<string, EstadoConductor> = {
  activo:           'EN_RUTA',
  desviado:         'DESVIADO',
  parada_tecnica:   'EN_RUTA',
  contacto_perdido: 'DESCONECTADO',
  cancelado:        'SIN_SESION',
  finalizado:       'SIN_SESION',
};

function normalizarEstado(estadoBackend?: string): EstadoConductor {
  if (!estadoBackend) return 'EN_RUTA';
  return ESTADO_BACKEND_A_DASHBOARD[estadoBackend] ?? 'EN_RUTA';
}

function decodePolylineToCoordenadas(encoded: string): Coordenada[] {
  if (!encoded) return [];
  try {
    return polyline.decode(encoded).map(([lat, lon]) => ({ lat, lon }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
// Interfaces (sin cambios)
// ─────────────────────────────────────────────

export interface ConductorEnRuta {
  user_id: string;
  viaje_id?: string;
  nombre_conductor?: string;
  ruta_id: string;
  lat: number;
  lon: number;
  estado: EstadoConductor;
  velocidad_kmh?: number;
  polilinea: Coordenada[];
  polyline_ruta?: string;
  timestamp: string;
  desviado?: boolean;
  distancia_desvio_m?: number;
  inicio_lat?: number;
  inicio_lon?: number;
  destino_lat?: number;
  destino_lon?: number;
  started_at?: string;
  last_telemetry_at?: string;
  segundos_sin_senal?: number;
  sesion_activa?: boolean;
  ultima_alerta_id?: string;
  alerta_pendiente?: boolean;
  alerta_confirmada_at?: string;
}

export interface EventoAdmin {
  tipo: string;
  user_id?: string;
  ruta_id?: string;
  viaje_id?: string;
  alerta_id?: string;
  mensaje?: string;
  timestamp?: string;
  _received: string;
  [key: string]: unknown;
}

interface AlertaCriticaResponse {
  status: string;
  alerta_id: string;
  enviado: boolean;
}

// ─────────────────────────────────────────────
// Configuración
// ─────────────────────────────────────────────

const BATCH_RENDER_INTERVAL_MS = 10000; // 👈 10 segundos entre renders del mapa
const EVENTOS_INMEDIATOS = [               // 👈 Eventos que se aplican sin esperar
  'alerta_desvio',
  'alerta_timeout', 
  'viaje_finalizado',
  'conductor_desconectado',
  'conductor_conectado',
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function normalizeTimestamp(value?: string): string {
  return value || new Date().toISOString();
}

function buildAdminWebSocketURL(): string | null {
  const token = getToken();
  if (!token) return null;
  const params = new URLSearchParams({ user_id: 'admin', token });
  return `${toWebSocketURL()}/ws/alertas/admin-monitor?${params.toString()}`;
}

// ─────────────────────────────────────────────
// Hook principal (OPTIMIZADO CON BATCH RENDERING)
// ─────────────────────────────────────────────

export function useAdminWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const conductoresRef = useRef<Map<string, ConductorEnRuta>>(new Map());
  const mountedRef = useRef(true);
  const connectingRef = useRef(false);
  const needsInitialLoadRef = useRef(true);
  
  // 👇 BUFFER: Almacena cambios pendientes de aplicar al estado de React
  const pendingUpdatesRef = useRef<Map<string, Partial<ConductorEnRuta>>>(new Map());
  const pendingDeletionsRef = useRef<Set<string>>(new Set());
  const batchTimerRef = useRef<number | null>(null);
  const forceUpdateRef = useRef(false); // Para forzar render inmediato

  const [conductores, setConductores] = useState<Map<string, ConductorEnRuta>>(new Map());
  const [conectado, setConectado] = useState(false);
  const [eventos, setEventos] = useState<EventoAdmin[]>([]);

  // ── Aplicar buffer al estado de React ──────
  
  const flushPendingUpdates = useCallback(() => {
    const updates = pendingUpdatesRef.current;
    const deletions = pendingDeletionsRef.current;
    
    if (updates.size === 0 && deletions.size === 0) return;
    
    const nuevo = new Map(conductoresRef.current);
    
    // Aplicar eliminaciones
    deletions.forEach(userID => nuevo.delete(userID));
    
    // Aplicar actualizaciones
    updates.forEach((patch, userID) => {
      const existente = nuevo.get(userID);
      if (!existente && !patch.lat) {
        // No crear conductores desde el buffer si no tienen coordenadas
        return;
      }
      
      const timestamp = normalizeTimestamp(patch.timestamp || patch.last_telemetry_at || existente?.timestamp);
      const polilinea = patch.polilinea?.length
        ? patch.polilinea
        : patch.polyline_ruta
        ? decodePolylineToCoordenadas(patch.polyline_ruta)
        : existente?.polilinea ?? [];

      nuevo.set(userID, {
        user_id: userID,
        ruta_id: patch.ruta_id || existente?.ruta_id || 'sin-ruta',
        lat: patch.lat ?? existente?.lat ?? 0,
        lon: patch.lon ?? existente?.lon ?? 0,
        estado: patch.estado || existente?.estado || 'EN_RUTA',
        polilinea,
        timestamp,
        ...existente,
        ...patch,
      });
    });
    
    // Actualizar ref y estado
    conductoresRef.current = nuevo;
    setConductores(new Map(nuevo));
    
    // Limpiar buffer
    pendingUpdatesRef.current = new Map();
    pendingDeletionsRef.current = new Set();
    forceUpdateRef.current = false;
    
    console.log(`🔄 [BatchRender] ${updates.size} actualizaciones y ${deletions.size} eliminaciones aplicadas`);
  }, []);

  // ── Programar flush del buffer ─────────────

  const scheduleFlush = useCallback(() => {
    if (batchTimerRef.current !== null) {
      // Ya hay un flush programado, no hacer nada
      return;
    }
    
    batchTimerRef.current = window.setTimeout(() => {
      batchTimerRef.current = null;
      if (mountedRef.current) {
        flushPendingUpdates();
      }
    }, BATCH_RENDER_INTERVAL_MS);
  }, [flushPendingUpdates]);

  // ── Helpers de estado ──────────────────────

  const commitConductores = useCallback((nuevoMapa: Map<string, ConductorEnRuta>) => {
    conductoresRef.current = new Map(nuevoMapa);
    setConductores(new Map(nuevoMapa));
    // Limpiar buffer porque ya aplicamos todo
    pendingUpdatesRef.current = new Map();
    pendingDeletionsRef.current = new Set();
    if (batchTimerRef.current !== null) {
      window.clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }
  }, []);

  const upsertConductor = useCallback((
    userID: string, 
    patch: Partial<ConductorEnRuta>,
    esEventoInmediato = false
  ) => {
    // Siempre actualizar la ref interna inmediatamente (para centrarEnConductor, etc.)
    const nuevo = new Map(conductoresRef.current);
    const existente = nuevo.get(userID);
    const timestamp = normalizeTimestamp(patch.timestamp || patch.last_telemetry_at || existente?.timestamp);
    const polilinea = patch.polilinea?.length
      ? patch.polilinea
      : patch.polyline_ruta
      ? decodePolylineToCoordenadas(patch.polyline_ruta)
      : existente?.polilinea ?? [];

    nuevo.set(userID, {
      user_id: userID,
      ruta_id: patch.ruta_id || existente?.ruta_id || 'sin-ruta',
      lat: patch.lat ?? existente?.lat ?? 0,
      lon: patch.lon ?? existente?.lon ?? 0,
      estado: patch.estado || existente?.estado || 'EN_RUTA',
      polilinea,
      timestamp,
      ...existente,
      ...patch,
    });
    
    conductoresRef.current = nuevo;

    if (esEventoInmediato || forceUpdateRef.current) {
      // Eventos críticos: aplicar inmediatamente
      setConductores(new Map(nuevo));
      // También aplicar el buffer pendiente
      pendingUpdatesRef.current = new Map();
      pendingDeletionsRef.current = new Set();
      if (batchTimerRef.current !== null) {
        window.clearTimeout(batchTimerRef.current);
        batchTimerRef.current = null;
      }
    } else {
      // Telemetría normal: acumular en buffer
      pendingUpdatesRef.current.set(userID, {
        ...(pendingUpdatesRef.current.get(userID) || {}),
        ...patch,
      });
      scheduleFlush();
    }
  }, [scheduleFlush]);

  // ── Carga desde REST API ───────────────────

  const cargarViajesIniciales = useCallback(async () => {
    try {
      console.log('🔄 [AdminWS] Solicitando viajes activos a la API REST...');
      const data = await api.get<any[]>('/api/admin/viajes/activos');
      
      if (!Array.isArray(data) || data.length === 0) {
        console.log('ℹ️ [AdminWS] No hay viajes activos en este momento');
        if (conductoresRef.current.size > 0) {
          commitConductores(new Map());
        }
        return;
      }

      const nuevo = new Map<string, ConductorEnRuta>();
      for (const viaje of data) {
        const polilinea = viaje.polyline_ruta
          ? decodePolylineToCoordenadas(viaje.polyline_ruta)
          : [];

        nuevo.set(viaje.user_id, {
          user_id: viaje.user_id,
          viaje_id: viaje.viaje_id,
          nombre_conductor: viaje.nombre_conductor,
          ruta_id: viaje.ruta_id,
          lat: viaje.ultima_latitud ?? 0,
          lon: viaje.ultima_longitud ?? 0,
          estado: normalizarEstado(viaje.estado),
          velocidad_kmh: viaje.ultima_velocidad_kmh ?? 0,
          polilinea,
          polyline_ruta: viaje.polyline_ruta,
          timestamp: viaje.ultimo_heartbeat || new Date().toISOString(),
          last_telemetry_at: viaje.ultimo_heartbeat,
          inicio_lat: viaje.origen_lat,
          inicio_lon: viaje.origen_lon,
          destino_lat: viaje.destino_lat,
          destino_lon: viaje.destino_lon,
          sesion_activa: true,
          desviado: viaje.estado === 'desviado',
        });
      }
      
      commitConductores(nuevo);
      needsInitialLoadRef.current = false;
      console.log(`✅ [AdminWS] ${nuevo.size} viajes activos sincronizados desde REST`);
    } catch (err) {
      console.warn('⚠️ [AdminWS] No se pudieron cargar viajes iniciales:', err);
    }
  }, [commitConductores]);

  // ── Manejador de mensajes WebSocket ────────

  const handleMessage = useCallback((raw: MessageEvent<string>) => {
    try {
      const data = JSON.parse(raw.data) as EventoAdmin;
      const received = new Date().toISOString();
      const esInmediato = EVENTOS_INMEDIATOS.includes(data.tipo);

      if (mountedRef.current) {
        setEventos(prev => [...prev.slice(-79), { ...data, _received: received }]);
      }

      switch (data.tipo) {

        case 'telemetria': {
          if (typeof data.user_id !== 'string') break;
          const estadoViaje = String(data.estado_viaje || 'activo');
          
          // Si el conductor no existe, cargar viajes (primera telemetría tras reconexión)
          if (!conductoresRef.current.has(data.user_id)) {
            console.log(`🆕 [AdminWS] Nuevo conductor detectado por telemetría: ${data.user_id}`);
            cargarViajesIniciales();
          }
          
          // 👇 Telemetría SIEMPRE va al buffer (no es evento inmediato)
          upsertConductor(data.user_id, {
            ruta_id:         String(data.ruta_id || 'sin-ruta'),
            lat:             Number(data.lat),
            lon:             Number(data.lon),
            velocidad_kmh:   Number(data.velocidad_kmh || 0),
            estado:          normalizarEstado(estadoViaje),
            desviado:        estadoViaje === 'desviado',
            last_telemetry_at: normalizeTimestamp(String(data.timestamp || '')),
            timestamp:       normalizeTimestamp(String(data.timestamp || '')),
            sesion_activa:   true,
            segundos_sin_senal: undefined,
          }, false); // false = no es evento inmediato
          break;
        }

        case 'alerta_desvio': {
          if (typeof data.user_id !== 'string') break;
          upsertConductor(data.user_id, {
            ruta_id:   String(data.ruta_id || 'sin-ruta'),
            lat:       Number(data.lat),
            lon:       Number(data.lon),
            estado:    'DESVIADO',
            desviado:  true,
            timestamp: normalizeTimestamp(String(data.timestamp || '')),
          }, true); // 👈 true = evento inmediato
          break;
        }

        case 'alerta_timeout': {
          if (typeof data.user_id !== 'string') break;
          upsertConductor(data.user_id, {
            viaje_id:           String(data.viaje_id || ''),
            nombre_conductor:   String(data.nombre_conductor || ''),
            lat:                Number(data.lat || 0),
            lon:                Number(data.lon || 0),
            estado:             'DESCONECTADO',
            desviado:           false,
            last_telemetry_at:  String(data.ultimo_contacto_time || ''),
            timestamp:          normalizeTimestamp(String(data.timestamp || '')),
            segundos_sin_senal: 300,
            sesion_activa:      false,
          }, true); // 👈 inmediato
          break;
        }

        case 'viaje_finalizado': {
          if (typeof data.user_id !== 'string') break;
          // Eliminar inmediatamente
          const copia = new Map(conductoresRef.current);
          copia.delete(data.user_id);
          commitConductores(copia);
          console.log(`🏁 [AdminWS] Conductor ${data.user_id} finalizó viaje`);
          break;
        }

        case 'conductor_conectado': {
          if (typeof data.user_id !== 'string') break;
          const polilinea = Array.isArray(data.polilinea)
            ? (data.polilinea as Coordenada[])
            : data.polyline_ruta
            ? decodePolylineToCoordenadas(String(data.polyline_ruta))
            : [];
          upsertConductor(data.user_id, {
            ruta_id:    String(data.ruta_id || 'sin-ruta'),
            lat:        Number(data.lat),
            lon:        Number(data.lon),
            estado:     normalizarEstado(String(data.estado || 'activo')),
            polilinea,
            inicio_lat: Number(data.lat),
            inicio_lon: Number(data.lon),
            started_at: normalizeTimestamp(String(data.timestamp || '')),
            timestamp:  normalizeTimestamp(String(data.timestamp || '')),
            sesion_activa: true,
          }, true); // 👈 inmediato
          break;
        }

        case 'conductor_desconectado': {
          if (typeof data.user_id !== 'string') break;
          const copia = new Map(conductoresRef.current);
          copia.delete(data.user_id);
          commitConductores(copia);
          break;
        }

        case 'flash_alert_enviada': {
          if (typeof data.user_id !== 'string') break;
          upsertConductor(data.user_id, {
            ultima_alerta_id:   String(data.alerta_id || ''),
            alerta_pendiente:   Boolean(data.enviado),
            alerta_confirmada_at: undefined,
            timestamp:          normalizeTimestamp(String(data.timestamp || '')),
          }, true);
          break;
        }

        case 'alerta_critica_confirmada': {
          if (typeof data.user_id !== 'string') break;
          upsertConductor(data.user_id, {
            ultima_alerta_id:   String(data.alerta_id || ''),
            alerta_pendiente:   false,
            alerta_confirmada_at: normalizeTimestamp(String(data.timestamp || '')),
          }, true);
          break;
        }

        default:
          break;
      }
    } catch (error) {
      console.error('Error parseando evento WebSocket admin:', error);
    }
  }, [commitConductores, upsertConductor, cargarViajesIniciales]);

  // ── Conexión WebSocket ──────────────────────

  const connect = useCallback(() => {
    if (connectingRef.current) return;
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) return;

    const wsUrl = buildAdminWebSocketURL();
    if (!wsUrl) {
      if (mountedRef.current && reconnectTimerRef.current === null) {
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null;
          if (mountedRef.current) connect();
        }, 3000);
      }
      return;
    }

    connectingRef.current = true;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        connectingRef.current = false;
        if (mountedRef.current) {
          console.log('✅ WebSocket admin conectado');
          setConectado(true);
          
          if (needsInitialLoadRef.current) {
            console.log('🔄 [AdminWS] Reconexión detectada - recargando viajes...');
            cargarViajesIniciales();
          }
        }
      };

      ws.onmessage = (event) => {
        if (mountedRef.current) handleMessage(event);
      };

      ws.onerror = (error) => {
        connectingRef.current = false;
        console.error('❌ Error WebSocket admin:', error);
      };

      ws.onclose = (event) => {
        connectingRef.current = false;
        console.log(`🔌 WebSocket admin cerrado: ${event.code} ${event.reason}`);
        if (mountedRef.current) setConectado(false);
        wsRef.current = null;
        needsInitialLoadRef.current = true;

        if (mountedRef.current && event.code !== 1000 && reconnectTimerRef.current === null) {
          reconnectTimerRef.current = window.setTimeout(() => {
            reconnectTimerRef.current = null;
            if (mountedRef.current) connect();
          }, 5000);
        }
      };
    } catch (error) {
      connectingRef.current = false;
      console.error('Error al crear WebSocket:', error);
      if (mountedRef.current && reconnectTimerRef.current === null) {
        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null;
          if (mountedRef.current) connect();
        }, 5000);
      }
    }
  }, [handleMessage, cargarViajesIniciales]);

  // ── Ciclo de vida ──────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    connectingRef.current = false;
    needsInitialLoadRef.current = true;

    cargarViajesIniciales();

    const initTimer = setTimeout(() => {
      if (mountedRef.current) connect();
    }, 100);

    return () => {
      mountedRef.current = false;
      clearTimeout(initTimer);

      // Limpiar buffer timer
      if (batchTimerRef.current !== null) {
        window.clearTimeout(batchTimerRef.current);
        batchTimerRef.current = null;
      }

      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      if (
        wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close(1000, 'Component unmounted');
      }
      wsRef.current = null;
    };
  }, [connect, cargarViajesIniciales]);

  // ── Acciones expuestas ─────────────────────

  const enviarAlertaCritica = useCallback(async (
    userID: string,
    mensaje: string,
    nivel = 'CRITICO',
    lat: number,
    lon: number,
  ) => {
    const response = await api.postInternal<AlertaCriticaResponse>('/api/internal/alerta-critica', {
      user_id: userID,
      mensaje,
      nivel,
      coordenadas: { lat, lon },
    });

    upsertConductor(userID, {
      ultima_alerta_id: response.alerta_id,
      alerta_pendiente: response.enviado,
    }, true); // inmediato

    return response;
  }, [upsertConductor]);

  const centrarEnConductor = useCallback((userID: string) => {
    const conductor = conductoresRef.current.get(userID);
    return conductor ? { lat: conductor.lat, lon: conductor.lon } : null;
  }, []);

  return {
    conductores: Array.from(conductores.values()),
    conectado,
    enviarAlertaCritica,
    centrarEnConductor,
    eventos,
  };
}