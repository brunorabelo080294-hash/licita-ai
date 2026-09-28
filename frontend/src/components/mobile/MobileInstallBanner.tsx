import React, { useState, useEffect } from 'react';
import { Smartphone, X, Download } from 'lucide-react';

export function MobileInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Verifica se já está em modo standalone (já instalado)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      return; // Já está rodando como app instalado!
    }

    // Detecta iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // No iOS, se não for standalone, mostra a dica após 3 segundos
    if (isAppleDevice) {
      const timer = setTimeout(() => setIsVisible(true), 2500);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-ocean-800 to-ocean-900 text-white px-3.5 py-2.5 flex items-center justify-between gap-2.5 shadow-md relative z-30">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Smartphone size={16} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold leading-tight truncate">Instalar Licita Aí no Celular</p>
          <p className="text-[10px] text-ocean-200 truncate">
            {isIOS ? 'Toque em Compartilhar ➔ "Adicionar à Tela de Início"' : 'Acesse como aplicativo direto na tela inicial'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
          >
            <Download size={12} />
            <span>Instalar</span>
          </button>
        )}
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 text-ocean-300 hover:text-white rounded-md"
          title="Fechar aviso"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
