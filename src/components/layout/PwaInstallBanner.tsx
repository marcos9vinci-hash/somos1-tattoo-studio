import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Verifica se já está rodando em modo standalone (PWA instalado)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
      console.log('[PWA] Aplicativo instalado com sucesso no sistema!');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        console.log('[PWA] Usuário aceitou a instalação');
        setIsVisible(false);
      } else {
        console.log('[PWA] Usuário dispensou a instalação');
      }
    } catch (err) {
      console.error('[PWA] Erro ao invocar prompt de instalação:', err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  const isAdminRoute = window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/studio');

  if (!isVisible || installed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 max-w-sm bg-zinc-950/95 border border-white/20 rounded-2xl p-4 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-in slide-in-from-bottom duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <img 
            src={isAdminRoute ? "/somos1-admin-icon-192.png" : "/somos1-icon-192.png"} 
            alt={isAdminRoute ? "Somos 1 Gestão" : "Somos 1 Tattoo"} 
            className="w-12 h-12 rounded-xl object-contain bg-black p-1 border border-white/10 shadow-md shrink-0" 
          />
          <div>
            <h4 className="font-headline font-black text-xs text-white uppercase tracking-wider">
              {isAdminRoute ? 'Instalar Somos 1 Gestão' : 'Instalar no Celular'}
            </h4>
            <p className="text-[11px] text-zinc-400 mt-0.5 leading-tight">
              {isAdminRoute 
                ? 'Instale o app de gestão na tela inicial para acesso direto à agenda e CRM.'
                : 'Adicione o Somos 1 à tela inicial para acesso rápido e tela cheia.'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-zinc-500 hover:text-white p-1"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleInstallClick}
          className="flex-1 bg-white hover:bg-zinc-200 text-black font-headline font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md"
        >
          <Download className="w-3.5 h-3.5" /> {isAdminRoute ? 'Instalar Gestão' : 'Instalar Aplicativo'}
        </button>
        <button
          onClick={() => setIsVisible(false)}
          className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-headline text-xs py-2 px-3 rounded-xl border border-white/10"
        >
          Agora Não
        </button>
      </div>
    </div>
  );
};

export default PwaInstallBanner;
