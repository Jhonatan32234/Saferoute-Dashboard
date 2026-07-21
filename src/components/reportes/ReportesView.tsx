import { useState, useEffect, useCallback } from 'react';
import { api, motores } from '../../api/client';
import type { Reporte } from '../../types';
import { getTipoLabel, getTipoColor, timeAgo, truncate, escapeHtml } from '../../utils/formatters';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import AdminMonitorView from '../monitor/AdminMonitorView';


export default function ReportesView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Reporte[]>([]);
  const [searchMeta, setSearchMeta] = useState({ total: 0, tiempo_ms: 0 });
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [filterTipo, setFilterTipo] = useState('');
  const [ultimosReportes, setUltimosReportes] = useState<Reporte[]>([]);
  const [isLoadingUltimos, setIsLoadingUltimos] = useState(true);
  const [ultimosError, setUltimosError] = useState('');
  const maxScore = Math.max(...searchResults.map(r => r.score || 0), 1);


  // Cargar últimos reportes al montar
  useEffect(() => {
    cargarUltimosReportes();
  }, [filterTipo]);

  async function cargarUltimosReportes() {
    setIsLoadingUltimos(true);
    setUltimosError('');
    
    try {
      const endpoint = filterTipo 
        ? `/reportes?tipo=${filterTipo}&vigente=true&limit=20` 
        : '/reportes?vigente=true&limit=20';
      
      const data = await api.get(endpoint);
      setUltimosReportes(data.reportes || []);
    } catch (err) {
      setUltimosError(err instanceof Error ? err.message : 'Error al cargar reportes');
    } finally {
      setIsLoadingUltimos(false);
    }
  }

  async function buscarReportes() {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchError('');
    
    try {
      const data = await motores.post('nlp', '/nlp/buscar', {
        query: searchQuery,
        top_k: 20,
        metodo: 'bm25'
      });
      
      setSearchResults(data.resultados || []);
      setSearchMeta({
        total: data.total || 0,
        tiempo_ms: data.tiempo_ms || 0
      });
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Error en la búsqueda');
    } finally {
      setIsSearching(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') buscarReportes();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 h-full overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Búsqueda de Reportes */}
        <Card title="Buscar Reportes">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ej: inundaciones en Suchiapa"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={buscarReportes} loading={isSearching}>
                Buscar
              </Button>
            </div>

            {/* Resultados de búsqueda */}
            {searchError && (
              <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">
                {searchError}
              </div>
            )}

            {searchMeta.total > 0 && (
              <p className="text-xs text-gray-400">
                {searchMeta.total} resultados · {searchMeta.tiempo_ms.toFixed(1)}ms · BM25
              </p>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <Badge tipo={r.tipo} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200">{truncate(r.texto, 100)}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        <span>{timeAgo(r.timestamp)}</span>
                        <span>Score: {Math.min(((r.score || 0) / maxScore * 100), 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : searchQuery && !isSearching ? (
                <p className="text-gray-500 text-sm text-center py-4">Sin resultados para esta búsqueda</p>
              ) : !searchQuery && (
                <p className="text-gray-500 text-sm text-center py-4">Escribe una consulta para buscar</p>
              )}
            </div>
          </div>
        </Card>

        {/* Últimos Reportes */}
        <Card 
          title="Últimos Reportes"
          headerRight={
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          }
        >
          {isLoadingUltimos ? (
            <LoadingSpinner message="Cargando reportes..." />
          ) : ultimosError ? (
            <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">
              {ultimosError}
            </div>
          ) : ultimosReportes.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {ultimosReportes.map((r) => (
                <div key={r.id} className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                  <Badge tipo={r.tipo} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200">
                      {escapeHtml(truncate(r.nota_voz || r.tipo, 100))}
                    </p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      <span>{timeAgo(r.timestamp)}</span>
                      <span>{r.confirmaciones || 0} confirmaciones</span>
                      <span className="text-blue-400">{r.ruta_id}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">Sin reportes recientes</p>
          )}
        </Card>
      </div>
    <AdminMonitorView />
    </div>
  );
}