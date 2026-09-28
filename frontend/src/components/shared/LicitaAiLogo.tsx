import React from 'react';

interface LicitaAiLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'horizontal' | 'icon';
  theme?: 'light' | 'dark'; // 'light' para fundos brancos/claros, 'dark' para cabeçalhos marinho escuro
}

export function LicitaAiLogo({
  className = '',
  size = 'md',
  variant = 'horizontal',
  theme = 'light'
}: LicitaAiLogoProps) {
  // Dimensões do ícone conforme tamanho
  const sizeMap = {
    sm: { iconSize: 24, textSize: 'text-lg', subSize: 'text-[9px]' },
    md: { iconSize: 36, textSize: 'text-2xl', subSize: 'text-[11px]' },
    lg: { iconSize: 48, textSize: 'text-3xl', subSize: 'text-xs' },
    xl: { iconSize: 64, textSize: 'text-4xl', subSize: 'text-sm' },
  };

  const { iconSize, textSize, subSize } = sizeMap[size];

  const licitaTextColor = theme === 'dark' ? 'text-white' : 'text-[#01203C]';
  const taglineColor = theme === 'dark' ? 'text-slate-300' : 'text-slate-500';

  // Ícone Oficial Vetorial: Hexágono com Check Marinho e Seta Ascendente Laranja
  const LogoIcon = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-200 hover:scale-105"
    >
      {/* Sombra suave de profundidade */}
      <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
      </filter>

      <g filter="url(#logoShadow)">
        {/* Moldura Externa Hexagonal / Chevron em Laranja Oficial (#FB8B03) */}
        {/* Lado esquerdo e base da estrutura */}
        <path
          d="M 33 20
             L 15 48
             L 36 82
             L 56 82
             L 30 50
             L 42 26
             Z"
          fill="#FB8B03"
        />

        {/* Braço Direito em Laranja com a Seta Ascendente (#FB8B03) */}
        <path
          d="M 52 70
             L 72 38
             L 60 38
             L 60 28
             L 86 28
             L 86 54
             L 76 54
             L 76 42
             L 48 82
             Z"
          fill="#FB8B03"
        />

        {/* Checkmark Interno em Marinho Oficial (#01203C) */}
        <path
          d="M 28 50
             L 42 68
             L 70 26
             L 60 20
             L 42 52
             L 34 42
             Z"
          fill="#01203C"
        />
        
        {/* Detalhe superior da ponta da seta */}
        <polygon 
          points="86,16 66,28 78,32" 
          fill="#D97602"
          opacity="0.3"
        />
      </g>
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center justify-center ${className}`}>{LogoIcon}</div>;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {LogoIcon}

      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-baseline tracking-tight">
          <span 
            className={`font-black font-['Montserrat',sans-serif] ${textSize} ${licitaTextColor}`}
            style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: '-0.03em' }}
          >
            Licita
          </span>
          <span 
            className={`font-black font-['Montserrat',sans-serif] ${textSize} text-[#FB8B03] ml-1.5`}
            style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: '-0.02em' }}
          >
            Aí
          </span>
        </div>

        {variant === 'full' && (
          <span 
            className={`font-normal tracking-wide mt-0.5 ${subSize} ${taglineColor}`}
            style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.04em' }}
          >
            Simplificando Licitações
          </span>
        )}
      </div>
    </div>
  );
}
