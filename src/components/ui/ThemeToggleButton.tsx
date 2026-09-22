import React from 'react';
import { useInvertedTheme } from '../../hooks/useInvertedTheme';
import { Contrast, Sun, Moon } from 'lucide-react';
import { Button } from './button';

export const ThemeToggleButton: React.FC<{ className?: string }> = ({ className }) => {
  const { isInverted, toggleInverted } = useInvertedTheme();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleInverted}
      className={`border border-border/80 rounded-xl px-2.5 py-1.5 gap-2 text-xs font-bold transition-all ${
        isInverted 
          ? 'bg-black text-white hover:bg-zinc-800' 
          : 'bg-white text-black hover:bg-zinc-200'
      } ${className || ''}`}
      title={isInverted ? "Alternar para Fundo Preto (Dark B&W)" : "Inverter para Fundo Branco (Light B&W)"}
    >
      <Contrast className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">
        {isInverted ? "B&W Invertido (Claro)" : "B&W Studio (Escuro)"}
      </span>
    </Button>
  );
};
