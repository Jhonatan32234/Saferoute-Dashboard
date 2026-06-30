import { JSX, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavSection {
  id: string;
  title: string;
  items?: NavItem[];
}

interface NavItem {
  id: string;
  label: string;
  path: string;
  badge?: number;
}

const navigationSections: NavSection[] = [
  {
    id: 'principal',
    title: 'Principal',
    items: [
      { id: 'mapa', label: 'Mapa de Riesgo', path: '/dashboard/mapa' },
    ]
  },
  {
    id: 'analisis',
    title: 'Analisis',
    items: [
      { id: 'analitica', label: 'Analitica', path: '/dashboard/analitica' },
    ]
  },
  {
    id: 'gestion',
    title: 'Gestion',
    items: [
      { id: 'flota', label: 'Mi Flota', path: '/dashboard/flota' },
    ]
  }
];

export default function NavigationPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState<string[]>(['principal', 'analisis', 'gestion']);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const sectionIcons: Record<string, JSX.Element> = {
    principal: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    analisis: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    gestion: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  };

  return (
    <div className="py-2">
      {navigationSections.map((section) => (
        <div key={section.id} className="mb-1">
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-[#627d98] uppercase tracking-wider hover:text-[#94a3b8] transition-colors"
          >
            <span className="text-[#627d98]">{sectionIcons[section.id]}</span>
            <span className="flex-1 text-left">{section.title}</span>
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${
                expandedSections.includes(section.id) ? 'rotate-90' : ''
              }`}
              fill="currentColor" viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>

          <div className={`overflow-hidden transition-all duration-200 ${
            expandedSections.includes(section.id) ? 'max-h-96' : 'max-h-0'
          }`}>
            {section.items?.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 pl-10 pr-4 py-2.5 text-sm font-medium transition-all duration-200 relative ${
                  location.pathname === item.path
                    ? 'text-[#0ea5e9] bg-[rgba(14,165,233,0.1)] border-l-2 border-[#0ea5e9]'
                    : 'text-[#94a3b8] hover:text-[#e8eef5] hover:bg-[#0f1f3a] border-l-2 border-transparent'
                }`}
              >
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}