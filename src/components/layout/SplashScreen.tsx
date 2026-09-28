import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';

interface SplashScreenProps {
  message?: string;
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  message = "Somos 1 Tattoo Studio", 
  onFinish 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    // Tenta dar play programático para contornar restrições móveis
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Se o navegador bloquear autoplay, fallback para imagem
        setVideoError(true);
      });
    }
  }, []);

  return (
    <div 
      onClick={onFinish}
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-0 m-0 select-none overflow-hidden cursor-pointer"
    >
      {/* Luz ambiente de fundo */}
      <div className="absolute w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[140px] pointer-events-none" />

      {/* Conteúdo Central: Vídeo Animado Oficial */}
      <div className="relative w-full max-w-2xl flex flex-col items-center justify-center px-4">
        {!videoError ? (
          <video
            ref={videoRef}
            src="/somos1-intro.mp4"
            autoPlay
            muted
            loop
            playsInline
            // @ts-ignore
            webkit-playsinline="true"
            onLoadedData={() => setVideoLoaded(true)}
            onError={() => setVideoError(true)}
            className="w-full h-auto max-h-[70vh] object-contain rounded-xl drop-shadow-[0_0_35px_rgba(255,255,255,0.18)]"
          />
        ) : (
          <motion.img
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            src="/somos1-logo-official.png"
            alt="Somos 1 Tattoo Studio"
            className="w-[80vw] max-w-[360px] h-auto object-contain drop-shadow-[0_0_35px_rgba(255,255,255,0.2)]"
          />
        )}

        {/* Rodapé com animação suave e opção de toque */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="w-36 h-0.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              animate={{ x: [-144, 144] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="w-16 h-full bg-white rounded-full"
            />
          </div>

          <p className="font-headline text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-semibold flex items-center gap-1.5">
            {message}
          </p>

          {onFinish && (
            <span className="text-[9px] text-zinc-600 uppercase font-headline tracking-widest flex items-center gap-1 mt-1 opacity-70 hover:opacity-100 transition-opacity">
              Toque na tela para continuar <ArrowRight className="w-3 h-3 inline" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
