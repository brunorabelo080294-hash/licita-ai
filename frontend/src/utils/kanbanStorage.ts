import { ItemKanban, KanbanEtapa, Oportunidade } from '../types';

const STORAGE_PREFIX = 'licita_ai_kanban_';

export const ETAPAS_CONFIG: Record<KanbanEtapa, { label: string; cor: string; bgCor: string; bordaCor: string; descricao: string }> = {
  encontrada: {
    label: 'ENCONTRADA',
    cor: '#1E8E5A',
    bgCor: '#EAF7EE',
    bordaCor: '#A3E2BE',
    descricao: 'Oportunidades identificadas nos 11 portais compatíveis com o seu raio e CNAE.'
  },
  em_analise: {
    label: 'EM ANÁLISE',
    cor: '#334155',
    bgCor: '#F1F5F9',
    bordaCor: '#CBD5E1',
    descricao: 'Estudo do edital, viabilidade técnica, margem governamental CATMAT e exigências de CND.'
  },
  proposta: {
    label: 'PROPOSTA',
    cor: '#0284C7',
    bgCor: '#F0F9FF',
    bordaCor: '#BAE6FD',
    descricao: 'Elaboração da planilha de formação de preços e separação dos documentos no Cofre.'
  },
  disputa: {
    label: 'DISPUTA',
    cor: '#01203C',
    bgCor: '#EBF2FF',
    bordaCor: '#93C5FD',
    descricao: 'Pregão eletrônico / fase de lances ativa na sala de disputa do portal licitante.'
  },
  ganha: {
    label: 'GANHA',
    cor: '#059669',
    bgCor: '#ECFDF5',
    bordaCor: '#A7F3D0',
    descricao: 'Proposta vencedora arrematada, aguardando adjudicação, homologação e empenho.'
  },
  perdida: {
    label: 'PERDIDA',
    cor: '#94A3B8',
    bgCor: '#F8FAFC',
    bordaCor: '#E2E8F0',
    descricao: 'Certame finalizado sem vitória ou com desistência estratégica fundamentada.'
  }
};

function getStorageKey(cnpj: string): string {
  const limpo = (cnpj || 'default').replace(/\D/g, '') || 'default';
  return `${STORAGE_PREFIX}${limpo}`;
}

export function getItensKanban(cnpj: string): ItemKanban[] {
  try {
    const raw = localStorage.getItem(getStorageKey(cnpj));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function salvarItensKanban(cnpj: string, itens: ItemKanban[]): void {
  try {
    localStorage.setItem(getStorageKey(cnpj), JSON.stringify(itens));
    window.dispatchEvent(new CustomEvent('kanban_alterado', { detail: { cnpj, itens } }));
  } catch (err) {
    console.error('Falha ao salvar Kanban:', err);
  }
}

export function adicionarAoKanban(oportunidade: Oportunidade, cnpj: string, etapa: KanbanEtapa = 'encontrada'): ItemKanban {
  const itens = getItensKanban(cnpj);
  const index = itens.findIndex(it => it.id === oportunidade.id);
  const agora = new Date().toISOString();

  if (index >= 0) {
    itens[index].etapa = etapa;
    itens[index].atualizadoEm = agora;
    itens[index].oportunidade = oportunidade;
    salvarItensKanban(cnpj, itens);
    return itens[index];
  }

  const novoItem: ItemKanban = {
    id: oportunidade.id,
    oportunidade,
    etapa,
    observacao: '',
    empresaCnpj: cnpj,
    adicionadoEm: agora,
    atualizadoEm: agora
  };

  itens.unshift(novoItem);
  salvarItensKanban(cnpj, itens);
  return novoItem;
}

export function moverEtapaKanban(id: string, novaEtapa: KanbanEtapa, cnpj: string): void {
  const itens = getItensKanban(cnpj);
  const item = itens.find(it => it.id === id);
  if (item) {
    item.etapa = novaEtapa;
    item.atualizadoEm = new Date().toISOString();
    salvarItensKanban(cnpj, itens);
  }
}

export function atualizarObservacaoKanban(id: string, observacao: string, cnpj: string): void {
  const itens = getItensKanban(cnpj);
  const item = itens.find(it => it.id === id);
  if (item) {
    item.observacao = observacao;
    item.atualizadoEm = new Date().toISOString();
    salvarItensKanban(cnpj, itens);
  }
}

export function removerDoKanban(id: string, cnpj: string): void {
  const itens = getItensKanban(cnpj).filter(it => it.id !== id);
  salvarItensKanban(cnpj, itens);
}

export function isOportunidadeNoKanban(id: string, cnpj: string): boolean {
  const itens = getItensKanban(cnpj);
  return itens.some(it => it.id === id);
}

export function getEtapaOportunidade(id: string, cnpj: string): KanbanEtapa | null {
  const itens = getItensKanban(cnpj);
  const match = itens.find(it => it.id === id);
  return match ? match.etapa : null;
}

/**
 * Garante que a empresa ativa tenha um conjunto de licitações reais demonstrando
 * todas as colunas do Kanban caso esteja vazio na primeira abertura.
 */
export function inicializarKanbanComSementes(cnpj: string, oportunidadesBase: Oportunidade[]): void {
  const existentes = getItensKanban(cnpj);
  if (existentes.length > 0 || !oportunidadesBase || oportunidadesBase.length === 0) {
    return;
  }

  const etapasSeq: KanbanEtapa[] = ['encontrada', 'encontrada', 'em_analise', 'proposta', 'disputa', 'ganha'];
  const novos: ItemKanban[] = [];
  const agora = new Date().toISOString();

  oportunidadesBase.slice(0, 10).forEach((op, idx) => {
    const etapa = etapasSeq[idx % etapasSeq.length];
    novos.push({
      id: op.id,
      oportunidade: op,
      etapa,
      observacao: idx === 2 ? 'Verificado no edital: atestado técnico de 50% obrigatório' : idx === 4 ? 'Disputa às 09:30 no Portal de Compras Públicas' : '',
      empresaCnpj: cnpj,
      adicionadoEm: agora,
      atualizadoEm: agora
    });
  });

  salvarItensKanban(cnpj, novos);
}
