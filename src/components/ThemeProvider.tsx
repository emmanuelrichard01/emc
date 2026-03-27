import React, { useEffect, createContext, useContext } from 'react';

/* -------------------------------------------------------------------------- */
/* THEME — Dark mode only, no toggle needed                                   */
/* -------------------------------------------------------------------------- */

interface ThemeContextType {
  theme: 'dark';
  resolvedTheme: 'dark';
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', resolvedTheme: 'dark' });

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'dark', resolvedTheme: 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  return useContext(ThemeContext);
}