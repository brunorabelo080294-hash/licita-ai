/**
 * Utilitário de Armazenamento e Atualização de CNDs e Documentações
 */
import { StatusCND } from '../types';
import { mockCNDs } from '../data/mockData';

const CND_STORAGE_KEY = 'licita_ai_cnds_documentos';

// Links oficiais do Governo para emissão imediata de certidões
export const LINKS_EMISSAO_OFICIAL: Record<string, { nome: string; url: string; orgao: string }> = {
  federal: {
    nome: 'Receita Federal & PGFN',
    url: 'https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir',
    orgao: 'Ministério da Fazenda'
  },
  trabalhista: {
    nome: 'CNDT - Débitos Trabalhistas (TST)',
    url: 'https://cndt-certidao.tst.jus.br/inicio.faces',
    orgao: 'Tribunal Superior do Trabalho'
  },
  fgts: {
    nome: 'CRF - Certificado de Regularidade FGTS',
    url: 'https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf',
    orgao: 'Caixa Econômica Federal'
  },
  estadual: {
    nome: 'Certidão Negativa SEF/MG',
    url: 'https://www2.fazenda.mg.gov.br/sol/ctrl/SOL/CDT/SERVICO_829?ACTION=INICIAR',
    orgao: 'Secretaria de Estado de Fazenda de Minas Gerais'
  },
  municipal: {
    nome: 'Tributos Municipais (Leopoldina/MG)',
    url: 'https://leopoldina.mg.gov.br/',
    orgao: 'Prefeitura Municipal de Leopoldina'
  }
};

export function calcularStatusCnd(dataValidadeStr: string): { status: 'valido' | 'vencendo' | 'vencido'; diasRestantes: number } {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const partes = dataValidadeStr.split('-');
    const validade = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    validade.setHours(0, 0, 0, 0);

    const diffMs = validade.getTime() - hoje.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      return { status: 'vencido', diasRestantes: diffDias };
    }
    if (diffDias <= 15) {
      return { status: 'vencendo', diasRestantes: diffDias };
    }
    return { status: 'valido', diasRestantes: diffDias };
  } catch {
    return { status: 'valido', diasRestantes: 60 };
  }
}

export function getListaCNDs(): StatusCND[] {
  try {
    const raw = localStorage.getItem(CND_STORAGE_KEY);
    if (raw) {
      const parsed: StatusCND[] = JSON.parse(raw);
      // Recalcula dias e status em tempo real com base no dia de hoje
      return parsed.map(cnd => {
        const { status, diasRestantes } = calcularStatusCnd(cnd.dataValidade);
        return { ...cnd, status, diasRestantes };
      });
    }
  } catch (e) {
    console.error('Erro ao ler CNDs do localStorage:', e);
  }

  // Preenche dados padrão se não houver no storage
  const base = mockCNDs.map(cnd => {
    const { status, diasRestantes } = calcularStatusCnd(cnd.dataValidade);
    return { ...cnd, status, diasRestantes };
  });
  salvarListaCNDs(base);
  return base;
}

export function salvarListaCNDs(cnds: StatusCND[]) {
  try {
    localStorage.setItem(CND_STORAGE_KEY, JSON.stringify(cnds));
    window.dispatchEvent(new CustomEvent('cnds_alteradas', { detail: cnds }));
  } catch (e) {
    console.error('Erro ao salvar CNDs no localStorage:', e);
  }
}

export function atualizarDocumentoCnd(
  id: string, 
  novaDataValidade: string, 
  arquivoNome?: string,
  arquivoUrl?: string
): StatusCND[] {
  const lista = getListaCNDs();
  const hojeStr = new Date().toISOString().split('T')[0];

  const atualizada = lista.map(cnd => {
    if (cnd.id === id) {
      const { status, diasRestantes } = calcularStatusCnd(novaDataValidade);
      return {
        ...cnd,
        dataEmissao: hojeStr,
        dataValidade: novaDataValidade,
        diasRestantes,
        status,
        arquivoNome: arquivoNome || cnd.arquivoNome,
        arquivoUrl: arquivoUrl || cnd.arquivoUrl,
      };
    }
    return cnd;
  });

  salvarListaCNDs(atualizada);
  return atualizada;
}

export function adicionarDocumentoCnd(novo: StatusCND): StatusCND[] {
  const lista = getListaCNDs();
  const { status, diasRestantes } = calcularStatusCnd(novo.dataValidade);
  const completo: StatusCND = {
    ...novo,
    id: novo.id || String(Date.now()),
    status,
    diasRestantes
  };
  const atualizada = [...lista, completo];
  salvarListaCNDs(atualizada);
  return atualizada;
}
