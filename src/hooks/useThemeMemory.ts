import { useEffect } from 'react';
import { useTheme } from '@/components/ThemeProvider';

export const useThemeMemory = () => {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem('portfolio-theme');
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme as 'light' | 'dark' | 'system');
    }
  }, [setTheme]);

  useEffect(() => {
    // Save theme to localStorage whenever it changes
    localStorage.setItem('portfolio-theme', theme);
  }, [theme]);

  return { theme, setTheme };
};