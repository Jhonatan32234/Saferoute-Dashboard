import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapContext } from '../../contexts/MapContext';
import { api, motores } from '../../api/client';
import type { Reporte, ZonaPredicha } from '../../types';
import { getTipoLabel, timeAgo } from '../../utils/formatters';
import PanelBusqueda from './PanelBusqueda';
import PanelPredicciones from './PanelPredicciones';
import PanelEstadisticas from './PanelEstadisticas';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useAdminWebSocket } from '@/hooks/useAdminWebSocket';
import PanelConductores from './PanelConductores';
import ModalNotificarConductor from '../dashboard/ModalNotificarConductor';
import EmpresaPanel from '../dashboard/EmpresaPanel';

const reportColors: Record<string, string> = {
  inundacion: '#3b82f6',
  accidente: '#ef4444',
  bache: '#f59e0b',
  derrumbe: '#8b5cf6',
  bloqueo: '#ef4444',
  sin_luz: '#8b5cf6',
  niebla: '#94a3b8',
  otro: '#8b5cf6',
};

const GEO_CHIAPAS: Record<string, { lat: number; lon: number }> = {
  'tuxtla': { lat: 16.753, lon: -93.115 },
  'tuxtla gutierrez': { lat: 16.753, lon: -93.115 },
  'tuxtla gutiérrez': { lat: 16.753, lon: -93.115 },
  'berriozabal': { lat: 16.806, lon: -93.272 },
  'berriozábal': { lat: 16.806, lon: -93.272 },
  'suchiapa': { lat: 16.620, lon: -93.100 },
  'chiapa de corzo': { lat: 16.707, lon: -93.017 },
  'chicoasen': { lat: 16.967, lon: -93.100 },
  'chicoasén': { lat: 16.967, lon: -93.100 },
  'ocozocoautla': { lat: 16.762, lon: -93.375 },
  'coita': { lat: 16.750, lon: -93.383 },
  'san cristobal': { lat: 16.737, lon: -92.637 },
  'san cristóbal': { lat: 16.737, lon: -92.637 },
  'teopisca': { lat: 16.540, lon: -92.520 },
  'comitan': { lat: 16.251, lon: -92.134 },
  'comitán': { lat: 16.251, lon: -92.134 },
  'las margaritas': { lat: 16.315, lon: -91.981 },
  'ocosingo': { lat: 16.907, lon: -92.096 },
  'villaflores': { lat: 16.232, lon: -93.267 },
  'tonala': { lat: 16.089, lon: -93.751 },
  'tonalá': { lat: 16.089, lon: -93.751 },
  'tapachula': { lat: 14.904, lon: -92.264 },
  'motozintla': { lat: 15.365, lon: -92.248 },
  'palenque': { lat: 17.509, lon: -91.982 },
  'catazaja': { lat: 17.717, lon: -92.017 },
  'catazajá': { lat: 17.717, lon: -92.017 },
};

function geolocalizarTexto(texto: string): { lat: number; lon: number } | null {
  const textoLower = texto.toLowerCase();
  const ciudades = Object.keys(GEO_CHIAPAS).sort((a, b) => b.length - a.length);
  for (const ciudad of ciudades) {
    if (textoLower.includes(ciudad)) {
      return {
        lat: GEO_CHIAPAS[ciudad].lat + (Math.random() - 0.5) * 0.008,
        lon: GEO_CHIAPAS[ciudad].lon + (Math.random() - 0.5) * 0.008,
      };
    }
  }
  return null;
}

function extraerCiudadDeConsulta(query: string): string | null {
  const queryLower = query.toLowerCase();
  const ciudades = Object.keys(GEO_CHIAPAS).sort((a, b) => b.length - a.length);
  for (const ciudad of ciudades) {
    if (queryLower.includes(ciudad)) return ciudad;
  }
  return null;
}

