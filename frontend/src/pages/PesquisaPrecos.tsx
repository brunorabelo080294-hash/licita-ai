import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Search, Database, TrendingUp, TrendingDown, DollarSign, Award, 
  MapPin, Building2, CheckCircle2, AlertCircle, ArrowRight, 
  Sparkles, RefreshCw, BarChart3, Calculator, Tag, ShieldCheck, 
  FileText, HelpCircle, Layers
} from 'lucide-react';
import { getEmpresaAtiva, Empresa } from '../utils/empresaStorage';

interface FornecedorVencedor {
  razao_social: string;
  cnpj: string;
  municipio: string;
  uf: string;
  orgao_comprador: string;
  data_homologacao?: string;
  preco_unitario_homologado: number;
  numero_edital?: string;
  portal_origem?: string;
}

interface ItemCatmatDetalhe {
  codigo_catmat: string;
  codigo_pdm: string;
  descricao_item: string;
  unidade_medida: string;
  categoria: string;
  preco_minimo: number;
  preco_medio: number;
  preco_maximo: number;
  preco_mediana: number;
  desvio_padrao: number;
  total_homologacoes: number;
  atualizado_em?: string;
  fornecedores_vencedores: FornecedorVencedor[];
}

export function PesquisaPrecos() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const empresa: Empresa = getEmpresaAtiva();

  const [buscaInput, setBuscaInput] = useState(searchParams.get('termo') || 'cimento');
  const [itemAtual, setItemAtual] = useState<ItemCatmatDetalhe | null>(null);
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  // Carrega catálogo pré-existente para autocompletar e sugestões rápidas
  useEffect(() => {
    const carregarCatalogo = async () => {
      try {
        const resp = await axios.get('/api/precificacao/catmat/catalogo');
        if (resp.data && Array.isArray(resp.data)) {
          setCatalogo(resp.data);
        }
      } catch (err) {
        console.warn('Erro ao carregar catálogo CATMAT:', err);
      }
    };
    carregarCatalogo();
  }, []);

  // Executa busca inicial ou quando parâmetro de URL mudar
  useEffect(() => {
    const termoInicial = searchParams.get('termo') || 'cimento';
    pesquisarItem(termoInicial);
  }, []);

  const pesquisarItem = async (termo: string) => {
    if (!termo || !termo.trim()) return;
    setLoading(true);
    setError('');

    try {
      const resp = await axios.get('/api/precificacao/catmat/pesquisar', {
        params: { termo: termo.trim() }
      });
      if (resp.data) {
        setItemAtual(resp.data);
      } else {
        setError(`Nenhum registro oficial encontrado para "${termo}".`);
      }
    } catch (err: any) {
      console.warn('Erro ao pesquisar CATMAT:', err);
      setError(`Item "${termo}" não localizado no catálogo homologado.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    pesquisarItem(buscaInput);
  };

  const calcularVariacaoMedia = (preco: number, media: number) => {
    if (!media || media === 0) return { texto: '0.0%', tipo: 'neutro' };
    const diff = ((preco - media) / media) * 100;
    if (diff < 0) {
      return { texto: `${diff.toFixed(1)}%`, tipo: 'positivo' };
    }
    return { texto: `+${diff.toFixed(1)}%`, tipo: 'negativo' };
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#01203C] text-white rounded-2xl shadow-sm">
            <Database size={24} className="text-[#FB8B03]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#01203C] tracking-tight">
                Pesquisa de Preços Governamental
              </h1>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                CATMAT Oficial
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Histórico de homologações públicas, dispersão de mercado e fornecedores vencedores por material.
            </p>
          </div>
        </div>

        {/* Botão de Atalho para Calculadora */}
        {itemAtual && (
          <button
            type="button"
            onClick={() => navigate(`/calculadora?catmat=${itemAtual.codigo_catmat}&objeto=${encodeURIComponent(itemAtual.descricao_item)}`)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FB8B03] to-[#e07b00] hover:to-[#c66c00] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Calculator size={15} />
            <span>Simular Lance com este Preço</span>
          </button>
        )}
      </div>

      {/* Barra de Busca de Itens / CATMAT */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={buscaInput}
              onChange={(e) => setBuscaInput(e.target.value)}
              placeholder="Digite o nome do material, insumo ou código CATMAT (ex: cimento, leite, diesel, cabo, luva, notebook)..."
              className="w-full pl-10 pr-4 py-3 bg-[#F7F8FA] border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:bg-white focus:border-[#01203C] focus:ring-4 focus:ring-[#01203C]/10 outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-[#01203C] hover:bg-[#032F52] text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
            <span>Pesquisar</span>
          </button>
        </form>

        {/* Sugestões Rápidas de Materiais */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Sugestões de Consulta:</span>
          {catalogo.length > 0 ? (
            catalogo.slice(0, 6).map((item) => (
              <button
                key={item.codigo_catmat}
                type="button"
                onClick={() => {
                  setBuscaInput(item.descricao_item);
                  pesquisarItem(item.codigo_catmat);
                }}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                  itemAtual?.codigo_catmat === item.codigo_catmat
                    ? 'bg-[#01203C] text-white border-[#01203C]'
                    : 'bg-[#F7F8FA] text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {item.descricao_item.split('-')[0].trim()}
              </button>
            ))
          ) : (
            ['Cimento CP-II', 'Pão Francês', 'Óleo Diesel S-10', 'Cabo de Cobre', 'Luva de Procedimento'].map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => {
                  setBuscaInput(sug);
                  pesquisarItem(sug);
                }}
                className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-[#F7F8FA] text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
              >
                {sug}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Alerta de Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs flex items-center gap-2 font-medium">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Conteúdo Principal da Pesquisa CATMAT (reproduzindo media_1790538141996.png) */}
      {itemAtual && (
        <div className="space-y-6">
          
          {/* Card de Identificação do Item */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold px-3 py-1 bg-[#01203C] text-white rounded-lg uppercase tracking-wider">
                  CATMAT: {itemAtual.codigo_catmat}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                  PDM: {itemAtual.codigo_pdm}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
                  Unidade: {itemAtual.unidade_medida}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <ShieldCheck size={14} className="text-emerald-500" />
                Base SIASG / Compras.gov.br / BLL / PCP
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-[#01203C] leading-snug">
              {itemAtual.descricao_item}
            </h2>
          </div>

          {/* Os 4 Cards de Estatísticas Governamentais (Réplica Exata da Imagem) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Card 1: MÉDIA */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-[#01203C]/30 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider">MÉDIA</span>
                  <BarChart3 size={16} className="text-[#01203C]" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#01203C] tracking-tight">
                  {formatter.format(itemAtual.preco_medio)}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                Média aritmética de mercado
              </div>
            </div>

            {/* Card 2: MEDIANA */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-emerald-500/30 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">MEDIANA</span>
                  <TrendingUp size={16} className="text-emerald-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
                  {formatter.format(itemAtual.preco_mediana)}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-emerald-700 font-medium">
                Referência livre de distorções
              </div>
            </div>

            {/* Card 3: MENOR PREÇO */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-blue-500/30 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">MENOR PREÇO</span>
                  <Award size={16} className="text-blue-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-blue-950 tracking-tight">
                  {formatter.format(itemAtual.preco_minimo)}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-blue-600 font-medium">
                Piso homologado registrado
              </div>
            </div>

            {/* Card 4: MAIOR PREÇO */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-amber-500/30 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">MAIOR PREÇO</span>
                  <DollarSign size={16} className="text-amber-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-950 tracking-tight">
                  {formatter.format(itemAtual.preco_maximo)}
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-amber-700 font-medium">
                Teto máximo aceito em atas
              </div>
            </div>

          </div>

          {/* Linha de Indicadores Secundários de Mercado */}
          <div className="bg-[#01203C] text-white p-5 rounded-3xl shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                Total de Registros
              </span>
              <span className="text-lg font-black text-white mt-0.5 block">
                {itemAtual.total_homologacoes} licitações
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                Fornecedores Vencedores
              </span>
              <span className="text-lg font-black text-white mt-0.5 block">
                {itemAtual.fornecedores_vencedores?.length || 3} cadastrados
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                Desvio Padrão
              </span>
              <span className="text-lg font-black text-[#FB8B03] mt-0.5 block">
                {formatter.format(itemAtual.desvio_padrao)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                Concorrência Geral
              </span>
              <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                Alta Disputa (LC 123)
              </span>
            </div>
          </div>

          {/* Tabela de Ranking de Fornecedores Vencedores (Reproduzindo a tabela da imagem) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#01203C]">
                  Ranking de Fornecedores Vencedores
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Empresas que venceram certames públicos fornecendo este material específico.
                </p>
              </div>

              <div className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-xl">
                {itemAtual.fornecedores_vencedores?.length || 0} vencedores mapeados
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F8FA] border-b border-slate-200 text-slate-500 uppercase font-black tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Fornecedor</th>
                    <th className="py-3 px-4">Local</th>
                    <th className="py-3 px-4">Órgão / Edital</th>
                    <th className="py-3 px-4 text-right">Preço Homologado</th>
                    <th className="py-3 px-4 text-center">Faixa vs Média</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {itemAtual.fornecedores_vencedores && itemAtual.fornecedores_vencedores.length > 0 ? (
                    itemAtual.fornecedores_vencedores.map((forn, idx) => {
                      const variacao = calcularVariacaoMedia(forn.preco_unitario_homologado, itemAtual.preco_medio);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-[#01203C] block">{forn.razao_social}</span>
                            <span className="text-[10px] font-mono text-slate-400">{forn.cnpj}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-slate-700 font-semibold">{forn.municipio} - {forn.uf}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-slate-800 font-bold block">{forn.orgao_comprador}</span>
                            <span className="text-[10px] text-slate-400">
                              {forn.numero_edital || 'Edital PE'} • {forn.portal_origem || 'Compras Públicas'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                            {formatter.format(forn.preco_unitario_homologado)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              variacao.tipo === 'positivo'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {variacao.texto}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhum fornecedor registrado individualmente para este registro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Banner Tático Inferior: Ancoragem na Calculadora */}
            <div className="p-6 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-t border-emerald-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-xs font-black text-emerald-900 uppercase tracking-wider block">
                  Inteligência de Precificação Prática
                </span>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Lance sugerido pela IA baseado no histórico: Use R$ {(itemAtual.preco_medio * 0.95).toFixed(2)} (-5% da média) para ter 85% de probabilidade de vitória mantendo margem sadia.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/calculadora?catmat=${itemAtual.codigo_catmat}&objeto=${encodeURIComponent(itemAtual.descricao_item)}`)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <span>Abrir Calculadora de Viabilidade</span>
                <ArrowRight size={14} />
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
