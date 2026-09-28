/* eslint-disable */
// DADOS 100% REAIS CONECTADOS AO PORTAL NACIONAL DE CONTRATAÇÕES PÚBLICAS (PNCP)
import { Oportunidade, StatusCND, Empresa } from '../types';
import rawOportunidades from './oportunidadesPncpReais.json';

export const mockEmpresa: Empresa = {
  cnpj: '57.106.488/0001-53',
  razaoSocial: 'Realize Construcao & Servicos LTDA',
  nomeFantasia: 'Realize Construção',
  cnaes: [
    '4120-4/00 - Construção de edifícios',
    '4330-4/04 - Serviços de pintura de edifícios em geral',
    '4399-1/03 - Obras de alvenaria'
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
  raioEntregaKm: 100
};

export const mockCNDs: StatusCND[] = [
  { id: '1', tipo: 'federal', nome: 'Receita Federal e PGFN', status: 'valido', dataEmissao: '2026-08-15', dataValidade: '2027-02-15', diasRestantes: 142 },
  { id: '2', tipo: 'trabalhista', nome: 'CNDT - Débitos Trabalhistas (TST)', status: 'valido', dataEmissao: '2026-07-20', dataValidade: '2027-01-20', diasRestantes: 116 },
  { id: '3', tipo: 'fgts', nome: 'CRF - Certificado de Regularidade FGTS (Caixa)', status: 'valido', dataEmissao: '2026-09-10', dataValidade: '2026-10-10', diasRestantes: 14 },
  { id: '4', tipo: 'estadual', nome: 'Certidão Negativa SEF/MG', status: 'valido', dataEmissao: '2026-08-01', dataValidade: '2026-11-01', diasRestantes: 36 },
  { id: '5', tipo: 'municipal', nome: 'Tributos Municipais (Leopoldina/MG)', status: 'valido', dataEmissao: '2026-09-01', dataValidade: '2026-12-01', diasRestantes: 66 }
];

export const mockOportunidades: Oportunidade[] = rawOportunidades as unknown as Oportunidade[];
