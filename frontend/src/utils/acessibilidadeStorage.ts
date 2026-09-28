/**
 * Gerenciador de Acessibilidade Visual para Baixa Visão
 * Salva no localStorage e aplica classes no elemento <html>
 */

export type TextSize = 'normal' | 'grande' | 'extragrande';

const STORAGE_SIZE_KEY = 'licita_ai_text_size';
const STORAGE_BOLD_KEY = 'licita_ai_text_bold';

export function getTextSize(): TextSize {
  try {
    const val = localStorage.getItem(STORAGE_SIZE_KEY);
    if (val === 'grande' || val === 'extragrande' || val === 'normal') {
      return val;
    }
  } catch {}
  return 'normal';
}

export function getTextBold(): boolean {
  try {
    return localStorage.getItem(STORAGE_BOLD_KEY) === 'true';
  } catch {}
  return false;
}

export function aplicarAcessibilidade(size: TextSize, bold: boolean) {
  try {
    const root = document.documentElement;
    root.setAttribute('data-text-size', size);
    root.setAttribute('data-text-bold', bold ? 'true' : 'false');

    localStorage.setItem(STORAGE_SIZE_KEY, size);
    localStorage.setItem(STORAGE_BOLD_KEY, bold ? 'true' : 'false');

    // Notifica outros componentes da aplicação
    window.dispatchEvent(new CustomEvent('acessibilidade_alterada', {
      detail: { size, bold }
    }));
  } catch (e) {
    console.error('Erro ao aplicar acessibilidade:', e);
  }
}

export function alternarCicloFonte(): { size: TextSize; bold: boolean; label: string } {
  const currentSize = getTextSize();
  const currentBold = getTextBold();

  // Ciclo intuitivo com 1 clique:
  // 1. Normal -> 2. Grande -> 3. Grande & Negrito -> volta para Normal
  if (currentSize === 'normal' && !currentBold) {
    aplicarAcessibilidade('grande', false);
    return { size: 'grande', bold: false, label: 'Grande' };
  } else if (currentSize === 'grande' && !currentBold) {
    aplicarAcessibilidade('grande', true);
    return { size: 'grande', bold: true, label: 'Negrito' };
  } else if (currentSize === 'grande' && currentBold) {
    aplicarAcessibilidade('extragrande', true);
    return { size: 'extragrande', bold: true, label: 'Extra G' };
  } else {
    aplicarAcessibilidade('normal', false);
    return { size: 'normal', bold: false, label: 'Normal' };
  }
}

export function initAcessibilidade() {
  const size = getTextSize();
  const bold = getTextBold();
  aplicarAcessibilidade(size, bold);
}
