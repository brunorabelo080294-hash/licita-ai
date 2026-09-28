import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusCND } from '../../types';
import { getListaCNDs } from '../../utils/cndStorage';
import { ModalAtualizarDocumento } from './ModalAtualizarDocumento';
import { ShieldCheck, ChevronRight, Upload, RefreshCw } from 'lucide-react';

interface SemaforoCNDProps {
  cnds?: StatusCND[];
  onGerenciarTodos?: () => void;
}

export function SemaforoCND({ cnds: initialCnds, onGerenciarTodos }: SemaforoCNDProps) {
  const navigate = useNavigate();
  const [cnds, setCnds] = useState<StatusCND[]>(initialCnds || getListaCNDs());
  const [selectedCnd, setSelectedCnd] = useState<StatusCND | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const regulares = cnds.filter(cnd => cnd.status === 'valido').length;
  
  const getStatusColor = (status: StatusCND['status']) => {
    switch (status) {
      case 'valido': return 'bg-[#1E8E5A]';
      case 'vencendo': return 'bg-amber-500';
      case 'vencido': return 'bg-red-500';
    }
  };

  const getStatusBadge = (cnd: StatusCND) => {
    if (cnd.status === 'valido') {
      return (
        <span className="text-[11px] font-bold text-[#1E8E5A]">
          Válido
        </span>
      );
    }
    if (cnd.status === 'vencendo') {
      return (
        <span className="text-[11px] font-bold text-amber-600">
          Vence em {cnd.diasRestantes}d
        </span>
      );
    }
    return (
      <span className="text-[11px] font-bold text-red-600">
        Vencido
      </span>
    );
  };

  const handleOpenUpdate = (cnd: StatusCND) => {
    setSelectedCnd(cnd);
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4">
      {/* Cabeçalho do Card */}
      <div className="mb-3 pb-2.5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 
            className="font-bold text-[#01203C] text-xs sm:text-sm"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Saúde Fiscal: {regulares}/{cnds.length} documentos regulares
          </h3>
          <span className="text-[10px] text-slate-400 font-medium block">
            Clique em qualquer certidão para atualizar
          </span>
        </div>

        <span className="w-2 h-2 rounded-full bg-[#1E8E5A] animate-pulse shrink-0"></span>
      </div>
      
      {/* Lista de Certidões Interativas */}
      <div className="space-y-2">
        {cnds.map(cnd => (
          <div 
            key={cnd.id} 
            onClick={() => handleOpenUpdate(cnd)}
            className="flex items-start justify-between p-2 rounded-xl hover:bg-[#F7F8FA] border border-transparent hover:border-slate-200 transition-all cursor-pointer group"
            title="Clique para atualizar data ou emitir no portal oficial"
          >
            <div className="flex items-start space-x-2 min-w-0 pr-2 flex-1">
              <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(cnd.status)} shrink-0 mt-1`} />
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-800 leading-snug group-hover:text-[#01203C] block break-words">
                  {cnd.nome}
                </span>
                <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                  Val: {new Date(cnd.dataValidade).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0 flex items-center gap-1.5 pl-1 mt-0.5">
              {getStatusBadge(cnd)}
              <div className="w-5 h-5 rounded-md bg-slate-100 group-hover:bg-[#FB8B03] group-hover:text-white text-slate-400 flex items-center justify-center transition-colors">
                <Upload size={10} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Botões de Ação para Documentos */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('open_documentos_drawer'));
          }}
          className="w-full py-2 px-3 bg-[#01203C] hover:bg-[#032F52] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-between shadow-2xs cursor-pointer active:scale-98"
          title="Abrir o menu lateral deslizante com todas as certidões e links oficiais"
        >
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#FB8B03]" />
            <span>Abrir Menu de Documentos</span>
          </div>
          <ChevronRight size={13} className="text-[#FB8B03]" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (onGerenciarTodos) {
              onGerenciarTodos();
            } else {
              navigate('/cofre');
            }
          }}
          className="w-full py-1.5 px-3 bg-[#F7F8FA] hover:bg-slate-100 text-slate-700 rounded-xl text-[11px] font-semibold transition-colors flex items-center justify-between border border-slate-200/80 cursor-pointer"
        >
          <span>Ir para Tela Completa do Cofre</span>
          <ChevronRight size={12} className="text-slate-400" />
        </button>
      </div>

      {/* Modal de Atualização */}
      <ModalAtualizarDocumento
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cnd={selectedCnd}
        onSuccess={carregarDados}
      />
    </div>
  );
}
