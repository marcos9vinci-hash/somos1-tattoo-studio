import React from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  message?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ message = "Inicializando..." }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center px-6 select-none overflow-hidden">
      {/* Luz ambiente de fundo (glow sutil) */}
      <div className="absolute w-80 h-80 bg-white/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute w-64 h-64 bg-primary-fixed/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Container Central com a Logo Oficial Bem Grande */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col items-center justify-center"
      >
        <img
          src="/somos1-logo-official.png"
          alt="Somos 1 Tattoo Studio"
          className="w-72 sm:w-80 md:w-96 max-w-[85vw] h-auto object-contain drop-shadow-[0_0_35px_rgba(255,255,255,0.2)]"
        />

        {/* Efeito de brilho pulsante */}
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="mt-6 flex flex-col items-center gap-3"
        >
          {/* Barra de progresso com animação suave */}
          <div className="w-36 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              animate={{ x: [-144, 144] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="w-16 h-full bg-gradient-to-r from-transparent via-primary-fixed to-transparent rounded-full"
            />
          </div>

          <span className="font-headline text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-semibold">
            {message}
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
