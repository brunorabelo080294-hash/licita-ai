import React, { useState, useEffect } from 'react';
import { 
  X, Upload, FileText, CheckCircle2, AlertTriangle, 
  ExternalLink, Calendar, ShieldCheck, Check, Clock, ChevronLeft 
} from 'lucide-react';
import { StatusCND } from '../../types';
import { 
  atualizarDocumentoCnd, calcularStatusCnd, LINKS_EMISSAO_OFICIAL 
} from '../../utils/cndStorage';

interface ModalAtualizarDocumentoProps {
  isOpen: boolean;
  onClose: () => void;
  cnd: StatusCND | null;
  onSuccess?: () => void;
}

export function ModalAtualizarDocumento({ isOpen, onClose, cnd, onSuccess }: ModalAtualizarDocumentoProps) {
  const [dataValidade, setDataValidade] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (cnd) {
      setDataValidade(cnd.dataValidade || '');
      setArquivo(null);
      setSucesso(false);
    }
  }, [cnd, isOpen]);

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !cnd) return null;

  const infoOrgao = LINKS_EMISSAO_OFICIAL[cnd.tipo || 'federal'] || {
    nome: 'Portal do Órgão Emissor',
    url: 'https://gov.br',
    orgao: 'Órgão Competente'
  };

  const statusCalculado = dataValidade ? calcularStatusCnd(dataValidade) : { status: cnd.status, diasRestantes: cnd.diasRestantes };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArquivo(e.target.files[0]);
    }
  };

  const handleAdicionarDias = (dias: number) => {
    const data = new Date();
    data.setDate(data.getDate() + dias);
    setDataValidade(data.toISOString().split('T')[0]);
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataValidade) return;

    setSalvando(true);
    setTimeout(() => {
      atualizarDocumentoCnd(
        cnd.id, 
        dataValidade, 
        arquivo ? arquivo.name : cnd.arquivoNome || `Certidao_${cnd.tipo}.pdf`
      );
      setSalvando(false);
      setSucesso(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    }, 500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] sm:max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Fixo em Marinho Nobre */}
        <div className="bg-[#01203C] text-white p-5 text-center relative shrink-0 shadow-sm">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X size={20} />
          </button>

          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
              <ShieldCheck size={18} className="text-[#FB8B03]" />
            </div>
            <span className="text-[11px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
              Habilitação & Regularidade Fiscal
            </span>
          </div>

          <h2 
            className="text-lg font-black tracking-tight"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Atualizar Documentação
          </h2>
          <p className="text-xs text-slate-300 mt-0.5 max-w-sm mx-auto">
            {cnd.nome}
          </p>
        </div>

        {/* Corpo Rolável */}
        <form onSubmit={handleSalvar} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Alerta de Sucesso */}
          {sucesso && (
            <div className="p-3.5 rounded-2xl bg-[#EAF7EE] border border-[#1E8E5A]/30 text-[#1E8E5A] flex items-center gap-2 text-xs font-bold animate-in fade-in">
              <CheckCircle2 size={18} className="text-[#1E8E5A] shrink-0" />
              <span>Certidão atualizada com sucesso! Seu status no feed e no cofre já foi recalculado.</span>
            </div>
          )}

          {/* 1. Botão de Acesso ao Portal Oficial do Governo */}
          <div className="bg-[#F7F8FA] border border-slate-200/80 p-4 rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Órgão Emissor Oficial
                </span>
                <h4 className="text-xs font-bold text-[#01203C]">
                  {infoOrgao.orgao}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Precisa emitir a 2ª via ou certidão atualizada? Acesse o portal do governo federal/estadual.
                </p>
              </div>

              <a
                href={infoOrgao.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-3 py-2 bg-[#01203C] hover:bg-[#032F52] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Abrir página oficial do órgão emissor em nova aba"
              >
                <span>Emitir no Órgão</span>
                <ExternalLink size={12} className="text-[#FB8B03]" />
              </a>
            </div>
          </div>

          {/* 2. Upload do Arquivo (PDF ou Imagem) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Anexar Arquivo da Nova Certidão (PDF ou Foto)
            </label>
            <div className="relative border-2 border-dashed border-slate-200 hover:border-[#01203C]/40 rounded-2xl p-5 text-center bg-[#F7F8FA] transition-colors cursor-pointer group">
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-10 h-10 bg-white rounded-xl shadow-xs border border-slate-200 flex items-center justify-center mx-auto mb-2 text-slate-500 group-hover:scale-105 transition-transform">
                <Upload size={18} className="text-[#FB8B03]" />
              </div>
              {arquivo ? (
                <div>
                  <p className="text-xs font-bold text-[#01203C] flex items-center justify-center gap-1">
                    <FileText size={14} className="text-[#1E8E5A]" />
                    {arquivo.name}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {(arquivo.size / 1024).toFixed(1)} KB • Arquivo pronto para salvar
                  </span>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-[#01203C]">
                    Clique para selecionar ou arraste o arquivo PDF aqui
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {cnd.arquivoNome ? `Arquivo atual: ${cnd.arquivoNome}` : 'Suporta arquivos PDF, PNG ou JPG'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Data de Validade da Nova Certidão */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Nova Data de Validade da Certidão
            </label>
            <input
              type="date"
              required
              value={dataValidade}
              onChange={(e) => setDataValidade(e.target.value)}
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-[#01203C] focus:outline-none focus:border-[#01203C] focus:ring-2 focus:ring-[#01203C]/10 transition-all shadow-2xs"
            />

            {/* Atalhos Rápidos de Validade Padrão */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Atalhos:</span>
              <button
                type="button"
                onClick={() => handleAdicionarDias(30)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                +30 dias (1 mês)
              </button>
              <button
                type="button"
                onClick={() => handleAdicionarDias(90)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                +90 dias (3 meses)
              </button>
              <button
                type="button"
                onClick={() => handleAdicionarDias(180)}
                className="px-2.5 py-1 bg-[#EAF7EE] hover:bg-emerald-100 text-[#1E8E5A] text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                +180 dias (Padrão Receita/PGFN)
              </button>
            </div>
          </div>

          {/* 4. Previsão de Status em Tempo Real */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Status com a nova data:</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              statusCalculado.status === 'valido'
                ? 'bg-[#EAF7EE] text-[#1E8E5A] border border-[#1E8E5A]/20'
                : statusCalculado.status === 'vencendo'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                statusCalculado.status === 'valido' ? 'bg-[#1E8E5A]' : statusCalculado.status === 'vencendo' ? 'bg-amber-500' : 'bg-red-500'
              }`}></span>
              {statusCalculado.status === 'valido' 
                ? `Válido (${statusCalculado.diasRestantes} dias)` 
                : statusCalculado.status === 'vencendo'
                  ? `Vence em breve (${statusCalculado.diasRestantes} dias)`
                  : 'Vencido'}
            </span>
          </div>

          {/* Botões do Rodapé */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={salvando}
              className="flex-1 py-3 bg-[#FB8B03] hover:bg-[#D97602] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Check size={15} />
              <span>{salvando ? 'Salvando...' : 'Salvar e Atualizar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
