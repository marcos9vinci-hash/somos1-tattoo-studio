import { useState, useEffect } from 'react';

export function useInvertedTheme() {
  const [isInverted, setIsInverted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('somos1_theme_inverted') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isInverted) {
        document.documentElement.classList.add('inverted');
        document.documentElement.setAttribute('data-theme', 'inverted');
        localStorage.setItem('somos1_theme_inverted', 'true');
      } else {
        document.documentElement.classList.remove('inverted');
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('somos1_theme_inverted', 'false');
      }
    } catch (e) {
      console.warn('Erro ao persistir tema:', e);
    }
  }, [isInverted]);

  const toggleInverted = () => setIsInverted(prev => !prev);

  return { isInverted, toggleInverted };
}
