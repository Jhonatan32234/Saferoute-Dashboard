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
  const [selectedTopico, setSelectedTopico] = useState<number | null>(null);

  useEffect(() => {
    cargarDatosAnalitica();
  }, []);

  async function cargarDatosAnalitica() {
    setIsLoadingTendencias(true);
    setIsLoadingResumen(true);
    
    try {
      const data = await motores.get('nlp', '/nlp/topicos?n_topicos=8');
      const topicos = data.topicos || [];
      setTendencias(topicos);
      setIsLoadingTendencias(false);

      try {
        const resumenData = await motores.post('llm', '/llm/resumen', {
          topicos: topicos,
          total_reportes: data.total_reportes || 0,
          topico_dominante: data.topico_dominante || {}
        });
        setResumen(resumenData.resumen || 'Resumen no disponible');
      } catch {
        const dominante = data.topico_dominante || {};
        const nombre = (dominante.nombre || '').replace(/[^\w\sáéíóúñ]/g, '').trim();
        setResumen(
          `Esta semana se registraron ${data.total_reportes || 0} incidentes. ` +
          `El topico dominante es "${nombre}" con ${dominante.porcentaje || 0}% de los reportes.`
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

  const getTendenciaColor = (tendencia: string) => {
    switch (tendencia) {
      case 'Emergente': return '#ef4444';
      case 'Recurrente': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'Emergente': return '↑';
      case 'Recurrente': return '→';
      default: return '↓';
    }
  };

  const totalReportes = tendencias.reduce((sum, t) => sum + t.frecuencia, 0);

  return (
    <div className="p-4 lg:p-6 space-y-6 h-full overflow-y-auto">
      {/* Resumen LLM */}
      <Card title="Resumen Inteligente">
        {isLoadingResumen ? (
          <LoadingSpinner message="Generando resumen con IA..." />
        ) : errorResumen ? (
          <div className="bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] text-[#ef4444] px-4 py-3 rounded-lg text-sm">
            {errorResumen}
          </div>
        ) : (
          <div className="bg-[#0f1f3a] border border-[#2a4070]/30 rounded-lg p-4">
            <p className="text-[#e8eef5] leading-relaxed text-sm">{resumen}</p>
          </div>
        )}
      </Card>

      {/* Tendencia Semanal */}
      <Card 
        title="Tendencia Semanal"
        subtitle={`${totalReportes} reportes totales · ${tendencias.length} topicos`}
      >
        {isLoadingTendencias ? (
          <LoadingSpinner message="Cargando tendencias..." />
        ) : errorTendencias ? (
          <div className="bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] text-[#ef4444] px-4 py-3 rounded-lg text-sm">
            {errorTendencias}
          </div>
        ) : tendencias.length > 0 ? (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {tendencias.map((topico, index) => {
              const pct = topico.porcentaje || 0;
              const color = pct > 30 ? '#ef4444' : pct > 15 ? '#f59e0b' : '#10b981';
              const isSelected = selectedTopico === index;
              
              return (
                <div 
                  key={index} 
                  className={`bg-[#0f1f3a] border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'border-[#0ea5e9]/50 shadow-lg shadow-[#0ea5e9]/5' 
                      : 'border-[#2a4070]/30 hover:border-[#2a4070]/60'
                  }`}
                  onClick={() => setSelectedTopico(isSelected ? null : index)}
                >
                  {/* Encabezado */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-lg font-bold"
                        style={{ color: getTendenciaColor(topico.tendencia) }}
                      >
                        {getTendenciaIcon(topico.tendencia)}
                      </span>
                      <span className="text-sm font-semibold text-[#e8eef5]">
                        {topico.nombre}
                      </span>
                      <span 
                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{ 
                          background: `${getTendenciaColor(topico.tendencia)}15`,
                          color: getTendenciaColor(topico.tendencia)
                        }}
                      >
                        {topico.tendencia}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold" style={{ color }}>
                        {pct}%
                      </span>
                      <span className="text-xs text-[#627d98] ml-1">
                        ({topico.frecuencia} rep.)
                      </span>
                    </div>
                  </div>
                  
                  {/* Barra de progreso */}
                  <div className="w-full bg-[#1a2430] rounded-full h-2.5 overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out shadow-lg"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: color,
                        boxShadow: `0 0 8px ${color}40`,
                      }}
                    />
                  </div>
                  
                  {/* Detalles expandibles */}
                  <div className={`overflow-hidden transition-all duration-300 ${
                    isSelected ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    {/* Palabras clave */}
                    {topico.palabras_clave && topico.palabras_clave.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-[#627d98] mb-1.5">Palabras clave:</p>
                        <div className="flex flex-wrap gap-1">
                          {topico.palabras_clave.map((palabra, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-[#1a2430] text-[#94a3b8] rounded text-xs border border-[#2a4070]/30"
                            >
                              {palabra}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Acción sugerida */}
                    {topico.accion_sugerida && (
                      <div className="bg-[rgba(14,165,233,0.05)] border border-[rgba(14,165,233,0.15)] rounded-lg p-3">
                        <p className="text-xs text-[#0ea5e9] font-medium mb-1">Accion sugerida:</p>
                        <p className="text-xs text-[#94a3b8]">{topico.accion_sugerida}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Indicador de expansión */}
                  <div className="flex justify-center mt-2">
                    <svg 
                      className={`w-4 h-4 text-[#627d98] transition-transform duration-200 ${
                        isSelected ? 'rotate-180' : ''
                      }`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[#94a3b8] text-sm text-center py-8">Sin datos de tendencias disponibles</p>
        )}
      </Card>

      {/* Resumen general */}
      {tendencias.length > 0 && (
        <Card title="Resumen General">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0f1f3a] border border-[#2a4070]/30 rounded-lg p-3 text-center">
              <span className="text-xl font-bold text-[#0ea5e9] block">{tendencias.length}</span>
              <span className="text-xs text-[#627d98]">Topicos</span>
            </div>
            <div className="bg-[#0f1f3a] border border-[#2a4070]/30 rounded-lg p-3 text-center">
              <span className="text-xl font-bold text-[#ef4444] block">
                {tendencias.filter(t => t.tendencia === 'Emergente').length}
              </span>
              <span className="text-xs text-[#627d98]">Emergentes</span>
            </div>
            <div className="bg-[#0f1f3a] border border-[#2a4070]/30 rounded-lg p-3 text-center">
              <span className="text-xl font-bold text-[#f59e0b] block">{totalReportes}</span>
              <span className="text-xs text-[#627d98]">Total Reportes</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}