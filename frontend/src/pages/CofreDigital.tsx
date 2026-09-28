import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SemaforoCND } from '../components/shared/SemaforoCND';
import { StatusCND } from '../types';
import { getListaCNDs, LINKS_EMISSAO_OFICIAL } from '../utils/cndStorage';
import { ModalAtualizarDocumento } from '../components/shared/ModalAtualizarDocumento';
import { 
  Upload, Camera, ShieldCheck, Plus, ExternalLink, 
  FileText, CheckCircle2, AlertTriangle, Clock, Download, ArrowLeft 
} from 'lucide-react';

export function CofreDigital() {
  const navigate = useNavigate();
  const isMobile = window.innerWidth < 768;
  const [cnds, setCnds] = useState<StatusCND[]>(getListaCNDs());
  const [selectedCnd, setSelectedCnd] = useState<StatusCND | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [documentosSocietarios, setDocumentosSocietarios] = useState([
    { id: 'soc_1', nome: 'Contrato Social Consolidado & Última Alteração', arquivo: 'Contrato_Social_Consolidado.pdf', data: '2026-01-10', status: 'valido' },
    { id: 'soc_2', nome: 'Comprovante de Inscrição e Situação Cadastral (CNPJ)', arquivo: 'Cartao_CNPJ_Ativo.pdf', data: '2026-08-01', status: 'valido' }
  ]);

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

  const handleOpenUpdate = (cnd: StatusCND) => {
    setSelectedCnd(cnd);
    setIsModalOpen(true);
  };

  const handleSimularUploadSocietario = () => {
    const nome = prompt('Nome do Documento Societário (ex: Alvará de Funcionamento, Balanço Patrimonial):');
    if (nome) {
      setDocumentosSocietarios(prev => [
        ...prev,
        {
          id: `soc_${Date.now()}`,
          nome,
          arquivo: `${nome.replace(/\s+/g, '_')}.pdf`,
          data: new Date().toISOString().split('T')[0],
          status: 'valido'
        }
      ]);
      alert('Documento societário adicionado ao cofre com sucesso!');
    }
  };

  const handleSimularAtestado = () => {
    const nome = prompt('Identificação do Atestado Técnico (ex: Obra Reforma UBS Muriaé, Fornecimento Merenda Leopoldina):');
    if (nome) {
      alert(`Atestado "${nome}" salvo no Cofre Digital para futuras habilitações!`);
    }
  };

  const regularesCount = cnds.filter(c => c.status === 'valido').length;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
      {/* Botão Superior de Voltar */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/feed')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-xs font-bold text-[#01203C] hover:text-[#FB8B03] shadow-2xs transition-all cursor-pointer active:scale-95 group"
          title="Voltar para o Feed de Oportunidades"
        >
          <ArrowLeft size={16} className="text-[#FB8B03] group-hover:-translate-x-1 transition-transform" />
          <span>Voltar para as Oportunidades</span>
        </button>

        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          Início &gt; Cofre Digital
        </span>
      </div>

      {/* Cabeçalho */}
      <div className="mb-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Compliance & Habilitação Jurídica
            </span>
            <h1 
              className="text-2xl sm:text-3xl font-black text-[#01203C] tracking-tight"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Cofre Digital de Documentações
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Emita, anexe e mantenha suas certidões e comprovantes em dia para participar de qualquer licitação.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="px-3.5 py-1.5 rounded-full bg-[#EAF7EE] text-[#1E8E5A] border border-[#1E8E5A]/20 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1E8E5A] animate-pulse"></span>
              {regularesCount}/{cnds.length} CNDs Regulares
            </span>
          </div>
        </div>
      </div>

      {/* Cartão de Semáforo Resumido */}
      <div className="mb-6">
        <SemaforoCND cnds={cnds} />
      </div>

      {/* Categorias de Documentos */}
      <div className="space-y-6">
        {/* ======================================================== */}
        {/* 1. CERTIDÕES FISCAIS E TRABALHISTAS (CNDs)               */}
        {/* ======================================================== */}
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="p-4 sm:p-5 bg-[#F7F8FA] border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 
                className="font-bold text-[#01203C] text-sm sm:text-base"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                1. Certidões Fiscais, Trabalhistas e Previdenciárias
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                Obrigatórias em 100% das licitações (Lei 14.133/2021)
              </span>
            </div>
            <span className="bg-[#01203C]/10 text-[#01203C] px-3 py-1 rounded-full text-xs font-bold">
              {cnds.length} certidões
            </span>
          </div>
          
          <div className="p-4 sm:p-5 space-y-3">
            {cnds.map(cnd => {
              const linkOficial = LINKS_EMISSAO_OFICIAL[cnd.tipo || 'federal'];
              const isValido = cnd.status === 'valido';
              const isVencendo = cnd.status === 'vencendo';

              return (
                <div 
                  key={cnd.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-200/80 rounded-2xl hover:bg-[#F7F8FA]/70 transition-all gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        isValido ? 'bg-[#1E8E5A]' : isVencendo ? 'bg-amber-500' : 'bg-red-500'
                      }`}></span>
                      <h3 className="text-xs sm:text-sm font-bold text-[#01203C] truncate">
                        {cnd.nome}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isValido 
                          ? 'bg-[#EAF7EE] text-[#1E8E5A] border border-[#1E8E5A]/20' 
                          : isVencendo 
                            ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                            : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {isValido ? `Válido (${cnd.diasRestantes} dias restantes)` : isVencendo ? `Vence em ${cnd.diasRestantes} dias` : 'Vencido'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span>Validade: <strong>{new Date(cnd.dataValidade).toLocaleDateString('pt-BR')}</strong></span>
                      {cnd.arquivoNome && (
                        <span className="text-slate-400 flex items-center gap-1 font-mono text-[11px]">
                          <FileText size={12} className="text-[#01203C]" />
                          {cnd.arquivoNome}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    {/* Link para Emitir no portal oficial */}
                    {linkOficial && (
                      <a
                        href={linkOficial.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-white hover:bg-slate-50 text-[#01203C] border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                        title={`Emitir no portal oficial: ${linkOficial.nome}`}
                      >
                        <ExternalLink size={12} className="text-[#FB8B03]" />
                        <span className="hidden sm:inline">Emitir no Órgão</span>
                      </a>
                    )}

                    {/* Botão de Atualizar / Upload de Arquivo */}
                    <button 
                      onClick={() => handleOpenUpdate(cnd)}
                      className="px-4 py-2 bg-[#FB8B03] hover:bg-[#D97602] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="Anexar nova certidão ou alterar data de validade"
                    >
                      {isMobile ? <Camera size={14} /> : <Upload size={14} />}
                      <span>Atualizar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. DOCUMENTOS SOCIETÁRIOS                                */}
        {/* ======================================================== */}
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="p-4 sm:p-5 bg-[#F7F8FA] border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 
                className="font-bold text-[#01203C] text-sm sm:text-base"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                2. Documentos Societários & Cadastrais
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                Contrato social, cartão CNPJ, procurações e alvarás
              </span>
            </div>
            <button
              onClick={handleSimularUploadSocietario}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-[#01203C] border border-slate-200 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer active:scale-95"
            >
              <Plus size={13} className="text-[#FB8B03]" />
              <span>Adicionar</span>
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            {documentosSocietarios.map(doc => (
              <div 
                key={doc.id}
                className="flex items-center justify-between p-3.5 border border-slate-100 rounded-2xl hover:bg-slate-50/50 transition-colors"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <h4 className="text-xs sm:text-sm font-bold text-[#01203C] truncate">{doc.nome}</h4>
                  <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                    <FileText size={11} className="text-slate-400" />
                    {doc.arquivo} • Atualizado em {new Date(doc.data).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded-full bg-[#EAF7EE] text-[#1E8E5A] border border-[#1E8E5A]/20 text-[10px] font-bold">
                    Válido
                  </span>
                  <button 
                    onClick={() => alert(`Visualizando documento: ${doc.arquivo}`)}
                    className="p-1.5 text-slate-500 hover:text-[#01203C] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Baixar ou visualizar"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. ATESTADOS DE CAPACIDADE TÉCNICA                       */}
        {/* ======================================================== */}
        <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="p-4 sm:p-5 bg-[#F7F8FA] border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 
                className="font-bold text-[#01203C] text-sm sm:text-base"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                3. Atestados de Capacidade Técnica
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                Comprovações de fornecimento ou execução de obras anteriores
              </span>
            </div>
            <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
              0 docs
            </span>
          </div>

          <div className="p-6 sm:p-8 text-center bg-[#F7F8FA]/30">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-xs border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Upload size={20} className="text-[#FB8B03]" />
            </div>
            <h4 className="text-[#01203C] font-bold text-sm">Nenhum atestado anexado ainda</h4>
            <p className="text-slate-500 text-xs mt-1 mb-4 max-w-sm mx-auto">
              Adicione atestados de órgãos públicos ou empresas privadas para pontuar e se habilitar em certames de maior valor.
            </p>
            <button 
              onClick={handleSimularAtestado}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#FB8B03] hover:bg-[#D97602] text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Plus size={14} />
              <span>Adicionar Atestado Técnico</span>
            </button>
          </div>
        </div>
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
