import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

interface SplashScreenProps {
  message?: string;
  onFinish?: () => void;
  isAdmin?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  message, 
  onFinish,
  isAdmin
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const isStudioAdmin = isAdmin ?? (
    typeof window !== 'undefined' && (
      window.location.pathname.startsWith('/admin') || 
      window.location.pathname.startsWith('/studio') ||
      window.location.pathname.startsWith('/test-crm') ||
      window.location.pathname.startsWith('/galeria')
    )
  );

  const videoSrc = isStudioAdmin ? "/somos1-admin-intro.mp4" : "/somos1-intro.mp4";
  const imageSrc = isStudioAdmin ? "/somos1-ouro-metal-preto.png" : "/somos1-logo-official.png";
  const displayMsg = message || (isStudioAdmin ? "Somos 1 Studio" : "Carregando Somos 1...");

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().then(() => {
        setVideoLoaded(true);
      }).catch(() => {
        // Se houver bloqueio severo de autoplay pelo SO, fallback gracioso
        setVideoError(true);
      });
    }
  }, []);

  useEffect(() => {
    // Se o vídeo der erro, dá fallback de 3.5s na imagem e abre
    if (videoError) {
      const timer = setTimeout(() => {
        onFinish?.();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [videoError, onFinish]);

  return (
    <div 
      onClick={onFinish}
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-0 m-0 select-none overflow-hidden cursor-pointer"
    >
      {/* Luz ambiente de fundo */}
      <div className={`absolute w-[500px] h-[500px] ${isStudioAdmin ? 'bg-amber-500/[0.04]' : 'bg-white/[0.02]'} rounded-full blur-[140px] pointer-events-none`} />

      {/* Conteúdo Central: Logo inicial seguida pelo Vídeo Animado 9:16 */}
      <div className="relative w-full max-w-md flex flex-col items-center justify-center px-4">
        {!videoError ? (
          <div className="relative flex flex-col items-center justify-center">
            {/* Imagem oficial estática exibida antes do vídeo começar */}
            {!videoLoaded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="relative flex flex-col items-center justify-center"
              >
                <img
                  src={imageSrc}
                  alt="Somos 1 Tattoo Studio"
                  className="w-[75vw] max-w-[280px] h-auto object-contain drop-shadow-[0_0_35px_rgba(255,255,255,0.25)]"
                />
              </motion.div>
            )}

            {/* Vídeo Animado 9:16 Oficial (Dourado no Admin / Prateado no Cliente) */}
            <video
              ref={videoRef}
              src={videoSrc}
              autoPlay
              muted
              playsInline
              // @ts-ignore
              webkit-playsinline="true"
              // @ts-ignore
              x5-playsinline="true"
              preload="auto"
              onPlay={() => setVideoLoaded(true)}
              onLoadedData={() => setVideoLoaded(true)}
              onEnded={() => {
                console.log('[Splash] Vídeo completo finalizado!');
                onFinish?.();
              }}
              onError={() => setVideoError(true)}
              style={{ display: videoLoaded ? 'block' : 'none' }}
              className="w-full max-w-[420px] h-auto max-h-[78vh] object-contain rounded-2xl drop-shadow-[0_0_35px_rgba(255,255,255,0.22)]"
            />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="relative flex flex-col items-center justify-center"
          >
            <img
              src={imageSrc}
              alt="Somos 1 Tattoo Studio"
              className="w-[75vw] max-w-[280px] h-auto object-contain drop-shadow-[0_0_35px_rgba(255,255,255,0.25)]"
            />
          </motion.div>
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
            {displayMsg}
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
