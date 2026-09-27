import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language } from '../types';
import { translations } from '../utils/translations';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: (e?: React.MouseEvent | React.TouchEvent | { clientX: number; clientY: number }) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
  isRTL: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('telecloud_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [lang, setLangState] = useState<Language>(() => {
    const savedLang = localStorage.getItem('telecloud_lang') as Language;
    return savedLang === 'en' || savedLang === 'fa' ? savedLang : 'fa'; // Default to Persian as requested by user prompt
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('telecloud_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('telecloud_theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('telecloud_lang', lang);
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleTheme = (e?: React.MouseEvent | React.TouchEvent | { clientX: number; clientY: number }) => {
    let clientX = window.innerWidth / 2;
    let clientY = window.innerHeight / 2;

    if (e) {
      if ('touches' in e && e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e && typeof e.clientX === 'number') {
        clientX = e.clientX;
        clientY = e.clientY;
      }
    }

    const updateThemeState = () => {
      setIsDark(prev => !prev);
    };

    // Check if modern View Transition API is supported by the browser
    if (
      typeof document !== 'undefined' &&
      'startViewTransition' in document &&
      typeof (document as any).startViewTransition === 'function'
    ) {
      try {
        const transition = (document as any).startViewTransition(() => {
          updateThemeState();
        });

        const endRadius = Math.hypot(
          Math.max(clientX, window.innerWidth - clientX),
          Math.max(clientY, window.innerHeight - clientY)
        );

        transition.ready.then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${clientX}px ${clientY}px)`,
                `circle(${endRadius}px at ${clientX}px ${clientY}px)`
              ],
            },
            {
              duration: 320,
              easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
              pseudoElement: '::view-transition-new(root)',
            }
          );
        });
        return;
      } catch {
        updateThemeState();
      }
    } else {
      updateThemeState();
    }
  };
  const setLang = (newLang: Language) => setLangState(newLang);

  const t = (key: keyof typeof translations.en): string => {
    const dict = translations[lang] || translations.en;
    return dict[key] || translations.en[key] || key;
  };

  const isRTL = lang === 'fa';

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, lang, setLang, t, isRTL }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
