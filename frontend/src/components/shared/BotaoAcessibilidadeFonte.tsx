import React, { useState, useEffect, useRef } from 'react';
import { 
  getTextSize, getTextBold, aplicarAcessibilidade, alternarCicloFonte, 
  TextSize 
} from '../../utils/acessibilidadeStorage';
import { Check, ChevronDown, Eye } from 'lucide-react';

interface BotaoAcessibilidadeFonteProps {
  className?: string;
  theme?: 'dark' | 'light';
}

export function BotaoAcessibilidadeFonte({ className = '', theme = 'dark' }: BotaoAcessibilidadeFonteProps) {
  const [size, setSize] = useState<TextSize>(getTextSize());
  const [bold, setBold] = useState<boolean>(getTextBold());
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sincroniza estado
  useEffect(() => {
    const handleUpdate = () => {
      setSize(getTextSize());
      setBold(getTextBold());
    };

    window.addEventListener('acessibilidade_alterada', handleUpdate);
    return () => window.removeEventListener('acessibilidade_alterada', handleUpdate);
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  // Rótulo visível no botão exatamente como na imagem
  const getButtonLabel = () => {
    if (size === 'extragrande') return 'Extra G';
    if (bold && size === 'grande') return 'Negrito';
    if (size === 'grande') return 'Grande';
    return 'Normal';
  };

  const handleQuickCycle = () => {
    const result = alternarCicloFonte();
    setSize(result.size);
    setBold(result.bold);
  };

  const handleSelect = (newSize: TextSize, newBold: boolean) => {
    aplicarAcessibilidade(newSize, newBold);
    setSize(newSize);
    setBold(newBold);
    setShowDropdown(false);
  };

  const buttonClasses = theme === 'dark'
    ? 'bg-white/10 hover:bg-white/15 border-white/20 hover:border-white/35 text-white'
    : 'bg-[#F7F8FA] hover:bg-slate-100 border-slate-200 text-[#01203C]';

  const textLabelClasses = theme === 'dark' ? 'text-white' : 'text-[#01203C]';
  const chevronClasses = theme === 'dark' ? 'text-slate-300' : 'text-slate-500';

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Botão idêntico ao screenshot enviado pelo usuário */}
      <button
        type="button"
        onClick={handleQuickCycle}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowDropdown(!showDropdown);
        }}
        title="Clique para alternar tamanho da fonte e negrito para pessoas com baixa visão. Botão direito para opções detalhadas."
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-2xs active:scale-95 select-none ${buttonClasses}`}
      >
        {/* "Aa" em amarelo/ouro exatamente como na imagem */}
        <span className="text-[#FBBF24] font-black text-sm tracking-tight font-['Montserrat',sans-serif]">
          Aa
        </span>

        {/* Texto "Normal", "Grande" ou "Negrito" em branco bold */}
        <span className={`font-bold text-xs tracking-tight ${textLabelClasses}`}>
          {getButtonLabel()}
        </span>

        <div 
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown(!showDropdown);
          }}
          className="p-0.5 hover:bg-black/10 dark:hover:bg-white/20 rounded cursor-pointer transition-colors"
          title="Ver opções de tamanho"
        >
          <ChevronDown size={11} className={chevronClasses} />
        </div>
      </button>

      {/* Menu Dropdown de Acessibilidade */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1.5 border-b border-slate-100 mb-1 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#01203C] flex items-center gap-1">
              <Eye size={12} className="text-[#FB8B03]" />
              Acessibilidade Visual
            </span>
            <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-1.5 py-0.5 rounded">
              Baixa Visão
            </span>
          </div>

          <div className="space-y-1">
            {/* Opção 1: Normal */}
            <button
              onClick={() => handleSelect('normal', false)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                size === 'normal' && !bold 
                  ? 'bg-[#01203C] text-white font-bold' 
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#FB8B03]">Aa</span>
                <span>Normal (100%)</span>
              </div>
              {size === 'normal' && !bold && <Check size={14} className="text-[#FB8B03]" />}
            </button>

            {/* Opção 2: Grande */}
            <button
              onClick={() => handleSelect('grande', false)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                size === 'grande' && !bold 
                  ? 'bg-[#01203C] text-white font-bold' 
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#FB8B03]">Aa</span>
                <span>Grande (+15%)</span>
              </div>
              {size === 'grande' && !bold && <Check size={14} className="text-[#FB8B03]" />}
            </button>

            {/* Opção 3: Grande e Negrito */}
            <button
              onClick={() => handleSelect('grande', true)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                size === 'grande' && bold 
                  ? 'bg-[#01203C] text-white font-bold' 
                  : 'hover:bg-slate-100 text-slate-700 font-semibold'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-[#FB8B03]">Aa</span>
                <span className="font-bold">Grande & Negrito</span>
              </div>
              {size === 'grande' && bold && <Check size={14} className="text-[#FB8B03]" />}
            </button>

            {/* Opção 4: Extra Grande e Negrito */}
            <button
              onClick={() => handleSelect('extragrande', true)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                size === 'extragrande' 
                  ? 'bg-[#01203C] text-white font-bold' 
                  : 'hover:bg-slate-100 text-slate-700 font-semibold'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-[#FB8B03]">Aa</span>
                <span className="font-black">Extra Grande & Negrito</span>
              </div>
              {size === 'extragrande' && <Check size={14} className="text-[#FB8B03]" />}
            </button>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 px-2 text-[10px] text-slate-400">
            Dica: clique no botão <strong>Aa</strong> para alternar os tamanhos com 1 toque!
          </div>
        </div>
      )}
    </div>
  );
}
