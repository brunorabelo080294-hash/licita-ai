import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Columns3, Database, Calculator, ShieldCheck, Sparkles } from 'lucide-react';

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;

  const tabs = [
    {
      path: '/feed',
      label: 'Editais',
      icon: Home,
      isActive: currentPath === '/feed' || currentPath === '/' || currentPath.startsWith('/edital'),
      badge: null
    },
    {
      path: '/kanban',
      label: 'Kanban',
      icon: Columns3,
      isActive: currentPath.startsWith('/kanban'),
      badge: 'NOVO'
    },
    {
      path: '/pesquisa-precos',
      label: 'Preços',
      icon: Database,
      isActive: currentPath.startsWith('/pesquisa-precos'),
      badge: 'CATMAT'
    },
    {
      path: '/calculadora',
      label: 'Margem',
      icon: Calculator,
      isActive: currentPath.startsWith('/calculadora'),
      badge: null
    },
    {
      path: '/cofre',
      label: 'Cofre',
      icon: ShieldCheck,
      isActive: currentPath.startsWith('/cofre'),
      badge: null
    },
    {
      path: '/sos-ia',
      label: 'SOS IA',
      icon: Sparkles,
      isActive: currentPath.startsWith('/sos-ia'),
      badge: 'IA'
    },
  ];

  return (
    <nav 
      aria-label="Navegação inferior mobile"
      className="fixed bottom-0 left-0 right-0 bg-white/98 backdrop-blur-md border-t border-slate-200/90 pb-safe md:hidden z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
    >
      <div className="grid grid-cols-6 items-center h-16 px-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.isActive;

          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center h-full py-1 text-center select-none touch-manipulation cursor-pointer active:scale-90 transition-transform duration-100 ${
                active ? 'text-[#01203C]' : 'text-slate-400 hover:text-slate-600'
              }`}
              title={tab.label}
            >
              <div className="relative flex items-center justify-center">
                <Icon 
                  size={20} 
                  className={`transition-colors ${
                    active ? 'stroke-[2.5] text-[#01203C]' : 'stroke-[1.8] text-slate-400'
                  }`} 
                />

                {/* Ponto indicador de aba ativa */}
                {active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#FB8B03] shadow-xs"></span>
                )}

                {/* Badge sutil quando não ativo */}
                {!active && tab.badge === 'IA' && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#FB8B03] animate-pulse"></span>
                )}
              </div>

              <span 
                className={`text-[9.5px] mt-0.5 tracking-tight truncate max-w-[56px] transition-colors ${
                  active ? 'font-black text-[#01203C]' : 'font-medium text-slate-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
