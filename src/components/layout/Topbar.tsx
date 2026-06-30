import { useLocation } from 'react-router-dom';

interface TopbarProps {
  onMenuClick: () => void;
}

const titles: Record<string, string> = {
  mapa: 'Mapa de Riesgo',
  reportes: 'Reportes',
  analitica: 'Analitica',
  predicciones: 'Predicciones',
  flota: 'Mi Flota',
};

const subtitles: Record<string, string> = {
  mapa: 'Prediccion y visualizacion de zonas de riesgo',
  reportes: 'Busqueda y gestion de reportes ciudadanos',
  analitica: 'Analisis inteligente de datos y tendencias',
  predicciones: 'Prediccion de zonas de riesgo y perfiles',
  flota: 'Gestion de conductores y vehiculos',
};

export default function Topbar({ onMenuClick }: TopbarProps) {
  const location = useLocation();
  const currentTab = location.pathname.split('/').pop() || 'mapa';
  const title = titles[currentTab] || 'Dashboard';
  const subtitle = subtitles[currentTab] || '';

  return (
    <header className="h-14 bg-[#0d1b33]/95 backdrop-blur-sm border-b border-[#2a4070]/30 flex items-center justify-between px-4 lg:px-6 z-30">
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-[#627d98] hover:text-[#e8eef5] hover:bg-[#0f1f3a] rounded-lg transition-all duration-200 flex-shrink-0"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <div className="min-w-0">
          <h2 className="text-base lg:text-lg font-bold text-[#e8eef5] truncate">{title}</h2>
          <p className="text-xs text-[#627d98] hidden sm:block truncate">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#0f1f3a] rounded-lg border border-[#2a4070]/30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
          </span>
          <span className="text-xs text-[#94a3b8]">Conectado</span>
        </div>
        
        <button 
          onClick={() => window.location.reload()}
          className="p-2 text-[#627d98] hover:text-[#0ea5e9] hover:bg-[#0f1f3a] rounded-lg transition-all duration-200"
          title="Actualizar datos"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </header>
  );
}