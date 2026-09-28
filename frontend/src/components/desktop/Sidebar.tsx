import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, ShieldCheck, Calculator, RefreshCw, ChevronDown, Sparkles, Columns3, Database } from 'lucide-react';
import { getEmpresaAtiva, getListaEmpresas, Empresa } from '../../utils/empresaStorage';
import { ModalGerenciarEmpresas } from '../shared/ModalGerenciarEmpresas';
import { LicitaAiLogo } from '../shared/LicitaAiLogo';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [empresa, setEmpresa] = useState<Empresa>(getEmpresaAtiva());
  const [listaEmpresas, setListaEmpresas] = useState<Empresa[]>(getListaEmpresas());
  const [showEmpresasModal, setShowEmpresasModal] = useState(false);

  useEffect(() => {
    const emp = getEmpresaAtiva();
    setEmpresa(emp);
    setListaEmpresas(getListaEmpresas());

    const handleEmpresaAlterada = (e: any) => {
      setEmpresa(e.detail || getEmpresaAtiva());
      setListaEmpresas(getListaEmpresas());
    };

    window.addEventListener('empresa_alterada', handleEmpresaAlterada);
    return () => window.removeEventListener('empresa_alterada', handleEmpresaAlterada);
  }, [location.pathname]);

  const navItems = [
    { path: '/feed', label: 'Feed de Oportunidades', icon: Search },
    { path: '/kanban', label: 'Quadro Kanban', icon: Columns3, badge: 'NOVO' },
    { path: '/pesquisa-precos', label: 'Pesquisa de Preços', icon: Database, badge: 'CATMAT' },
    { path: '/calculadora', label: 'Calculadora de Margem', icon: Calculator },
    { path: '/cofre', label: 'Cofre Digital', icon: ShieldCheck },
    { path: '/sos-ia', label: 'SOS Copiloto IA', icon: Sparkles, badge: 'IA' },
  ];

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <aside className="w-72 bg-white border-r border-slate-200/80 h-screen flex flex-col sticky top-0 shrink-0 z-30 shadow-xs">
      {/* Topo Oficial com a Nova Logo do Manual */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <LicitaAiLogo size="md" variant="full" theme="light" />
      </div>

      {/* Cartão de Identificação da Empresa Cadastrada com Alternador de CNPJ */}
      <div className="p-4 border-b border-slate-100 bg-[#F7F8FA]/90">
        <div className="flex items-start space-x-3 mb-2">
          <div className="w-10 h-10 bg-[#01203C] text-white rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
            {getInitials(empresa.nomeFantasia || empresa.razaoSocial)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-[#01203C] text-sm truncate" title={empresa.razaoSocial}>
              {empresa.nomeFantasia || empresa.razaoSocial}
            </h2>
            <p className="text-xs text-slate-500 font-mono tracking-tight">{empresa.cnpj}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="inline-flex items-center text-[10px] font-bold bg-[#01203C]/10 text-[#01203C] px-2 py-0.5 rounded-md">
                {empresa.categoriaNome || 'Comércio & Serviços'}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {empresa.municipio ? `${empresa.municipio}/${empresa.uf}` : 'Leopoldina/MG'}
              </span>
            </div>
          </div>
        </div>

        {/* Botão de Alternar / Gerenciar CNPJs */}
        <button
          type="button"
          onClick={() => setShowEmpresasModal(true)}
          className="w-full mt-2.5 text-xs font-bold text-[#01203C] hover:text-[#032F52] flex items-center justify-between py-2 px-3 rounded-xl border border-slate-200 hover:border-[#01203C]/30 bg-white hover:bg-slate-50 transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <RefreshCw size={13} className="text-[#FB8B03] shrink-0" />
            <span className="truncate">Trocar Empresa ({listaEmpresas.length} cadastradas)</span>
          </div>
          <ChevronDown size={14} className="text-slate-400 shrink-0" />
        </button>
      </div>

      {/* Navegação Principal */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-1">
          Menu de Navegação
        </span>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path) || 
            (item.path === '/feed' && (location.pathname === '/' || location.pathname.startsWith('/edital')));
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer select-none active:scale-[0.98] ${
                isActive 
                  ? 'bg-[#01203C] text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-[#01203C]'
              }`}
            >
              <Icon 
                size={18} 
                className={isActive ? 'text-[#FB8B03]' : 'text-slate-400'} 
              />
              <span className="truncate">{item.label}</span>
              {item.badge && !isActive && (
                <span className="ml-auto text-[10px] font-black bg-[#FB8B03]/20 text-[#D97602] border border-[#FB8B03]/40 px-1.5 py-0.2 rounded-md">
                  {item.badge}
                </span>
              )}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FB8B03]"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Rodapé institucional discreto e limpo */}
      <div className="p-3 border-t border-slate-100 bg-[#F7F8FA]/60">
        <p className="text-[11px] text-slate-400 font-medium text-center">
          Licita Aí • Versão Oficial 2.0
        </p>
      </div>

      {/* Modal de Troca de Empresa */}
      <ModalGerenciarEmpresas isOpen={showEmpresasModal} onClose={() => setShowEmpresasModal(false)} />
    </aside>
  );
}
