import React from 'react';
import { motion } from 'motion/react';

interface LoadingScreenProps {
  message?: string;
  isAdmin?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message, 
  isAdmin 
}) => {
  const isStudioAdmin = isAdmin ?? (
    typeof window !== 'undefined' && (
      window.location.pathname.startsWith('/admin') || 
      window.location.pathname.startsWith('/studio') ||
      window.location.pathname.startsWith('/test-crm') ||
      window.location.pathname.startsWith('/galeria')
    )
  );

  const imageSrc = isStudioAdmin ? "/somos1-ouro-metal-preto.png" : "/somos1-logo-official.png";
  const displayMsg = message || (isStudioAdmin ? "Carregando Somos 1 Studio..." : "Carregando Somos 1...");

  return (
    <div className="fixed inset-0 z-[9990] bg-black flex flex-col items-center justify-center p-6 select-none overflow-hidden">
      {/* Luz ambiente de fundo */}
      <div className={`absolute w-[450px] h-[450px] ${isStudioAdmin ? 'bg-amber-500/[0.04]' : 'bg-white/[0.02]'} rounded-full blur-[140px] pointer-events-none`} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="relative z-10 flex flex-col items-center justify-center text-center max-w-sm"
      >
        <img
          src={imageSrc}
          alt="Somos 1"
          className="w-48 max-w-[70vw] h-auto object-contain mb-8 drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]"
        />

        {/* Barra de Progresso Fluida */}
        <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden mb-3">
          <motion.div
            animate={{ x: [-128, 128] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            className={`w-14 h-full ${isStudioAdmin ? 'bg-amber-400' : 'bg-white'} rounded-full`}
          />
        </div>

        <p className="font-headline text-[10px] uppercase tracking-[0.28em] text-zinc-400 font-bold">
          {displayMsg}
        </p>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;
