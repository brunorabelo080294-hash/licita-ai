import { Empresa } from '../types';
export type { Empresa };

export function identificarCategoriaCnae(cnaeCodigo: string, cnaeDescricao: string = ''): { 
  categoria: 'construcao' | 'alimentos' | 'limpeza' | 'ti' | 'saude' | 'veiculos' | 'geral'; 
  nome: string; 
  emoji: string; 
} {
  const code = (cnaeCodigo || '').replace(/\D/g, '');
  const desc = (cnaeDescricao || '').toLowerCase();

  // Alimentos / Padaria / Merenda Escolar
  if (
    code.startsWith('10') || 
    code.startsWith('56') || 
    code.startsWith('4721') || 
    code.startsWith('4722') || 
    code.startsWith('4729') ||
    code.startsWith('472') ||
    desc.includes('padaria') || 
    desc.includes('confeitaria') || 
    desc.includes('alimento') || 
    desc.includes('pão') || 
    desc.includes('refeic') || 
    desc.includes('restaurante') ||
    desc.includes('lanche')
  ) {
    return { categoria: 'alimentos', nome: 'Alimentos & Padaria', emoji: '🍞' };
  }

  // Construção Civil / Obras / Engenharia
  if (
    code.startsWith('41') || 
    code.startsWith('42') || 
    code.startsWith('43') || 
    code.startsWith('71') || 
    desc.includes('constru') || 
    desc.includes('edif') || 
    desc.includes('engenharia') || 
    desc.includes('obra') ||
    desc.includes('reforma') ||
    desc.includes('alvenaria')
  ) {
    return { categoria: 'construcao', nome: 'Construção Civil & Obras', emoji: '🏗️' };
  }

  // Limpeza & Conservação
  if (code.startsWith('81') || desc.includes('limpeza') || desc.includes('conserva')) {
    return { categoria: 'limpeza', nome: 'Limpeza & Conservação', emoji: '🧹' };
  }

  // Tecnologia da Informação
  if (code.startsWith('62') || code.startsWith('63') || desc.includes('software') || desc.includes('tecnologia') || desc.includes('computador')) {
    return { categoria: 'ti', nome: 'Tecnologia & TI', emoji: '💻' };
  }

  // Saúde & Medicamentos
  if (code.startsWith('86') || desc.includes('saúde') || desc.includes('medic') || desc.includes('hospitalar')) {
    return { categoria: 'saude', nome: 'Saúde & Farmacêutico', emoji: '🏥' };
  }

  // Veículos, Transportes & Combustíveis
  if (code.startsWith('45') || code.startsWith('473') || code.startsWith('49') || desc.includes('combustivel') || desc.includes('transporte') || desc.includes('veículo')) {
    return { categoria: 'veiculos', nome: 'Veículos & Transportes', emoji: '🚗' };
  }

  return { categoria: 'geral', nome: 'Comércio & Serviços', emoji: '📋' };
}

// EMPRESA 1 (CONSTRUÇÃO CIVIL): Realize Construção
export const EMPRESA_DEFAULT: Empresa = {
  cnpj: '57.106.488/0001-53',
  razaoSocial: 'Realize Construcao & Servicos LTDA',
  nomeFantasia: 'Realize Construção',
  cnaes: [
    '4120-4/00 - Construção de edifícios',
    '4330-4/04 - Serviços de pintura de edifícios em geral',
    '4399-1/03 - Obras de alvenaria',
  ],
  cnaePrincipal: '4120-4/00',
  cnaeDescricao: 'Construção de edifícios',
  categoriaPrincipal: 'construcao',
  categoriaNome: 'Construção Civil & Obras',
  endereco: 'Rua Manoel Lobato, 150, Sala B, Centro, Leopoldina - MG, CEP 36700-200',
  municipio: 'Leopoldina',
  uf: 'MG',
  latitude: -21.5316,
  longitude: -42.6428,
  raioEntregaKm: 100,
};

