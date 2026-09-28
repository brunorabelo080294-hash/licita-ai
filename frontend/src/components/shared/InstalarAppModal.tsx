import React, { useState, useEffect } from 'react';
import { Smartphone, X, QrCode, Check, Copy, Download, Sparkles, ArrowLeft, ChevronLeft } from 'lucide-react';

interface InstalarAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstalarAppModal({ isOpen, onClose }: InstalarAppModalProps) {
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Endereço de rede local da máquina na rede Wi-Fi
  const localUrl = `http://192.168.1.4:5173/`;

  // Fechar com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Captura evento de instalação PWA nativo
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(localUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose} // Clicar fora fecha a janela
    >
      {/* Botão flutuante fixo no canto superior direito para nunca sumir da tela */}
      <button
        onClick={onClose}
        className="fixed top-3 right-3 sm:top-5 sm:right-5 z-60 bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-full shadow-xl border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
        title="Fechar janela e voltar"
      >
        <ArrowLeft size={16} />
        <span>Voltar / Fechar (ESC)</span>
      </button>

      {/* Cartão do Modal com altura máxima e rolagem interna garantida */}
      <div 
        className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] sm:max-h-[90vh] shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()} // Impede fechar ao clicar dentro
      >
        {/* Top Header Fixo / Grudado */}
        <div className="bg-[#01203C] text-white p-4 sm:p-5 text-center relative shrink-0 shadow-sm">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            title="Fechar janela"
          >
            <X size={20} />
          </button>

          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
              <Smartphone size={18} className="text-[#FB8B03]" />
            </div>
            <span className="text-[11px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
              PWA Android & iPhone
            </span>
          </div>

          <h2 
            className="text-lg font-black tracking-tight"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Instalar Licita Aí no Celular
          </h2>
          <p className="text-[11px] text-slate-300 mt-0.5">
            Abra diretamente no seu smartphone sem precisar da Play Store
          </p>
        </div>

        {/* Conteúdo Rolável (nunca corta na tela) */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Se o navegador permitir instalação direta com 1 clique */}
          {isInstallable && (
            <button
              onClick={handleNativeInstall}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Download size={16} /> Instalar Agora Neste Dispositivo
            </button>
          )}

          {/* QR Code para o Celular */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
              <QrCode size={15} className="text-ocean-600" />
              <span>Aponte a Câmera do seu Celular</span>
            </div>

            <div className="w-40 h-40 bg-white p-2 rounded-2xl mx-auto shadow-sm border border-slate-200 flex items-center justify-center">
              <img
                src="/qr-code-celular.png"
                alt="QR Code para abrir no celular"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            <p className="text-[11px] text-slate-500 mt-2 font-medium">
              Conecte o celular no <strong>mesmo Wi-Fi</strong> deste computador e aponte a câmera.
            </p>
          </div>

          {/* Link direto com botão de copiar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1 pl-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Ou digite no Chrome do celular:</span>
              <span className="text-xs font-mono font-bold text-ocean-700 truncate block">
                {localUrl}
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1 transition-colors shrink-0 shadow-2xs cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          {/* Passo a passo para Android e iPhone */}
          <div className="space-y-2 pt-1 text-xs">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">Como adicionar à tela inicial:</h4>

            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-2.5 text-slate-700">
              <span className="text-base shrink-0">🤖</span>
              <div>
                <strong className="text-emerald-900 block text-xs">No Android (Google Chrome):</strong>
                <span className="text-[11px]">Abra o link, toque no botão <strong>"Instalar aplicativo"</strong> que surge na tela ou clique nos <strong>3 pontinhos (⋮)</strong> no topo e escolha <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 flex items-start gap-2.5 text-slate-700">
              <span className="text-base shrink-0">🍏</span>
              <div>
                <strong className="text-blue-900 block text-xs">No iPhone / iPad (Safari):</strong>
                <span className="text-[11px]">Abra o link no Safari, toque no botão de <strong>Compartilhar</strong> (quadrado com seta para cima) e selecione <strong>"Adicionar à Tela de Início"</strong>.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé Fixo e Sempre Visível */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
          >
            <ChevronLeft size={16} />
            <span>Voltar para o Feed / Fechar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
