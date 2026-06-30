import { useState, useEffect } from 'react';
import { motores } from '../../api/client';
import type { Topico } from '../../types';
import Card from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function AnaliticaView() {
  const [resumen, setResumen] = useState('');
  const [tendencias, setTendencias] = useState<Topico[]>([]);
  const [isLoadingResumen, setIsLoadingResumen] = useState(true);
  const [isLoadingTendencias, setIsLoadingTendencias] = useState(true);
  const [errorResumen, setErrorResumen] = useState('');
  const [errorTendencias, setErrorTendencias] = useState('');

  useEffect(() => {
    cargarDatosAnalitica();
  }, []);

  async function cargarDatosAnalitica() {
    setIsLoadingTendencias(true);
    setIsLoadingResumen(true);
    
    try {
      // Cargar tópicos del NLP
      const data = await motores.get('nlp', '/nlp/topicos?n_topicos=5');
      const topicos = data.topicos || [];
      setTendencias(topicos);
      setIsLoadingTendencias(false);

      // Intentar cargar resumen del LLM
      try {
        const resumenData = await motores.post('llm', '/llm/resumen', {
          topicos: topicos,
          total_reportes: data.total_reportes || 0,
          topico_dominante: data.topico_dominante || {}
        });
        setResumen(resumenData.resumen || 'Resumen no disponible');
      } catch {
        // Fallback sin LLM
        const dominante = data.topico_dominante || {};
        const nombre = (dominante.nombre || '').replace(/[^\w\sáéíóúñ]/g, '').trim();
        setResumen(
          `Esta semana se registraron ${data.total_reportes || 0} incidentes. ` +
          `El tópico dominante es "${nombre}" con ${dominante.porcentaje || 0}% de los reportes.`
        );
      }
      setIsLoadingResumen(false);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar datos';
      setErrorTendencias(message);
      setErrorResumen(message);
      setIsLoadingTendencias(false);
      setIsLoadingResumen(false);
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Resumen LLM */}
      <Card title="Resumen Inteligente (LLM)">
        {isLoadingResumen ? (
          <LoadingSpinner message="Generando resumen con IA..." />
        ) : errorResumen ? (
          <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">
            {errorResumen}
          </div>
        ) : (
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 leading-relaxed">{resumen}</p>
          </div>
        )}
      </Card>

      {/* Tendencia Semanal */}
      <Card title="Tendencia Semanal">
        {isLoadingTendencias ? (
          <LoadingSpinner message="Cargando tendencias..." />
        ) : errorTendencias ? (
          <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">
            {errorTendencias}
          </div>
        ) : tendencias.length > 0 ? (
          <div className="space-y-4">
            {tendencias.map((topico, index) => {
              const pct = topico.porcentaje || 0;
              const color = pct > 30 ? '#e94560' : pct > 15 ? '#f0a500' : '#4ade80';
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-300">
                      {topico.nombre}
                    </span>
                    <span className="text-sm" style={{ color }}>
                      {topico.frecuencia} reportes ({pct}%)
                    </span>
                  </div>
                  
                  {/* Barra de progreso */}
                  <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  
                  {/* Palabras clave */}
                  {topico.palabras_clave && topico.palabras_clave.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {topico.palabras_clave.map((palabra, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-gray-700/50 text-gray-400 rounded text-xs"
                        >
                          {palabra}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Acción sugerida */}
                  {topico.accion_sugerida && (
                    <p className="text-xs text-blue-400 flex items-center gap-1">
                      {topico.accion_sugerida}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-8">Sin datos de tendencias disponibles</p>
        )}
      </Card>
    </div>
  );
}