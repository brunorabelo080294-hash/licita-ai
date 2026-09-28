export interface Municipio {
  nome: string;
  uf: string;
  codigoIbge: string;
  latitude: number;
  longitude: number;
  brasaoUrl?: string;
}

export interface Empresa {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnaes: string[];
  cnaePrincipal?: string;
  cnaeDescricao?: string;
  categoriaPrincipal?: 'construcao' | 'alimentos' | 'limpeza' | 'ti' | 'saude' | 'veiculos' | 'geral';
  categoriaNome?: string;
  endereco: string;
  municipio?: string;
  uf?: string;
  latitude?: number;
  longitude?: number;
  raioEntregaKm: number;
}

export interface ItemLicitacao {
  numero: number;
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitarioMax: number;
  valorTotalMax?: number;
}

export interface AdimplenciaPrefeitura {
  tempoMedioDias: number;
  status: 'otimo' | 'bom' | 'regular' | 'risco';
  descricao: string;
  scoreTce: number; // 0 a 10 (Tribunal de Contas)
  percentualPontualidade: number; // ex: 94%
}

export interface EditalCompleto {
  preambulo: string;
  justificativa: string;
  requisitosHabilitacao: string[];
  condicoesPagamento: string;
  criterioJulgamento: string;
  localExecucao: string;
  prazoExecucao: string;
}

export interface Oportunidade {
  id: string;
  numeroControlePNCP?: string;
  municipio: Municipio;
  orgao: string;
  numeroProcesso: string;
  numeroEdital: string;
  categoria: 'construcao' | 'alimentos' | 'limpeza' | 'ti' | 'saude' | 'veiculos' | 'geral';
  objetoOriginal: string;
  objetoResumido: string;
  valorMaximo: number;
  modalidade: 'dispensa' | 'pregao' | 'concorrencia' | 'srp' | 'inexigibilidade' | 'credenciamento' | 'leilao' | 'concurso' | 'dialogo_competitivo' | 'pre_qualificacao' | 'manifestacao_interesse' | 'outros';
  dataAbertura: string;
  dataEncerramento: string;
  statusPrazo?: 'aberta' | 'futura' | 'encerrada';
  urlEdital: string;
  urlPncp?: string;
  linkSistemaOrigem?: string;
  nomeSistemaOrigem?: string;
  portalSlug?: string;
  portalNome?: string;
  portalNomeCurto?: string;
  portalCor?: string;
  portalBgCor?: string;
  portalBordaCor?: string;
  exclusivoMpe: boolean;
  distanciaKm: number;
  vantagemLc123: boolean;
  adimplencia: AdimplenciaPrefeitura;
  itens?: ItemLicitacao[];
  editalCompleto?: EditalCompleto;
  catmatReferencia?: CATMATReferencia;
}

export interface FornecedorVencedorCATMAT {
  razao_social?: string;
  razaoSocial?: string;
  cnpj: string;
  municipio: string;
  uf: string;
  orgao_comprador?: string;
  orgaoComprador?: string;
  data_homologacao?: string;
  dataHomologacao?: string;
  preco_unitario_homologado?: number;
  precoUnitarioHomologado?: number;
  numero_edital?: string;
  numeroEdital?: string;
  portal_origem?: string;
  portalOrigem?: string;
}

export interface CATMATReferencia {
  codigo_catmat?: string;
  codigoCatmat?: string;
  codigo_pdm?: string;
  codigoPdm?: string;
  descricao_item?: string;
  descricaoItem?: string;
  unidade_medida?: string;
  unidadeMedida?: string;
  categoria: string;
  preco_minimo?: number;
  precoMinimo?: number;
  preco_medio?: number;
  precoMedio?: number;
  preco_maximo?: number;
  precoMaximo?: number;
  preco_mediana?: number;
  precoMediana?: number;
  desvio_padrao?: number;
  desvioPadrao?: number;
  total_homologacoes?: number;
  totalHomologacoes?: number;
  fornecedores_vencedores?: FornecedorVencedorCATMAT[];
  fornecedoresVencedores?: FornecedorVencedorCATMAT[];
}

export type KanbanEtapa = 'encontrada' | 'em_analise' | 'proposta' | 'disputa' | 'ganha' | 'perdida';

export interface ItemKanban {
  id: string; // ID da oportunidade
  oportunidade: Oportunidade;
  etapa: KanbanEtapa;
  observacao?: string;
  empresaCnpj: string;
  adicionadoEm: string;
  atualizadoEm: string;
}

export interface StatusCND {
  id: string;
  tipo: string;
  nome: string;
  status: 'valido' | 'vencendo' | 'vencido';
  dataEmissao: string;
  dataValidade: string;
  diasRestantes: number;
  arquivoNome?: string;
  arquivoUrl?: string;
}

export interface MensagemChat {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