export default function DashboardPrincipal() {
  const { puntos, setPuntos, limpiarPuntosPorTipo, setCentroMapa, setZoomMapa, centroMapa, zoomMapa } = useMapContext();
  
  const [panelActivo, setPanelActivo] = useState<string | null>(null);
  const [isLoadingReportes, setIsLoadingReportes] = useState(false);
  const [isLoadingPrediccion, setIsLoadingPrediccion] = useState(false);
  const [totalReportes, setTotalReportes] = useState(0);
  const [zonasPredichas, setZonasPredichas] = useState<ZonaPredicha[]>([]);
  const [mapReady, setMapReady] = useState(false);
  
  const [modalNotificarAbierto, setModalNotificarAbierto] = useState(false);
  const [incidenteParaNotificar, setIncidenteParaNotificar] = useState<any>(null);
  
  const { conductores, conectado, enviarAlertaCritica, centrarEnConductor } = useAdminWebSocket();
  const conductoresDesviados = conductores.filter(c => c.estado === 'DESVIADO' || c.desviado).length;
  const conductoresSinSenal = conductores.filter(c => c.estado === 'DESCONECTADO').length;

  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      handleNotificarConductor(customEvent.detail);
    };
    window.addEventListener('notificar-conductor', handler);
    return () => window.removeEventListener('notificar-conductor', handler);
  }, []);

  const handleNotificarConductor = useCallback((incidente: any) => {
    setIncidenteParaNotificar({
      id: incidente.id,
      tipo: incidente.tipo || 'otro',
      lat: incidente.lat,
      lon: incidente.lon,
      descripcion: incidente.descripcion || incidente.label || 'Sin descripción',
    });
    setModalNotificarAbierto(true);
  }, []);

  // ========== ACTUALIZAR CONDUCTORES EN EL MAPA ==========
  useEffect(() => {
    if (conductores.length === 0) {
      setPuntos(prev => {
        const sinConductores = prev.filter(p => p.tipo !== 'conductor');
        return sinConductores.length !== prev.length ? sinConductores : prev;
      });
      return;
    }

    const puntosConductores = conductores.map(conductor => {
      const estado = conductor.estado || 'EN_RUTA';
      const esDesviado = conductor.desviado || estado === 'DESVIADO';
      const esDesconectado = estado === 'DESCONECTADO';
      const esSinSesion = estado === 'SIN_SESION';

      let color: string;
      let borderColor: string;
      let shadowColor: string;
      let radius: number;
      let estadoLabel: string;

      if (esDesconectado) {
        color = '#ef4444';
        borderColor = '#fecaca';
        shadowColor = 'rgba(239,68,68,0.5)';
        radius = 9;
        estadoLabel = 'SIN SEÑAL 🚨';
      } else if (esDesviado) {
        color = '#f59e0b';
        borderColor = '#fff';
        shadowColor = 'rgba(245,158,11,0.6)';
        radius = 12;
        estadoLabel = 'DESVIADO ⚠️';
      } else if (esSinSesion) {
        color = '#94a3b8';
        borderColor = '#fff';
        shadowColor = 'rgba(148,163,184,0.3)';
        radius = 8;
        estadoLabel = 'SIN SESIÓN';
      } else {
        color = '#10b981';
        borderColor = '#fff';
        shadowColor = 'rgba(16,185,129,0.4)';
        radius = 11;
        estadoLabel = 'EN RUTA ✓';
      }

      const nombreDisplay = conductor.nombre_conductor
        ? conductor.nombre_conductor
        : `Conductor ${conductor.user_id?.substring(0, 8)}`;

      return {
        id: `conductor-${conductor.user_id}`,
        lat: conductor.lat,
        lon: conductor.lon,
        color: color,
        radius: radius,
        tipo: 'conductor' as const,
        label: nombreDisplay,
        popupContent: `
          <div style="font-size:12px;min-width:230px;font-family:system-ui,sans-serif;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:8px;background:${color}18;border-radius:8px;border:1px solid ${color}35;">
              <div style="width:26px;height:26px;border-radius:50%;background:${color};border:2.5px solid ${borderColor};box-shadow:0 0 10px ${shadowColor};flex-shrink:0;"></div>
              <div>
                <span style="font-weight:700;color:${color};font-size:13px;">${estadoLabel}</span>
                <br><span style="font-size:10px;color:#64748b;">${(conductor.velocidad_kmh ?? 0).toFixed(1)} km/h</span>
              </div>
            </div>
            <div style="margin-bottom:3px;font-weight:600;font-size:13px;color:#e2e8f0;">${nombreDisplay}</div>
            <div style="margin-bottom:2px;color:#94a3b8;"><b>Ruta:</b> ${conductor.ruta_id}</div>
            <div style="margin-bottom:2px;color:#94a3b8;"><b>Pos:</b> ${conductor.lat.toFixed(5)}, ${conductor.lon.toFixed(5)}</div>
            ${conductor.distancia_desvio_m ? `<div style="margin-bottom:2px;color:#f59e0b;"><b>Desvío:</b> ${conductor.distancia_desvio_m.toFixed(0)} m desde la ruta</div>` : ''}
            ${conductor.ultima_alerta_id ? `<div style="margin-bottom:2px;color:${conductor.alerta_pendiente ? '#f59e0b' : '#10b981'};"><b>Alerta:</b> ${conductor.alerta_pendiente ? '⏳ pendiente confirmación' : '✅ confirmada'}</div>` : ''}
            ${conductor.last_telemetry_at ? `<div style="font-size:10px;color:#64748b;margin-top:5px;border-top:1px solid #2a4070;padding-top:4px;">Actualizado: ${timeAgo(conductor.last_telemetry_at)}</div>` : ''}
          </div>
        `
      };
    });

    setPuntos(prev => {
      const sinConductores = prev.filter(p => p.tipo !== 'conductor');
      const nuevosPuntos = [...sinConductores, ...puntosConductores];
      const haCambiado = JSON.stringify(nuevosPuntos) !== JSON.stringify(prev);
      return haCambiado ? nuevosPuntos : prev;
    });
  }, [conductores]);

  // ========== CARGAR REPORTES ==========
  const cargarReportes = useCallback(async (tipoFiltro = '', queryBusqueda = '') => {
    setIsLoadingReportes(true);
    try {
      limpiarPuntosPorTipo('reporte');
      let reportes: Reporte[] = [];
      
      if (queryBusqueda && queryBusqueda.trim().length >= 2) {
        try {
          const nlpData = await motores.post('nlp', '/nlp/buscar', {
            query: queryBusqueda.trim(),
            top_k: 20,
            metodo: 'bm25'
          });
          
          let resultadosNLP = nlpData.resultados || [];
          if (tipoFiltro) {
            resultadosNLP = resultadosNLP.filter((r: any) => r.tipo === tipoFiltro);
          }
          
          if (resultadosNLP.length > 0) {
            const params = new URLSearchParams({ vigente: 'true', limit: '500' });
            const apiData = await api.get(`/api/reportes?${params}`);
            const reportesAPI = apiData.reportes || [];
            const mapaReportes: Record<string, Reporte> = {};
            reportesAPI.forEach((r: Reporte) => { mapaReportes[r.id] = r; });
            const ciudadBuscada = extraerCiudadDeConsulta(queryBusqueda);
            
            reportes = resultadosNLP
              .filter((r: any) => {
                if (ciudadBuscada) {
                  const texto = (r.texto || '').toLowerCase();
                  if (r.score > 5.0) return true;
                  if (texto.includes(ciudadBuscada)) return true;
                  return false;
                }
                return true;
              })
              .map((r: any) => {
                const reporteCompleto = mapaReportes[r.id];
                if (reporteCompleto) {
                  const lat = Number(reporteCompleto.latitud || reporteCompleto.lat);
                  const lon = Number(reporteCompleto.longitud || reporteCompleto.lon);
                  if (lat && lon && !isNaN(lat) && !isNaN(lon) && !(lat === 16.753 && lon === -93.115)) {
                    return { ...reporteCompleto, score: r.score };
                  }
                }
                const geo = geolocalizarTexto(r.texto || '');
                if (geo) {
                  return { id: r.id, tipo: r.tipo, texto: r.texto, nota_voz: r.texto, ruta_id: r.ruta_id, timestamp: r.timestamp, score: r.score, confirmaciones: 0, latitud: geo.lat, longitud: geo.lon } as Reporte;
                }
                if (r.score > 3.0) {
                  const c = extraerCiudadDeConsulta(r.texto || '') || 'tuxtla';
                  const coords = GEO_CHIAPAS[c] || { lat: 16.5, lon: -93.1 };
                  return { id: r.id, tipo: r.tipo, texto: r.texto, nota_voz: r.texto, ruta_id: r.ruta_id, timestamp: r.timestamp, score: r.score, confirmaciones: 0, latitud: coords.lat + (Math.random()-0.5)*0.01, longitud: coords.lon + (Math.random()-0.5)*0.01 } as Reporte;
                }
                return null;
              })
              .filter((r: Reporte | null): r is Reporte => r !== null);
          }
        } catch (err) {
          console.warn('⚠️ Motor NLP no disponible:', err);
        }
      }
      
      setTotalReportes(reportes.length);
      
      if (reportes.length > 0) {
        const maxScore = Math.max(...reportes.map(r => (r as any).score || 0), 1);
        const puntosReportes = reportes
          .filter((r: Reporte) => {
            const lat = Number(r.latitud || (r as any).lat);
            const lon = Number(r.longitud || (r as any).lon);
            return lat && lon && !isNaN(lat) && !isNaN(lon);
          })
          .map((reporte: Reporte, i: number) => {
            const lat = Number(reporte.latitud || (reporte as any).lat);
            const lon = Number(reporte.longitud || (reporte as any).lon);
            const color = reportColors[reporte.tipo] || '#8b5cf6';
            const rawScore = (reporte as any).score || 0;
            const normalizedScore = maxScore > 0 ? rawScore / maxScore : 0;
            const radius = 5 + normalizedScore * 10;
            const scorePercent = Math.round(normalizedScore * 100);
            const descripcionCorta = (reporte.nota_voz || reporte.texto || 'Sin descripción').substring(0, 120);
            
            return {
              id: reporte.id || `r-${i}`,
              lat, lon, color, radius,
              tipo: 'reporte' as const,
              label: getTipoLabel(reporte.tipo),
              timestamp: reporte.timestamp,
              popupContent: `
                <div style="font-size:12px;min-width:200px;font-family:system-ui,sans-serif;">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <span style="background:${color};color:white;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:600;">
                      ${getTipoLabel(reporte.tipo)}
                    </span>
                    <span style="font-size:10px;color:#64748b;">Relevancia: ${scorePercent}%</span>
                  </div>
                  <p style="margin:6px 0;font-size:11px;color:#cbd5e1;line-height:1.4;">
                    ${descripcionCorta}
                  </p>
                  <span style="font-size:10px;color:#64748b;">Ruta: ${reporte.ruta_id || 'N/A'}</span>
                  <button 
                    onclick="event.stopPropagation(); window.dispatchEvent(new CustomEvent('notificar-conductor', { detail: ${JSON.stringify({
                      id: reporte.id,
                      tipo: reporte.tipo,
                      lat: lat,
                      lon: lon,
                      descripcion: descripcionCorta
                    }).replace(/"/g, '&quot;')} }))"
                    style="width:100%;padding:8px;margin-top:10px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;border-radius:8px;cursor:pointer;font-size:11px;font-weight:600;"
                  >
                    Notificar a conductor
                  </button>
                </div>
              `
            };
          });
        
        setPuntos(prev => [...prev.filter(p => p.tipo !== 'reporte'), ...puntosReportes]);
        if (puntosReportes.length > 0) {
          setCentroMapa([puntosReportes[0].lat, puntosReportes[0].lon]);
          setZoomMapa(10);
        }
      } else if (queryBusqueda || tipoFiltro) {
        setPuntos(prev => prev.filter(p => p.tipo !== 'reporte'));
      }
    } catch (err) {
      console.error('❌ Error:', err);
    } finally {
      setIsLoadingReportes(false);
    }
  }, [limpiarPuntosPorTipo, setPuntos, setCentroMapa, setZoomMapa]);

  // ========== GENERAR PREDICCIONES ==========
  const generarPredicciones = useCallback(async (vehiculo: string, horario: string) => {
    setIsLoadingPrediccion(true);
    limpiarPuntosPorTipo('prediccion');
    try {
      let data;
      try {
        data = await motores.post('predicciones', '/predicciones/zonas', {
          lat: 16.753, lon: -93.115, radio_km: 80,
          tipo_vehiculo: vehiculo, horario: horario,
        });
      } catch {
        data = await api.post('/api/predicciones/zonas', {
          lat: 16.753, lon: -93.115, radio_km: 80,
          tipo_vehiculo: vehiculo, horario: horario,
        });
      }
      
      const zonas = data.zonas || [];
      setZonasPredichas(zonas);
      
      if (zonas.length > 0) {
        const nuevosPuntos = zonas.map((zona: ZonaPredicha, i: number) => {
          const lat = zona.latitud || zona.lat || (16.7 + (Math.random() - 0.5) * 0.8);
          const lon = zona.longitud || zona.lon || (-93.1 + (Math.random() - 0.5) * 0.8);
          const nivelColor = zona.nivel === 'critico' ? '#ef4444' : 
                            zona.nivel === 'alto' ? '#f59e0b' : 
                            zona.nivel === 'medio' ? '#eab308' : '#10b981';
          const radius = zona.nivel === 'critico' ? 22 : zona.nivel === 'alto' ? 16 : 11;
          
          return {
            id: `pred-${i}-${Date.now()}`,
            lat, lon, color: nivelColor, radius,
            tipo: 'prediccion' as const,
            label: zona.nombre_zona || `Zona ${i + 1}`,
            popupContent: `
              <div style="font-size:12px;min-width:180px;font-family:system-ui,sans-serif;">
                <b>${zona.nombre_zona || `Zona ${i + 1}`}</b>
                <span style="background:${nivelColor};color:white;padding:1px 6px;border-radius:8px;font-size:10px;margin-left:4px;">${(zona.nivel || 'medio').toUpperCase()}</span>
                <hr style="margin:6px 0;border-color:#cbd5e1;">
                <b>Prob:</b> ${((zona.probabilidad_incidente || 0.5) * 100).toFixed(0)}%<br>
                <b>Tipo:</b> ${zona.tipo_riesgo_predominante || 'General'}<br>
                ${zona.recomendacion ? `<span style="color:#0369a1;">${zona.recomendacion}</span>` : ''}
              </div>
            `
          };
        });

        setPuntos(prev => [...prev.filter(p => p.tipo !== 'prediccion'), ...nuevosPuntos]);
        if (nuevosPuntos.length > 0) {
          setCentroMapa([nuevosPuntos[0].lat, nuevosPuntos[0].lon]);
          setZoomMapa(10);
        }
      }
    } catch (err) {
      console.error('❌ Error generando predicciones:', err);
    } finally {
      setIsLoadingPrediccion(false);
    }
  }, [limpiarPuntosPorTipo, setPuntos, setCentroMapa, setZoomMapa]);

  const limpiarPredicciones = () => {
    limpiarPuntosPorTipo('prediccion');
    setZonasPredichas([]);
  };

  const togglePanel = (panel: string) => {
    setPanelActivo(panelActivo === panel ? null : panel);
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* ── Barra de herramientas ── */}
      <div className="flex-shrink-0 bg-[#0d1b33] border-b border-[#2a4070]/30 px-4 py-2 flex items-center gap-2 overflow-x-auto z-30">
        <button onClick={() => togglePanel('busqueda')} 
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            panelActivo === 'busqueda' ? 'bg-[#0ea5e9]/20 text-[#0ea5e9] border border-[#0ea5e9]/30' : 'bg-[#0f1f3a] text-[#94a3b8] hover:text-white'
          }`}>
          Buscar
        </button>
        
        <button onClick={() => togglePanel('predicciones')} 
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            panelActivo === 'predicciones' ? 'bg-[#0ea5e9]/20 text-[#0ea5e9] border border-[#0ea5e9]/30' : 'bg-[#0f1f3a] text-[#94a3b8] hover:text-white'
          }`}>
          Predicciones
        </button>
        
        <button onClick={() => togglePanel('estadisticas')} 
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            panelActivo === 'estadisticas' ? 'bg-[#0ea5e9]/20 text-[#0ea5e9] border border-[#0ea5e9]/30' : 'bg-[#0f1f3a] text-[#94a3b8] hover:text-white'
          }`}>
          Estadisticas
        </button>

        <button onClick={() => togglePanel('conductores')} 
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            panelActivo === 'conductores' ? 'bg-[#0ea5e9]/20 text-[#0ea5e9] border border-[#0ea5e9]/30' : 'bg-[#0f1f3a] text-[#94a3b8] hover:text-white'
          }`}>
          Conductores ({conductores.length})
        </button>

        {zonasPredichas.length > 0 && (
          <button onClick={limpiarPredicciones}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0f1f3a] text-[#ef4444] hover:text-white border border-[#2a4070]/30">
            Limpiar predicciones
          </button>
        )}

        {(totalReportes > 0) && (
          <button onClick={() => { limpiarPuntosPorTipo('reporte'); setTotalReportes(0); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0f1f3a] text-[#94a3b8] hover:text-white border border-[#2a4070]/30">
            Limpiar búsqueda
          </button>
        )}

        <div className="flex-1"></div>
        
    
        
        <span className="text-xs text-[#627d98]">
          {totalReportes} rep | {zonasPredichas.length} zonas
        </span>
      </div>

      {/* ── Contenido principal ── */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* Panel lateral - en lg+ es relative (ocupa espacio en flex), en <lg es absolute (overlay sobre mapa) */}
        {panelActivo && (
          <div 
            className="absolute lg:relative left-0 top-0 bottom-0 w-80 bg-[#0d1b33] border-r border-[#2a4070]/30 overflow-y-auto shadow-2xl flex-shrink-0"
            style={{ zIndex: 1001 }}
          >
            {panelActivo === 'busqueda' && (
              <PanelBusqueda onBuscar={cargarReportes} onCerrar={() => setPanelActivo(null)} isLoading={isLoadingReportes} />
            )}
            {panelActivo === 'predicciones' && (
              <PanelPredicciones onPredecir={generarPredicciones} onLimpiar={limpiarPredicciones} onCerrar={() => setPanelActivo(null)} isLoading={isLoadingPrediccion} hasPredicciones={zonasPredichas.length > 0} />
            )}
            {panelActivo === 'estadisticas' && (
              <PanelEstadisticas stats={{ totalZonas: zonasPredichas.length, zonasCriticas: zonasPredichas.filter(z => z.nivel === 'critico').length, totalReportes, nivelDominante: zonasPredichas[0]?.tipo_riesgo_predominante || '--' }} onCerrar={() => setPanelActivo(null)} />
            )}
            {panelActivo === 'empresa' && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold">🏢 Mi Empresa</h3>
                  <button onClick={() => setPanelActivo(null)} className="text-gray-400 hover:text-white">✕</button>
                </div>
                <EmpresaPanel />
              </div>
            )}
            {panelActivo === 'conductores' && (
              <PanelConductores 
                conductores={conductores} 
                onCentrar={(uid) => { 
                  const c = centrarEnConductor(uid); 
                  if (c) { setCentroMapa([c.lat, c.lon]); setZoomMapa(14); } 
                }} 
                onEnviarAlerta={(uid, lat, lon) => { 
                  const m = prompt('Mensaje de alerta:'); 
                  if (m) enviarAlertaCritica(uid, m, 'CRITICO', lat, lon)
                    .then(() => alert('✅'))
                    .catch(() => alert('❌')); 
                }} 
                onCerrar={() => setPanelActivo(null)} 
              />
            )}
          </div>
        )}

        {/* Mapa - ocupa el espacio restante */}
        <div className="flex-1 relative min-w-0" style={{ zIndex: 10 }}>
          {!mapReady && (
            <div className="absolute inset-0 z-20 bg-[#0a1628] flex items-center justify-center">
              <LoadingSpinner message="Cargando mapa..." />
            </div>
          )}
          
          <MapContainer 
            center={[16.5, -93.3]} 
            zoom={9} 
            scrollWheelZoom={true} 
            className="h-full w-full" 
            style={{ background: '#0a1628' }}
          >
            <TileLayer 
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
              attribution='&copy; OpenStreetMap' 
            />
            
            {conductores.map(c => c.polilinea && c.polilinea.length > 1 && (
              <Polyline
                key={`ruta-${c.user_id}`}
                positions={c.polilinea.map(p => [p.lat, p.lon] as [number, number])}
                pathOptions={{
                  color: c.estado === 'DESCONECTADO' ? '#9ca3af' : 
                         c.desviado || c.estado === 'DESVIADO' ? '#f87171' : '#38bdf8',
                  weight: 3,
                  opacity: 0.75,
                  dashArray: c.estado === 'DESCONECTADO' ? '4 6' : 
                             c.desviado ? '10 5' : undefined,
                }}
              />
            ))}
            
            {puntos.map((punto) => (
              <CircleMarker
                key={punto.id}
                center={[punto.lat, punto.lon]}
                radius={punto.radius}
                fillColor={punto.color}
                color={punto.tipo === 'conductor' ? '#fff' : '#fff'}
                weight={punto.tipo === 'conductor' ? 3 : 1.5}
                fillOpacity={punto.tipo === 'conductor' ? 1 : 0.85}
                className={punto.tipo === 'conductor' && punto.color === '#ef4444' ? 'conductor-pulse' : ''}
              >
                <Popup>
                  <div dangerouslySetInnerHTML={{ __html: punto.popupContent }} />
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* ── Leyenda ── */}
      <div className="flex-shrink-0 bg-[#0d1b33] border-t border-[#2a4070]/30 px-4 py-1.5 flex flex-wrap gap-3 text-xs text-[#94a3b8] z-30">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span> Crítico</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span> Alto</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#eab308]"></span> Medio</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span> Bajo</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2 border-[#3b82f6] bg-transparent"></span> Reporte</span>
        <span className="flex items-center gap-1.5">
          <span className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-[#10b981] border-2 border-white shadow-lg shadow-green-500/50"></span>
          </span>
          En ruta
        </span>
        <span className="flex items-center gap-1.5">
          <span className="relative flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-[#f59e0b] border-2 border-white shadow-lg shadow-yellow-500/50"></span>
          </span>
          Desviado        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#6b7280] border border-[#9ca3af]" style={{borderStyle:'dashed'}}></span>
          Desconectado
        </span>
      </div>

      <ModalNotificarConductor
        isOpen={modalNotificarAbierto}
        onClose={() => {
          setModalNotificarAbierto(false);
          setIncidenteParaNotificar(null);
        }}
        incidente={incidenteParaNotificar}
        conductores={conductores}
      />
    </div>
  );
}