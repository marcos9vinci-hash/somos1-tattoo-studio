import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

interface SplashScreenProps {
  message?: string;
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  message = "Carregando Somos 1...", 
  onFinish 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Se houver bloqueio severo de autoplay pelo SO, fallback gracioso
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

      {/* Conteúdo Central: Vídeo Animado 9:16 Oficial */}
      <div className="relative w-full max-w-md flex flex-col items-center justify-center px-4">
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
            // @ts-ignore
            x5-playsinline="true"
            preload="auto"
            onError={() => setVideoError(true)}
            className="w-full max-w-[380px] h-auto max-h-[75vh] object-contain rounded-2xl drop-shadow-[0_0_35px_rgba(255,255,255,0.22)]"
          />
        ) : (
          <motion.img
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            src="/somos1-logo-official.png"
            alt="Somos 1 Tattoo Studio"
            className="w-[85vw] max-w-[380px] h-auto object-contain drop-shadow-[0_0_35px_rgba(255,255,255,0.22)]"
          />
        )}

        {/* Rodapé: Barra de Carregamento Fluida */}
        <div className="mt-4 flex flex-col items-center gap-2.5">
          <div className="w-36 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              animate={{ x: [-144, 144] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className="w-16 h-full bg-white rounded-full"
            />
          </div>

          <p className="font-headline text-[10px] uppercase tracking-[0.3em] text-zinc-400 font-bold">
            {message}
          </p>

          {onFinish && (
            <span className="text-[9px] text-zinc-500 uppercase font-headline tracking-widest flex items-center gap-1 mt-0.5 opacity-80 hover:opacity-100 transition-opacity">
              Toque para continuar <ArrowRight className="w-3 h-3 inline" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
