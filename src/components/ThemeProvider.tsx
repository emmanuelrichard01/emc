import React, { createContext, useContext, useEffect, useState } from "react";

type ColorTheme = "amber" | "purple";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ColorTheme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: ColorTheme;
  setTheme: (theme: ColorTheme) => void;
}

const initialState: ThemeProviderState = {
  theme: "amber",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "amber",
  storageKey = "emc-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<ColorTheme>(
    () => (localStorage.getItem(storageKey) as ColorTheme) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("theme-amber", "theme-purple");
    
    // Add the selected theme class to the root HTML element
    if (theme === "purple") {
      root.classList.add("theme-purple");
    } else {
      root.classList.add("theme-amber"); // default is amber, we could just not add it, but explicit is good
    }
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: ColorTheme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
