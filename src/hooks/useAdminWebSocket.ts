import { useEffect, useRef, useState, useCallback } from 'react';
import { getToken } from '../api/client';

interface Coordenada {
  lat: number;
  lon: number;
}

interface ConductorEnRuta {
  user_id: string;
  ruta_id: string;
  lat: number;
  lon: number;
  estado: string;
  velocidad_kmh?: number;
  polilinea: Coordenada[];
  timestamp: string;
  desviado?: boolean;
  distancia_desvio_m?: number;
  inicio_lat?: number;
  inicio_lon?: number;
  started_at?: string;
  last_telemetry_at?: string;
}

export function useAdminWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [conductores, setConductores] = useState<Map<string, ConductorEnRuta>>(new Map());
  const [conectado, setConectado] = useState(false);
  const [eventos, setEventos] = useState<any[]>([]);
  const conductoresRef = useRef<Map<string, ConductorEnRuta>>(new Map());

  const updateConductores = (nuevoMapa: Map<string, ConductorEnRuta>) => {
    const anterior = conductoresRef.current;
    let cambio = false;
    
    if (anterior.size !== nuevoMapa.size) {
      cambio = true;
    } else {
      for (const [key, val] of nuevoMapa) {
        const old = anterior.get(key);
        if (!old || old.lat !== val.lat || old.lon !== val.lon || old.estado !== val.estado) {
          cambio = true;
          break;
        }
      }
    }
    
    if (cambio) {
      conductoresRef.current = new Map(nuevoMapa);
      setConductores(new Map(nuevoMapa));
    }
  };

  const connect = useCallback(() => {
    const token = getToken();
    if (!token) {
      console.warn('No hay token, reintentando en 3s...');
      setTimeout(connect, 3000);
      return;
    }

    const isProduction = import.meta.env.PROD;
  const wsUrl = isProduction
    ? `wss://saferoute-api-m4i5.onrender.com/ws/alertas/admin-monitor?user_id=admin&token=${token}`
    : `ws://localhost:8080/ws/alertas/admin-monitor?user_id=admin&token=${token}`;
    
    console.log('🔌 Conectando WebSocket admin...');
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ WebSocket admin conectado');
        setConectado(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          setEventos(prev => [...prev.slice(-50), { ...data, _received: new Date().toISOString() }]);

          switch (data.tipo) {
            case 'conductor_conectado': {
              const nuevo = new Map(conductoresRef.current);
              nuevo.set(data.user_id, {
                user_id: data.user_id,
                ruta_id: data.ruta_id,
                lat: data.lat,
                lon: data.lon,
                estado: data.estado || 'EN_RUTA',
                polilinea: data.polilinea || [],
                timestamp: data.timestamp,
                inicio_lat: data.lat,
                inicio_lon: data.lon,
                started_at: data.timestamp,
              });
              updateConductores(nuevo);
              break;
            }

            case 'telemetria': {
              const nuevo = new Map(conductoresRef.current);
              const existente = nuevo.get(data.user_id);
              if (existente) {
                nuevo.set(data.user_id, {
                  ...existente,
                  lat: data.lat,
                  lon: data.lon,
                  velocidad_kmh: data.velocidad_kmh,
                  estado: data.estado || existente.estado,
                  desviado: data.desviado,
                  distancia_desvio_m: data.distancia_desvio_m,
                  last_telemetry_at: data.timestamp,
                  timestamp: data.timestamp,
                  polilinea: existente.polilinea,
                });
              } else {
                nuevo.set(data.user_id, {
                  user_id: data.user_id,
                  ruta_id: data.ruta_id || 'desconocida',
                  lat: data.lat,
                  lon: data.lon,
                  estado: data.estado || 'EN_RUTA',
                  velocidad_kmh: data.velocidad_kmh,
                  polilinea: [],
                  timestamp: data.timestamp,
                  desviado: data.desviado,
                  distancia_desvio_m: data.distancia_desvio_m,
                });
              }
              updateConductores(nuevo);
              break;
            }

            case 'conductor_desconectado': {
              const nuevo = new Map(conductoresRef.current);
              nuevo.delete(data.user_id);
              updateConductores(nuevo);
              break;
            }

            case 'desconexion_alerta': {
              const nuevo = new Map(conductoresRef.current);
              const existente = nuevo.get(data.user_id);
              if (existente) {
                nuevo.set(data.user_id, { ...existente, estado: 'DESCONECTADO' });
                updateConductores(nuevo);
              }
              break;
            }

            case 'flash_alert_enviada':
              console.log('✅ Alerta enviada a', data.user_id);
              break;

            case 'alerta_critica_confirmada':
              console.log('✅ Conductor confirmó alerta:', data.user_id);
              break;
          }
        } catch (err) {
          console.error('Error parseando mensaje:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket desconectado, código:', event.code);
        setConectado(false);
        setTimeout(connect, 5000);
      };

      ws.onerror = (error) => {
        console.error('❌ Error WebSocket:', error);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error creando WebSocket:', err);
      setTimeout(connect, 5000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const enviarAlertaCritica = useCallback(async (
    userID: string, 
    mensaje: string, 
    nivel: string = 'CRITICO', 
    lat: number, 
    lon: number
  ) => {
    const baseUrl = 'https://saferoute-api-m4i5.onrender.com';
    
    const response = await fetch(`${baseUrl}/api/internal/alerta-critica`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-API-Key': import.meta.env.VITE_INTERNAL_API_KEY || 'dev-key',
      },
      body: JSON.stringify({ user_id: userID, mensaje, nivel, coordenadas: { lat, lon } })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Error enviando alerta');
    }
    
    return response.json();
  }, []);

  const centrarEnConductor = useCallback((userID: string) => {
    const conductor = conductoresRef.current.get(userID);
    if (conductor) {
      return { lat: conductor.lat, lon: conductor.lon };
    }
    return null;
  }, []);

  return {
    conductores: Array.from(conductores.values()),
    conectado,
    enviarAlertaCritica,
    centrarEnConductor,
    eventos,
  };
}