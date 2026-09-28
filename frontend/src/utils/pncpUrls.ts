/**
 * Utilitários para tratamento e normalização de URLs e Status do PNCP
 * Portal Nacional de Contratações Públicas (Governo Federal)
 */

export function formatarUrlPncpWeb(numeroControleOuUrl?: string): string {
  if (!numeroControleOuUrl) return 'https://pncp.gov.br/app/editais';
  const str = numeroControleOuUrl.trim();

  // Caso 1: String com padrão de controle PNCP:
  // Ex: "17733643000147-1-000079/2026" ou "18140756000100-1-000188/2026"
  const matchControle = str.match(/(\d{14})-?\d*-?(\d{6})\/(\d{4})/);
  if (matchControle) {
    const [, cnpj, seq, ano] = matchControle;
    return `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${seq}`;
  }

  // Caso 2: URL do PNCP mas com formato com hífens que quebra no app PNCP:
  // Ex: "https://pncp.gov.br/app/editais/17733643000147-1-000079/2026"
  const matchUrlComHifen = str.match(/pncp\.gov\.br\/app\/editais\/(\d{14})-?\d*-?(\d{6})\/(\d{4})/);
  if (matchUrlComHifen) {
    const [, cnpj, seq, ano] = matchUrlComHifen;
    return `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${seq}`;
  }

  // Caso 3: Já é uma URL no padrão correto do PNCP ou outra URL válida
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }

  return 'https://pncp.gov.br/app/editais';
}

export function resolverUrlOrigem(oportunidade: {
  linkSistemaOrigem?: string;
  nomeSistemaOrigem?: string;
  urlPncp?: string;
  urlEdital?: string;
  id: string;
  numeroControlePNCP?: string;
}): { url: string; nome: string; isOficialPncp: boolean } {
  const pncpOficial = formatarUrlPncpWeb(oportunidade.numeroControlePNCP || oportunidade.id || oportunidade.urlPncp);
  const linkOrigem = (oportunidade.linkSistemaOrigem || '').trim();

  // Se tiver link externo de sistema de compras (Comprasnet, ComprasPublicas, etc.)
  if (
    linkOrigem && 
    (linkOrigem.startsWith('http://') || linkOrigem.startsWith('https://')) && 
    !linkOrigem.includes('pncp.gov.br/app/editais/') // Se não for apenas a rota do PNCP duplicada
  ) {
    let nome = oportunidade.nomeSistemaOrigem?.trim() || 'Portal de Compras';
    if (linkOrigem.includes('comprasnet') || linkOrigem.includes('serpro.gov.br') || linkOrigem.includes('compras.gov.br')) {
      nome = 'Comprasnet (Compras.gov.br)';
    } else if (linkOrigem.includes('portaldecompraspublicas')) {
      nome = 'Portal de Compras Públicas';
    } else if (linkOrigem.includes('bllcompras') || linkOrigem.includes('bll.org.br')) {
      nome = 'BLL Compras';
    } else if (linkOrigem.includes('licitacoes-e') || linkOrigem.includes('bb.com.br')) {
      nome = 'Licitações-e (Banco do Brasil)';
    } else if (linkOrigem.includes('ammlicita')) {
      nome = 'AMM Licita';
    }
    return { url: linkOrigem, nome, isOficialPncp: false };
  }

  // Fallback seguro: URL oficial do edital no PNCP
  return { 
    url: pncpOficial, 
    nome: oportunidade.nomeSistemaOrigem?.trim() || 'Acessar no PNCP Oficial', 
    isOficialPncp: true 
  };
}

export function calcularStatusPrazo(dataEncerramentoStr?: string, dataAberturaStr?: string): {
  status: 'aberta' | 'futura' | 'encerrada';
  badgeLabel: string;
  badgeColor: string;
  textoPrazo: string;
  diasRestantes: number;
} {
  const agora = new Date();

  // Verifica data de encerramento
  if (dataEncerramentoStr) {
    try {
      const dataFim = new Date(dataEncerramentoStr);
      if (!isNaN(dataFim.getTime())) {
        const diffMs = dataFim.getTime() - agora.getTime();
        const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const diffHoras = Math.ceil(diffMs / (1000 * 60 * 60));

        if (diffMs > 0) {
          const isAnoSeguinte = dataFim.getFullYear() > agora.getFullYear();
          // Formata com ano completo se for de outro ano ou prazo estendido
          const dataFmt = (isAnoSeguinte || diffDias > 45)
            ? dataFim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : dataFim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          const horaFmt = dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

          if (diffHoras <= 24) {
            return {
              status: 'aberta',
              badgeLabel: '⚡ Encerra Hoje',
              badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
              textoPrazo: `Encerra hoje às ${horaFmt}`,
              diasRestantes: 0
            };
          }

          const textoPrazo = isAnoSeguinte
            ? `Aberto até ${dataFmt} (Vence em ${dataFim.getFullYear()} • ${diffDias} dias)`
            : diffDias > 60
              ? `Vigência até ${dataFmt} às ${horaFmt} (${diffDias} dias restantes)`
              : `Encerra em ${diffDias} dias (${dataFmt} às ${horaFmt})`;

          return {
            status: 'aberta',
            badgeLabel: isAnoSeguinte ? '🟢 Aberto / Vigente' : '🟢 Recebendo Propostas',
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            textoPrazo: textoPrazo,
            diasRestantes: diffDias
          };
        }
      }
    } catch {
      // Ignora erro de parse
    }
  }

  // Verifica data de abertura futura
  if (dataAberturaStr) {
    try {
      const dataIni = new Date(dataAberturaStr);
      if (!isNaN(dataIni.getTime()) && dataIni.getTime() > agora.getTime()) {
        const diffMs = dataIni.getTime() - agora.getTime();
        const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const dataFmt = dataIni.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const horaFmt = dataIni.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        return {
          status: 'futura',
          badgeLabel: '🔵 Abertura em Breve',
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
          textoPrazo: `Abre em ${diffDias} dias (${dataFmt} às ${horaFmt})`,
          diasRestantes: diffDias
        };
      }
    } catch {
      // Ignora erro
    }
  }

  // Se chegou aqui, já encerrou
  let encerrouEm = '';
  if (dataEncerramentoStr) {
    try {
      const d = new Date(dataEncerramentoStr);
      if (!isNaN(d.getTime())) {
        encerrouEm = d.toLocaleDateString('pt-BR');
      }
    } catch {}
  }

  return {
    status: 'encerrada',
    badgeLabel: '⚪ Prazo Encerrado',
    badgeColor: 'bg-slate-100 text-slate-600 border-slate-300',
    textoPrazo: encerrouEm ? `Encerrada em ${encerrouEm}` : 'Encerrada',
    diasRestantes: -1
  };
}
