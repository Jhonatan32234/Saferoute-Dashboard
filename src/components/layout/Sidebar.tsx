import { useAuth } from '../../contexts/AuthContext';
import NavigationPanel from './NavigationPanel';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-[260px] bg-[#0d1b33] border-r border-[#2a4070]/50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col shadow-2xl
        `}
      >
        {/* En Sidebar.tsx */}
<div className="p-5 border-b border-[#2a4070]/30">
  <div className="flex items-center gap-3">
    {/* Logo - Versión simple */}
    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow-lg shadow-[#0ea5e9]/20 border border-[#2a4070]/50 bg-[#0f1f3a]">
      <img 
        src="/saferoute_blue.png" 
        alt="SafeRoute" 
        className="w-full h-full object-contain p-1.5"
      />
    </div>
    <div className="min-w-0">
      <h1 className="text-lg font-bold text-[#e8eef5] truncate">SafeRoute</h1>
      <p className="text-[10px] text-[#627d98] uppercase tracking-wider">Panel de Control</p>
    </div>
  </div>
</div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto py-2">
          <NavigationPanel />
        </nav>

        {/* Footer con usuario */}
        <div className="p-4 border-t border-[#2a4070]/30">
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0f1f3a] border border-[#2a4070]/30">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0ea5e9]/20 to-[#0ea5e9]/10 flex items-center justify-center text-[#0ea5e9] font-bold text-sm flex-shrink-0 border border-[rgba(14,165,233,0.2)]">
              {user?.nombre?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#e8eef5] truncate">
                {user?.nombre || 'Administrador'}
              </p>
              <p className="text-xs text-[#627d98]">
                {user?.tipo === 'admin' ? 'Administrador' : 'Conductor'}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-[#627d98] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] rounded-md transition-all duration-200"
              title="Cerrar sesión"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}