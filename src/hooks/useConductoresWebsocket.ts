import { useEffect, useRef, useState, useCallback } from 'react';
import { getToken } from '../api/client';

export interface ConductorUbicacion {
  userId: string;
  nombre?: string;
  lat: number;
  lon: number;
  velocidadKmh?: number;
  rutaId?: string;
  ultimaActualizacion: string;
}

export function useConductoresWebSocket() {
  const [conductores, setConductores] = useState<Map<string, ConductorUbicacion>>(new Map());
  const [conectado, setConectado] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setInterval>>();

  const conectar = useCallback(() => {
    const token = getToken();
    if (!token) return;

    // Intentar cerrar conexión anterior
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Conectar al WebSocket del Gateway
    // Usamos una ruta especial "admin-monitor" para que el admin reciba todas las telemetrías
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.DEV 
      ? 'https://saferoute-api-m4i5.onrender.com' 
      : 'https://saferoute-api-m4i5.onrender.com';
    
    const wsUrl = `https://saferoute-api-m4i5.onrender.com/ws/alertas/admin-monitor?user_id=admin`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('🔌 [Dashboard] WebSocket conectado para monitoreo');
      setConectado(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        // Solo procesar mensajes de telemetría
        if (msg.tipo === 'telemetria') {
          setConductores((prev) => {
            const nuevo = new Map(prev);
            nuevo.set(msg.user_id || 'desconocido', {
              userId: msg.user_id || 'desconocido',
              lat: msg.lat,
              lon: msg.lon,
              velocidadKmh: msg.velocidad_kmh,
              rutaId: msg.ruta_id,
              ultimaActualizacion: msg.timestamp || new Date().toISOString(),
            });
            return nuevo;
          });
        }
      } catch (e) {
        // Ignorar mensajes no JSON
      }
    };

    ws.onclose = () => {
      console.log('🔌 [Dashboard] WebSocket desconectado');
      setConectado(false);
      reconnectTimerRef.current = setTimeout(() => conectar(), 10000); // 10s en vez de 5s
    };

    ws.onerror = (error) => {
      console.error('❌ [Dashboard] Error WebSocket:', error);
    };
  }, []);

  useEffect(() => {
    conectar();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [conectar]);

  return { conductores: Array.from(conductores.values()), conectado };
}