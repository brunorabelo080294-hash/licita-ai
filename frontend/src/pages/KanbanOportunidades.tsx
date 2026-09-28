import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Columns3, Sparkles, Plus, RefreshCw, ChevronRight, ChevronDown, ChevronUp,
  MapPin, Calendar, Building2, ExternalLink, Trash2, CheckCircle2, 
  FileText, ShieldCheck, AlertCircle, ArrowRight, Eye, MoveRight,
  BookOpen, HelpCircle, X, Search, CheckSquare, Square, Flame, Trophy, Award, Sliders,
  GripVertical, Maximize2, Clock
} from 'lucide-react';
import { getEmpresaAtiva, getListaEmpresas, Empresa } from '../utils/empresaStorage';
import { 
  getItensKanban, salvarItensKanban, moverEtapaKanban, 
  atualizarObservacaoKanban, removerDoKanban, adicionarAoKanban,
  inicializarKanbanComSementes, ETAPAS_CONFIG 
} from '../utils/kanbanStorage';
import { getListaCNDs } from '../utils/cndStorage';
import { ItemKanban, KanbanEtapa, Oportunidade, StatusCND } from '../types';
import { BrasaoPrefeitura } from '../components/shared/BrasaoPrefeitura';
import { calcularStatusPrazo, formatarUrlPncpWeb, resolverUrlOrigem } from '../utils/pncpUrls';
import { ModalGerenciarEmpresas } from '../components/shared/ModalGerenciarEmpresas';
import axios from 'axios';

// Configuração visual das 6 colunas do Kanban (reproduzindo exatamente o padrão do Liciconsulta)
const COLUNAS_KANBAN: { id: KanbanEtapa; titulo: string; corHeader: string; bordaCard: string }[] = [
  { id: 'encontrada', titulo: 'ENCONTRADA', corHeader: 'bg-[#00A67E]', bordaCard: 'hover:border-[#00A67E]/40' },
  { id: 'em_analise', titulo: 'EM ANÁLISE', corHeader: 'bg-[#3C4A57]', bordaCard: 'hover:border-[#3C4A57]/40' },
  { id: 'proposta', titulo: 'PROPOSTA', corHeader: 'bg-[#0099D8]', bordaCard: 'hover:border-[#0099D8]/40' },
  { id: 'disputa', titulo: 'DISPUTA', corHeader: 'bg-[#3B4B5B]', bordaCard: 'hover:border-[#3B4B5B]/40' },
  { id: 'ganha', titulo: 'GANHA', corHeader: 'bg-[#00875A]', bordaCard: 'hover:border-[#00875A]/40' },
  { id: 'perdida', titulo: 'PERDIDA', corHeader: 'bg-[#64748B]', bordaCard: 'hover:border-[#64748B]/40' },
];

