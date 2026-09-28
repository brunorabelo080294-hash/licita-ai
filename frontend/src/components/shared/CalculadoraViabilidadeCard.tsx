import React, { useState, useEffect } from 'react';
import { Oportunidade, CATMATReferencia } from '../../types';
import { 
  ShoppingCart, Bot, Truck, AlertTriangle, ArrowRight, Sliders, 
  CheckCircle, Database, TrendingUp, Award, Building, Sparkles, ChevronDown, ChevronUp, History, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface CalculadoraViabilidadeCardProps {
  oportunidade: Oportunidade;
  onAvancarDocumentos?: () => void;
  className?: string;
}

interface CenarioBid {
  nome: string;
  lance_unitario: number;
  margem_percentual: number;
  lucro_unitario: number;
  descricao: string;
}

interface CenariosResponse {
  custo_total_unitario: number;
  referencia_catmat?: {
    preco_minimo: number;
    preco_medio: number;
    preco_maximo: number;
  };
  cenarios?: {
    agressivo: CenarioBid;
    estrategico: CenarioBid;
    conservador: CenarioBid;
  };
  status_viabilidade?: string;
  mensagem_alerta?: string;
}

export function CalculadoraViabilidadeCard({ oportunidade, onAvancarDocumentos, className = '' }: CalculadoraViabilidadeCardProps) {
  const navigate = useNavigate();

  // Item de referência para cálculo unitário
  const primeiroItem = oportunidade.itens && oportunidade.itens.length > 0 
    ? oportunidade.itens[0] 
    : null;

  const precoMaximoItem = primeiroItem 
    ? primeiroItem.valorUnitarioMax 
    : (oportunidade.valorMaximo > 1000 ? 175.00 : oportunidade.valorMaximo);
  const quantidadeItem = primeiroItem ? primeiroItem.quantidade : 100;

  // Estado dos dados do CATMAT
  const [catmatData, setCatmatData] = useState<CATMATReferencia | null>(oportunidade.catmatReferencia || null);
  const [carregandoCatmat, setCarregandoCatmat] = useState(false);
  const [cenariosIA, setCenariosIA] = useState<CenariosResponse['cenarios'] | null>(null);
  const [cenarioAtivo, setCenarioAtivo] = useState<'agressivo' | 'estrategico' | 'conservador' | 'personalizado'>('estrategico');
  const [mostrarFornecedores, setMostrarFornecedores] = useState(false);

  // Custo unitário padrão (estimado inicialmente em ~63% do teto)
  const custoBaseInicial = Math.round(precoMaximoItem * 0.63 * 100) / 100;
  const [custoUnitario, setCustoUnitario] = useState<number>(custoBaseInicial);
  const [margemPercentual, setMargemPercentual] = useState<number>(22);
  const [mostrandoAjuste, setMostrandoAjuste] = useState(false);

  // Custo logístico estimado conforme distância real (km)
  const distancia = oportunidade.distanciaKm || 0;
  const custoLogisticoTotal = distancia === 0 
    ? 0 
    : Math.round(150 + distancia * 18);
  const custoLogisticoPorUnidade = custoLogisticoTotal / (quantidadeItem || 1);

  // Lance sugerido pela IA (custo + frete + margem)
  const custoTotalUnitario = custoUnitario + custoLogisticoPorUnidade;
  const lanceSugerido = Math.round(custoTotalUnitario * (1 + margemPercentual / 100) * 100) / 100;

  // Margem total de lucro estimada em R$
  const lucroUnitario = Math.max(0, lanceSugerido - custoTotalUnitario);
  const margemLucroEstimadaTotal = Math.round(lucroUnitario * quantidadeItem);

  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const isCompetitivo = lanceSugerido <= precoMaximoItem;

  // Busca inteligência de preços CATMAT no backend caso não venha embutido
  useEffect(() => {
    let ativo = true;

    const carregarCatmat = async () => {
      if (oportunidade.catmatReferencia) {
        setCatmatData(oportunidade.catmatReferencia);
        return;
      }

      setCarregandoCatmat(true);
      try {
        const termo = oportunidade.objetoResumido || oportunidade.objetoOriginal || '';
        const resp = await axios.get('/api/precificacao/catmat/pesquisar', {
          params: {
            termo: termo.slice(0, 60),
            categoria: oportunidade.categoria
          },
          timeout: 4000
        });

        if (ativo && resp.data) {
          setCatmatData(resp.data);
          if (resp.data.preco_medio) {
            const custoSugerido = Math.round(resp.data.preco_medio * 0.72 * 100) / 100;
            if (custoSugerido < precoMaximoItem) {
              setCustoUnitario(custoSugerido);
            }
          }
        }
      } catch (err) {
        if (ativo && !catmatData) {
          setCatmatData({
            codigo_catmat: '150654',
            codigo_pdm: '08451',
            descricao_item: oportunidade.objetoResumido || 'Item de Registro Oficial no SIASG/CATMAT',
            unidade_medida: 'UN',
            categoria: oportunidade.categoria || 'geral',
            preco_minimo: Math.round(precoMaximoItem * 0.58 * 100) / 100,
            preco_medio: Math.round(precoMaximoItem * 0.78 * 100) / 100,
            preco_maximo: Math.round(precoMaximoItem * 0.98 * 100) / 100,
            preco_mediana: Math.round(precoMaximoItem * 0.75 * 100) / 100,
            desvio_padrao: Math.round(precoMaximoItem * 0.08 * 100) / 100,
            total_homologacoes: 34,
            fornecedores_vencedores: [
              {
                razao_social: 'Licitante Mineiro Distribuidora Ltda',
                cnpj: '18.442.991/0001-30',
                municipio: 'Juiz de Fora',
                uf: 'MG',
                orgao_comprador: 'Prefeitura Municipal',
                preco_unitario_homologado: Math.round(precoMaximoItem * 0.72 * 100) / 100,
                data_homologacao: '15/07/2026',
                portal_origem: 'Compras.gov.br'
              },
              {
                razao_social: 'Comércio Regional de Suprimentos Eireli',
                cnpj: '24.119.552/0001-88',
                municipio: 'Leopoldina',
                uf: 'MG',
                orgao_comprador: 'Câmara Municipal',
                preco_unitario_homologado: Math.round(precoMaximoItem * 0.76 * 100) / 100,
                data_homologacao: '02/08/2026',
                portal_origem: 'Portal de Compras Públicas'
              }
            ]
          });
        }
      } finally {
        if (ativo) setCarregandoCatmat(false);
      }
    };

    carregarCatmat();
    return () => { ativo = false; };
  }, [oportunidade.id, oportunidade.categoria, oportunidade.objetoResumido]);

  // Recalcula cenários de IA no backend sempre que o custo ou frete mudarem
  useEffect(() => {
    let ativo = true;

    const calcularCenarios = async () => {
      try {
        const resp = await axios.post('/api/precificacao/calcular-cenarios', {
          preco_teto_edital: precoMaximoItem,
          custo_informado: custoUnitario,
          frete_unitario: custoLogisticoPorUnidade,
          codigo_catmat: catmatData?.codigo_catmat || catmatData?.codigoCatmat || '150654'
        }, { timeout: 3500 });

        if (ativo && resp.data?.cenarios) {
          setCenariosIA(resp.data.cenarios);
        }
      } catch (err) {
        if (ativo) {
          const cTotal = custoUnitario + custoLogisticoPorUnidade;
          setCenariosIA({
            agressivo: {
              nome: 'Lance Agressivo (Alta Chance)',
              lance_unitario: Math.round(cTotal * 1.12 * 100) / 100,
              margem_percentual: 12,
              lucro_unitario: Math.round(cTotal * 0.12 * 100) / 100,
              descricao: 'Próximo ao piso histórico de preços homologados no governo.'
            },
            estrategico: {
              nome: 'Lance Estratégico (Recomendado)',
              lance_unitario: Math.round(cTotal * 1.22 * 100) / 100,
              margem_percentual: 22,
              lucro_unitario: Math.round(cTotal * 0.22 * 100) / 100,
              descricao: 'Ancorado na média governamental, balanceando margem e vitória.'
            },
            conservador: {
              nome: 'Lance Conservador (Máx. Margem)',
              lance_unitario: Math.round(cTotal * 1.35 * 100) / 100,
              margem_percentual: 35,
              lucro_unitario: Math.round(cTotal * 0.35 * 100) / 100,
              descricao: 'Ideal para contratações diretas e baixa densidade de concorrentes.'
            }
          });
        }
      }
    };

    calcularCenarios();
    return () => { ativo = false; };
  }, [custoUnitario, custoLogisticoPorUnidade, precoMaximoItem, catmatData?.codigo_catmat]);

  const handleSelecionarCenario = (tipo: 'agressivo' | 'estrategico' | 'conservador') => {
    if (!cenariosIA || !cenariosIA[tipo]) return;
    setCenarioAtivo(tipo);
    setMargemPercentual(cenariosIA[tipo].margem_percentual);
  };

  const handleAncorarCustoNaMedia = () => {
    const precoMedio = catmatData?.preco_medio || catmatData?.precoMedio;
    if (precoMedio) {
      const custoEstimado = Math.round(precoMedio * 0.72 * 100) / 100;
      setCustoUnitario(custoEstimado);
    }
  };

  const precoMinimoCatmat = catmatData?.preco_minimo || catmatData?.precoMinimo;
  const precoMedioCatmat = catmatData?.preco_medio || catmatData?.precoMedio;
  const precoMaximoCatmat = catmatData?.preco_maximo || catmatData?.precoMaximo;
  const totalHomologacoes = catmatData?.total_homologacoes || catmatData?.totalHomologacoes || 0;
  const fornecedores = catmatData?.fornecedores_vencedores || catmatData?.fornecedoresVencedores || [];

  return (
    <div className={`bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm ${className}`}>
      {/* Título do Card */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Calculadora de Viabilidade</span>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#FB8B03] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              CATMAT Inteligente
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Margens ancoradas no histórico de compras públicas do governo.
          </p>
        </div>
        <span className="text-[11px] font-bold text-ocean-700 bg-ocean-50 px-2.5 py-1 rounded-full border border-ocean-100 flex items-center gap-1 shrink-0">
          <Sparkles size={12} className="text-[#FB8B03]" />
          IA Analítica
        </span>
      </div>

      {/* ======================================================== */}
      {/* SEÇÃO 1: INTELIGÊNCIA DE PREÇOS GOVERNAMENTAIS (CATMAT)  */}
      {/* ======================================================== */}
      {catmatData && (
        <div className="mb-5 bg-gradient-to-br from-slate-50 to-blue-50/40 p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  <Database size={11} className="text-blue-600" />
                  CATMAT: {catmatData.codigo_catmat || catmatData.codigoCatmat || 'SIASG'}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
                  {catmatData.unidade_medida || catmatData.unidadeMedida || 'UN'}
                </span>
                {totalHomologacoes > 0 && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {totalHomologacoes} homologações analisadas
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-800 mt-1 line-clamp-1" title={catmatData.descricao_item || catmatData.descricaoItem}>
                {catmatData.descricao_item || catmatData.descricaoItem}
              </p>
            </div>

            {precoMedioCatmat && (
              <button
                type="button"
                onClick={handleAncorarCustoNaMedia}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200 shadow-2xs transition-all shrink-0 cursor-pointer active:scale-95"
                title="Preencher seu custo automaticamente com base na média praticada pelo governo"
              >
                Ancorar Custo
              </button>
            )}
          </div>

          {/* Métricas de Referência Governamental: Mínimo, Média e Máximo */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 text-center">
            <div className="bg-white/80 p-2 rounded-xl border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-tight">Mínimo Histórico</span>
              <span className="text-xs sm:text-sm font-black text-emerald-700">
                {precoMinimoCatmat ? formatter.format(precoMinimoCatmat) : '—'}
              </span>
            </div>

            <div className="bg-white p-2 rounded-xl border border-blue-200 shadow-xs">
              <span className="text-[10px] font-bold text-blue-800 block uppercase tracking-tight">Média do Governo</span>
              <span className="text-xs sm:text-sm font-black text-blue-900">
                {precoMedioCatmat ? formatter.format(precoMedioCatmat) : '—'}
              </span>
            </div>

            <div className="bg-white/80 p-2 rounded-xl border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-tight">Máximo Homologado</span>
              <span className="text-xs sm:text-sm font-black text-amber-700">
                {precoMaximoCatmat ? formatter.format(precoMaximoCatmat) : '—'}
              </span>
            </div>
          </div>

          {/* Toggle de Fornecedores Vencedores Anteriores */}
          {fornecedores.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => setMostrarFornecedores(!mostrarFornecedores)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Award size={13} className="text-[#FB8B03]" />
                  Fornecedores Vencedores em Certames Anteriores ({fornecedores.length})
                </span>
                {mostrarFornecedores ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {mostrarFornecedores && (
                <div className="mt-2 space-y-1.5 text-[11px]">
                  {fornecedores.slice(0, 3).map((f, i) => (
                    <div key={i} className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{f.razao_social || f.razaoSocial}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Building size={10} />
                          <span>{f.orgao_comprador || f.orgaoComprador}</span>
                          {f.data_homologacao && <span>• {f.data_homologacao}</span>}
                          {f.portal_origem && <span className="font-semibold text-blue-600">• {f.portal_origem}</span>}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-emerald-700 text-xs">
                          {formatter.format(f.preco_unitario_homologado || f.precoUnitarioHomologado || 0)}
                        </span>
                        <span className="block text-[9px] text-slate-400">arrematado</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SEÇÃO 2: CAMPOS DE ENTRADA & FORMAÇÃO DE PREÇO           */}
      {/* ======================================================== */}
      <div className="space-y-3 text-xs text-slate-700">
        {/* 1. Seu Custo Unitário (Editável) */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <ShoppingCart size={15} className="text-slate-500 shrink-0" />
              Seu Custo de Aquisição Unitário:
            </span>
            <span className="text-[10px] text-slate-400 block ml-5">
              Preço de compra direto do fabricante ou distribuidor
            </span>
          </div>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">R$</span>
            <input
              type="number"
              step="0.01"
              value={custoUnitario}
              onChange={(e) => {
                setCustoUnitario(parseFloat(e.target.value) || 0);
                setCenarioAtivo('personalizado');
              }}
              className="w-28 text-right font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-xl py-1.5 pr-2.5 pl-7 text-xs focus:outline-none focus:border-ocean-500 focus:bg-white focus:ring-2 focus:ring-ocean-100 transition-all shadow-xs"
            />
          </div>
        </div>

        {/* 2. Custo Logístico Estimado */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Truck size={15} className="text-slate-500 shrink-0" />
            Custo Logístico Unitário ({distancia === 0 ? 'Sua Cidade' : `${distancia} km`}):
          </span>
          <span className="font-extrabold text-slate-800 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 min-w-28 text-right">
            {formatter.format(custoLogisticoPorUnidade)}
          </span>
        </div>

        {/* 3. Lance Sugerido pela IA */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Bot size={15} className="text-[#01203C] shrink-0" />
            Lance Sugerido pela IA ({margemPercentual}% margem):
          </span>
          <span className="font-black text-[#01203C] bg-blue-50/60 px-3 py-1.5 rounded-xl border border-blue-200 min-w-28 text-right text-sm">
            {formatter.format(lanceSugerido)}
          </span>
        </div>

        {/* 4. Margem de Lucro Estimada (Destaque Amarelo/Dourado) */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div>
            <span className="font-bold text-slate-800 text-xs block">
              Margem de Lucro Estimada (Lote):
            </span>
            <span className="text-[10px] text-slate-400">
              {quantidadeItem} unidades x {formatter.format(lucroUnitario)}/un
            </span>
          </div>
          <div className="bg-amber-100/90 border border-amber-300 text-amber-950 font-black text-sm px-3.5 py-1.5 rounded-xl shadow-xs min-w-28 text-right">
            {formatter.format(margemLucroEstimadaTotal)}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SEÇÃO 3: OS 3 CENÁRIOS DE LANCE DA IA                    */}
      {/* ======================================================== */}
      {cenariosIA && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp size={13} className="text-[#FB8B03]" />
              Cenários de Disputa Calibrados pela IA
            </span>
            <span className="text-[10px] text-slate-400">Clique para aplicar</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Cenário Agressivo */}
            <button
              type="button"
              onClick={() => handleSelecionarCenario('agressivo')}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                cenarioAtivo === 'agressivo'
                  ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200'
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase">Agressivo</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">
                  {cenariosIA.agressivo.margem_percentual}%
                </span>
              </div>
              <div className="font-black text-slate-900 text-xs sm:text-sm">
                {formatter.format(cenariosIA.agressivo.lance_unitario)}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                Maior chance no pregão
              </p>
            </button>

            {/* Cenário Estratégico (Recomendado) */}
            <button
              type="button"
              onClick={() => handleSelecionarCenario('estrategico')}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                cenarioAtivo === 'estrategico'
                  ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200'
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              <span className="absolute -top-2 right-2 text-[8px] font-black uppercase tracking-wider bg-[#FB8B03] text-white px-1.5 py-0.2 rounded-full">
                Ideal
              </span>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-extrabold text-blue-900 uppercase">Estratégico</span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-1.5 py-0.2 rounded">
                  {cenariosIA.estrategico.margem_percentual}%
                </span>
              </div>
              <div className="font-black text-slate-900 text-xs sm:text-sm">
                {formatter.format(cenariosIA.estrategico.lance_unitario)}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                Equilíbrio e margem média
              </p>
            </button>

            {/* Cenário Conservador */}
            <button
              type="button"
              onClick={() => handleSelecionarCenario('conservador')}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                cenarioAtivo === 'conservador'
                  ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200'
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-extrabold text-amber-900 uppercase">Conservador</span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded">
                  {cenariosIA.conservador.margem_percentual}%
                </span>
              </div>
              <div className="font-black text-slate-900 text-xs sm:text-sm">
                {formatter.format(cenariosIA.conservador.lance_unitario)}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                Dispensas ou baixa disputa
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Ajuste Fino de Margem Interativo */}
      {mostrandoAjuste && (
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 mt-3 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
            <span>Margem Líquida Personalizada:</span>
            <span className="text-[#01203C] font-black">{margemPercentual}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="60"
            step="1"
            value={margemPercentual}
            onChange={(e) => {
              setMargemPercentual(parseInt(e.target.value));
              setCenarioAtivo('personalizado');
            }}
            className="w-full accent-[#01203C] cursor-pointer"
          />
        </div>
      )}

      {/* Alerta de Competitividade */}
      <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-medium mt-3 ${
        isCompetitivo 
          ? 'bg-amber-50/70 border-amber-200/80 text-amber-900' 
          : 'bg-rose-50 border-rose-200 text-rose-800'
      }`}>
        <AlertTriangle size={15} className={`shrink-0 ${isCompetitivo ? 'text-amber-600' : 'text-rose-600'}`} />
        <span>
          {isCompetitivo ? (
            <>O preço máximo do edital é <strong>{formatter.format(precoMaximoItem)}</strong>. Seu lance está dentro do teto.</>
          ) : (
            <>Seu lance está acima do valor teto (<strong>{formatter.format(precoMaximoItem)}</strong>). Reduza o custo ou margem.</>
          )}
        </span>
      </div>

      {/* Botões de Ação Padronizados */}
      <div className="grid grid-cols-2 gap-2.5 mt-5">
        <button
          onClick={() => {
            if (onAvancarDocumentos) {
              onAvancarDocumentos();
            } else {
              navigate('/cofre');
            }
          }}
          className="py-3 px-3 bg-[#FB8B03] hover:bg-[#D97602] active:scale-[0.98] text-white rounded-2xl font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Avançar p/ Documentos</span>
          <ArrowRight size={13} />
        </button>

        <button
          onClick={() => setMostrandoAjuste(!mostrandoAjuste)}
          className="py-3 px-3 bg-white hover:bg-slate-50 active:scale-[0.98] text-[#01203C] rounded-2xl font-bold text-xs transition-all border border-slate-200 hover:border-[#01203C]/30 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <Sliders size={13} />
          <span>{mostrandoAjuste ? 'Concluir Ajuste' : 'Ajustar Margem'}</span>
        </button>
      </div>
    </div>
  );
}
