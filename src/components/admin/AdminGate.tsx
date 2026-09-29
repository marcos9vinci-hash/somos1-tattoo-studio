import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, KeyRound, ArrowLeft, ArrowRight, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import Admin from '../../pages/Admin';

export default function AdminGate() {
  const { isAdmin, loginAsAdmin } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Se já estiver autenticado como administrador, abre o painel direto!
  if (isAdmin) {
    return <Admin />;
  }

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Por favor, digite a chave de acesso.');
      return;
    }

    const success = loginAsAdmin(pin);
    if (!success) {
      setError('Chave de acesso incorreta. Acesso restrito ao estúdio.');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Luz ambiente de fundo */}
      <div className="absolute w-[450px] h-[450px] bg-white/[0.03] rounded-full blur-[130px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm flex flex-col items-center text-center relative z-10"
      >
        {/* Logo Oficial Ouro Metálico */}
        <div className="mb-6 flex justify-center">
          <img 
            src="/somos1-ouro-metal-preto.png" 
            alt="Somos 1 Tattoo Studio" 
            className="w-56 h-auto object-contain" 
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
          <Shield className="w-3.5 h-3.5 text-primary-fixed" />
          <span className="font-headline font-black text-[10px] uppercase tracking-widest text-zinc-300">
            Acesso Restrito · Operação
          </span>
        </div>

        <h1 className="font-headline font-black text-2xl text-white uppercase tracking-wider mb-2">
          Painel do Estúdio
        </h1>
        <p className="text-xs text-zinc-400 font-headline mb-6 max-w-xs leading-relaxed">
          Esta área é exclusiva para o dono e tatuadores do Somos 1 Studio.
        </p>

        {error && (
          <div className="w-full p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-headline font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleUnlock} className="w-full space-y-4">
          <div className="relative">
            <KeyRound className="w-5 h-5 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="password"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(''); }}
              placeholder="Digite sua chave de admin..."
              autoFocus
              className="w-full h-14 pl-12 pr-4 bg-zinc-900/80 border border-white/15 focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed rounded-xl text-base font-headline text-white placeholder:text-zinc-600 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full h-14 bg-primary-fixed text-black font-headline font-black text-sm uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(204,255,0,0.2)]"
          >
            <span>Desbloquear Painel</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 w-full flex flex-col items-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs font-headline text-zinc-500 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors py-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao App do Cliente</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