export function KanbanOportunidades() {
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<Empresa>(getEmpresaAtiva());
  const [listaEmpresas, setListaEmpresas] = useState<Empresa[]>(getListaEmpresas());
  const [itens, setItens] = useState<ItemKanban[]>([]);
  const [showEmpresasModal, setShowEmpresasModal] = useState(false);
  const [showModoOperante, setShowModoOperante] = useState(false);
  const [etapaModoOperante, setEtapaModoOperante] = useState<KanbanEtapa>('encontrada');
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanEtapa | null>(null);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [selectedAnaliseOp, setSelectedAnaliseOp] = useState<Oportunidade | null>(null);
  const [cndsEmpresa, setCndsEmpresa] = useState<StatusCND[]>(getListaCNDs());

  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  // Carrega e sincroniza itens do Kanban da empresa ativa
  const carregarItens = () => {
    const ativa = getEmpresaAtiva();
    setEmpresa(ativa);
    const dados = getItensKanban(ativa.cnpj);
    setItens(dados);
    setCndsEmpresa(getListaCNDs());
  };

  useEffect(() => {
    carregarItens();

    // Busca certames do backend para sementes caso a empresa esteja vazia
    const carregarSementes = async () => {
      try {
        const resp = await axios.get('/api/oportunidades/', {
          params: { raio_km: 500, apenas_abertas: true }
        });
        if (resp.data && Array.isArray(resp.data)) {
          const ativa = getEmpresaAtiva();
          inicializarKanbanComSementes(ativa.cnpj, resp.data);
          setItens(getItensKanban(ativa.cnpj));
        }
      } catch (err) {
        console.warn('Backend offline para sementes Kanban:', err);
      }
    };

    carregarSementes();

    const handleKanbanAlterado = (e: any) => {
      const ativa = getEmpresaAtiva();
      if (!e.detail?.cnpj || e.detail.cnpj === ativa.cnpj) {
        setItens(getItensKanban(ativa.cnpj));
      }
    };

    const handleEmpresaAlterada = (e: any) => {
      const nova = e.detail || getEmpresaAtiva();
      setEmpresa(nova);
      setListaEmpresas(getListaEmpresas());
      setItens(getItensKanban(nova.cnpj));
    };

    window.addEventListener('kanban_alterado', handleKanbanAlterado);
    window.addEventListener('empresa_alterada', handleEmpresaAlterada);

    return () => {
      window.removeEventListener('kanban_alterado', handleKanbanAlterado);
      window.removeEventListener('empresa_alterada', handleEmpresaAlterada);
    };
  }, []);

  // Mover item entre etapas
  const handleMoverEtapa = (id: string, novaEtapa: KanbanEtapa) => {
    moverEtapaKanban(id, novaEtapa, empresa.cnpj);
    setItens(getItensKanban(empresa.cnpj));
  };

  // Atualizar nota/observação
  const handleAtualizarObs = (id: string, obs: string) => {
    atualizarObservacaoKanban(id, obs, empresa.cnpj);
    setItens(prev => prev.map(it => it.id === id ? { ...it, observacao: obs } : it));
  };

  // Excluir item
  const handleRemover = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Deseja remover esta licitação do seu quadro Kanban?')) {
      removerDoKanban(id, empresa.cnpj);
      setItens(getItensKanban(empresa.cnpj));
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, a, textarea, [data-no-drag]')) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', id);
    setDraggedItemId(id);
  };

  const handleDragOver = (e: React.DragEvent, etapa: KanbanEtapa) => {
    e.preventDefault();
    setDragOverColumn(etapa);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, novaEtapa: KanbanEtapa) => {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData('text/plain') || draggedItemId;
    if (id) {
      handleMoverEtapa(id, novaEtapa);
    }
    setDraggedItemId(null);
  };

  // Filtragem de itens por busca textual
  const itensFiltrados = useMemo(() => {
    if (!filtroTexto.trim()) return itens;
    const q = filtroTexto.toLowerCase().trim();
    return itens.filter(it => {
      const op = it.oportunidade;
      const obj = (op.objetoOriginal || op.objetoResumido || '').toLowerCase();
      const mun = (op.municipio?.nome || '').toLowerCase();
      const org = (op.orgao || '').toLowerCase();
      const ed = (op.numeroEdital || '').toLowerCase();
      const obs = (it.observacao || '').toLowerCase();
      return obj.includes(q) || mun.includes(q) || org.includes(q) || ed.includes(q) || obs.includes(q);
    });
  }, [itens, filtroTexto]);

  // Contadores por coluna
  const contadores = useMemo(() => {
    const mapa: Record<KanbanEtapa, number> = {
      encontrada: 0,
      em_analise: 0,
      proposta: 0,
      disputa: 0,
      ganha: 0,
      perdida: 0
    };
    itens.forEach(it => {
      if (mapa[it.etapa] !== undefined) {
        mapa[it.etapa]++;
      }
    });
    return mapa;
  }, [itens]);

  // Valor total em disputa / pipeline
  const valorTotalPipeline = useMemo(() => {
    return itens.reduce((acc, it) => acc + (it.oportunidade.valorMaximo || 0), 0);
  }, [itens]);

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col font-sans">
      {/* ======================================================== */}
      {/* BARRA SUPERIOR DO KANBAN (Conforme Mockup Liciconsulta)   */}
      {/* ======================================================== */}
      <header className="bg-white border-b border-slate-200/90 px-4 sm:px-6 py-3 sticky top-0 z-20 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Título & Identificação */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#00A67E] text-white flex items-center justify-center font-bold shadow-xs">
              <Columns3 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-black text-[#01203C] tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  Quadro de Oportunidades
                </h1>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {itens.length} {itens.length === 1 ? 'licitação acompanhada' : 'licitações acompanhadas'}
                </span>
                <span className="text-xs font-extrabold text-[#00875A] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
                  Pipeline: {formatter.format(valorTotalPipeline)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Arraste os certames por etapa do funil — Um quadro isolado para cada empresa que você atende.
              </p>
            </div>
          </div>

          {/* Controles da Direita */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Alternador de Empresa Ativa */}
            <button
              type="button"
              onClick={() => setShowEmpresasModal(true)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-[#01203C] transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Alternar empresa e carregar o quadro Kanban correspondente"
            >
              <Building2 size={14} className="text-[#FB8B03]" />
              <span className="truncate max-w-[140px] sm:max-w-[180px]">
                {empresa.nomeFantasia || empresa.razaoSocial}
              </span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>

            {/* Botão Modo Operante (Destaque Principal) */}
            <button
              type="button"
              onClick={() => setShowModoOperante(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#01203C] hover:bg-[#032F52] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
              title="Abrir o Guia Tático e Checklist do Modo Operante"
            >
              <BookOpen size={14} className="text-[#FB8B03]" />
              <span>Modo Operante (Guia Tático)</span>
            </button>

            {/* Botão Sincronizar */}
            <button
              type="button"
              onClick={carregarItens}
              className="p-2 text-slate-600 hover:text-[#01203C] hover:bg-slate-100 rounded-xl border border-slate-200 transition-all cursor-pointer"
              title="Atualizar quadro"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Barra de Filtro Rápido */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar no quadro por objeto, prefeitura, edital ou anotação..."
              value={filtroTexto}
              onChange={e => setFiltroTexto(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#01203C] placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#01203C] transition-all"
            />
            {filtroTexto && (
              <button
                onClick={() => setFiltroTexto('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto pb-1 max-w-full">
            <span className="font-bold text-slate-400 uppercase text-[10px] mr-1">Ir para:</span>
            {COLUNAS_KANBAN.map(c => (
              <button 
                key={c.id} 
                type="button"
                onClick={() => {
                  const el = document.getElementById(`coluna-${c.id}`);
                  el?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
                }}
                className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 whitespace-nowrap shadow-2xs cursor-pointer select-none touch-manipulation active:scale-95 transition-all"
                title={`Navegar até a coluna ${c.titulo}`}
              >
                <span className={`w-2 h-2 rounded-full ${c.corHeader}`}></span>
                <span>{c.titulo}:</span>
                <strong className="text-[#01203C]">{contadores[c.id]}</strong>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* QUADRO KANBAN: 6 COLUNAS LADO A LADO                    */}
      {/* ======================================================== */}
      <main className="flex-1 p-4 sm:p-6 overflow-x-auto pb-20">
        <div className="flex items-start gap-4 min-w-[1600px] h-full">
          {COLUNAS_KANBAN.map(coluna => {
            const itensDaColuna = itensFiltrados.filter(it => it.etapa === coluna.id);
            const isDropTarget = dragOverColumn === coluna.id;

            return (
              <div 
                key={coluna.id}
                id={`coluna-${coluna.id}`}
                onDragOver={(e) => handleDragOver(e, coluna.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, coluna.id)}
                className={`w-72 sm:w-80 shrink-0 flex flex-col rounded-2xl bg-[#EEF2F6]/60 border transition-all duration-200 min-h-[620px] max-h-[calc(100vh-180px)] ${
                  isDropTarget 
                    ? 'border-[#00A67E] bg-[#EAF7EE]/50 ring-2 ring-[#00A67E]/30' 
                    : 'border-slate-200/80 shadow-2xs'
                }`}
              >
                {/* Header da Coluna */}
                <div className={`${coluna.corHeader} text-white px-4 py-3 rounded-t-2xl flex items-center justify-between shadow-xs select-none`}>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-black text-xs uppercase tracking-wider">
                      {coluna.titulo}
                    </h3>
                    <span className="bg-white/25 text-white text-[11px] font-black px-2 py-0.5 rounded-full">
                      {itensDaColuna.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEtapaModoOperante(coluna.id);
                      setShowModoOperante(true);
                    }}
                    className="p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                    title={`Ver Modo Operante para ${coluna.titulo}`}
                  >
                    <BookOpen size={13} />
                  </button>
                </div>

                {/* Lista de Cards da Coluna */}
                <div className="p-2.5 flex-1 overflow-y-auto space-y-3">
                  {itensDaColuna.length === 0 ? (
                    <div className="h-44 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-4 text-center text-slate-400 select-none">
                      <p className="text-xs font-semibold">Nenhuma licitação</p>
                      <p className="text-[11px] text-slate-400 mt-1">Arraste um certame para esta etapa</p>
                    </div>
                  ) : (
                    itensDaColuna.map(item => {
                      const op = item.oportunidade;
                      const statusInfo = calcularStatusPrazo(op.dataEncerramento, op.dataAbertura);
                      const portalOrigem = resolverUrlOrigem(op);
                      const isDisputa = coluna.id === 'disputa';
                      const isExpanded = expandedCardId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all relative group ${coluna.bordaCard} ${
                            isExpanded ? 'ring-2 ring-[#01203C]/10 border-[#01203C]/30' : ''
                          }`}
                        >
                          {/* Topo do Card: Alça de Arraste, Órgão & Brasão */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center space-x-2 min-w-0">
                              {/* Alça de Arraste (Grip) dedicada — apenas ela inicia o drag nativo, liberando 100% dos cliques no card */}
                              <div
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/plain', item.id);
                                  setDraggedItemId(item.id);
                                }}
                                className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-md shrink-0 transition-colors select-none"
                                title="Segure e arraste para mover este card entre as colunas do funil"
                              >
                                <GripVertical size={14} />
                              </div>

                              <BrasaoPrefeitura municipio={op.municipio} size="sm" />
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-slate-700 truncate leading-tight" title={op.orgao}>
                                  {op.orgao}
                                </p>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                  <MapPin size={9} />
                                  <span>{op.municipio?.nome}/{op.municipio?.uf}</span>
                                </div>
                              </div>
                            </div>

                            {/* Badge da Modalidade */}
                            <span className="shrink-0 text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {op.modalidade}
                            </span>
                          </div>

                          {/* Objeto do Certame - Clicável para abrir mais informações */}
                          <h4 
                            onClick={() => setExpandedCardId(prev => prev === item.id ? null : item.id)}
                            className="text-xs font-bold text-[#01203C] hover:text-[#FB8B03] transition-colors line-clamp-2 leading-snug cursor-pointer mb-2"
                            title="Clique para ver mais informações deste certame"
                            style={{ fontFamily: "'Montserrat', sans-serif" }}
                          >
                            {op.objetoResumido || op.objetoOriginal}
                          </h4>

                          {/* Valor Estimado & Datas */}
                          <div 
                            onClick={() => setExpandedCardId(prev => prev === item.id ? null : item.id)}
                            className="bg-slate-50 hover:bg-slate-100/70 cursor-pointer p-2 rounded-xl border border-slate-100 mb-2 flex items-center justify-between text-xs transition-colors"
                            title="Clique para expandir informações"
                          >
                            <div>
                              <span className="text-[9px] text-slate-400 block font-bold uppercase">Valor Teto</span>
                              <span className="font-black text-[#01203C]">
                                {formatter.format(op.valorMaximo)}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 block font-bold uppercase">Encerramento</span>
                              <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border ${statusInfo.badgeColor}`}>
                                {statusInfo.badgeLabel}
                              </span>
                            </div>
                          </div>

                          {/* Badge do Portal de Origem (11 Portais Integrados) */}
                          <div className="mb-2.5 flex items-center justify-between gap-1">
                            <span 
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border truncate"
                              style={{ 
                                backgroundColor: op.portalBgCor || '#F1F5F9',
                                color: op.portalCor || '#01203C',
                                borderColor: op.portalBordaCor || '#CBD5E1'
                              }}
                              title={`Hospedado em: ${op.portalNome || portalOrigem.nome}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: op.portalCor || '#01203C' }}></span>
                              <span className="truncate">{op.portalNomeCurto || op.portalNome || portalOrigem.nome}</span>
                            </span>

                            {op.distanciaKm !== undefined && (
                              <span className="text-[10px] font-semibold text-slate-500">
                                {op.distanciaKm <= 0.5 ? 'Sua Cidade' : `${op.distanciaKm} km`}
                              </span>
                            )}
                          </div>

                          {/* Campo de Anotação Rápida */}
                          <div className="mb-2.5">
                            <input
                              type="text"
                              placeholder="Adicionar observação..."
                              defaultValue={item.observacao || ''}
                              onBlur={(e) => handleAtualizarObs(item.id, e.target.value)}
                              className="w-full px-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#00A67E] focus:ring-1 focus:ring-[#00A67E]/30 transition-all"
                            />
                          </div>

                          {/* ======================================================== */}
                          {/* CAMPO DE MAIS INFORMAÇÕES (EXPANSÍVEL NO CARD)           */}
                          {/* ======================================================== */}
                          {isExpanded && (
                            <div className="mb-3 pt-2.5 border-t border-slate-200/80 space-y-2.5 animate-in fade-in duration-150">
                              <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-slate-200/70 text-xs">
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1 flex items-center gap-1">
                                  <FileText size={12} className="text-[#FB8B03]" />
                                  Objeto Completo
                                </span>
                                <p className="text-[11px] text-slate-700 leading-relaxed font-normal whitespace-pre-line max-h-40 overflow-y-auto">
                                  {op.objetoOriginal || op.objetoResumido}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  <span className="text-slate-400 font-bold uppercase block">Portal</span>
                                  <span className="font-bold text-[#01203C] truncate block">
                                    {op.portalNomeCurto || op.portalNome || portalOrigem.nome}
                                  </span>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                  <span className="text-slate-400 font-bold uppercase block">Prazo</span>
                                  <span className="font-bold text-[#01203C] truncate block">
                                    {statusInfo.textoPrazo}
                                  </span>
                                </div>
                              </div>

                              {portalOrigem.url && (
                                <a
                                  href={portalOrigem.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all"
                                >
                                  <ExternalLink size={11} />
                                  <span>Abrir Edital no Portal Oficial</span>
                                </a>
                              )}
                            </div>
                          )}

                          {/* Ações no Rodapé do Card */}
                          <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
                            {/* Botão Principal: Ver Análise (Abre Modal de Análise Instantâneo) */}
                            <button
                              type="button"
                              onClick={() => setSelectedAnaliseOp(op)}
                              className="flex-1 py-1.5 px-2 bg-[#00A67E] hover:bg-[#008F6B] text-white text-[11px] font-black rounded-lg transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                              title="Abrir Análise Inteligente e Detalhes Deste Edital"
                            >
                              <Sparkles size={11} />
                              <span>VER ANÁLISE</span>
                            </button>

                            {/* Botão de Expandir / Recolher Informações */}
                            <button
                              type="button"
                              onClick={() => setExpandedCardId(prev => prev === item.id ? null : item.id)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                              title={isExpanded ? 'Recolher informações' : 'Expandir mais informações'}
                            >
                              {isExpanded ? <ChevronUp size={13} className="text-[#FB8B03]" /> : <ChevronDown size={13} />}
                            </button>

                            {/* Se estiver em Disputa, Botão de Sala de Lances do Portal */}
                            {isDisputa && (
                              <a
                                href={portalOrigem.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 bg-[#FB8B03] hover:bg-[#D97602] text-white rounded-lg transition-all shadow-2xs"
                                title={`Abrir Sala de Disputa em ${portalOrigem.nome}`}
                              >
                                <ExternalLink size={13} />
                              </a>
                            )}

                            {/* Seletor Rápido de Transferência de Etapa */}
                            <div className="relative">
                              <select
                                value={item.etapa}
                                onChange={(e) => handleMoverEtapa(item.id, e.target.value as KanbanEtapa)}
                                className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                                title="Mover para outra etapa"
                              >
                                {COLUNAS_KANBAN.map(c => (
                                  <option key={c.id} value={c.id}>{c.titulo}</option>
                                ))}
                              </select>
                            </div>

                            {/* Excluir do Kanban */}
                            <button
                              type="button"
                              onClick={(e) => handleRemover(item.id, e)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Remover deste quadro"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ======================================================== */}
      {/* MODAL / DRAWER: MODO OPERANTE (GUIA TÁTICO OPERACIONAL)  */}
      {/* ======================================================== */}
      {showModoOperante && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Topo do Modal */}
            <div className="bg-[#01203C] text-white p-5 flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FB8B03] text-white flex items-center justify-center font-bold shadow-xs">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    Modo Operante: Guia Tático do Funil
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Procedimentos operacionais e checklist normativo (Lei 14.133/21 & LC 123/06) para cada etapa.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModoOperante(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Seletor de Etapas do Modo Operante */}
            <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 overflow-x-auto">
              {COLUNAS_KANBAN.map(c => (
                <button
                  key={c.id}
                  onClick={() => setEtapaModoOperante(c.id)}
                  className={`py-3 px-3.5 text-xs font-extrabold uppercase whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                    etapaModoOperante === c.id
                      ? 'border-[#FB8B03] text-[#01203C] bg-white'
                      : 'border-transparent text-slate-500 hover:text-[#01203C]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${c.corHeader}`}></span>
                    {c.titulo}
                  </span>
                </button>
              ))}
            </div>

            {/* Conteúdo Tático Específico da Etapa Selecionada */}
            <div className="p-6 overflow-y-auto space-y-5 text-slate-700 text-xs sm:text-sm flex-1 leading-relaxed">
              {etapaModoOperante === 'encontrada' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                    <h4 className="font-extrabold text-emerald-900 text-sm mb-1">
                      Etapa 1: ENCONTRADA — Triagem & Georreferenciamento
                    </h4>
                    <p className="text-emerald-800 text-xs">
                      Aqui entram todas as licitações dos 11 portais captadas no raio logístico configurado da sua empresa. O objetivo é filtrar antes de investir tempo em cálculos aprofundados.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-[#01203C] uppercase text-xs tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckSquare size={15} className="text-[#00A67E]" />
                      Checklist Operacional Obrigatório:
                    </h5>
                    <ul className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00A67E] mt-1.5 shrink-0"></span>
                        <span><strong>Compatibilidade de Objeto:</strong> O edital exige fornecimento de produtos ou serviços que a sua empresa de fato executa e possui CNAE registrado no cartão CNPJ.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00A67E] mt-1.5 shrink-0"></span>
                        <span><strong>Raio Logístico de Entrega:</strong> Distância entre o seu depósito e o local de entrega é economicamente viável (frete não consome a margem).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00A67E] mt-1.5 shrink-0"></span>
                        <span><strong>Exclusividade ME/EPP:</strong> Verificar se o certame é exclusivo para micro e pequenas empresas (teto de até R$ 80.000,00 da LC 123/06).</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {etapaModoOperante === 'em_analise' && (
                <div className="space-y-4">
                  <div className="bg-slate-100 border border-slate-300 p-4 rounded-2xl">
                    <h4 className="font-extrabold text-[#01203C] text-sm mb-1">
                      Etapa 2: EM ANÁLISE — Viabilidade Técnica & Ancoragem CATMAT
                    </h4>
                    <p className="text-slate-600 text-xs">
                      Nesta fase você abre a Calculadora de Viabilidade com Inteligência Governamental CATMAT para definir sua margem de lucro e checa se seus documentos no Cofre atendem 100% do edital.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-[#01203C] uppercase text-xs tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckSquare size={15} className="text-[#3C4A57]" />
                      Checklist Operacional Obrigatório:
                    </h5>
                    <ul className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3C4A57] mt-1.5 shrink-0"></span>
                        <span><strong>Pesquisa de Preços CATMAT:</strong> Consultar os valores praticados pelo governo (Mínimo, Médio e Máximo) e os fornecedores vencedores anteriores para calibrar o custo de compra.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3C4A57] mt-1.5 shrink-0"></span>
                        <span><strong>Cofre de CNDs e Regularidade:</strong> Conferir no Cofre se as CNDs (Federal, Estadual, Municipal, FGTS e Trabalhista) estão com sinal verde e mais de 15 dias de validade.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3C4A57] mt-1.5 shrink-0"></span>
                        <span><strong>Atestados de Capacidade Técnica:</strong> Checar se o edital exige comprovação de execução anterior de quantidade similar (até 50% conforme Lei 14.133).</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {etapaModoOperante === 'proposta' && (
                <div className="space-y-4">
                  <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl">
                    <h4 className="font-extrabold text-sky-900 text-sm mb-1">
                      Etapa 3: PROPOSTA — Elaboração & Envio no Portal Licitante
                    </h4>
                    <p className="text-sky-800 text-xs">
                      Elaboração da proposta comercial formal e cadastramento da proposta inicial no sistema de compras públicas do certame (Compras.gov.br, Portal de Compras Públicas, BLL, BNC, etc.).
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-[#01203C] uppercase text-xs tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckSquare size={15} className="text-[#0099D8]" />
                      Checklist Operacional Obrigatório:
                    </h5>
                    <ul className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0099D8] mt-1.5 shrink-0"></span>
                        <span><strong>Emissão da Proposta Automática:</strong> Gerar o documento de proposta com timbre da empresa, descrição detalhada dos itens e validade mínima (geralmente 60 dias).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0099D8] mt-1.5 shrink-0"></span>
                        <span><strong>Declarações Obrigatórias:</strong> Anexar declaração de enquadramento ME/EPP, inexistência de fatos impeditivos e cumprimento das normas trabalhistas.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0099D8] mt-1.5 shrink-0"></span>
                        <span><strong>Cadastramento com Antecedência:</strong> Inserir a proposta no portal licitante pelo menos 2 horas antes do fechamento do prazo.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {etapaModoOperante === 'disputa' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                    <h4 className="font-extrabold text-amber-950 text-sm mb-1 flex items-center gap-1.5">
                      <Flame size={16} className="text-[#FB8B03]" />
                      Etapa 4: DISPUTA — Sala de Lances ao Vivo & Estratégia
                    </h4>
                    <p className="text-amber-900 text-xs">
                      A sessão pública do pregão ou dispensa está aberta! Esteja logado na sala de disputa do portal específico e opere de acordo com o limite de lance calculado na IA.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-[#01203C] uppercase text-xs tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckSquare size={15} className="text-[#FB8B03]" />
                      Checklist Operacional Obrigatório:
                    </h5>
                    <ul className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FB8B03] mt-1.5 shrink-0"></span>
                        <span><strong>Login 15 minutos antes:</strong> Acessar a sala de disputa do portal oficial (Compras.gov, BLL, Banrisul, etc.) antes do horário agendado.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FB8B03] mt-1.5 shrink-0"></span>
                        <span><strong>Respeito ao Lance Piso:</strong> Jamais cobrir lances abaixo do seu lance agressivo definido na Calculadora CATMAT para não ter prejuízo de operação.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FB8B03] mt-1.5 shrink-0"></span>
                        <span><strong>Direito de Preferência LC 123:</strong> Se o primeiro colocado for média/grande empresa e sua proposta estiver até 5% (pregão) ou 10% (outras modalidades), o pregoeiro convocará você para cobrir a melhor oferta!</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {etapaModoOperante === 'ganha' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl">
                    <h4 className="font-extrabold text-emerald-950 text-sm mb-1 flex items-center gap-1.5">
                      <Trophy size={16} className="text-[#00875A]" />
                      Etapa 5: GANHA — Adjudicação, Contrato & Nota de Empenho
                    </h4>
                    <p className="text-emerald-900 text-xs">
                      Parabéns pela arrematação! Agora é a etapa jurídica de homologação e garantia de faturamento seguro com os órgãos públicos.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-[#01203C] uppercase text-xs tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckSquare size={15} className="text-[#00875A]" />
                      Checklist Operacional Obrigatório:
                    </h5>
                    <ul className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00875A] mt-1.5 shrink-0"></span>
                        <span><strong>Envio da Proposta Readequada:</strong> Remeter ao pregoeiro a planilha de preços ajustada ao valor final arrematado dentro do prazo concedido (geralmente 2 horas).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00875A] mt-1.5 shrink-0"></span>
                        <span><strong>Assinatura da Ata de Registro de Preços ou Contrato:</strong> Assinar eletronicamente via GOV.BR ou sistema indicado no edital.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00875A] mt-1.5 shrink-0"></span>
                        <span><strong>Exigência da Nota de Empenho:</strong> NUNCA despachar mercadoria ou iniciar serviço sem a via física ou eletrônica da Nota de Empenho emitida pela contabilidade pública.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {etapaModoOperante === 'perdida' && (
                <div className="space-y-4">
                  <div className="bg-slate-100 border border-slate-300 p-4 rounded-2xl">
                    <h4 className="font-extrabold text-slate-900 text-sm mb-1">
                      Etapa 6: PERDIDA — Análise Pós-Sessão & Recurso Administrativo
                    </h4>
                    <p className="text-slate-600 text-xs">
                      Nem todo certame é vencido no preço: muitos vencedores são desclassificados por falta de CND ou atestado irregular. Esta etapa serve para auditar o vencedor e interpor recurso fundamentado.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-[#01203C] uppercase text-xs tracking-wider mb-2 flex items-center gap-1.5">
                      <CheckSquare size={15} className="text-slate-500" />
                      Checklist Operacional Obrigatório:
                    </h5>
                    <ul className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0"></span>
                        <span><strong>Download da Ata da Sessão Pública:</strong> Verificar a proposta do concorrente arrematante e os documentos de habilitação dele.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0"></span>
                        <span><strong>Intenção de Recurso:</strong> Se o concorrente descumpriu qualquer especificação do edital, registre a intenção motivada de recurso imediatamente no sistema.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0"></span>
                        <span><strong>Alimentação da Inteligência de Preços:</strong> Registrar o preço final vencedor no histórico para calibrar as próximas licitações no mesmo município.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Licita Aí • Guia Tático Oficial de Sucesso em Licitações
              </span>
              <button
                type="button"
                onClick={() => setShowModoOperante(false)}
                className="px-5 py-2 bg-[#01203C] hover:bg-[#032F52] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Entendido, Fechar Guia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DE ANÁLISE DA LICITAÇÃO (INSTANTÂNEO NO KANBAN)     */}
      {/* ======================================================== */}
      {selectedAnaliseOp && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
          onClick={() => setSelectedAnaliseOp(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Topo do Modal */}
            <div className="bg-[#01203C] text-white p-5 flex items-start justify-between relative">
              <div className="flex items-center space-x-3 min-w-0 pr-8">
                <BrasaoPrefeitura municipio={selectedAnaliseOp.municipio} size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-white/20 text-white border border-white/20">
                      {selectedAnaliseOp.modalidade}
                    </span>
                    <span 
                      className="text-[10px] font-bold px-2 py-0.5 rounded border"
                      style={{
                        backgroundColor: selectedAnaliseOp.portalBgCor || 'rgba(255,255,255,0.15)',
                        color: selectedAnaliseOp.portalCor || '#ffffff',
                        borderColor: selectedAnaliseOp.portalBordaCor || 'rgba(255,255,255,0.3)'
                      }}
                    >
                      {selectedAnaliseOp.portalNomeCurto || selectedAnaliseOp.portalNome || 'Portal Oficial'}
                    </span>
                    {selectedAnaliseOp.distanciaKm !== undefined && (
                      <span className="text-[10px] font-semibold text-slate-300">
                        {selectedAnaliseOp.distanciaKm <= 0.5 ? 'Sua Cidade' : `${selectedAnaliseOp.distanciaKm} km de distância`}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-black text-white truncate leading-snug" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {selectedAnaliseOp.numeroEdital || selectedAnaliseOp.orgao}
                  </h3>
                  <p className="text-xs text-slate-300 truncate">
                    {selectedAnaliseOp.orgao} • {selectedAnaliseOp.municipio?.nome}/{selectedAnaliseOp.municipio?.uf}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAnaliseOp(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer absolute top-4 right-4"
                title="Fechar análise"
              >
                <X size={18} />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* Barra de Valores & Prazo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#F0FDF4] p-3.5 rounded-2xl border border-[#BBF7D0]">
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block mb-0.5">
                    Valor Teto Estimado
                  </span>
                  <span className="text-2xl font-black text-[#01203C]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                    {formatter.format(selectedAnaliseOp.valorMaximo)}
                  </span>
                  <span className="block text-[11px] font-medium text-emerald-700 mt-0.5">
                    {selectedAnaliseOp.exclusivoMpe ? '🛡️ Exclusivo MPE/MEI (LC 123/06)' : 'Ampla Concorrência'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">
                    Status do Prazo
                  </span>
                  {(() => {
                    const st = calcularStatusPrazo(selectedAnaliseOp.dataEncerramento, selectedAnaliseOp.dataAbertura);
                    return (
                      <div>
                        <span className={`inline-block text-xs font-extrabold px-2 py-0.5 rounded border mb-1 ${st.badgeColor}`}>
                          {st.badgeLabel}
                        </span>
                        <p className="text-xs text-slate-700 font-semibold">{st.textoPrazo}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Descrição Completa do Objeto */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <h4 className="text-xs font-extrabold text-[#01203C] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={15} className="text-[#FB8B03]" />
                  Descrição do Objeto & Termo de Referência
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100 max-h-56 overflow-y-auto">
                  {selectedAnaliseOp.objetoOriginal || selectedAnaliseOp.objetoResumido}
                </p>
              </div>

              {/* Checklist de Documentos no Cofre Digital */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <h4 className="text-xs font-extrabold text-[#01203C] uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-[#00A67E]" />
                    Saúde Fiscal da Empresa ({empresa.nomeFantasia || empresa.razaoSocial})
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    Cofre Digital
                  </span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {cndsEmpresa.slice(0, 4).map(cnd => (
                    <div key={cnd.id || cnd.tipo} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2 truncate">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          cnd.status === 'valido' ? 'bg-[#00A67E]' : cnd.status === 'vencendo' ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                        <span className="font-semibold text-slate-700 truncate text-[11px]">{cnd.nome}</span>
                      </div>
                      <span className={`text-[10px] font-bold shrink-0 ml-1 ${
                        cnd.status === 'valido' ? 'text-[#00A67E]' : cnd.status === 'vencendo' ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {cnd.status === 'valido' ? 'Regular' : cnd.status === 'vencendo' ? `Vence em ${cnd.diasRestantes}d` : 'Vencida'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rodapé com Ações */}
            <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedAnaliseOp(null)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Fechar
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                {/* Botão Acessar Portal Oficial */}
                {(() => {
                  const portUrl = resolverUrlOrigem(selectedAnaliseOp);
                  return (
                    <a
                      href={portUrl.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-[#01203C] rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Acessar no Portal ({selectedAnaliseOp.portalNomeCurto || selectedAnaliseOp.portalNome || portUrl.nome})</span>
                      <ExternalLink size={13} className="text-slate-400" />
                    </a>
                  );
                })()}

                {/* Botão Abrir Estudo Completo & Proposta (Tela Cheia) */}
                <button
                  type="button"
                  onClick={() => {
                    const idParaNav = selectedAnaliseOp.id;
                    const opObj = selectedAnaliseOp;
                    setSelectedAnaliseOp(null);
                    navigate(`/edital/${encodeURIComponent(idParaNav)}`, { state: { oportunidade: opObj } });
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-[#01203C] hover:bg-[#032F52] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Maximize2 size={13} />
                  <span>Estudo Completo & Proposta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Troca de Empresa */}
      <ModalGerenciarEmpresas isOpen={showEmpresasModal} onClose={() => setShowEmpresasModal(false)} />
    </div>
  );
}
