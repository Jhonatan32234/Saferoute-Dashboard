import { useState, useEffect } from 'react';
import { motores } from '../../api/client';
import type { ZonaPredicha, Conductor } from '../../types';
import { useMapContext } from '../../contexts/MapContext';
import Card from '../ui/Card';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function PrediccionesView() {
  const { setPuntos, limpiarPuntos, setCentroMapa, setZoomMapa } = useMapContext();
  
  // Estado para zonas
  const [vehiculo, setVehiculo] = useState('carga');
  const [horario, setHorario] = useState('diurno');
  const [zonas, setZonas] = useState<ZonaPredicha[]>([]);
  const [isLoadingZonas, setIsLoadingZonas] = useState(false);
  const [errorZonas, setErrorZonas] = useState('');
  const [hasPredicho, setHasPredicho] = useState(false);

  // Estado para perfil de conductor
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [conductorSeleccionado, setConductorSeleccionado] = useState('');
  const [perfil, setPerfil] = useState<any>(null);
  const [isLoadingPerfil, setIsLoadingPerfil] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState('');

  useEffect(() => {
    cargarConductores();
    // Limpiar puntos al desmontar
    return () => limpiarPuntos();
  }, []);

  async function cargarConductores() {
    try {
      const data = await motores.get('predicciones', '/predicciones/conductores');
      setConductores(data.conductores || []);
    } catch (err) {
      console.error('Error cargando conductores:', err);
    }
  }

  async function predecirZonas() {
    setIsLoadingZonas(true);
    setErrorZonas('');
    setHasPredicho(true);
    limpiarPuntos();
    
    try {
      const data = await motores.post('predicciones', '/predicciones/zonas', {
        lat: 16.753,
        lon: -93.115,
        radio_km: 80,
        tipo_vehiculo: vehiculo,
        horario: horario,
      });
      
      const zonasData = data.zonas || [];
      setZonas(zonasData);

      // Transformar zonas a puntos del mapa
      if (zonasData.length > 0) {
        const nuevosPuntos = zonasData.map((zona: ZonaPredicha) => {
          // Generar coordenadas aleatorias cerca del centro para demo
          // En producción, las coordenadas vendrían de la API
          const lat = 16.753 + (Math.random() - 0.5) * 1.5;
          const lon = -93.115 + (Math.random() - 0.5) * 1.5;
          
          const nivelColor = getNivelColorHex(zona.nivel);
          const radius = zona.nivel === 'critico' ? 20 : 
                        zona.nivel === 'alto' ? 15 : 
                        zona.nivel === 'medio' ? 10 : 7;

          return {
            lat,
            lon,
            color: nivelColor,
            radius,
            label: zona.nombre_zona,
            popupContent: `
              <div style="font-size:12px;">
                <b>${zona.nombre_zona}</b> · ${zona.nivel.toUpperCase()}<br>
                <hr style="margin:4px 0; border-color:#2a4070;">
                <b>Riesgo:</b> ${(zona.probabilidad_incidente * 100).toFixed(0)}%<br>
                <b>Tipo:</b> ${zona.tipo_riesgo_predominante}<br>
                <b>Factores:</b> ${zona.factores_contribuyentes.join(', ')}<br>
                <span style="color:#0ea5e9;">💡 ${zona.recomendacion}</span>
              </div>
            `
          };
        });

        setPuntos(nuevosPuntos);
        
        // Centrar mapa en la primera zona
        if (nuevosPuntos.length > 0) {
          setCentroMapa([nuevosPuntos[0].lat, nuevosPuntos[0].lon]);
          setZoomMapa(9);
        }
      }
    } catch (err) {
      setErrorZonas(err instanceof Error ? err.message : 'Error al predecir zonas');
    } finally {
      setIsLoadingZonas(false);
    }
  }

  async function cargarPerfil(conductorId: string) {
    if (!conductorId) return;
    
    setIsLoadingPerfil(true);
    setErrorPerfil('');
    
    try {
      const data = await motores.post('predicciones', '/predicciones/perfil', {
        conductor_id: conductorId,
      });
      setPerfil(data);
    } catch (err) {
      setErrorPerfil(err instanceof Error ? err.message : 'Error al cargar perfil');
    } finally {
      setIsLoadingPerfil(false);
    }
  }

  const handleConductorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setConductorSeleccionado(id);
    if (id) cargarPerfil(id);
  };

  function getNivelColor(nivel: string): string {
    switch (nivel) {
      case 'critico': return '#ef4444';
      case 'alto': return '#f59e0b';
      case 'medio': return '#eab308';
      default: return '#10b981';
    }
  }

  function getNivelColorHex(nivel: string): string {
    return getNivelColor(nivel);
  }

  function getNivelBg(nivel: string): string {
    switch (nivel) {
      case 'critico': return 'bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)]';
      case 'alto': return 'bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.3)]';
      case 'medio': return 'bg-[rgba(234,179,8,0.1)] border-[rgba(234,179,8,0.3)]';
      default: return 'bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.3)]';
    }
  }

  return (
    <div className="space-y-5 h-full overflow-y-auto">
      <div className="grid-2">
        {/* Predicción de Zonas */}
        <Card 
          title="🔮 Zonas de Riesgo Predichas"
          subtitle="Genera predicciones y visualízalas en el mapa"
        >
          <div className="space-y-4">
            {/* Controles */}
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={vehiculo}
                onChange={(e) => setVehiculo(e.target.value)}
                className="w-full bg-[#0a1628] border border-[#2a4070] rounded-lg px-3 py-2.5 text-sm text-[#e8eef5] outline-none focus:border-[#0ea5e9] transition-colors"
              >
                <option value="carga">🚛 Carga</option>
                <option value="publico">🚌 Transporte público</option>
                <option value="particular">🚗 Particular</option>
                <option value="emergencia">🚑 Emergencia</option>
              </select>
              
              <select
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="w-full bg-[#0a1628] border border-[#2a4070] rounded-lg px-3 py-2.5 text-sm text-[#e8eef5] outline-none focus:border-[#0ea5e9] transition-colors"
              >
                <option value="diurno">☀️ Diurno</option>
                <option value="nocturno">🌙 Nocturno</option>
                <option value="mixto">🔄 Mixto</option>
              </select>
              
              <Button 
                onClick={predecirZonas} 
                loading={isLoadingZonas}
                className="flex-shrink-0"
              >
                🔍 Predecir
              </Button>
            </div>

            {/* Resultados */}
            {errorZonas && (
              <div className="bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] text-[#ef4444] px-4 py-3 rounded-lg text-sm">
                {errorZonas}
              </div>
            )}

            {isLoadingZonas ? (
              <LoadingSpinner message="Prediciendo zonas de riesgo..." />
            ) : zonas.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                <p className="text-xs text-[#627d98]">
                  ✅ {zonas.length} zonas encontradas · 
                  <button 
                    onClick={() => {
                      setCentroMapa([16.753, -93.115]);
                      setZoomMapa(8);
                    }}
                    className="text-[#0ea5e9] hover:underline ml-1"
                  >
                    Ver todas en mapa
                  </button>
                </p>
                {zonas.map((zona, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getNivelBg(zona.nivel)} cursor-pointer hover:scale-[1.02] transition-transform`}
                    onClick={() => {
                      // Centrar mapa en esta zona (coordenadas demo)
                      const lat = 16.753 + (Math.random() - 0.5) * 1.5;
                      const lon = -93.115 + (Math.random() - 0.5) * 1.5;
                      setCentroMapa([lat, lon]);
                      setZoomMapa(12);
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-[#e8eef5] text-sm">
                        📍 {zona.nombre_zona}
                      </h4>
                      <span
                        className="text-lg font-bold"
                        style={{ color: getNivelColor(zona.nivel) }}
                      >
                        {(zona.probabilidad_incidente * 100).toFixed(0)}%
                      </span>
                    </div>
                    
                    <p className="text-xs text-[#94a3b8] mb-2">
                      {zona.tipo_riesgo_predominante} · {zona.factores_contribuyentes.slice(0, 3).join(', ')}
                    </p>
                    
                    <p className="text-xs text-[#0ea5e9] flex items-start gap-1">
                      <span>💡</span>
                      {zona.recomendacion}
                    </p>
                  </div>
                ))}
              </div>
            ) : hasPredicho ? (
              <div className="text-center py-8">
                <p className="text-[#94a3b8] text-sm">
                  Sin zonas de riesgo para estos parámetros
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-3xl block mb-2">🗺️</span>
                <p className="text-[#94a3b8] text-sm">
                  Selecciona parámetros y haz clic en <span className="text-[#0ea5e9] font-medium">Predecir</span>
                </p>
                <p className="text-[#627d98] text-xs mt-1">
                  Las zonas aparecerán en el mapa automáticamente
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Perfil de Conductor */}
        <Card 
          title="👤 Perfil de Conductor"
          subtitle="Análisis de riesgo individual"
        >
          <div className="space-y-4">
            <select
              value={conductorSeleccionado}
              onChange={handleConductorChange}
              className="w-full bg-[#0a1628] border border-[#2a4070] rounded-lg px-4 py-2.5 text-sm text-[#e8eef5] outline-none focus:border-[#0ea5e9] transition-colors"
            >
              <option value="">Seleccionar conductor</option>
              {conductores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre || c.id}
                </option>
              ))}
            </select>

            {errorPerfil && (
              <div className="bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] text-[#ef4444] px-4 py-3 rounded-lg text-sm">
                {errorPerfil}
              </div>
            )}

            {isLoadingPerfil ? (
              <LoadingSpinner message="Cargando perfil..." />
            ) : perfil ? (
              <div className="space-y-4 animate-fade-in">
                {/* Cabecera */}
                <div className="flex items-center gap-4 p-4 bg-[#0f1f3a] rounded-lg border border-[#2a4070]/30">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: getNivelColor(perfil.nivel_riesgo) }}
                  >
                    {perfil.nombre?.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || 'C'}
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-[#e8eef5]">{perfil.nombre}</h4>
                    <p style={{ color: getNivelColor(perfil.nivel_riesgo) }} className="text-sm font-medium">
                      Riesgo: {(perfil.probabilidad_incidente * 100).toFixed(0)}% ·{' '}
                      {perfil.nivel_riesgo?.toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* Factores de riesgo */}
                {perfil.factores_riesgo?.length > 0 && (
                  <div className="p-3 bg-[#0f1f3a] rounded-lg border border-[#2a4070]/30">
                    <p className="text-xs text-[#627d98] mb-2">⚠️ Factores de riesgo</p>
                    <div className="flex flex-wrap gap-1">
                      {perfil.factores_riesgo.map((factor: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-[rgba(239,68,68,0.1)] text-[#ef4444] rounded text-xs">
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fortalezas */}
                {perfil.fortalezas?.length > 0 && (
                  <div className="p-3 bg-[#0f1f3a] rounded-lg border border-[#2a4070]/30">
                    <p className="text-xs text-[#627d98] mb-2">✅ Fortalezas</p>
                    <div className="flex flex-wrap gap-1">
                      {perfil.fortalezas.map((fortaleza: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-[rgba(16,185,129,0.1)] text-[#10b981] rounded text-xs">
                          {fortaleza}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recomendaciones */}
                {perfil.recomendaciones?.length > 0 && (
                  <div className="p-3 bg-[rgba(14,165,233,0.05)] rounded-lg border border-[rgba(14,165,233,0.2)]">
                    <p className="text-xs text-[#0ea5e9] mb-2">💡 Recomendaciones</p>
                    <ul className="space-y-1">
                      {perfil.recomendaciones.map((rec: string, i: number) => (
                        <li key={i} className="text-sm text-[#e8eef5] flex items-start gap-2">
                          <span className="text-[#0ea5e9] mt-0.5">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {perfil.metricas_modelo && (
                  <p className="text-xs text-[#627d98] text-center">
                    Modelo: K-NN (k=5) · Accuracy: {perfil.metricas_modelo.accuracy || 'N/A'}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-3xl block mb-2">👤</span>
                <p className="text-[#94a3b8] text-sm">
                  Selecciona un conductor para ver su perfil de riesgo
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}