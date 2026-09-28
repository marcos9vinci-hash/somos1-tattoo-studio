import React from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  message?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ message = "Inicializando..." }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-4 select-none overflow-hidden">
      {/* Luz ambiente de fundo */}
      <div className="absolute w-[500px] h-[500px] bg-white/[0.03] rounded-full blur-[140px] pointer-events-none" />

      {/* Símbolo Oficial Grande ocupando o máximo da tela */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative flex flex-col items-center justify-center w-full max-w-lg"
      >
        <img
          src="/somos1-logo-official.png"
          alt="Somos 1 Tattoo Studio"
          className="w-[85vw] max-w-[440px] h-auto object-contain drop-shadow-[0_0_40px_rgba(255,255,255,0.25)]"
        />

        {/* Barra de progresso sutil */}
        <div className="mt-8 flex flex-col items-center gap-3 w-full">
          <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              animate={{ x: [-192, 192] }}
              transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
              className="w-24 h-full bg-white rounded-full"
            />
          </div>
          <span className="font-headline text-[10px] uppercase tracking-[0.35em] text-zinc-400 font-bold">
            {message}
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
