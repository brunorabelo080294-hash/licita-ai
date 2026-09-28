import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Oportunidade, KanbanEtapa } from '../../types';
import { 
  Clock, MapPin, ChevronRight, ChevronDown, ChevronUp, 
  ExternalLink, ShieldCheck, Heart, Columns3, Sparkles, 
  FileText, Package, AlertCircle 
} from 'lucide-react';
import { BrasaoPrefeitura } from './BrasaoPrefeitura';
import { calcularStatusPrazo, formatarUrlPncpWeb, resolverUrlOrigem } from '../../utils/pncpUrls';
import { isOportunidadeFavorita, toggleFavoritoOportunidade } from '../../utils/favoritosStorage';
import { getEmpresaAtiva } from '../../utils/empresaStorage';
import { getEtapaOportunidade, adicionarAoKanban, ETAPAS_CONFIG } from '../../utils/kanbanStorage';

interface OportunidadeCardProps {
  oportunidade: Oportunidade;
}

export function OportunidadeCard({ oportunidade }: OportunidadeCardProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const getModalityInfo = (modalidade: Oportunidade['modalidade']) => {
    switch (modalidade) {
      case 'dispensa': return { label: 'Dispensa Eletrônica', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'pregao': return { label: 'Pregão Eletrônico', color: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'concorrencia': return { label: 'Concorrência Pública', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      case 'srp': return { label: 'Registro de Preços', color: 'bg-slate-50 text-slate-800 border-slate-200' };
      default: return { label: modalidade, color: 'bg-gray-50 text-gray-800 border-gray-200' };
    }
  };

  const modInfo = getModalityInfo(oportunidade.modalidade);
  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const statusInfo = calcularStatusPrazo(oportunidade.dataEncerramento, oportunidade.dataAbertura);

  // Estado e sincronização de licitação favoritada
  const [isFav, setIsFav] = useState(isOportunidadeFavorita(oportunidade.id));

  useEffect(() => {
    const handleFavAlterado = (e: any) => {
      if (e.detail?.alteradoId === oportunidade.id || Array.isArray(e.detail?.ids)) {
        setIsFav(isOportunidadeFavorita(oportunidade.id));
      }
    };
    window.addEventListener('favoritos_alterados', handleFavAlterado);
    return () => window.removeEventListener('favoritos_alterados', handleFavAlterado);
  }, [oportunidade.id]);

  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    const novoStatus = toggleFavoritoOportunidade(oportunidade.id);
    setIsFav(novoStatus);
  };

  // Sincronização com o Kanban da empresa ativa
  const empresaAtiva = getEmpresaAtiva();
  const [etapaKanban, setEtapaKanban] = useState<KanbanEtapa | null>(() => getEtapaOportunidade(oportunidade.id, empresaAtiva.cnpj));

  useEffect(() => {
    const handleKanbanAlterado = () => {
      setEtapaKanban(getEtapaOportunidade(oportunidade.id, getEmpresaAtiva().cnpj));
    };
    window.addEventListener('kanban_alterado', handleKanbanAlterado);
    window.addEventListener('empresa_alterada', handleKanbanAlterado);
    return () => {
      window.removeEventListener('kanban_alterado', handleKanbanAlterado);
      window.removeEventListener('empresa_alterada', handleKanbanAlterado);
    };
  }, [oportunidade.id]);

  const handleToggleKanban = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (etapaKanban) {
      navigate('/kanban');
    } else {
      const ativa = getEmpresaAtiva();
      adicionarAoKanban(oportunidade, ativa.cnpj, 'encontrada');
      setEtapaKanban('encontrada');
    }
  };

  const portalOrigem = resolverUrlOrigem(oportunidade);

  // Classificação semântica de Bom Pagador e Prazo Apertado conforme manual
  const isBomPagador = oportunidade.adimplencia 
    ? (oportunidade.adimplencia.status === 'otimo' || oportunidade.adimplencia.status === 'bom' || oportunidade.adimplencia.scoreTce >= 7.0) 
    : true;
  const isPrazoApertado = statusInfo.diasRestantes !== null && statusInfo.diasRestantes <= 4 && statusInfo.status === 'aberta';

  const pncpWebUrl = formatarUrlPncpWeb(
    oportunidade.numeroControlePNCP || oportunidade.id || oportunidade.urlEdital
  );

  return (
    <article 
      onClick={() => setIsExpanded(prev => !prev)}
      className={`bg-white rounded-2xl shadow-xs hover:shadow-md border transition-all duration-200 p-5 mb-4 cursor-pointer group relative ${
        isExpanded ? 'border-[#01203C]/40 ring-2 ring-[#01203C]/5' : 'border-slate-200/80 hover:border-[#01203C]/30'
      }`}
      title={isExpanded ? 'Clique para recolher detalhes' : 'Clique para ver mais informações desta licitação'}
    >
      {/* Topo: Município, Brasão, Distância e Badges de Status do Manual */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-3 min-w-0">
          <BrasaoPrefeitura municipio={oportunidade.municipio} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-[#01203C] text-base group-hover:text-[#FB8B03] transition-colors" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                {oportunidade.municipio.nome}
              </span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {oportunidade.municipio.uf}
              </span>
              <span className="text-xs text-slate-400 font-medium flex items-center">
                <MapPin size={11} className="mr-0.5 text-slate-400" />
                {oportunidade.distanciaKm === undefined || oportunidade.distanciaKm === null
                  ? `${oportunidade.municipio.nome}`
                  : oportunidade.distanciaKm <= 0.5
                    ? 'Sua Cidade (Sede)'
                    : `${oportunidade.distanciaKm} km`}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate" title={oportunidade.orgao}>
              {oportunidade.orgao}
            </p>
          </div>
        </div>

        {/* Badges Oficiais: • Portal de Origem, • Bom Pagador e • Prazo apertado */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {/* Badge Oficial do Portal de Compras (11 Portais Integrados) */}
          <span 
            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs"
            style={{
              backgroundColor: oportunidade.portalBgCor || '#F1F5F9',
              color: oportunidade.portalCor || '#01203C',
              borderColor: oportunidade.portalBordaCor || '#CBD5E1'
            }}
            title={`Hospedado no portal: ${oportunidade.portalNome || portalOrigem.nome}`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: oportunidade.portalCor || '#01203C' }}></span>
            <span>{oportunidade.portalNomeCurto || oportunidade.portalNome || portalOrigem.nome}</span>
          </span>

          {isBomPagador && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#EAF7EE] text-[#1E8E5A] border border-[#1E8E5A]/20 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1E8E5A]"></span>
              Bom Pagador
            </span>
          )}

          {isPrazoApertado ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97602] border border-[#D97602]/20 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D97602] animate-pulse"></span>
              Prazo apertado
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${statusInfo.badgeColor}`}>
              {statusInfo.status === 'aberta' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E8E5A] animate-pulse"></span>
              )}
              {statusInfo.badgeLabel}
            </span>
          )}

          {/* Botão de Coração: Favoritar para Acompanhar em SOS IA */}
          <button
            type="button"
            onClick={handleToggleFav}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer active:scale-90 flex items-center justify-center shrink-0 ${
              isFav 
                ? 'bg-rose-50 border-rose-200 text-rose-500 shadow-2xs' 
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-400 hover:text-rose-500'
            }`}
            title={isFav ? 'Favoritado! Acompanhando em SOS IA > Quando vai ser?' : 'Favoritar licitação (Acompanhar datas em SOS IA)'}
          >
            <Heart size={16} className={isFav ? 'fill-rose-500 text-rose-500' : ''} />
          </button>

          {/* Botão Indicador de Expandir/Recolher no Topo */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(prev => !prev);
            }}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-[#FB8B03] transition-all cursor-pointer flex items-center justify-center shrink-0"
            title={isExpanded ? 'Recolher detalhes' : 'Abrir mais informações'}
          >
            {isExpanded ? <ChevronUp size={16} className="text-[#FB8B03]" /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Título Oficial: Montserrat 700 (ex: Concorrência nº 025/2026) */}
      <h3 
        className="text-sm font-bold text-[#01203C] mb-1.5 flex items-center justify-between gap-2"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        <span>{oportunidade.numeroEdital || `${modInfo.label} • ${oportunidade.id.slice(0, 18)}`}</span>
      </h3>

      {/* Objeto Resumido */}
      <p className="text-slate-600 font-normal mb-3 text-xs sm:text-sm line-clamp-2 leading-relaxed">
        {oportunidade.objetoResumido}
      </p>

      {/* Valor Estimado em Destaque */}
      <div className="mb-4 flex items-baseline justify-between bg-[#F7F8FA] p-3 rounded-xl border border-slate-100">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-0.5">
            Valor Estimado
          </span>
          <span 
            className="text-xl sm:text-2xl font-black text-[#01203C] tracking-tight"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            {formatter.format(oportunidade.valorMaximo)}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-0.5">
            Modalidade
          </span>
          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${modInfo.color}`}>
            {modInfo.label}
          </span>
        </div>
      </div>

      {/* Rodapé: Botões de Ação Padronizados conforme o Manual */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Clock size={13} className="text-slate-400" />
          <span>{statusInfo.textoPrazo}</span>
          {oportunidade.exclusivoMpe && (
            <span className="bg-emerald-50 text-[#1E8E5A] text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-200">
              MPE/MEI
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Botão de Expandir/Recolher Detalhes */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(prev => !prev);
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
            title={isExpanded ? 'Recolher detalhes' : 'Ver mais informações desta licitação'}
          >
            <span>{isExpanded ? 'Recolher' : 'Mais Informações'}</span>
            {isExpanded ? <ChevronUp size={14} className="text-[#FB8B03]" /> : <ChevronDown size={14} />}
          </button>

          {/* Botão Acompanhar no Kanban */}
          <button
            type="button"
            onClick={handleToggleKanban}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border shadow-2xs cursor-pointer active:scale-95 ${
              etapaKanban
                ? 'bg-[#EAF7EE] text-[#00A67E] border-[#A3E2BE]'
                : 'bg-white hover:bg-slate-50 text-[#01203C] border-slate-200 hover:border-[#00A67E]/40'
            }`}
            title={etapaKanban ? `Acompanhando no Kanban (${ETAPAS_CONFIG[etapaKanban].label})` : 'Adicionar ao Pipeline Kanban'}
          >
            <Columns3 size={13} className={etapaKanban ? 'text-[#00A67E]' : 'text-[#FB8B03]'} />
            <span>{etapaKanban ? ETAPAS_CONFIG[etapaKanban].label : '+ Kanban'}</span>
          </button>

          {/* Botão Secundário do Manual: Ver no PNCP Oficial */}
          <a
            href={pncpWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-[#01203C] border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            title="Abrir no portal oficial do PNCP"
          >
            <span>Ver no PNCP</span>
            <ExternalLink size={12} className="text-slate-400" />
          </a>

          {/* Botão Primário do Manual: Quero Participar em Laranja Oficial */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/edital/${encodeURIComponent(oportunidade.id)}`, { state: { oportunidade } });
            }}
            className="px-4 py-2 bg-[#FB8B03] hover:bg-[#D97602] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer active:scale-95"
          >
            <span>Quero Participar</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CAMPO DE MAIS INFORMAÇÕES (EXPANSÍVEL / ACCORDION)       */}
      {/* ======================================================== */}
      {isExpanded && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="mt-4 pt-4 border-t border-slate-200/90 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Objeto Completo na Íntegra */}
          <div className="bg-[#F7F8FA] p-4 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] font-black text-[#01203C] uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <FileText size={14} className="text-[#FB8B03]" />
              Descrição Completa do Objeto
            </span>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal whitespace-pre-line">
              {oportunidade.objetoOriginal || oportunidade.objetoResumido}
            </p>
          </div>

          {/* Dados Detalhados do Certame */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Órgão & Localização
              </span>
              <p className="font-bold text-[#01203C] text-xs">
                {oportunidade.orgao}
              </p>
              <p className="text-slate-600 flex items-center gap-1 text-[11px]">
                <MapPin size={12} className="text-[#FB8B03]" />
                {oportunidade.municipio.nome} - {oportunidade.municipio.uf}
                {oportunidade.distanciaKm !== undefined && (
                  <span className="text-slate-500 font-semibold">
                    ({oportunidade.distanciaKm <= 0.5 ? 'Sua Cidade' : `${oportunidade.distanciaKm} km de distância`})
                  </span>
                )}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Prazos & Envio de Propostas
              </span>
              <p className="font-bold text-[#01203C] text-xs flex items-center gap-1">
                <Clock size={12} className="text-emerald-600" />
                {statusInfo.textoPrazo}
              </p>
              <p className="text-slate-600 text-[11px]">
                Encerramento: {oportunidade.dataEncerramento ? new Date(oportunidade.dataEncerramento).toLocaleString('pt-BR') : 'Consulte o Edital'}
              </p>
            </div>
          </div>

          {/* Exigências & Habilitação Rápida */}
          <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 flex items-start gap-2.5 text-xs">
            <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-emerald-950 text-xs mb-0.5">
                Exigências de Habilitação & CNDs
              </h4>
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                {oportunidade.exclusivoMpe 
                  ? '🛡️ Licitação com participação exclusiva para MEI, Microempresa e EPP (Lei Complementar 123/2006).' 
                  : 'Participação ampla aberta para todas as empresas credenciadas.'}
                {' '}Exige regularidade fiscal com CND Federal/Previdenciária, FGTS e CND Trabalhista (CNDT).
              </p>
            </div>
          </div>

          {/* Itens do Edital (se disponíveis) */}
          {oportunidade.itens && oportunidade.itens.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="bg-slate-100 px-3.5 py-2.5 text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Package size={13} className="text-[#01203C]" />
                  Itens Solicitados no Termo de Referência ({oportunidade.itens.length})
                </span>
                <span className="text-slate-500 font-normal">Valores Unitários Máximos</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {oportunidade.itens.slice(0, 10).map((it, idx) => (
                  <div key={idx} className="p-2.5 text-xs flex items-center justify-between hover:bg-slate-50 gap-2">
                    <span className="text-slate-700 font-medium truncate flex-1" title={it.descricao}>
                      {idx + 1}. {it.descricao}
                    </span>
                    <span className="font-mono text-slate-500 shrink-0 text-[11px]">
                      {it.quantidade} {it.unidade}
                    </span>
                    <span className="font-bold text-[#01203C] shrink-0 text-xs">
                      {formatter.format(it.valorUnitarioMax)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Barra de Ações Rápidas do Campo Expandido */}
          <div className="flex items-center justify-between gap-2.5 flex-wrap pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/edital/${encodeURIComponent(oportunidade.id)}`, { state: { oportunidade } });
              }}
              className="flex-1 min-w-[220px] py-2.5 px-4 bg-[#01203C] hover:bg-[#032F52] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Sparkles size={14} className="text-[#FB8B03]" />
              <span>Ver Análise Completa, Resumo IA & Calculadora</span>
              <ChevronRight size={14} />
            </button>

            {pncpWebUrl && (
              <a
                href={pncpWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="py-2.5 px-4 bg-white hover:bg-slate-50 text-[#01203C] border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              >
                <span>Baixar no {oportunidade.portalNomeCurto || 'Portal Oficial'}</span>
                <ExternalLink size={13} className="text-slate-400" />
              </a>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="py-2.5 px-3 text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ChevronUp size={14} />
              <span>Recolher</span>
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