// EMPRESA 2 (ALIMENTAÇÃO / PADARIA): Sabor da Mata
export const EMPRESA_PADARIA: Empresa = {
  cnpj: '12.345.678/0001-90',
  razaoSocial: 'Padaria e Confeitaria Sabor da Mata LTDA',
  nomeFantasia: 'Panificadora Sabor da Mata',
  cnaes: [
    '1091-1/01 - Fabricação de produtos de panificação industrial',
    '4721-1/02 - Padaria e confeitaria com predominância de revenda',
    '5611-2/03 - Lanchonetes, casas de chá, de sucos e similares'
  ],
  cnaePrincipal: '1091-1/01',
  cnaeDescricao: 'Fabricação de produtos de panificação',
  categoriaPrincipal: 'alimentos',
  categoriaNome: 'Alimentos & Padaria',
  endereco: 'Praça General Osório, 45, Centro, Leopoldina - MG, CEP 36700-000',
  municipio: 'Leopoldina',
  uf: 'MG',
  latitude: -21.5316,
  longitude: -42.6428,
  raioEntregaKm: 80,
};

// EMPRESA 3 (SANTA MARIA MADALENA - RJ): Madalena Construções & Pavimentação
export const EMPRESA_MADALENA: Empresa = {
  cnpj: '35.892.144/0001-20',
  razaoSocial: 'Madalena Construções e Obras EIRELI',
  nomeFantasia: 'Madalena Construções & Pavimentação',
  cnaes: [
    '4120-4/00 - Construção de edifícios',
    '4211-1/01 - Obras de pavimentação asfáltica e rodovias',
    '4399-1/03 - Obras de alvenaria'
  ],
  cnaePrincipal: '4211-1/01',
  cnaeDescricao: 'Obras de pavimentação e construção',
  categoriaPrincipal: 'construcao',
  categoriaNome: 'Construção Civil & Pavimentação',
  endereco: 'Rua Coronel Manoel Portugal, 45, Centro, Santa Maria Madalena - RJ, CEP 28770-000',
  municipio: 'Santa Maria Madalena',
  uf: 'RJ',
  latitude: -21.9547,
  longitude: -42.0089,
  raioEntregaKm: 80,
};

// EMPRESA 4 (RIO GRANDE DO SUL - PORTO ALEGRE): Gaúcha Alimentos & Merenda
export const EMPRESA_GAUCHA: Empresa = {
  cnpj: '92.754.738/0001-62',
  razaoSocial: 'Gaúcha Alimentos e Suprimentos LTDA',
  nomeFantasia: 'Gaúcha Alimentos & Merenda',
  cnaes: [
    '1091-1/01 - Fabricação de produtos de panificação industrial',
    '4639-7/01 - Comércio atacadista de produtos alimentícios em geral',
    '4721-1/02 - Padaria e confeitaria com predominância de revenda'
  ],
  cnaePrincipal: '4639-7/01',
  cnaeDescricao: 'Comércio atacadista de produtos alimentícios em geral',
  categoriaPrincipal: 'alimentos',
  categoriaNome: 'Alimentos & Padaria',
  endereco: 'Avenida Farrapos, 1200, Floresta, Porto Alegre - RS, CEP 90220-004',
  municipio: 'Porto Alegre',
  uf: 'RS',
  latitude: -30.0346,
  longitude: -51.2177,
  raioEntregaKm: 50,
};

const STORAGE_KEY = 'licita_ai_empresa_ativa';
const LISTA_EMPRESAS_KEY = 'licita_ai_empresas_cadastradas';
const RAIO_STORAGE_KEY = 'licita_ai_raio_busca';

/**
 * Retorna a lista de todas as empresas cadastradas pelo usuário.
 * Se vazia, inicializa com as empresas de exemplo (Leopoldina, Santa Maria Madalena e Porto Alegre/RS).
 */
export function getListaEmpresas(): Empresa[] {
  try {
    const raw = localStorage.getItem(LISTA_EMPRESAS_KEY);
    if (raw) {
      const lista: Empresa[] = JSON.parse(raw);
      if (Array.isArray(lista) && lista.length > 0) {
        return lista.map(emp => {
          if (!emp.categoriaNome || !emp.categoriaPrincipal) {
            const info = identificarCategoriaCnae(emp.cnaePrincipal || '', emp.cnaeDescricao || '');
            emp.categoriaPrincipal = info.categoria;
            emp.categoriaNome = info.nome;
          }
          if (!emp.latitude || !emp.longitude) {
            if (emp.uf === 'RS' || emp.municipio === 'Porto Alegre') {
              emp.latitude = -30.0346;
              emp.longitude = -51.2177;
            } else if (emp.municipio === 'Santa Maria Madalena') {
              emp.latitude = -21.9547;
              emp.longitude = -42.0089;
            } else {
              emp.latitude = -21.5316;
              emp.longitude = -42.6428;
            }
          }
          return emp;
        });
      }
    }
  } catch (e) {
    console.error('Erro ao ler lista de empresas:', e);
  }

  // Inicialização padrão com as empresas cadastradas
  const inicial = [EMPRESA_DEFAULT, EMPRESA_PADARIA, EMPRESA_MADALENA, EMPRESA_GAUCHA];
  salvarListaEmpresas(inicial);
  return inicial;
}

