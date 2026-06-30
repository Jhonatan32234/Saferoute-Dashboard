import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapContext } from '../../contexts/MapContext';
import { motores, api } from '../../api/client';
import type { ZonaPredicha, Reporte } from '../../types';
import { getTipoLabel, timeAgo, formatDate } from '../../utils/formatters';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';

function MapController() {
  const map = useMap();
  const { centroMapa, zoomMapa } = useMapContext();

  useEffect(() => {
    map.setView(centroMapa, zoomMapa, { animate: true });
  }, [centroMapa, zoomMapa, map]);

  return null;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => { 
    setTimeout(() => map.invalidateSize(), 100); 
  }, [map]);
  return null;
}

// Colores para tipos de reportes
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

export default function MapaView() {
  const { puntos, setPuntos, limpiarPuntos, limpiarPuntosPorTipo, setCentroMapa, setZoomMapa } = useMapContext();
  
  // Estado del formulario de prediccion
  const [vehiculo, setVehiculo] = useState('carga');
  const [horario, setHorario] = useState('diurno');
  const [isLoadingPrediccion, setIsLoadingPrediccion] = useState(false);
  const [errorPrediccion, setErrorPrediccion] = useState('');
  const [zonasPredichas, setZonasPredichas] = useState<ZonaPredicha[]>([]);
  const [prediccionRealizada, setPrediccionRealizada] = useState(false);

  // Estado de reportes
  const [isLoadingReportes, setIsLoadingReportes] = useState(false);
  const [errorReportes, setErrorReportes] = useState('');
  const [reportesCargados, setReportesCargados] = useState(false);
  const [filtroTipoReporte, setFiltroTipoReporte] = useState('');

  // Estadisticas
  const [stats, setStats] = useState({
    totalZonas: 0,
    zonasCriticas: 0,
    totalReportes: 0,
    nivelDominante: '--'
  });

  // Cargar reportes al iniciar
  useEffect(() => {
    cargarReportesEnMapa();
    return () => limpiarPuntos();
  }, []);

  async function cargarReportesEnMapa(tipoFiltro = '') {
  setIsLoadingReportes(true);
  setErrorReportes('');
  
  try {
    limpiarPuntosPorTipo('reporte');
    
    let todosLosReportes: Reporte[] = [];
    let offset = 0;
    const LIMITE = 200; // Máximo que acepta el backend
    
    while (true) {
      const params = new URLSearchParams({
        vigente: 'true',
        limit: String(LIMITE),
        offset: String(offset),
      });
      if (tipoFiltro) params.set('tipo', tipoFiltro);
      
      const data = await api.get(`/reportes?${params}`);
      const reportes = data.reportes || [];
      
      if (reportes.length === 0) break;
      
      todosLosReportes = [...todosLosReportes, ...reportes];
      
      // Si recibió menos del límite, es la última página
      if (reportes.length < LIMITE) break;
      
      offset += LIMITE;
    }
    
    // Renderizar todos los puntos
    if (todosLosReportes.length > 0) {
      const puntosReportes = todosLosReportes.map((reporte, i) => {
        const lat = Number(reporte.latitud || reporte.lat);
        const lon = Number(reporte.longitud || reporte.lon);
        if (!lat || !lon || isNaN(lat) || isNaN(lon)) return null;
        
        const color = reportColors[reporte.tipo] || '#8b5cf6';
        
        return {
          id: reporte.id || `r-${i}`,
          lat, lon, color,
          radius: 7,
          tipo: 'reporte' as const,
          label: getTipoLabel(reporte.tipo),
          timestamp: reporte.timestamp,
          popupContent: `
            <div style="font-size:12px;min-width:200px;">
              <span style="background:${color};color:white;padding:2px 8px;border-radius:10px;font-size:10px;">${getTipoLabel(reporte.tipo)}</span>
              <span style="font-size:10px;color:#64748b;margin-left:6px;">${timeAgo(reporte.timestamp)}</span>
              <p style="margin:6px 0;font-size:11px;">${(reporte.nota_voz || '').substring(0, 120)}</p>
              <span style="font-size:10px;color:#64748b;">📍 ${reporte.ruta_id}</span>
            </div>
          `
        };
      }).filter(Boolean);
      
      setPuntos(prev => [...prev, ...puntosReportes]);
      setStats(prev => ({ ...prev, totalReportes: todosLosReportes.length }));
      setReportesCargados(true);
    }
  } catch (err) {
    setErrorReportes(err instanceof Error ? err.message : 'Error al cargar reportes');
  } finally {
    setIsLoadingReportes(false);
  }
}

  function getNivelColor(nivel: string): string {
    switch (nivel) {
      case 'critico': return '#ef4444';
      case 'alto': return '#f59e0b';
      case 'medio': return '#eab308';
      default: return '#10b981';
    }
  }

  function getNivelBg(nivel: string): string {
    switch (nivel) {
      case 'critico': return 'bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)]';
      case 'alto': return 'bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.3)]';
      case 'medio': return 'bg-[rgba(234,179,8,0.1)] border-[rgba(234,179,8,0.3)]';
      default: return 'bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.3)]';
    }
  }

  async function predecirZonas() {
    setIsLoadingPrediccion(true);
    setErrorPrediccion('');
    setPrediccionRealizada(true);
    limpiarPuntosPorTipo('prediccion');
    
    try {
      const data = await motores.post('predicciones', '/predicciones/zonas', {
        lat: 16.753,
        lon: -93.115,
        radio_km: 80,
        tipo_vehiculo: vehiculo,
        horario: horario,
      });
      
      const zonas = data.zonas || [];
      setZonasPredichas(zonas);

      const criticas = zonas.filter((z: ZonaPredicha) => z.nivel === 'critico').length;
      
      setStats(prev => ({
        ...prev,
        totalZonas: zonas.length,
        zonasCriticas: criticas,
        nivelDominante: zonas.length > 0 ? zonas[0].tipo_riesgo_predominante : '--'
      }));

      if (zonas.length > 0) {
  const nuevosPuntos = zonas.map((zona: ZonaPredicha) => {
    // ✅ USAR LAS COORDENADAS REALES DE LA ZONA
    const lat = zona.lat || 16.753;
    const lon = zona.lon || -93.115;
    
    const nivelColor = getNivelColor(zona.nivel);
    const radius = zona.nivel === 'critico' ? 22 : 
                  zona.nivel === 'alto' ? 16 : 
                  zona.nivel === 'medio' ? 11 : 7;

    return {
      id: `pred-${zona.nombre_zona}-${zona.cluster_id || Math.random()}`,
      lat,  // ✅ Coordenada real
      lon,  // ✅ Coordenada real
      color: nivelColor,
      radius,
      tipo: 'prediccion' as const,
      label: zona.nombre_zona,
      popupContent: `
        <div style="font-size:12px; color:#1e293b;">
          <b style="font-size:13px;">${zona.nombre_zona}</b>
          <span style="background:${nivelColor}; color:white; padding:1px 6px; border-radius:8px; font-size:10px; margin-left:4px;">${zona.nivel.toUpperCase()}</span>
          <hr style="margin:6px 0; border-color:#cbd5e1;">
          <div style="margin-bottom:3px;"><b>Probabilidad:</b> ${(zona.probabilidad_incidente * 100).toFixed(0)}%</div>
          <div style="margin-bottom:3px;"><b>Tipo:</b> ${zona.tipo_riesgo_predominante}</div>
          <div style="margin-bottom:3px;"><b>Factores:</b> ${zona.factores_contribuyentes.slice(0, 3).join(', ')}</div>
          <div style="color:#0369a1; margin-top:4px; font-style:italic;">${zona.recomendacion}</div>
        </div>
      `
    };
  });

  setPuntos(prev => [...prev, ...nuevosPuntos]);
  
  // Centrar en la primera zona predicha (sus coordenadas reales)
  if (nuevosPuntos.length > 0) {
    setCentroMapa([nuevosPuntos[0].lat, nuevosPuntos[0].lon]);
    setZoomMapa(9);
  }

      }
    } catch (err) {
      setErrorPrediccion(err instanceof Error ? err.message : 'Error al predecir zonas');
    } finally {
      setIsLoadingPrediccion(false);
    }
  }

  function centrarEnZona(index: number) {
    const zonasPrediccion = puntos.filter(p => p.tipo === 'prediccion');
    const punto = zonasPrediccion[index];
    if (punto) {
      setCentroMapa([punto.lat, punto.lon]);
      setZoomMapa(12);
    }
  }

  function limpiarPrediccion() {
    limpiarPuntosPorTipo('prediccion');
    setZonasPredichas([]);
    setPrediccionRealizada(false);
    setStats(prev => ({
      ...prev,
      totalZonas: 0,
      zonasCriticas: 0,
      nivelDominante: '--'
    }));
    setCentroMapa([16.753, -93.115]);
    setZoomMapa(8);
  }

  function handleFiltroReporte(tipo: string) {
    setFiltroTipoReporte(tipo);
    cargarReportesEnMapa(tipo);
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Panel de Control */}
        <div className="lg:col-span-1 space-y-5">
          {/* Seccion de Predicciones */}
          <Card 
            title="Prediccion de Zonas de Riesgo"
            subtitle="Configure los parametros y genere predicciones"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                  Tipo de Vehiculo
                </label>
                <select
                  value={vehiculo}
                  onChange={(e) => setVehiculo(e.target.value)}
                  className="w-full bg-[#0a1628] border border-[#2a4070] rounded-lg px-3 py-2.5 text-sm text-[#e8eef5] outline-none focus:border-[#0ea5e9] transition-colors"
                >
                  <option value="carga">Carga</option>
                  <option value="publico">Transporte publico</option>
                  <option value="particular">Particular</option>
                  <option value="emergencia">Emergencia</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                  Horario
                </label>
                <select
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  className="w-full bg-[#0a1628] border border-[#2a4070] rounded-lg px-3 py-2.5 text-sm text-[#e8eef5] outline-none focus:border-[#0ea5e9] transition-colors"
                >
                  <option value="diurno">Diurno</option>
                  <option value="nocturno">Nocturno</option>
                  <option value="mixto">Mixto</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={predecirZonas} 
                  loading={isLoadingPrediccion}
                  fullWidth
                >
                  Generar Prediccion
                </Button>
                {prediccionRealizada && (
                  <Button 
                    onClick={limpiarPrediccion}
                    variant="outline"
                    size="md"
                  >
                    Limpiar
                  </Button>
                )}
              </div>

              {errorPrediccion && (
                <div className="bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] text-[#ef4444] px-3 py-2 rounded-lg text-xs">
                  {errorPrediccion}
                </div>
              )}
            </div>
          </Card>

          {/* Seccion de Reportes */}
          <Card 
            title="Reportes en el Mapa"
            subtitle="Filtre por tipo de incidente"
          >
            <div className="space-y-3">
              <select
                value={filtroTipoReporte}
                onChange={(e) => handleFiltroReporte(e.target.value)}
                className="w-full bg-[#0a1628] border border-[#2a4070] rounded-lg px-3 py-2.5 text-sm text-[#e8eef5] outline-none focus:border-[#0ea5e9] transition-colors"
              >
                <option value="">Todos los tipos</option>
                <option value="accidente">Accidentes</option>
                <option value="inundacion">Inundaciones</option>
                <option value="bache">Baches</option>
                <option value="derrumbe">Derrumbes</option>
                <option value="bloqueo">Bloqueos</option>
                <option value="sin_luz">Sin luz</option>
                <option value="niebla">Niebla</option>
              </select>

              <Button 
                onClick={() => cargarReportesEnMapa(filtroTipoReporte)}
                variant="outline"
                fullWidth
                size="sm"
                loading={isLoadingReportes}
              >
                Actualizar Reportes
              </Button>

              {errorReportes && (
                <div className="bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] text-[#ef4444] px-3 py-2 rounded-lg text-xs">
                  {errorReportes}
                </div>
              )}
            </div>
          </Card>

          {/* Estadisticas */}
          <Card 
            title="Estadisticas del Mapa"
            subtitle="Resumen de elementos visibles"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card">
                <span className="stat-value text-[#0ea5e9]">{stats.totalZonas}</span>
                <span className="stat-label">Zonas Pred.</span>
              </div>
              <div className="stat-card">
                <span className="stat-value text-[#ef4444]">{stats.zonasCriticas}</span>
                <span className="stat-label">Criticas</span>
              </div>
              <div className="stat-card">
                <span className="stat-value text-[#f59e0b]">{stats.totalReportes}</span>
                <span className="stat-label">Reportes</span>
              </div>
              <div className="stat-card">
                <span className="stat-value text-[#eab308] text-base">{stats.nivelDominante}</span>
                <span className="stat-label">Tipo Dominante</span>
              </div>
            </div>
          </Card>

          {/* Lista de zonas predichas */}
          {zonasPredichas.length > 0 && (
            <Card 
              title="Zonas Predichas"
              subtitle={`${zonasPredichas.length} zonas · Click para centrar`}
            >
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {zonasPredichas.map((zona, index) => (
                  <button
                    key={index}
                    onClick={() => centrarEnZona(index)}
                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 hover:scale-[1.02] ${getNivelBg(zona.nivel)}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#e8eef5] truncate">
                          {zona.nombre_zona}
                        </p>
                        <p className="text-xs text-[#94a3b8] mt-0.5 truncate">
                          {zona.tipo_riesgo_predominante}
                        </p>
                      </div>
                      <span
                        className="text-base font-bold flex-shrink-0"
                        style={{ color: getNivelColor(zona.nivel) }}
                      >
                        {(zona.probabilidad_incidente * 100).toFixed(0)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Mapa */}
        <div className="lg:col-span-2">
          <div className="bg-[#0d1b33] border border-[#2a4070]/50 rounded-xl overflow-hidden h-full">
            <div className="flex items-center justify-between p-4 border-b border-[#2a4070]/30">
              <h2 className="text-lg font-bold text-[#e8eef5]">Mapa de Riesgo</h2>
              
              <div className="hidden sm:flex flex-wrap gap-3 text-xs text-[#94a3b8]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span> Critico
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span> Alto
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]"></span> Medio
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span> Bajo
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-[#3b82f6] bg-transparent"></span> Reporte
                </span>
              </div>
            </div>
            
            <div className="h-[500px] lg:h-[600px]">
              <MapContainer
                center={[16.753, -93.115]}
                zoom={8}
                scrollWheelZoom={true}
                className="h-full w-full"
                style={{ background: '#0a1628' }}
              >
                <MapResizer />
                <MapController />
                
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                
                {puntos.map((punto) => (
                  <CircleMarker
                    key={punto.id}
                    center={[punto.lat, punto.lon]}
                    radius={punto.radius}
                    fillColor={punto.tipo === 'reporte' ? punto.color : punto.color}
                    color={punto.tipo === 'reporte' ? '#fff' : '#fff'}
                    weight={punto.tipo === 'reporte' ? 2 : 1.5}
                    fillOpacity={punto.tipo === 'reporte' ? 0.9 : 0.7}
                    dashArray={punto.tipo === 'reporte' ? undefined : undefined}
                  >
                    <Popup>
                      <div dangerouslySetInnerHTML={{ __html: punto.popupContent }} />
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
            
            <div className="sm:hidden flex flex-wrap gap-3 text-xs text-[#94a3b8] p-3 border-t border-[#2a4070]/30">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span> Critico
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span> Alto
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10b981]"></span> Bajo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full border-2 border-[#3b82f6] bg-transparent"></span> Reporte
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}