import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, ShieldCheck, Upload, ExternalLink, FileText, 
  CheckCircle2, AlertTriangle, ArrowRight, Plus, Download, ChevronRight 
} from 'lucide-react';
import { StatusCND } from '../../types';
import { getListaCNDs, LINKS_EMISSAO_OFICIAL } from '../../utils/cndStorage';
import { ModalAtualizarDocumento } from './ModalAtualizarDocumento';

interface DrawerDocumentosProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DrawerDocumentos({ isOpen, onClose }: DrawerDocumentosProps) {
  const navigate = useNavigate();
  const [cnds, setCnds] = useState<StatusCND[]>(getListaCNDs());
  const [selectedCnd, setSelectedCnd] = useState<StatusCND | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const carregarDados = () => {
    setCnds(getListaCNDs());
  };

  useEffect(() => {
    carregarDados();

    const handleAtualizacao = (e: any) => {
      setCnds(e.detail || getListaCNDs());
    };

    window.addEventListener('cnds_alteradas', handleAtualizacao);
    return () => window.removeEventListener('cnds_alteradas', handleAtualizacao);
  }, []);

  // Fechar com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const regularesCount = cnds.filter(c => c.status === 'valido').length;

  const handleOpenUpdate = (cnd: StatusCND) => {
    setSelectedCnd(cnd);
    setIsUpdateModalOpen(true);
  };

  const handleGoToCofre = () => {
    onClose();
    navigate('/cofre');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop escuro clicável para fechar */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Painel Lateral / Drawer Deslizante */}
      <aside 
        className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo do Drawer em Marinho Nobre */}
        <div className="bg-[#01203C] text-white p-5 shrink-0 shadow-sm relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            title="Fechar menu lateral"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
              <ShieldCheck size={18} className="text-[#FB8B03]" />
            </div>
            <span className="text-[11px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
              Menu de Documentos & Habilitação
            </span>
          </div>

          <h2 
            className="text-lg font-black tracking-tight text-white"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Suas Certidões & Documentos
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Gerencie, atualize a validade ou emita a 2ª via oficial.
          </p>

          {/* Banner de Saúde Fiscal */}
          <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${regularesCount === cnds.length ? 'bg-[#1E8E5A]' : 'bg-amber-400'} animate-pulse`}></span>
              <span className="text-xs font-bold text-white">
                Saúde Fiscal: {regularesCount}/{cnds.length} regulares
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              regularesCount === cnds.length
                ? 'bg-[#EAF7EE] text-[#1E8E5A]'
                : 'bg-amber-100 text-amber-900'
            }`}>
              {regularesCount === cnds.length ? 'Regular' : 'Atenção com Prazos'}
            </span>
          </div>
        </div>

        {/* Lista Rolável de Documentos */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Certidões Negativas de Débito (CND)
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Clique para atualizar
            </span>
          </div>

          {/* Cards das 5 Certidões (com nomes completos sem corte) */}
          <div className="space-y-2.5">
            {cnds.map(cnd => {
              const linkOficial = LINKS_EMISSAO_OFICIAL[cnd.tipo || 'federal'];
              const isValido = cnd.status === 'valido';
              const isVencendo = cnd.status === 'vencendo';

              return (
                <div 
                  key={cnd.id}
                  className="p-3.5 bg-[#F7F8FA] hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                        isValido ? 'bg-[#1E8E5A]' : isVencendo ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
                      }`} />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-[#01203C] leading-snug">
                          {cnd.nome}
                        </h4>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          Validade: <strong>{new Date(cnd.dataValidade).toLocaleDateString('pt-BR')}</strong>
                        </span>
                      </div>
                    </div>

                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isValido 
                        ? 'bg-[#EAF7EE] text-[#1E8E5A] border-[#1E8E5A]/20' 
                        : isVencendo 
                          ? 'bg-amber-50 text-amber-800 border-amber-200' 
                          : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {isValido ? `Válido (${cnd.diasRestantes}d)` : isVencendo ? `Vence em ${cnd.diasRestantes}d` : 'Vencido'}
                    </span>
                  </div>

                  {/* Ações da Certidão */}
                  <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-200/60">
                    {linkOficial && (
                      <a
                        href={linkOficial.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 text-[11px] font-bold text-[#01203C] hover:text-[#032F52] bg-white border border-slate-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        title="Emitir no portal oficial do órgão"
                      >
                        <span>Emitir no Órgão</span>
                        <ExternalLink size={11} className="text-[#FB8B03]" />
                      </a>
                    )}

                    <button
                      onClick={() => handleOpenUpdate(cnd)}
                      className="px-3 py-1 text-[11px] font-bold text-white bg-[#FB8B03] hover:bg-[#D97602] rounded-lg flex items-center gap-1 transition-all shadow-xs cursor-pointer active:scale-95"
                      title="Anexar novo arquivo ou atualizar validade"
                    >
                      <Upload size={11} />
                      <span>Atualizar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Seção Adicional: Documentos da Empresa */}
          <div className="pt-3 border-t border-slate-200/80">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-2">
              Documentos Societários
            </span>
            <div className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#01203C]" />
                <span className="font-semibold text-slate-700">Contrato Social & CNPJ</span>
              </div>
              <span className="text-[10px] font-bold text-[#1E8E5A] bg-[#EAF7EE] px-2 py-0.5 rounded-full">
                Anexados
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé Fixo */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2 shrink-0">
          <button
            onClick={handleGoToCofre}
            className="w-full py-2.5 bg-[#01203C] hover:bg-[#032F52] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
          >
            <span>Acessar Tela Completa do Cofre Digital</span>
            <ArrowRight size={14} className="text-[#FB8B03]" />
          </button>
        </div>
      </aside>

      {/* Modal de Atualização de Certidão */}
      <ModalAtualizarDocumento
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        cnd={selectedCnd}
        onSuccess={carregarDados}
      />
    </div>
  );
}
