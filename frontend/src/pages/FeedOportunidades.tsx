import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockOportunidades } from '../data/mockData';
import { Oportunidade } from '../types';
import axios from 'axios';
import { OportunidadeCard } from '../components/shared/OportunidadeCard';
import { GeofencingSlider } from '../components/shared/GeofencingSlider';
import { getEmpresaAtiva, getRaioBusca, salvarRaioBusca, Empresa, identificarCategoriaCnae } from '../utils/empresaStorage';
import { getListaCNDs } from '../utils/cndStorage';
import { Search, X, SlidersHorizontal, CheckCircle2, AlertCircle, History, CheckCircle, Smartphone, RefreshCw, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { calcularStatusPrazo } from '../utils/pncpUrls';
import { InstalarAppModal } from '../components/shared/InstalarAppModal';
import { ModalGerenciarEmpresas } from '../components/shared/ModalGerenciarEmpresas';

export function FeedOportunidades() {
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<Empresa>(getEmpresaAtiva());
  const [cnds, setCnds] = useState(getListaCNDs());
  const [radius, setRadius] = useState<number>(getRaioBusca());
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showEmpresasModal, setShowEmpresasModal] = useState(false);
  const [showRadiusControls, setShowRadiusControls] = useState(false);
  
  // Oportunidades do feed: inicia vazio e consome diretamente o SQLite (pncp_core.py) via backend
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
  const [carregandoBackend, setCarregandoBackend] = useState<boolean>(true);
  const [conectadoBackend, setConectadoBackend] = useState<boolean>(false);

  // Filtro de status de prazo: PADRÃO É MOSTRAR APENAS ABERTAS E FUTURAS
  const [statusFilter, setStatusFilter] = useState<'abertas_futuras' | 'todas' | 'encerradas'>('abertas_futuras');
  const [categoryFilter, setCategoryFilter] = useState<string>('meu_segmento');
  const [modalityFilter, setModalityFilter] = useState<string>('todas');
  const [portalFilter, setPortalFilter] = useState<string>('todos');
  const [portaisCadastrados, setPortaisCadastrados] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let montado = true;
    const carregarOportunidadesBackend = async () => {
      setCarregandoBackend(true);
      try {
        const params: Record<string, any> = { raio_km: 500, apenas_abertas: true };
        if (empresa?.latitude && empresa?.longitude) {
          params.empresa_lat = empresa.latitude;
          params.empresa_lon = empresa.longitude;
        }
        if (empresa?.uf) {
          params.empresa_uf = empresa.uf;
        }
        const resp = await axios.get('/api/oportunidades/', { params });
        if (montado && resp.data && Array.isArray(resp.data)) {
          setOportunidades(resp.data);
          setConectadoBackend(true);
        }

        // Busca lista e contagem dos 11 portais oficiais integrados
        try {
          const portaisResp = await axios.get('/api/oportunidades/portais');
          if (montado && portaisResp.data && Array.isArray(portaisResp.data)) {
            setPortaisCadastrados(portaisResp.data);
          }
        } catch {
          // ignore
        }
      } catch {
        if (montado) {
          setConectadoBackend(false);
          // Fallback seguro se backend não estiver rodando
          setOportunidades(mockOportunidades);
        }
      } finally {
        if (montado) {
          setCarregandoBackend(false);
        }
      }
    };
    carregarOportunidadesBackend();
    return () => { montado = false; };
  }, [empresa?.cnpj, empresa?.latitude, empresa?.longitude, empresa?.uf]);

  useEffect(() => {
    const ativa = getEmpresaAtiva();
    setEmpresa(ativa);
    if (!ativa.categoriaPrincipal || !ativa.categoriaNome) {
      const info = identificarCategoriaCnae(ativa.cnaePrincipal || '', ativa.cnaeDescricao || '');
      ativa.categoriaPrincipal = info.categoria;
      ativa.categoriaNome = info.nome;
      setEmpresa({ ...ativa });
    }

    // Ouvinte para quando o usuário alternar de CNPJ em qualquer lugar do app
    const handleEmpresaAlterada = (e: any) => {
      const nova = e.detail || getEmpresaAtiva();
      setEmpresa(nova);
      setCategoryFilter('meu_segmento');
    };

    window.addEventListener('empresa_alterada', handleEmpresaAlterada);
    return () => window.removeEventListener('empresa_alterada', handleEmpresaAlterada);
  }, []);

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    salvarRaioBusca(newRadius);
  };

  // Cálculo de distância geodésica precisa (Haversine) - NUNCA retorna 0 se coordenadas inválidas
  function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if (!lat1 || !lon1 || !lat2 || !lon2 || lat1 === 0 || lat2 === 0) return 999999;
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  // Recalcular distância para a empresa ativa SEMPRE via Haversine real
  const oportunidadesComDistancia = useMemo(() => {
    return oportunidades.map(op => {
      let dist = 999999;
      const mLat = op.municipio?.latitude;
      const mLon = op.municipio?.longitude;
      const eLat = empresa.latitude;
      const eLon = empresa.longitude;

      if (eLat && eLon && mLat && mLon && mLat !== 0 && mLon !== 0 && eLat !== 0 && eLon !== 0) {
        dist = calcularDistanciaKm(eLat, eLon, mLat, mLon);
      } else if (op.distanciaKm !== undefined && op.distanciaKm !== null && op.distanciaKm > 0) {
        dist = op.distanciaKm;
      }
      return { ...op, distanciaKm: dist };
    });
  }, [empresa, oportunidades]);

  // Contadores globais de status para os chips de filtro
  const { totalAbertas, totalEncerradas, totalGeral } = useMemo(() => {
    let abertas = 0;
    let encerradas = 0;
    for (const op of oportunidades) {
      const st = calcularStatusPrazo(op.dataEncerramento, op.dataAbertura).status;
      if (st === 'aberta' || st === 'futura') {
        abertas++;
      } else {
        encerradas++;
      }
    }
    return {
      totalAbertas: abertas,
      totalEncerradas: encerradas,
      totalGeral: oportunidades.length,
    };
  }, [oportunidades]);

  // Filtragem combinada: Status de Prazo + Raio + CNAE + Modalidade + Busca Livre
  const filteredOportunidades = useMemo(() => {
    const normalizarCat = (c?: string) => {
      if (!c) return 'geral';
      if (c === 'obras') return 'construcao';
      return c;
    };

    return oportunidadesComDistancia.filter(op => {
      // 1. FILTRO DE STATUS DE PRAZO (Calculado em tempo real com base no calendário oficial)
      const st = calcularStatusPrazo(op.dataEncerramento, op.dataAbertura).status;
      if (statusFilter === 'abertas_futuras') {
        if (st !== 'aberta' && st !== 'futura') return false;
      } else if (statusFilter === 'encerradas') {
        if (st !== 'encerrada') return false;
      }

      // 2. FILTRO DE RAIO DE ENTREGA (GEOLOCALIZAÇÃO)
      // Descarta se a distância for desconhecida (999999) ou maior que o raio selecionado
      if (op.distanciaKm === undefined || op.distanciaKm === null || op.distanciaKm > radius) {
        return false;
      }

      // 3. FILTRO POR CATEGORIA DE CNAE / SEGMENTO
      if (categoryFilter === 'meu_segmento') {
        const catEmpresa = normalizarCat(empresa.categoriaPrincipal);
        if (catEmpresa !== 'geral') {
          const opCat = normalizarCat(op.categoria);
          if (opCat !== catEmpresa) {
            return false;
          }
        }
      } else if (categoryFilter !== 'todas') {
        const catAlvo = normalizarCat(categoryFilter);
        const opCat = normalizarCat(op.categoria);
        if (opCat !== catAlvo) {
          return false;
        }
      }

      // 4. FILTRO DE MODALIDADE
      if (modalityFilter === 'exclusivas') {
        if (!op.exclusivoMpe) return false;
      } else if (modalityFilter !== 'todas' && op.modalidade !== modalityFilter) {
        return false;
      }

      // 5. FILTRO DE BUSCA POR TEXTO
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const objeto = (op.objetoOriginal || op.objetoResumido || '').toLowerCase();
        const cidade = (op.municipio.nome || '').toLowerCase();
        const orgao = (op.orgao || '').toLowerCase();
        const edital = (op.numeroEdital || '').toLowerCase();
        const match = objeto.includes(query) || cidade.includes(query) || orgao.includes(query) || edital.includes(query);
        if (!match) return false;
      }

      // 6. FILTRO POR PORTAIS DE COMPRAS (11 Portais Integrados)
      if (portalFilter !== 'todos') {
        const pSlug = op.portalSlug || '';
        const pNome = (op.portalNome || '').toLowerCase();
        const pOrigem = (op.nomeSistemaOrigem || '').toLowerCase();
        const alvo = portalFilter.toLowerCase();
        if (pSlug !== portalFilter && !pNome.includes(alvo) && !pOrigem.includes(alvo)) {
          return false;
        }
      }

      return true;
    });
  }, [oportunidadesComDistancia, radius, statusFilter, categoryFilter, modalityFilter, portalFilter, searchQuery, empresa]);

  const categoriasChips = [
    { id: 'meu_segmento', label: `⭐ Meu Segmento (${empresa.categoriaNome || 'Principal'})` },
    { id: 'obras', label: '🏗️ Obras & Engenharia' },
    { id: 'alimentos', label: '🍞 Alimentos & Padaria' },
    { id: 'limpeza', label: '🧹 Limpeza & Conservação' },
    { id: 'saude', label: '🏥 Saúde & Medicina' },
    { id: 'veiculos', label: '🚗 Veículos & Frotas' },
    { id: 'ti', label: '💻 Tecnologia & TI' },
    { id: 'todas', label: '🌐 Todos os Segmentos' },
  ];

  const handleScrollToFeed = () => {
    setStatusFilter('abertas_futuras');
    const el = document.getElementById('lista-oportunidades');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-24 md:pb-8">
      {/* ======================================================== */}
      {/* 1. DASHBOARD EXECUTIVO CONFORME MANUAL DE IDENTIDADE     */}
      {/* (Páginas 2 e 3 do PDF: Saudação + Métricas + Ações)      */}
      {/* ======================================================== */}
      <div className="mb-6 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden">
        {/* Faixa decorativa superior discreta em Marinho */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#01203C] via-[#032F52] to-[#FB8B03]"></div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pt-1">
          <div>
            <h1 
              className="text-2xl sm:text-3xl font-black text-[#01203C] tracking-tight"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Bom dia, {empresa.nomeFantasia || empresa.razaoSocial}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-slate-500 text-sm font-medium">
                <strong className="text-[#01203C] font-bold">{totalAbertas} licitações abertas</strong> no seu raio de {radius} km agora.
              </p>
              {conectadoBackend ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  SQLite ativo (pncp_core.py) • {totalGeral} oportunidades
                </span>
              ) : carregandoBackend ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  <RefreshCw size={10} className="animate-spin text-slate-500" />
                  Conectando ao banco SQLite...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  Modo offline local
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setShowEmpresasModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#01203C] bg-[#F7F8FA] hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
              title="Alternar entre CNPJs cadastrados"
            >
              <RefreshCw size={12} className="text-[#FB8B03]" />
              <span>Trocar Empresa</span>
            </button>

            <button
              onClick={() => setShowInstallModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#01203C] bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
              title="Instalar Licita Aí no Celular (PWA)"
            >
              <Smartphone size={13} className="text-[#FB8B03]" />
              <span className="hidden sm:inline">App Celular</span>
            </button>
          </div>
        </div>

        {/* Cartões de Métricas da Empresa Ativa */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
          {/* Card 1: Saúde fiscal - CLICÁVEL PARA ACESSAR O COFRE DIGITAL */}
          <div 
            onClick={() => navigate('/cofre')}
            className="bg-[#F7F8FA] hover:bg-white border border-slate-200/70 hover:border-[#01203C]/40 p-4 rounded-2xl transition-all cursor-pointer shadow-2xs hover:shadow-xs group select-none touch-manipulation active:scale-[0.98]"
            title="Acessar o Cofre Digital de Certidões e Documentos"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-500 group-hover:text-[#01203C]">Saúde fiscal</span>
              <span className="text-[10px] text-[#FB8B03] font-bold group-hover:underline transition-colors flex items-center gap-0.5">
                Ver Cofre ➔
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span 
                className="text-2xl font-black text-[#01203C]" 
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {cnds.filter(c => c.status === 'valido').length}/{cnds.length}
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                cnds.filter(c => c.status === 'valido').length === cnds.length
                  ? 'bg-[#EAF7EE] text-[#1E8E5A] border-[#1E8E5A]/20'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {cnds.filter(c => c.status === 'valido').length === cnds.length ? '• Regular' : '• Atenção'}
              </span>
            </div>
          </div>

          {/* Card 2: Abertas na região */}
          <div className="bg-[#F7F8FA] border border-slate-200/70 p-4 rounded-2xl transition-all hover:border-[#01203C]/20">
            <span className="text-xs font-semibold text-slate-500 block mb-1">Abertas na região</span>
            <div className="flex items-baseline justify-between">
              <span 
                className="text-2xl font-black text-[#01203C]" 
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {totalAbertas}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EAF7EE] text-[#1E8E5A] border border-[#1E8E5A]/20">
                • No seu raio
              </span>
            </div>
          </div>
        </div>

        {/* Botões de Ação Imediata do Manual */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleScrollToFeed}
            className="px-6 py-2.5 bg-[#FB8B03] hover:bg-[#D97602] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>Ver oportunidades</span>
          </button>

          <button
            onClick={() => setShowRadiusControls(!showRadiusControls)}
            className="px-5 py-2.5 bg-white hover:bg-slate-50 text-[#01203C] border border-[#01203C]/30 hover:border-[#01203C] rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>Ajustar raio ({radius} km)</span>
            {showRadiusControls ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Painel Expansível de Ajuste de Raio */}
        {showRadiusControls && (
          <div className="mt-5 pt-4 border-t border-slate-200/80 animate-in fade-in duration-200">
            <GeofencingSlider value={radius} onChange={handleRadiusChange} count={filteredOportunidades.length} />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. SELETOR DE STATUS: ABERTAS vs HISTÓRICO              */}
      {/* ======================================================== */}
      <div className="mb-5 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs grid grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => setStatusFilter('abertas_futuras')}
          className={`py-2 px-1 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none touch-manipulation active:scale-95 ${
            statusFilter === 'abertas_futuras'
              ? 'bg-[#1E8E5A] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#01203C] hover:bg-slate-50'
          }`}
          title="Ver apenas certames abertos para envio de propostas"
        >
          <span className="w-2 h-2 rounded-full bg-white shrink-0 animate-pulse"></span>
          <span className="truncate">🟢 Abertas ({totalAbertas})</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('todas')}
          className={`py-2 px-1 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none touch-manipulation active:scale-95 ${
            statusFilter === 'todas'
              ? 'bg-[#01203C] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#01203C] hover:bg-slate-50'
          }`}
          title="Ver todas as licitações"
        >
          <span className="truncate">📁 Todas ({totalGeral})</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('encerradas')}
          className={`py-2 px-1 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none touch-manipulation active:scale-95 ${
            statusFilter === 'encerradas'
              ? 'bg-slate-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-[#01203C] hover:bg-slate-50'
          }`}
          title="Ver histórico de licitações encerradas"
        >
          <History size={13} className="shrink-0" />
          <span className="truncate">Encerradas ({totalEncerradas})</span>
        </button>
      </div>

      {/* Notificação explicativa do filtro de status ativo */}
      {statusFilter === 'abertas_futuras' ? (
        <div className="mb-4 bg-[#EAF7EE] border border-[#1E8E5A]/25 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-[#1E8E5A]">
          <CheckCircle size={16} className="text-[#1E8E5A] shrink-0" />
          <span>
            <strong>Filtro ativo:</strong> Mostrando apenas oportunidades com prazo de envio de propostas <strong>aberto ou futuro</strong>. Você pode enviar lances e participar!
          </span>
        </div>
      ) : statusFilter === 'encerradas' ? (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-amber-900">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <span>
            <strong>Histórico de Referência:</strong> Estes certames já encerraram o prazo de propostas. Servem para você estudar preços praticados e concorrentes.
          </span>
        </div>
      ) : null}

      {/* ======================================================== */}
      {/* 3. BARRA DE PESQUISA POR PALAVRA-CHAVE                   */}
      {/* ======================================================== */}
      <div className="mb-5">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por produto, obra ou cidade (ex: reforma, merenda, asfalto, papelaria)..."
            className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200/80 rounded-2xl text-xs sm:text-sm text-[#01203C] placeholder-slate-400 focus:outline-none focus:border-[#01203C] focus:ring-2 focus:ring-[#01203C]/10 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. FILTROS POR CATEGORIA / CNAE                          */}
      {/* ======================================================== */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal size={13} /> Filtrar por Segmento
          </span>
          {categoryFilter === 'meu_segmento' && (
            <span className="text-xs text-[#1E8E5A] font-bold flex items-center gap-1">
              <CheckCircle2 size={13} /> Foco no seu CNAE
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {categoriasChips.map(chip => {
            const isSelected = categoryFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setCategoryFilter(chip.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none touch-manipulation active:scale-95 ${
                  isSelected
                    ? 'bg-[#01203C] text-white border-[#01203C] shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-[#01203C]'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. FILTRO POR MODALIDADE (DISPENSAS, PREGÕES, ETC.)      */}
      {/* ======================================================== */}
      <div className="flex overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 gap-2 mb-4 no-scrollbar">
        {[
          { id: 'todas', label: 'Todas as Modalidades' },
          { id: 'dispensa', label: 'Dispensas Eletrônicas' },
          { id: 'pregao', label: 'Pregões Eletrônicos' },
          { id: 'concorrencia', label: 'Concorrências' },
          { id: 'exclusivas', label: 'Exclusivas MPE/MEI' },
        ].map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => setModalityFilter(f.id)}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none touch-manipulation active:scale-95 ${
              modalityFilter === f.id 
                ? 'bg-[#032F52] text-white border-[#032F52] shadow-xs' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ======================================================== */}
      {/* 6. LISTA DE OPORTUNIDADES FILTRADAS                      */}
      {/* ======================================================== */}
      <div id="lista-oportunidades" className="space-y-4 pt-1">
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {filteredOportunidades.length} {filteredOportunidades.length === 1 ? 'oportunidade encontrada' : 'oportunidades encontradas'}
          </span>
          <span className="text-xs text-slate-400">
            Raio ativo: {radius} km
          </span>
        </div>

        {carregandoBackend && oportunidades.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
            <RefreshCw size={28} className="animate-spin text-[#FB8B03] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#01203C]">Consultando banco SQLite local (pncp_core.py)...</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
              Recalculando distâncias geodésicas reais para a sede cadastrada em <strong>{empresa.municipio}/{empresa.uf}</strong>.
            </p>
          </div>
        ) : filteredOportunidades.length > 0 ? (
          filteredOportunidades.map(op => (
            <OportunidadeCard key={op.id} oportunidade={op} />
          ))
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-8 shadow-xs">
            <div className="w-14 h-14 bg-[#F7F8FA] rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Search size={28} />
            </div>
            <h3 className="text-base font-bold text-[#01203C]">Nenhuma licitação encontrada neste raio e filtros</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
              Tente aumentar o <strong>raio de entrega</strong> para alcançar municípios vizinhos ou selecione <strong>"Todos os Segmentos"</strong>.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <button
                onClick={() => { setRadius(300); salvarRaioBusca(300); }}
                className="px-4 py-2 bg-[#FB8B03] text-white rounded-xl text-xs font-bold hover:bg-[#D97602] transition-colors shadow-xs cursor-pointer"
              >
                Expandir Raio para 300 km
              </button>
              <button
                onClick={() => { setCategoryFilter('todas'); setSearchQuery(''); }}
                className="px-4 py-2 bg-[#01203C] text-white rounded-xl text-xs font-bold hover:bg-[#032F52] transition-colors shadow-xs cursor-pointer"
              >
                Ver Todos os Segmentos
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      <InstalarAppModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />
      <ModalGerenciarEmpresas isOpen={showEmpresasModal} onClose={() => setShowEmpresasModal(false)} />
    </div>
  );
}
