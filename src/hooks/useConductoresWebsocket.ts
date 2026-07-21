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
  const mountedRef = useRef(true);

  const conectar = useCallback(() => {
    // Validar que el componente siga montado
    if (!mountedRef.current) return;
    
    // Evitar reconexiones duplicadas
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const token = getToken();
    if (!token) {
      console.warn('No hay token disponible para el WebSocket.');
      // Reintentar en 3 segundos
      if (mountedRef.current && !reconnectTimerRef.current) {
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = undefined;
          conectar();
        }, 3000);
      }
      return;
    }

    // Detectar protocolo y construir URL
    const isProduction = import.meta.env.PROD || window.location.protocol === 'https:';
    const wsProtocol = isProduction ? 'wss:' : 'ws:';
    const wsHost = isProduction 
      ? 'saferoute-api-m4i5.onrender.com'
      : 'localhost:8080';
    
    const wsUrl = `${wsProtocol}//${wsHost}/ws/alertas/admin-monitor?user_id=admin&token=${token}`;

    console.log('🔌 Conectando a:', wsUrl);
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (mountedRef.current) {
          console.log('🔌 [Dashboard] WebSocket conectado para monitoreo');
          setConectado(true);
        }
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        
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

      ws.onclose = (event) => {
        if (mountedRef.current) {
          console.log('🔌 [Dashboard] WebSocket desconectado:', event.code);
          setConectado(false);
          
          // Solo reconectar si no fue un cierre intencional
          if (event.code !== 1000 && !reconnectTimerRef.current) {
            reconnectTimerRef.current = setTimeout(() => {
              reconnectTimerRef.current = undefined;
              conectar();
            }, 10000);
          }
        }
      };

      ws.onerror = (error) => {
        console.error('❌ [Dashboard] Error WebSocket:', error);
      };
    } catch (error) {
      console.error('Error al crear WebSocket:', error);
      // Reintentar conexión
      if (mountedRef.current && !reconnectTimerRef.current) {
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = undefined;
          conectar();
        }, 10000);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    // Iniciar conexión con pequeño delay
    const initTimer = setTimeout(() => conectar(), 100);
    
    return () => {
      mountedRef.current = false;
      clearTimeout(initTimer);
      
      // Limpiar timer de reconexión
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = undefined;
      }
      
      // Cerrar WebSocket limpiamente
      if (wsRef.current?.readyState === WebSocket.OPEN || 
          wsRef.current?.readyState === WebSocket.CONNECTING) {
        wsRef.current.close(1000, 'Component unmounted');
      }
      wsRef.current = null;
    };
  }, [conectar]);

  return { 
    conductores: Array.from(conductores.values()), 
    conectado 
  };
}