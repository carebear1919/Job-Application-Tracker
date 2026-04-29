import { useState, useEffect } from 'react';

interface ThemeColors {
  primary: string;
  accent: string;
  secondary: string;
  applied: string;
  interviewing: string;
  technical: string;
  offer: string;
  rejected: string;
  ghosted: string;
}

const DEFAULT_COLORS: ThemeColors = {
  primary: '#6366f1',
  accent: '#8b5cf6',
  secondary: '#f59e0b',
  applied: '#6366f1',
  interviewing: '#8b5cf6',
  technical: '#f59e0b',
  offer: '#10b981',
  rejected: '#ef4444',
  ghosted: '#71717a',
};

export function useThemeCustomization() {
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_COLORS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load colors from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('app_theme_colors');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setColors(parsed);
        applyColors(parsed);
      } catch (e) {
        setColors(DEFAULT_COLORS);
        applyColors(DEFAULT_COLORS);
      }
    } else {
      applyColors(DEFAULT_COLORS);
    }
    setIsLoaded(true);
  }, []);

  const applyColors = (newColors: ThemeColors) => {
    const root = document.documentElement;
    Object.entries(newColors).forEach(([key, value]) => {
      const cssVarName = `--color-${key}`;
      root.style.setProperty(cssVarName, value);
    });
  };

  const updateColor = (colorKey: keyof ThemeColors, value: string) => {
    const newColors = { ...colors, [colorKey]: value };
    setColors(newColors);
    applyColors(newColors);
    localStorage.setItem('app_theme_colors', JSON.stringify(newColors));
  };

  const resetColors = () => {
    setColors(DEFAULT_COLORS);
    applyColors(DEFAULT_COLORS);
    localStorage.removeItem('app_theme_colors');
  };

  return {
    colors,
    updateColor,
    resetColors,
    isLoaded,
  };
}
