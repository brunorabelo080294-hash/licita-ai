import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

export const RADIUS_STEPS = [25, 50, 100, 150, 200, 300] as const;

export const DESCRICOES_RAIO: Record<number, string> = {
  25: 'Sua cidade e municípios vizinhos imediatos (até 25 km)',
  50: 'Microrregião (Leopoldina, Cataguases, Muriaé, Miracema... até 50 km)',
  100: 'Zona da Mata Mineira e Região Serrana/Noroeste Fluminense (até 100 km)',
  150: 'Raio ampliado (Juiz de Fora, Petrópolis, Nova Friburgo, Ubá... até 150 km)',
  200: 'Macrorregião Sudeste (Belo Horizonte, Grande Rio e cidades polo... até 200 km)',
  300: 'Ampla cobertura interestadual (MG, RJ, ES e leste de SP... até 300 km)',
};

interface GeofencingSliderProps {
  value: number;
  onChange: (value: number) => void;
  count: number;
}

export function GeofencingSlider({ value, onChange, count }: GeofencingSliderProps) {
  // Encontra o índice correspondente ao valor atual (ou o mais próximo)
  const getClosestIndex = (km: number): number => {
    let closest = 0;
    let minDiff = Infinity;
    RADIUS_STEPS.forEach((step, idx) => {
      const diff = Math.abs(step - km);
      if (diff < minDiff) {
        minDiff = diff;
        closest = idx;
      }
    });
    return closest;
  };

  const currentIndex = getClosestIndex(value);
  const currentStep = RADIUS_STEPS[currentIndex];
  const maxIndex = RADIUS_STEPS.length - 1;
  const progressPercent = (currentIndex / maxIndex) * 100;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = Number(e.target.value);
    const newRadius = RADIUS_STEPS[newIndex];
    if (newRadius !== undefined) {
      onChange(newRadius);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
      {/* Cabeçalho do Card */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-ocean-50 text-ocean-600 flex items-center justify-center">
            <MapPin size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Raio de Busca Logístico</h3>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              {DESCRICOES_RAIO[currentStep] || `Oportunidades em até ${currentStep} km`}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-flex items-center gap-1.5 font-black text-ocean-700 bg-ocean-50 border border-ocean-200 px-3.5 py-1 rounded-full text-sm shadow-2xs">
            <Navigation size={13} className="text-ocean-600" />
            {currentStep} km
          </span>
        </div>
      </div>

      {/* Descrição em mobile */}
      <p className="text-[11px] text-slate-500 mb-4 sm:hidden">
        {DESCRICOES_RAIO[currentStep] || `Oportunidades em até ${currentStep} km`}
      </p>

      {/* Pílulas de seleção rápida (1-tap) */}
      <div className="flex overflow-x-auto pb-2 -mx-1 px-1 gap-1.5 mb-4 no-scrollbar">
        {RADIUS_STEPS.map((step) => {
          const isSelected = currentStep === step;
          return (
            <button
              key={step}
              type="button"
              onClick={() => onChange(step)}
              className={`flex-1 min-w-[50px] py-1 px-2 rounded-lg text-xs font-bold transition-all text-center border ${
                isSelected
                  ? 'bg-ocean-600 text-white border-ocean-600 shadow-xs ring-2 ring-ocean-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {step}km
            </button>
          );
        })}
      </div>

      {/* Slider calibrado por notches (índice 0 a 5) */}
      <div className="relative mb-5 px-1 pt-1">
        {/* Trilho customizado de fundo */}
        <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
          {/* Preenchimento ativo graduado de 0% até a posição do ponteiro */}
          <div
            className="h-full bg-gradient-to-r from-ocean-500 to-ocean-600 transition-all duration-150 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Input range invisível sobreposto, 100% alinhado aos notches */}
        <input
          type="range"
          min={0}
          max={maxIndex}
          step={1}
          value={currentIndex}
          onChange={handleSliderChange}
          aria-label="Ajustar raio de busca em quilômetros"
          className="absolute inset-0 w-full h-4 -top-1 opacity-0 cursor-pointer z-20"
        />

        {/* Marcadores de passos (bolinhas na barra) */}
        <div className="absolute inset-x-1 top-1.5 flex justify-between pointer-events-none z-10">
          {RADIUS_STEPS.map((step, idx) => {
            const isPassed = idx <= currentIndex;
            return (
              <div
                key={step}
                className={`w-2 h-2 rounded-full border-2 transition-colors ${
                  isPassed ? 'bg-white border-ocean-600' : 'bg-slate-300 border-slate-300'
                }`}
              />
            );
          })}
        </div>

        {/* Ponteiro visual (Thumb customizado) */}
        <div
          className="absolute top-0 w-5 h-5 -mt-1 -ml-2.5 bg-white border-2 border-ocean-600 rounded-full shadow-md pointer-events-none transition-all duration-150 flex items-center justify-center z-15"
          style={{ left: `${progressPercent}%` }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-ocean-600" />
        </div>

        {/* Rótulos dos marcos calibrados (Clicáveis) */}
        <div className="flex justify-between mt-3 text-xs px-0.5">
          {RADIUS_STEPS.map((step, idx) => {
            const isSelected = currentStep === step;
            return (
              <button
                key={step}
                type="button"
                onClick={() => onChange(step)}
                className={`cursor-pointer transition-colors text-center focus:outline-none ${
                  isSelected
                    ? 'text-ocean-700 font-extrabold text-[13px] scale-105'
                    : 'text-slate-400 hover:text-slate-600 font-medium'
                }`}
                title={`Definir raio para ${step} km`}
              >
                {step}km
              </button>
            );
          })}
        </div>
      </div>

      {/* Rodapé: Quantidade de oportunidades no raio */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600">
        {count === 0 ? (
          <span className="text-amber-600">
            Nenhuma licitação encontrada neste raio. Tente expandir para 200 km ou 300 km.
          </span>
        ) : count === 1 ? (
          <span className="text-slate-700">
            🎯 <strong>1 oportunidade</strong> encontrada neste raio de {currentStep} km
          </span>
        ) : (
          <span className="text-slate-700">
            🎯 <strong>{count} oportunidades</strong> encontradas em até {currentStep} km
          </span>
        )}
      </div>
    </div>
  );
}
