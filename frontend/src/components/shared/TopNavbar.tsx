import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LicitaAiLogo } from './LicitaAiLogo';
import { InstalarAppModal } from './InstalarAppModal';
import { BotaoAcessibilidadeFonte } from './BotaoAcessibilidadeFonte';
import { DrawerDocumentos } from './DrawerDocumentos';
import { Smartphone, ArrowLeft } from 'lucide-react';

interface TopNavbarProps {
  showLogo?: boolean;
}

export function TopNavbar({ showLogo = true }: TopNavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showDocsDrawer, setShowDocsDrawer] = useState(false);

  const isEdital = location.pathname.startsWith('/edital');

  const handleVoltar = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/feed');
    }
  };

  return (
    <header className="bg-[#01203C] text-white px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-20 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Lado Esquerdo: Mobile exibe Logo (e Voltar se no edital); Desktop exibe Voltar se no edital ou Status PNCP */}
        <div className="flex items-center gap-2">
          {/* Mobile View */}
          <div className="flex md:hidden items-center gap-2">
            {isEdital && (
              <button
                type="button"
                onClick={handleVoltar}
                className="p-1.5 -ml-1 text-slate-200 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="Voltar"
              >
                <ArrowLeft size={18} className="text-[#FB8B03]" />
                <span className="hidden xs:inline">Voltar</span>
              </button>
            )}
            <LicitaAiLogo size="sm" variant="horizontal" theme="dark" />
          </div>

          {/* Desktop View (Sidebar já tem a logo) */}
          <div className="hidden md:flex items-center gap-3">
            {isEdital ? (
              <button
                type="button"
                onClick={handleVoltar}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all cursor-pointer border border-white/20 active:scale-95 group shadow-xs"
                title="Voltar à página anterior"
              >
                <ArrowLeft size={15} className="text-[#FB8B03] group-hover:-translate-x-1 transition-transform" />
                <span>← Voltar</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FB8B03] animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Radar Oficial de Compras Públicas
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Acessibilidade de Fonte + Botão Instalar App */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Botão Oficial de Acessibilidade Visual (Aa Normal / Grande / Negrito) */}
          <BotaoAcessibilidadeFonte />

          {/* Botão Atalho Mobile / Desktop para Instalar App */}
          <button
            onClick={() => setShowInstallModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium transition-colors cursor-pointer border border-white/10 active:scale-95 shadow-2xs"
            title="Instalar Licita Aí no Celular"
          >
            <Smartphone size={13} className="text-[#FB8B03]" />
            <span>App</span>
          </button>
        </div>
      </div>

      {/* Menu Lateral Deslizante (Drawer) para Acesso e Atualização de Documentos */}
      <DrawerDocumentos isOpen={showDocsDrawer} onClose={() => setShowDocsDrawer(false)} />

      <InstalarAppModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />
    </header>
  );
}
