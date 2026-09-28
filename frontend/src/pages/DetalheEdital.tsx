import React, { useState } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { mockOportunidades } from '../data/mockData';
import { 
  ChevronLeft, FileText, AlertTriangle, CheckCircle, Clock, 
  ExternalLink, Download, ShieldCheck, MapPin, Building2, 
  Coins, ListOrdered, FileSpreadsheet, Eye, User, Calculator, Sliders,
  Calendar, CheckCircle2, ArrowRight, Heart, Columns3
} from 'lucide-react';
import { BrasaoPrefeitura } from '../components/shared/BrasaoPrefeitura';
import { TermometroAdimplencia } from '../components/shared/TermometroAdimplencia';
import { CalculadoraViabilidadeCard } from '../components/shared/CalculadoraViabilidadeCard';
import { getEmpresaAtiva, Empresa } from '../utils/empresaStorage';
import { formatarUrlPncpWeb, resolverUrlOrigem, calcularStatusPrazo } from '../utils/pncpUrls';
import { isOportunidadeFavorita, toggleFavoritoOportunidade } from '../utils/favoritosStorage';
import { getEtapaOportunidade, adicionarAoKanban, getItensKanban, ETAPAS_CONFIG } from '../utils/kanbanStorage';
import axios from 'axios';
import { Oportunidade, KanbanEtapa } from '../types';

