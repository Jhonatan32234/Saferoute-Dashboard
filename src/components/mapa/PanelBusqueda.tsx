import { useState } from 'react';
import Button from '../ui/Button';

interface PanelBusquedaProps {
  onBuscar: (tipo: string, query: string) => void;
  onCerrar: () => void;
  isLoading: boolean;
}

const tiposReporte = [
  { value: '', label: 'Todos los tipos' },
  { value: 'accidente', label: 'Accidentes' },
  { value: 'inundacion', label: 'Inundaciones' },
  { value: 'bache', label: 'Baches' },
  { value: 'derrumbe', label: 'Derrumbes' },
  { value: 'bloqueo', label: 'Bloqueos' },
  { value: 'sin_luz', label: 'Sin luz' },
  { value: 'niebla', label: 'Niebla' },
];

export default function PanelBusqueda({ onBuscar, onCerrar, isLoading }: PanelBusquedaProps) {
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [queryBusqueda, setQueryBusqueda] = useState('');

  const handleBuscar = () => {
    // Siempre pasar ambos valores, incluso si están vacíos
    onBuscar(tipoFiltro, queryBusqueda.trim());
  };

  const handleLimpiar = () => {
    setTipoFiltro('');
    setQueryBusqueda('');
    // Recargar sin filtros
    onBuscar('', '');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBuscar();
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#e8eef5]">Busqueda de Reportes</h3>
        <button onClick={onCerrar} className="text-[#627d98] hover:text-[#e8eef5] transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        {/* Búsqueda por texto - PRIMERO */}
        <div>
          <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
            Buscar por texto
          </label>
          <div className="relative">
            <input
              type="text"
              value={queryBusqueda}
              onChange={(e) => setQueryBusqueda(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ej: villaflores, inundacion, ruta..."
              className="w-full bg-[#0a1628] border border-[#2a4070] rounded-lg pl-9 pr-3 py-2.5 text-sm text-[#e8eef5] outline-none focus:border-[#0ea5e9] placeholder-[#627d98] transition-colors"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#627d98]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {queryBusqueda && (
              <button
                onClick={() => setQueryBusqueda('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#627d98] hover:text-white"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <p className="text-[10px] text-[#627d98] mt-1">
            Busca en descripcion, ruta y tipo de incidente
          </p>
        </div>

        {/* Filtro por tipo - DESPUES */}
        <div>
          <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
            Filtrar por tipo
          </label>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="w-full bg-[#0a1628] border border-[#2a4070] rounded-lg px-3 py-2.5 text-sm text-[#e8eef5] outline-none focus:border-[#0ea5e9] transition-colors cursor-pointer"
          >
            {tiposReporte.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <p className="text-[10px] text-[#627d98] mt-1">
            {tipoFiltro ? `Mostrando solo: ${tiposReporte.find(t => t.value === tipoFiltro)?.label}` : 'Mostrando todos los tipos'}
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 pt-1">
          <Button onClick={handleBuscar} fullWidth loading={isLoading} size="sm">
            Buscar
          </Button>
          {(tipoFiltro || queryBusqueda) && (
            <Button onClick={handleLimpiar} variant="outline" size="sm">
              Limpiar
            </Button>
          )}
        </div>

        {/* Info de estado */}
        {(tipoFiltro || queryBusqueda) && (
          <div className="bg-[#0f1f3a] border border-[#2a4070]/30 rounded-lg p-2.5">
            <p className="text-xs text-[#94a3b8]">
              {queryBusqueda && tipoFiltro && (
                <>Buscando "<span className="text-[#0ea5e9]">{queryBusqueda}</span>" en {tiposReporte.find(t => t.value === tipoFiltro)?.label}</>
              )}
              {queryBusqueda && !tipoFiltro && (
                <>Buscando "<span className="text-[#0ea5e9]">{queryBusqueda}</span>" en todos los tipos</>
              )}
              {!queryBusqueda && tipoFiltro && (
                <>Mostrando todos los reportes de tipo {tiposReporte.find(t => t.value === tipoFiltro)?.label}</>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}