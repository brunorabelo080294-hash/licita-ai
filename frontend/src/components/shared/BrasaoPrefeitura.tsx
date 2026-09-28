import React, { useState } from 'react';
import { Municipio } from '../../types';

interface BrasaoPrefeituraProps {
  municipio: Municipio;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Slugs mapeados para os arquivos locais em /brasoes/{slug}.png
const MUNICIPiOS_SLUGS: Record<string, string> = {
  'leopoldina': 'leopoldina',
  'cataguases': 'cataguases',
  'alem paraiba': 'alem_paraiba',
  'alem paraíba': 'alem_paraiba',
  'além paraíba': 'alem_paraiba',
  'juiz de fora': 'juiz_de_fora',
  'muriae': 'muriae',
  'muriaé': 'muriae',
  'uba': 'uba',
  'ubá': 'uba',
  'nova friburgo': 'nova_friburgo',
  'carmo': 'carmo',
  'teresopolis': 'teresopolis',
  'teresópolis': 'teresopolis',
  'tres rios': 'tres_rios',
  'três rios': 'tres_rios',
  'sapucaia': 'sapucaia',
};

// Cores heráldicas dos municípios para renderização vetorial bonita em caso de fallback
const CORES_HERALDICAS: Record<string, { topo: string; meio: string; borda: string }> = {
  'leopoldina': { topo: '#1e3a8a', meio: '#2563eb', borda: '#d97706' }, // Azul e ouro
  'cataguases': { topo: '#dc2626', meio: '#991b1b', borda: '#f59e0b' }, // Rubro e ouro
  'alem paraiba': { topo: '#047857', meio: '#065f46', borda: '#f59e0b' }, // Verde e ouro
  'juiz de fora': { topo: '#0369a1', meio: '#0284c7', borda: '#eab308' }, // Azul celeste
  'muriae': { topo: '#15803d', meio: '#166534', borda: '#ca8a04' },
  'uba': { topo: '#b91c1c', meio: '#4338ca', borda: '#eab308' },
  'nova friburgo': { topo: '#0f766e', meio: '#115e59', borda: '#f59e0b' },
  'carmo': { topo: '#0369a1', meio: '#1e40af', borda: '#d97706' },
  'casimiro de abreu': { topo: '#0284c7', meio: '#0369a1', borda: '#f59e0b' },
  'bom jardim': { topo: '#15803d', meio: '#166534', borda: '#f59e0b' },
  'bom jesus do itabapoana': { topo: '#b91c1c', meio: '#991b1b', borda: '#f59e0b' },
  'sao pedro da aldeia': { topo: '#0284c7', meio: '#0369a1', borda: '#eab308' },
  'sao sebastiao do alto': { topo: '#0f766e', meio: '#115e59', borda: '#d97706' },
  'itaocara': { topo: '#047857', meio: '#065f46', borda: '#f59e0b' },
  'itaguai': { topo: '#1e3a8a', meio: '#2563eb', borda: '#eab308' },
  'teresopolis': { topo: '#166534', meio: '#14532d', borda: '#f59e0b' },
  'tres rios': { topo: '#0284c7', meio: '#0369a1', borda: '#f59e0b' },
  'sapucaia': { topo: '#047857', meio: '#065f46', borda: '#d97706' },
};

export function BrasaoPrefeitura({ municipio, size = 'md', className = '' }: BrasaoPrefeituraProps) {
  const [imageError, setImageError] = useState(false);

  const normalize = (str: string) => 
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const normalizedName = normalize(municipio.nome);
  const slug = MUNICIPiOS_SLUGS[normalizedName] || normalizedName.replace(/\s+/g, '_');
  const cores = CORES_HERALDICAS[normalizedName] || { topo: '#0d9488', meio: '#0f766e', borda: '#f59e0b' };

  const dimensions = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-sm',
  }[size];

  const imagePath = `/brasoes/${slug}.png`;

  if (!imageError) {
    return (
      <div 
        className={`relative inline-flex items-center justify-center shrink-0 rounded-full bg-white shadow-sm border border-slate-200 p-0.5 overflow-hidden ${dimensions} ${className}`}
        title={`Brasão Oficial de ${municipio.nome}/${municipio.uf}`}
      >
        <img
          src={imagePath}
          alt={`Brasão de ${municipio.nome}`}
          onError={() => setImageError(true)}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback: Brasão Heráldico estilizado em SVG com coroa mural e listel
  return (
    <div 
      className={`relative inline-flex items-center justify-center shrink-0 rounded-lg shadow-sm ${dimensions} ${className}`}
      title={`Brasão de ${municipio.nome}/${municipio.uf}`}
    >
      <svg viewBox="0 0 40 46" className="w-full h-full drop-shadow-sm">
        {/* Coroa Mural (Símbolo de Cidade/Município) */}
        <path d="M7 8 L10 4 L14 7 L17 4 L20 7 L23 4 L26 7 L30 4 L33 8 Z" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
        <rect x="9" y="8" width="22" height="3" fill="#eab308" />
        {/* Torres da coroa */}
        <circle cx="13" cy="9.5" r="0.8" fill="#78350f" />
        <circle cx="20" cy="9.5" r="0.8" fill="#78350f" />
        <circle cx="27" cy="9.5" r="0.8" fill="#78350f" />

        {/* Escudo Heráldico Clássico */}
        <path 
          d="M8 12 L32 12 Q32 26 20 38 Q8 26 8 12 Z" 
          fill={cores.topo} 
          stroke={cores.borda} 
          strokeWidth="1.5" 
        />
        {/* Faixa inferior do escudo */}
        <path 
          d="M12 24 Q20 36 20 37 Q20 36 28 24 Z" 
          fill={cores.meio} 
        />

        {/* Letras iniciais do município no centro do escudo */}
        <text 
          x="20" 
          y="23" 
          textAnchor="middle" 
          fill="#ffffff" 
          fontSize="8.5" 
          fontWeight="bold" 
          fontFamily="system-ui, sans-serif"
        >
          {municipio.nome.slice(0, 2).toUpperCase()}
        </text>

        {/* Sigla do Estado na base do escudo */}
        <text 
          x="20" 
          y="31" 
          textAnchor="middle" 
          fill="#fef08a" 
          fontSize="6" 
          fontWeight="bold" 
          fontFamily="system-ui, sans-serif"
        >
          {municipio.uf}
        </text>

        {/* Listel inferior com o nome abreviado */}
        <rect x="5" y="39" width="30" height="5" rx="1.5" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.8" />
        <text 
          x="20" 
          y="43" 
          textAnchor="middle" 
          fill="#334155" 
          fontSize="4.5" 
          fontWeight="bold"
        >
          {municipio.nome.length > 9 ? municipio.nome.slice(0, 8) + '..' : municipio.nome}
        </text>
      </svg>
    </div>
  );
}