export function salvarListaEmpresas(empresas: Empresa[]): void {
  try {
    localStorage.setItem(LISTA_EMPRESAS_KEY, JSON.stringify(empresas));
  } catch (e) {
    console.error('Erro ao salvar lista de empresas:', e);
  }
}

/**
 * Retorna a empresa ativa no momento
 */
export function getEmpresaAtiva(): Empresa {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const emp: Empresa = JSON.parse(raw);
      if (!emp.categoriaNome || !emp.categoriaPrincipal) {
        const info = identificarCategoriaCnae(emp.cnaePrincipal || '', emp.cnaeDescricao || '');
        emp.categoriaPrincipal = info.categoria;
        emp.categoriaNome = info.nome;
      }
      if (!emp.latitude || !emp.longitude) {
        emp.latitude = -21.5316;
        emp.longitude = -42.6428;
      }
      return emp;
    }
  } catch (e) {
    console.error('Erro ao ler empresa do localStorage:', e);
  }
  return EMPRESA_DEFAULT;
}

/**
 * Define e ativa uma empresa
 */
export function salvarEmpresaAtiva(empresa: Empresa): void {
  try {
    if (!empresa.categoriaPrincipal || !empresa.categoriaNome) {
      const info = identificarCategoriaCnae(empresa.cnaePrincipal || '', empresa.cnaeDescricao || '');
      empresa.categoriaPrincipal = info.categoria;
      empresa.categoriaNome = info.nome;
    }
    if (!empresa.latitude || !empresa.longitude) {
      empresa.latitude = -21.5316;
      empresa.longitude = -42.6428;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(empresa));

    // Também garante que ela esteja na lista de empresas
    const lista = getListaEmpresas();
    const idx = lista.findIndex(e => e.cnpj.replace(/\D/g, '') === empresa.cnpj.replace(/\D/g, ''));
    if (idx >= 0) {
      lista[idx] = empresa;
    } else {
      lista.push(empresa);
    }
    salvarListaEmpresas(lista);

    // Dispara evento para toda a aplicação atualizar em tempo real
    window.dispatchEvent(new CustomEvent('empresa_alterada', { detail: empresa }));
  } catch (e) {
    console.error('Erro ao salvar empresa no localStorage:', e);
  }
}

/**
 * Alterna rapidamente para outra empresa já cadastrada
 */
export function selecionarEmpresaAtiva(cnpj: string): Empresa {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  const lista = getListaEmpresas();
  const encontrada = lista.find(e => e.cnpj.replace(/\D/g, '') === cnpjLimpo);

  if (encontrada) {
    salvarEmpresaAtiva(encontrada);
    return encontrada;
  }
  return getEmpresaAtiva();
}

/**
 * Adiciona uma nova empresa e a ativa imediatamente
 */
export function adicionarNovaEmpresa(nova: Empresa): void {
  salvarEmpresaAtiva(nova);
}

/**
 * Remove uma empresa da lista (se houver mais de 1)
 */
export function removerEmpresa(cnpj: string): void {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  let lista = getListaEmpresas();
  if (lista.length <= 1) return; // Não remove se for a única

  lista = lista.filter(e => e.cnpj.replace(/\D/g, '') !== cnpjLimpo);
  salvarListaEmpresas(lista);

  const ativa = getEmpresaAtiva();
  if (ativa.cnpj.replace(/\D/g, '') === cnpjLimpo && lista.length > 0) {
    salvarEmpresaAtiva(lista[0]);
  }
}

export function getRaioBusca(): number {
  try {
    const val = localStorage.getItem(RAIO_STORAGE_KEY);
    if (val) {
      const num = Number(val);
      if (!isNaN(num) && num > 0) return num;
    }
  } catch (e) {
    // fallback
  }
  return 100;
}

export function salvarRaioBusca(raio: number): void {
  try {
    localStorage.setItem(RAIO_STORAGE_KEY, String(raio));
  } catch (e) {
    // fallback
  }
}

export function limparEmpresa(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LISTA_EMPRESAS_KEY);
  localStorage.removeItem(RAIO_STORAGE_KEY);
}
