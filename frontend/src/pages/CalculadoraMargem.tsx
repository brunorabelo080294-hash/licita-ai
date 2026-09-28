import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, TrendingUp, AlertCircle, Sparkles, ArrowLeft } from 'lucide-react';

export function CalculadoraMargem() {
  const navigate = useNavigate();
  const [custoProduto, setCustoProduto] = useState('');
  const [custoFrete, setCustoFrete] = useState('');
  const [margem, setMargem] = useState('20');

  const custoTotal = (Number(custoProduto) || 0) + (Number(custoFrete) || 0);
  const margemPerc = Number(margem) || 0;
  // Preço Sugerido = Custo Total / (1 - Margem/100)
  const precoSugerido = margemPerc < 100 ? custoTotal / (1 - margemPerc / 100) : 0;
  
  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const getRiskColor = () => {
    if (margemPerc < 10) return 'bg-rose-500';
    if (margemPerc < 20) return 'bg-[#FB8B03]';
    return 'bg-[#1E8E5A]';
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24 md:pb-8">
      {/* Botão Superior de Voltar */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/feed')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-xs font-bold text-[#01203C] hover:text-[#FB8B03] shadow-2xs transition-all cursor-pointer active:scale-95 group"
          title="Voltar para o Feed de Oportunidades"
        >
          <ArrowLeft size={16} className="text-[#FB8B03] group-hover:-translate-x-1 transition-transform" />
          <span>Voltar para as Oportunidades</span>
        </button>

        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          Início &gt; Calculadora
        </span>
      </div>
      <div className="mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Planejamento Financeiro</span>
        <h1 
          className="text-2xl sm:text-3xl font-black text-[#01203C] tracking-tight mt-0.5"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          Calculadora de Margem e Viabilidade
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          Simule seus custos de produto, frete regional e descubra o lance ideal para vencer com lucro garantido.
        </p>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200/80 mb-6 space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Custo do Produto / Serviço (R$)
          </label>
          <input
            type="number"
            value={custoProduto}
            onChange={e => setCustoProduto(e.target.value)}
            className="w-full p-3.5 bg-[#F7F8FA] border border-slate-200 rounded-2xl focus:border-[#01203C] focus:ring-2 focus:ring-[#01203C]/10 outline-none text-sm text-[#01203C] font-semibold"
            placeholder="0,00"
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Custo de Frete Regional (R$)
          </label>
          <input
            type="number"
            value={custoFrete}
            onChange={e => setCustoFrete(e.target.value)}
            className="w-full p-3.5 bg-[#F7F8FA] border border-slate-200 rounded-2xl focus:border-[#01203C] focus:ring-2 focus:ring-[#01203C]/10 outline-none text-sm text-[#01203C] font-semibold"
            placeholder="0,00"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Margem Líquida Desejada (%)
          </label>
          <input
            type="number"
            value={margem}
            onChange={e => setMargem(e.target.value)}
            className="w-full p-3.5 bg-[#F7F8FA] border border-slate-200 rounded-2xl focus:border-[#01203C] focus:ring-2 focus:ring-[#01203C]/10 outline-none text-sm text-[#01203C] font-semibold"
            placeholder="20"
          />
        </div>
      </div>

      {/* Cartão de Resultado em Marinho Nobre */}
      <div className="bg-[#01203C] p-6 rounded-3xl shadow-md text-white mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FB8B03]/10 rounded-full blur-2xl"></div>
        <p className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">
          Preço Sugerido de Lance Vencedor
        </p>
        <h2 
          className="text-3xl sm:text-4xl font-black text-[#FB8B03] mb-5 tracking-tight"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          {formatter.format(precoSugerido)}
        </h2>
        
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300">Risco Operacional:</span>
            <span className="font-bold text-white">
              {margemPerc < 10 ? 'Alto (Margem abaixo do seguro)' : margemPerc < 20 ? 'Médio (Margem apertada)' : 'Baixo (Margem saudável)'}
            </span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden flex">
            <div className={`h-full transition-all ${getRiskColor()}`} style={{ width: `${Math.min(margemPerc * 3, 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200/80">
        <h3 
          className="font-bold text-[#01203C] mb-2.5 text-xs uppercase tracking-wider flex items-center gap-1.5"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          <Sparkles size={14} className="text-[#FB8B03]" />
          Inteligência de Mercado B2G
        </h3>
        <div className="p-4 bg-[#F7F8FA] rounded-2xl border border-slate-200/70 text-slate-700 text-xs space-y-1">
          <p className="font-medium text-xs sm:text-sm">
            Média de deságio na região: <strong>{formatter.format((custoTotal || 100) * 1.25)}</strong>
          </p>
          <p className="text-slate-500 text-[11px]">
            Seu lance estimado protege os custos operacionais de transporte nos municípios da Zona da Mata e Região Serrana.
          </p>
        </div>
      </div>
    </div>
  );
}
