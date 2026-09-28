import React from 'react';
import { Clock, ShieldCheck, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { AdimplenciaPrefeitura } from '../../types';

interface TermometroAdimplenciaProps {
  adimplencia: AdimplenciaPrefeitura;
  variant?: 'compact' | 'detailed' | 'gauge_card';
  className?: string;
}

export function TermometroAdimplencia({ adimplencia, variant = 'compact', className = '' }: TermometroAdimplenciaProps) {
  const { tempoMedioDias, status, scoreTce, percentualPontualidade, descricao } = adimplencia;

  // Converte a nota TCE (0 a 10) para escala 0 a 5.0 (como no mockup: 4.8 / 5.0)
  const score5 = Math.min(5.0, Math.max(1.0, scoreTce ? scoreTce / 2 : 4.8));

  // Posição percentual do indicador na barra de gradiente
  // 5.0 fica perto da ponta verde (ou ponta de excelente), 1.0 perto do risco
  const pointerPosition = Math.min(94, Math.max(8, (score5 / 5.0) * 88));

  const config = {
    otimo: {
      corTexto: 'text-emerald-700',
      corBg: 'bg-emerald-50',
      corBorda: 'border-emerald-200',
      corBarra: 'bg-emerald-500',
      corBadge: 'bg-emerald-100 text-emerald-800',
      icone: ShieldCheck,
      rotulo: 'Prefeitura Paga em Dia',
      statusTexto: 'EXCELENTE PAGADOR',
      historicoAtrasos: '0%',
      rapidez: 'Rápido',
    },
    bom: {
      corTexto: 'text-teal-700',
      corBg: 'bg-teal-50',
      corBorda: 'border-teal-200',
      corBarra: 'bg-teal-500',
      corBadge: 'bg-teal-100 text-teal-800',
      icone: ShieldCheck,
      rotulo: 'Pagamento Regular',
      statusTexto: 'BOM PAGADOR',
      historicoAtrasos: '2%',
      rapidez: 'Regular',
    },
    regular: {
      corTexto: 'text-amber-800',
      corBg: 'bg-amber-50',
      corBorda: 'border-amber-200',
      corBarra: 'bg-amber-500',
      corBadge: 'bg-amber-100 text-amber-800',
      icone: AlertTriangle,
      rotulo: 'Atraso Moderado',
      statusTexto: 'ATRASO MODERADO',
      historicoAtrasos: '12%',
      rapidez: 'Médio',
    },
    risco: {
      corTexto: 'text-red-700',
      corBg: 'bg-red-50',
      corBorda: 'border-red-200',
      corBarra: 'bg-red-500',
      corBadge: 'bg-red-100 text-red-800',
      icone: AlertCircle,
      rotulo: 'Risco de Atraso',
      statusTexto: 'ALTO RISCO DE ATRASO',
      historicoAtrasos: '38%',
      rapidez: 'Lento',
    },
  }[status] || {
    corTexto: 'text-slate-700',
    corBg: 'bg-slate-50',
    corBorda: 'border-slate-200',
    corBarra: 'bg-slate-500',
    corBadge: 'bg-slate-100 text-slate-800',
    icone: Clock,
    rotulo: 'Pontualidade Normal',
    statusTexto: 'PAGADOR REGULAR',
    historicoAtrasos: '0%',
    rapidez: 'Normal',
  };

  const Icone = config.icone;

  if (variant === 'compact') {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${config.corBg} ${config.corBorda} ${config.corTexto} ${className}`}
        title={`Tempo médio de pagamento: ${tempoMedioDias} dias após emissão da NF`}
      >
        <Clock size={13} className="shrink-0 animate-pulse text-opacity-80" />
        <span className="font-semibold">Paga em ~{tempoMedioDias} dias</span>
        <span className="text-[11px] opacity-75 hidden sm:inline">({config.rotulo})</span>
      </div>
    );
  }

  // Card idêntico ao mockup do aplicativo (Termômetro de Pagamento com barra deslizante)
  return (
    <div className={`bg-white p-5 rounded-3xl border border-slate-200 shadow-sm ${className}`}>
      {/* Título do Card com ícone de informação */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
          Termômetro de Pagamento
        </h3>
        <button 
          title="Dados baseados no histórico de empenhos liquidados do Tribunal de Contas (TCE)" 
          className="text-slate-400 hover:text-slate-600 transition-colors p-1"
        >
          <Info size={16} />
        </button>
      </div>

      {/* Barra de Gradiente com Marcador Deslizante (Slider Thumb) */}
      <div className="relative px-2 py-3">
        <div className="h-4 w-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 via-orange-400 to-rose-500 shadow-inner" />
        {/* Marcador Vertical */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-7 bg-white border-2 border-amber-600 rounded-md shadow-md flex items-center justify-center transition-all duration-500"
          style={{ left: `${pointerPosition}%` }}
        >
          <div className="w-0.5 h-3 bg-amber-600 rounded-full" />
        </div>
      </div>

      {/* Pontuação em Destaque */}
      <div className="text-center my-2">
        <span className="text-2xl font-black text-slate-800 tracking-tight">
          {score5.toFixed(1)}/5.0
        </span>
      </div>

      {/* Métricas Detalhadas do Órgão */}
      <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between py-0.5">
          <span className="font-medium text-slate-500">Média de Pagamento:</span>
          <span className="font-bold text-slate-800">{tempoMedioDias} dias ({config.rapidez})</span>
        </div>
        <div className="flex items-center justify-between py-0.5">
          <span className="font-medium text-slate-500">Histórico de Atrasos:</span>
          <span className="font-bold text-slate-800">{config.historicoAtrasos}</span>
        </div>
        <div className="flex items-center justify-between py-0.5">
          <span className="font-medium text-slate-500">Status:</span>
          <span className="font-extrabold text-emerald-600 uppercase tracking-wide">
            {config.statusTexto}
          </span>
        </div>
      </div>
    </div>
  );
}
