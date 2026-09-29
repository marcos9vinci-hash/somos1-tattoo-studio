import React, { useRef, useState, useEffect, useCallback } from 'react';

interface SplashScreenProps {
  message?: string;
  onFinish?: () => void;
  isAdmin?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onFinish,
  isAdmin
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const hasFinishedRef = useRef(false);

  const handleComplete = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    console.log('[Splash] Vídeo em tela cheia finalizado com sucesso.');
    onFinish?.();
  }, [onFinish]);

  const isStudioAdmin = isAdmin ?? (
    typeof window !== 'undefined' && (
      window.location.pathname.startsWith('/admin') || 
      window.location.pathname.startsWith('/studio') ||
      window.location.pathname.startsWith('/test-crm') ||
      window.location.pathname.startsWith('/galeria')
    )
  );

  const videoSrc = isStudioAdmin ? "/somos1-admin-intro.mp4" : "/somos1-intro.mp4";

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().then(() => {
        setVideoLoaded(true);
      }).catch(() => {
        // Se houver bloqueio severo de autoplay pelo SO (modo economia de bateria)
        setVideoError(true);
      });
    }
  }, []);

  useEffect(() => {
    // Se o vídeo der erro de codec/rede, encerra após 1.5s
    if (videoError) {
      const timer = setTimeout(() => {
        handleComplete();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [videoError, handleComplete]);

  return (
    <div 
      onClick={handleComplete}
      className="fixed inset-0 z-[9999] bg-black w-screen h-screen flex items-center justify-center p-0 m-0 select-none overflow-hidden cursor-pointer"
    >
      {/* Vídeo Animado 9:16 Oficial em Full Screen Puro (Dourado no Admin / Prateado no Cliente) */}
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
        onEnded={handleComplete}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration > 0 && v.currentTime >= v.duration - 0.15) {
            handleComplete();
          }
        }}
        onError={() => setVideoError(true)}
        className="w-full h-full object-cover sm:object-contain bg-black"
      />
    </div>
  );
};

export default SplashScreen;