export function DetalheEdital() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Suporte a IDs com barras (como os do PNCP: 17733643000147-1-000079/2026) e query string ?id=
  const queryId = searchParams.get('id');
  const rawId = queryId || params['*'] || params.id || '';
  const decodedId = decodeURIComponent(rawId);

  // Procura oportunidade recebida via state (instantâneo), ou no Kanban do usuário, ou nos mocks
  const opFromState = (location.state as any)?.oportunidade;
  const kanbanMatch = (() => {
    try {
      const itens = getItensKanban(getEmpresaAtiva().cnpj);
      return itens.find(it => 
        it.id === decodedId || 
        it.id === rawId || 
        (it.oportunidade && (
          it.oportunidade.id === decodedId || 
          it.oportunidade.id === rawId ||
          it.oportunidade.numeroControlePNCP === decodedId ||
          it.oportunidade.numeroControlePNCP === rawId
        ))
      )?.oportunidade;
    } catch {
      return null;
    }
  })();

  const localMatch = opFromState || kanbanMatch || mockOportunidades.find(op => 
    op.id === decodedId || 
    op.id === rawId || 
    (op.numeroControlePNCP && (op.numeroControlePNCP === decodedId || op.numeroControlePNCP === rawId))
  );

  const [oportunidade, setOportunidade] = useState<Oportunidade | null>(localMatch || null);
  const [carregando, setCarregando] = useState<boolean>(!localMatch);
  const [naoEncontrado, setNaoEncontrado] = useState<boolean>(false);

  const [empresa, setEmpresa] = useState<Empresa>(getEmpresaAtiva());
  const [isFavorito, setIsFavorito] = useState<boolean>(() => oportunidade ? isOportunidadeFavorita(oportunidade.id) : false);
  const [etapaKanban, setEtapaKanban] = useState<KanbanEtapa | null>(() => oportunidade ? getEtapaOportunidade(oportunidade.id, getEmpresaAtiva().cnpj) : null);

  React.useEffect(() => {
    let ativo = true;
    const buscarBackend = async () => {
      try {
        const idConsulta = decodedId || rawId;
        if (!idConsulta) {
          if (ativo) setNaoEncontrado(true);
          return;
        }
        const params: Record<string, any> = {};
        if (empresa?.latitude && empresa?.longitude) {
          params.empresa_lat = empresa.latitude;
          params.empresa_lon = empresa.longitude;
        }
        const resp = await axios.get(`/api/oportunidades/${encodeURIComponent(idConsulta)}`, { params });
        if (ativo && resp.data?.oportunidade) {
          setOportunidade(resp.data.oportunidade);
          setNaoEncontrado(false);
        }
      } catch (err: any) {
        if (ativo && !localMatch) {
          setNaoEncontrado(true);
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    buscarBackend();
    return () => { ativo = false; };
  }, [decodedId, rawId, empresa?.latitude, empresa?.longitude]);

  React.useEffect(() => {
    if (!oportunidade) return;
    const handleEmpresaAlterada = (e: any) => {
      setEmpresa(e.detail || getEmpresaAtiva());
    };
    const handleFavoritosAlterados = () => {
      setIsFavorito(isOportunidadeFavorita(oportunidade.id));
    };
    const handleKanbanAlterados = () => {
      setEtapaKanban(getEtapaOportunidade(oportunidade.id, getEmpresaAtiva().cnpj));
    };

    window.addEventListener('empresa_alterada', handleEmpresaAlterada);
    window.addEventListener('favoritos_alterados', handleFavoritosAlterados);
    window.addEventListener('kanban_alterado', handleKanbanAlterados);
    return () => {
      window.removeEventListener('empresa_alterada', handleEmpresaAlterada);
      window.removeEventListener('favoritos_alterados', handleFavoritosAlterados);
      window.removeEventListener('kanban_alterado', handleKanbanAlterados);
    };
  }, [oportunidade?.id]);

  const [activeTab, setActiveTab] = useState<'edital' | 'itens' | 'viabilidade'>('edital');
  const [propostaGerada, setPropostaGerada] = useState(false);

  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  if (carregando && !oportunidade) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#01203C] mx-auto mb-3"></div>
          <p className="text-sm font-medium text-slate-600">Buscando edital no banco de dados...</p>
        </div>
      </div>
    );
  }

  if (naoEncontrado || !oportunidade) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4">
          <AlertTriangle size={32} />
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Edital Não Encontrado (404)</h1>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          A oportunidade com identificador <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">{decodedId || rawId}</span> não existe no banco de dados do PNCP ou foi cancelada/revogada.
        </p>
        <button
          onClick={() => navigate('/feed')}
          className="px-5 py-2.5 bg-[#01203C] text-white text-sm font-semibold rounded-xl hover:bg-[#02325e] transition-colors cursor-pointer"
        >
          Voltar ao Feed de Oportunidades
        </button>
      </div>
    );
  }

  // URLs oficiais resolvidas
  const urlPncpOficial = formatarUrlPncpWeb(oportunidade.numeroControlePNCP || oportunidade.id || (oportunidade as any).urlPncp);
  const portalOrigem = resolverUrlOrigem(oportunidade);

  // Status de prazo em tempo real
  const statusInfo = calcularStatusPrazo(oportunidade.dataEncerramento, oportunidade.dataAbertura);

  // Cálculo e formatação resiliente de distância (nunca renderiza 'null km')
  const distanciaFormatada = React.useMemo(() => {
    if (!oportunidade) return null;
    let d = oportunidade.distanciaKm;
    if (d === undefined || d === null || d === 0) {
      const eLat = empresa?.latitude;
      const eLon = empresa?.longitude;
      const mLat = oportunidade.municipio?.latitude;
      const mLon = oportunidade.municipio?.longitude;
      if (eLat && eLon && mLat && mLon && eLat !== 0 && mLat !== 0) {
        const R = 6371;
        const dLat = (mLat - eLat) * Math.PI / 180;
        const dLon = (mLon - eLon) * Math.PI / 180;
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(eLat * Math.PI / 180) * Math.cos(mLat * Math.PI / 180) * 
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        d = Math.round(R * c * 10) / 10;
      }
    }
    if (d === undefined || d === null || d >= 99999) {
      return null;
    }
    if (d <= 0.5) {
      return 'Sua Cidade (Sede)';
    }
    return `${d} km`;
  }, [empresa, oportunidade]);

  // Formatação de datas
  const formatarData = (dStr?: string) => {
    if (!dStr) return 'Não informada';
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return dStr;
      return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dStr;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-100 overflow-hidden">
      {/* ======================================================== */}
      {/* PAINEL ESQUERDO: LEITOR REAL DO EDITAL & DOCUMENTOS      */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col h-full bg-white border-r border-slate-200 overflow-hidden">
        {/* Barra superior de controle do documento */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => navigate('/feed')} 
              className="p-1.5 text-slate-600 hover:text-[#01203C] hover:bg-slate-200/60 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
              title="Voltar ao Feed de Oportunidades"
            >
              <ChevronLeft size={18} />
              <span className="hidden sm:inline">Feed</span>
            </button>
            <div className="flex items-center space-x-2">
              <BrasaoPrefeitura municipio={oportunidade.municipio} size="sm" />
              <div>
                <h2 
                  className="text-xs font-bold text-[#01203C] leading-tight"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {oportunidade.numeroEdital}
                </h2>
                <p className="text-[11px] text-slate-500 truncate max-w-xs">{oportunidade.orgao}</p>
              </div>
            </div>
          </div>

          {/* BOTÕES OFICIAIS DE ACESSO AO GOVERNO (100% FUNCIONAIS) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* BOTÃO KANBAN: Adicionar ou Ver no Pipeline */}
            <button
              type="button"
              onClick={() => {
                if (etapaKanban) {
                  navigate('/kanban');
                } else {
                  adicionarAoKanban(oportunidade, empresa.cnpj, 'em_analise');
                  setEtapaKanban('em_analise');
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs active:scale-[0.98] cursor-pointer ${
                etapaKanban
                  ? 'bg-[#EAF7EE] border-[#A3E2BE] text-[#00A67E]'
                  : 'bg-white border-slate-200 text-[#01203C] hover:bg-slate-50 hover:border-[#00A67E]/40'
              }`}
              title={etapaKanban ? `Ver no quadro Kanban (${ETAPAS_CONFIG[etapaKanban].label})` : 'Adicionar ao Quadro Kanban em Em Análise'}
            >
              <Columns3 size={12} className={etapaKanban ? 'text-[#00A67E]' : 'text-[#FB8B03]'} />
              <span>{etapaKanban ? `No Kanban: ${ETAPAS_CONFIG[etapaKanban].label}` : '+ Adicionar ao Kanban'}</span>
            </button>

            {/* BOTÃO 1: Link para o PNCP Oficial (Secundário do Manual) */}
            <a
              href={urlPncpOficial}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-[#01203C] border border-slate-200 hover:border-[#01203C]/40 text-xs font-bold rounded-xl transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
              title="Acessar o portal oficial do governo federal (PNCP)"
            >
              <span>Ver no PNCP Oficial</span>
              <ExternalLink size={12} className="text-slate-400" />
            </a>

            {/* BOTÃO 2: Link Direto para a Sala de Disputa no Portal de Origem */}
            <a
              href={portalOrigem.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-bold rounded-xl transition-all shadow-xs active:scale-[0.98] cursor-pointer"
              style={{
                backgroundColor: oportunidade.portalCor || '#01203C'
              }}
              title={`Acessar a Sala de Disputa no ${oportunidade.portalNome || portalOrigem.nome}`}
            >
              <ExternalLink size={12} className="text-[#FB8B03]" />
              <span>{oportunidade.portalNomeCurto ? `Disputa no ${oportunidade.portalNomeCurto}` : (portalOrigem.isOficialPncp ? 'Acessar Edital & Anexos' : `Disputa no ${portalOrigem.nome}`)}</span>
            </a>

            {/* BOTÃO 3: Baixar Anexos */}
            <a 
              href={portalOrigem.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="Acessar e baixar todos os arquivos e termos de referência do certame"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Baixar Anexos</span>
            </a>

            {/* BOTÃO 4: Favoritar (Acompanhar no Radar SOS IA) */}
            <button
              onClick={() => {
                const novoStatus = toggleFavoritoOportunidade(oportunidade.id);
                setIsFavorito(novoStatus);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs active:scale-[0.97] cursor-pointer ${
                isFavorito
                  ? 'bg-rose-50 border-rose-300 text-rose-600 hover:bg-rose-100 shadow-rose-100'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200'
              }`}
              title={isFavorito ? 'Remover dos favoritos (radar SOS IA)' : 'Salvar no radar de datas do SOS IA'}
            >
              <Heart 
                size={14} 
                className={`transition-colors ${isFavorito ? 'fill-rose-500 text-rose-500' : 'text-slate-400 group-hover:text-rose-500'}`} 
              />
              <span>{isFavorito ? 'Favoritada' : 'Favoritar'}</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BANNER INFORMATIVO DE STATUS DE PRAZO                    */}
        {/* ======================================================== */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          {statusInfo.status === 'aberta' ? (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-900 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <div>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    {oportunidade.modalidade === 'credenciamento' 
                      ? '🟢 Credenciamento Aberto — Inscrição Contínua' 
                      : '🟢 Oportunidade Aberta — Recebendo Propostas'}
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {oportunidade.modalidade === 'credenciamento'
                      ? `Inscrições de credenciamento abertas • ${statusInfo.textoPrazo}`
                      : `Envio de propostas e lances • ${statusInfo.textoPrazo}`
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-bold bg-emerald-600 text-white px-3 py-1 rounded-full shadow-2xs">
                  {oportunidade.modalidade === 'credenciamento' ? 'Credenciamento Vigente' : 'Fase de Lances Ativa'}
                </span>
              </div>
            </div>
          ) : statusInfo.status === 'futura' ? (
            <div className="bg-blue-50 border border-blue-300 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-blue-900 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <Clock className="text-blue-600 shrink-0" size={18} />
                <div>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-blue-900">
                    🔵 Abertura de Propostas Prevista
                  </h4>
                  <p className="text-xs text-blue-800 mt-0.5">
                    Início previsto para <strong>{formatarData(oportunidade.dataAbertura)}</strong> ({statusInfo.textoPrazo})
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-900">
                    ⚠️ Prazo de Envio de Propostas Encerrado
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Este certame encerrou o envio de propostas em <strong>{formatarData(oportunidade.dataEncerramento)}</strong>.
                    As informações abaixo servem para <strong>pesquisa de preços praticados e transparência pública</strong>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/feed')}
                className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-xl shrink-0 transition-colors shadow-2xs flex items-center gap-1"
              >
                <span>Ver Licitações Abertas</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Abas de Navegação do Documento */}
        <div className="flex border-b border-slate-200 px-4 bg-slate-50/50 text-xs font-semibold overflow-x-auto gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('edital')}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer select-none touch-manipulation active:scale-95 ${
              activeTab === 'edital'
                ? 'border-[#01203C] text-[#01203C] font-black bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
            }`}
          >
            <FileText size={14} className={activeTab === 'edital' ? 'text-[#FB8B03]' : 'text-slate-400'} /> 
            <span>Minuta do Edital & TR</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('itens')}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer select-none touch-manipulation active:scale-95 ${
              activeTab === 'itens'
                ? 'border-[#01203C] text-[#01203C] font-black bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
            }`}
          >
            <FileSpreadsheet size={14} className={activeTab === 'itens' ? 'text-[#00A67E]' : 'text-slate-400'} /> 
            <span>Planilha Orçamentária ({oportunidade.itens?.length || 1} itens)</span>
          </button>
          {/* Aba adicional para mobile */}
          <button
            type="button"
            onClick={() => setActiveTab('viabilidade')}
            className={`md:hidden py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer select-none touch-manipulation active:scale-95 ${
              activeTab === 'viabilidade'
                ? 'border-[#01203C] text-[#01203C] font-black bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
            }`}
          >
            <Calculator size={14} className={activeTab === 'viabilidade' ? 'text-[#FB8B03]' : 'text-slate-400'} /> 
            <span>Calculadora de Margem</span>
          </button>
        </div>

        {/* Conteúdo Rolável do Documento */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/40">
          {activeTab === 'edital' && (
            <div className="max-w-2xl mx-auto bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-200 text-slate-800 space-y-6 font-serif">
              {/* Cabeçalho Oficial do Município */}
              <div className="text-center pb-6 border-b border-slate-200 space-y-2">
                <div className="flex justify-center mb-2">
                  <BrasaoPrefeitura municipio={oportunidade.municipio} size="lg" />
                </div>
                <h1 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-sans">
                  ESTADO DE {oportunidade.municipio.uf === 'MG' ? 'MINAS GERAIS' : 'RIO DE JANEIRO'}
                </h1>
                <h2 className="text-base font-extrabold uppercase text-slate-900 font-sans">
                  PREFEITURA MUNICIPAL DE {oportunidade.municipio.nome.toUpperCase()}
                </h2>
                <p className="text-xs font-sans text-slate-500">{oportunidade.orgao}</p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2 font-sans">
                  <div className="bg-slate-100 text-slate-800 font-mono text-xs px-3 py-1 rounded border border-slate-300 font-bold">
                    {oportunidade.numeroEdital} {oportunidade.numeroProcesso ? `• ${oportunidade.numeroProcesso}` : ''}
                  </div>
                  {oportunidade.numeroControlePNCP && (
                    <div className="bg-blue-50 text-blue-800 font-mono text-xs px-3 py-1 rounded border border-blue-200 font-bold flex items-center gap-1">
                      <span>PNCP:</span>
                      <span>{oportunidade.numeroControlePNCP}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Preâmbulo Legal */}
              <div className="text-xs leading-relaxed text-slate-700 text-justify bg-slate-50 p-4 rounded-xl border border-slate-200/80 font-sans">
                <p>{oportunidade.editalCompleto?.preambulo || `O ${oportunidade.orgao} torna público o presente certame sob a égide da Lei Federal nº 14.133/2021.`}</p>
              </div>

              {/* Cláusula Primeira: Do Objeto */}
              <div>
                <h3 className="font-sans font-bold text-sm text-slate-900 uppercase tracking-wide border-b pb-1 mb-2">
                  CLÁUSULA PRIMEIRA – DO OBJETO
                </h3>
                <p className="text-xs leading-relaxed text-slate-700 text-justify">
                  {oportunidade.objetoOriginal}
                </p>
                <div className="mt-3 p-3 bg-ocean-50/80 rounded-xl border border-ocean-100 text-xs font-sans text-ocean-900">
                  <strong>Local de Execução:</strong> {oportunidade.editalCompleto?.localExecucao || `${oportunidade.municipio.nome}/${oportunidade.municipio.uf}`}
                  <br />
                  <strong>Prazo Estimado:</strong> {oportunidade.editalCompleto?.prazoExecucao || 'Conforme cronograma oficial'}
                </div>
              </div>

              {/* Cláusula Segunda: Da Justificativa Técnica */}
              <div>
                <h3 className="font-sans font-bold text-sm text-slate-900 uppercase tracking-wide border-b pb-1 mb-2">
                  CLÁUSULA SEGUNDA – DA JUSTIFICATIVA
                </h3>
                <p className="text-xs leading-relaxed text-slate-700 text-justify">
                  {oportunidade.editalCompleto?.justificativa || `Atendimento contínuo e prioritário às demandas públicas do município de ${oportunidade.municipio.nome}.`}
                </p>
              </div>

              {/* Cláusula Terceira: Condições de Habilitação */}
              <div>
                <h3 className="font-sans font-bold text-sm text-slate-900 uppercase tracking-wide border-b pb-1 mb-2">
                  CLÁUSULA TERCEIRA – DA HABILITAÇÃO EXIGIDA
                </h3>
                <ul className="text-xs space-y-1.5 text-slate-700 font-sans list-disc pl-5">
                  {(oportunidade.editalCompleto?.requisitosHabilitacao || [
                    'Certidão Negativa de Débitos Federais e Dívida Ativa da União (CND/PGFN)',
                    'Certidão Negativa de Débitos Trabalhistas (CNDT)',
                    'Certificado de Regularidade do FGTS (CRF Caixa)',
                    'Certidão de Regularidade perante a Fazenda Estadual',
                    'Certidão de Regularidade perante a Fazenda Municipal'
                  ]).map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>

              {/* Cláusula Quarta: Pagamento */}
              <div>
                <h3 className="font-sans font-bold text-sm text-slate-900 uppercase tracking-wide border-b pb-1 mb-2">
                  CLÁUSULA QUARTA – DO PAGAMENTO
                </h3>
                <p className="text-xs leading-relaxed text-slate-700 text-justify">
                  {oportunidade.editalCompleto?.condicoesPagamento || `O pagamento será realizado mediante empenho e transferência bancária em conta vinculada ao CNPJ contratado, no prazo médio de até ${oportunidade.adimplencia?.tempoMedioDias || 30} dias contados do recebimento definitivo da nota fiscal.`}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'itens' && (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-sans">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Planilha Orçamentária de Referência</h3>
                  <p className="text-xs text-slate-500">Quantitativos e preços unitários máximos fixados pelo órgão</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-medium block">Valor Global</span>
                  <span className="text-base font-extrabold text-ocean-600">{formatter.format(oportunidade.valorMaximo)}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px]">
                    <tr>
                      <th className="p-3 w-12 text-center">Item</th>
                      <th className="p-3">Descrição dos Serviços / Materiais</th>
                      <th className="p-3 text-center">Und</th>
                      <th className="p-3 text-right">Qtd</th>
                      <th className="p-3 text-right">Preço Máx (R$)</th>
                      <th className="p-3 text-right">Total Máx (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(oportunidade.itens || [
                      {
                        numero: 1,
                        descricao: oportunidade.objetoResumido,
                        unidade: 'UN/GL',
                        quantidade: 1,
                        valorUnitarioMax: oportunidade.valorMaximo,
                        valorTotalMax: oportunidade.valorMaximo
                      }
                    ]).map((item) => (
                      <tr key={item.numero} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center font-mono font-bold text-slate-400">{item.numero}</td>
                        <td className="p-3 font-medium text-slate-800 leading-snug">{item.descricao}</td>
                        <td className="p-3 text-center font-mono text-slate-600 bg-slate-50/50 rounded">{item.unidade}</td>
                        <td className="p-3 text-right font-mono font-semibold text-slate-700">{item.quantidade}</td>
                        <td className="p-3 text-right font-mono text-slate-600">{formatter.format(item.valorUnitarioMax)}</td>
                        <td className="p-3 text-right font-mono font-bold text-ocean-700">
                          {formatter.format(item.valorTotalMax || (item.quantidade * item.valorUnitarioMax))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'viabilidade' && (
            <div className="space-y-4 max-w-xl mx-auto md:hidden font-sans">
              {/* Card de Identificação da Empresa */}
              <div className="bg-gradient-to-r from-ocean-800 to-ocean-900 text-white p-4 rounded-3xl shadow-sm flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <User size={22} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-extrabold truncate">Olá, {empresa.nomeFantasia || empresa.razaoSocial}!</h4>
                  <p className="text-xs text-ocean-200 font-mono truncate">CNPJ: {empresa.cnpj}</p>
                </div>
              </div>

              {/* Termômetro de Pagamento com Barra Deslizante (Mockup) */}
              {oportunidade.adimplencia && (
                <TermometroAdimplencia adimplencia={oportunidade.adimplencia} variant="gauge_card" />
              )}

              {/* Calculadora de Viabilidade Interativa (Mockup) */}
              <CalculadoraViabilidadeCard oportunidade={oportunidade} onAvancarDocumentos={() => setActiveTab('itens')} />
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* PAINEL DIREITO: RESUMO, TERMÔMETRO & CALCULADORA (DESKTOP) */}
      {/* ======================================================== */}
      <div className="hidden md:flex w-full md:w-[450px] shrink-0 bg-slate-50 flex-col h-full border-l border-slate-200 overflow-y-auto">
        <div className="p-4 sm:p-6 space-y-4 font-sans">
          {/* Card de Identificação da Empresa do Usuário (Mockup Phone) */}
          <div className="bg-gradient-to-r from-ocean-800 to-ocean-900 text-white p-4 rounded-3xl shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <User size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-extrabold truncate text-white">Olá, {empresa.nomeFantasia || empresa.razaoSocial}!</h4>
              <p className="text-[11px] text-ocean-200 font-mono truncate">CNPJ: {empresa.cnpj}</p>
            </div>
          </div>

          {/* Identificação Municipal e Distância */}
          <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <BrasaoPrefeitura municipio={oportunidade.municipio} size="md" />
              <div>
                <h3 className="font-extrabold text-slate-800 text-xs">{oportunidade.municipio.nome}/{oportunidade.municipio.uf}</h3>
                <p className="text-[11px] text-slate-500">{oportunidade.modalidade.toUpperCase()} • Lei 14.133</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-ocean-700 bg-ocean-50 px-2 py-1 rounded-full border border-ocean-100 flex items-center gap-1">
                <MapPin size={11} /> {distanciaFormatada || `${oportunidade.municipio.nome}/${oportunidade.municipio.uf}`}
              </span>
            </div>
          </div>

          {/* CARD 1 DO MOCKUP: TERMÔMETRO DE PAGAMENTO COM SLIDER GAUGE */}
          {oportunidade.adimplencia && (
            <TermometroAdimplencia adimplencia={oportunidade.adimplencia} variant="gauge_card" />
          )}

          {/* CARD 2 DO MOCKUP: CALCULADORA DE VIABILIDADE INTERATIVA */}
          <CalculadoraViabilidadeCard 
            oportunidade={oportunidade} 
            onAvancarDocumentos={() => setActiveTab('itens')} 
          />

          {/* Vantagens LC 123 (MPE/MEI) */}
          {(oportunidade.exclusivoMpe || oportunidade.vantagemLc123) && (
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 flex items-start space-x-2.5">
              <CheckCircle className="text-emerald-600 mt-0.5 shrink-0" size={17} />
              <div>
                <h4 className="font-bold text-emerald-900 text-xs">Vantagens Garantidas por Lei (LC 123/06)</h4>
                {oportunidade.exclusivoMpe && (
                  <p className="text-emerald-700 text-xs mt-0.5">• Licitação exclusiva para Micro e Pequenas Empresas (ME/EPP/MEI).</p>
                )}
                {oportunidade.vantagemLc123 && (
                  <p className="text-emerald-700 text-xs mt-0.5">• Prioridade de contratação e desempate regional para empresas do entorno.</p>
                )}
              </div>
            </div>
          )}

          {/* Documentos de Habilitação */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-ocean-600" /> Documentos de Habilitação
              </h3>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                100% no Cofre
              </span>
            </div>

            <div className="space-y-1.5">
              {[
                { nome: 'CND Federal e Previdenciária', status: 'valido' },
                { nome: 'CNDT Trabalhista', status: 'valido' },
                { nome: 'CRF FGTS (Caixa)', status: 'valido' },
                { nome: 'Certidão Estadual (SEFAZ)', status: 'valido' },
                { nome: 'Certidão Municipal', status: 'valido' },
              ].map((doc, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-700 font-medium text-[11px]">{doc.nome}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-600">No Cofre</span>
                </div>
              ))}
            </div>
          </div>

          {/* Botão de Participação */}
          <div className="pt-2 sticky bottom-4 z-10">
            {propostaGerada ? (
              <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl text-center space-y-2">
                <div className="flex items-center justify-center text-emerald-700 font-bold text-xs gap-1.5">
                  <CheckCircle size={16} /> Proposta Comercial Gerada com Sucesso!
                </div>
                <button
                  onClick={() => alert('Download do Dossiê Completo de Proposta (PDF) em andamento!')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Baixar Dossiê Completo (.ZIP)
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setPropostaGerada(true)}
                className="w-full py-3.5 rounded-2xl font-black text-white bg-gradient-to-r from-cta-500 to-cta-600 hover:from-cta-600 hover:to-cta-700 shadow-md shadow-cta-500/20 active:scale-[0.98] text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
              >
                <span>⚡ Quero Participar</span>
                <span className="text-[11px] font-normal opacity-90">(Montar Dossiê com IA)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
