import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ColorTheme = "amber" | "purple" | "phosphor";

/** Themes offered by the visible toggle. `phosphor` is intentionally absent. */
export const PUBLIC_THEMES: ColorTheme[] = ["amber", "purple"];

const ALL_THEMES: ColorTheme[] = ["amber", "purple", "phosphor"];
const THEME_CLASSES = ALL_THEMES.map((t) => `theme-${t}`);

function isColorTheme(value: string | null): value is ColorTheme {
  return value !== null && (ALL_THEMES as string[]).includes(value);
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ColorTheme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: ColorTheme;
  setTheme: (theme: ColorTheme) => void;
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "amber",
  storageKey = "emc-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ColorTheme>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      // Validated rather than cast. A stale or hand-edited value used to be
      // asserted straight into the union, which then applied a class like
      // `theme-null` and silently left the site with no accent colour.
      return isColorTheme(stored) ? stored : defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(...THEME_CLASSES);
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  const value = useMemo<ThemeProviderState>(
    () => ({
      theme,
      setTheme: (next: ColorTheme) => {
        try {
          localStorage.setItem(storageKey, next);
        } catch {
          // Storage can be unavailable (private mode, blocked cookies). The
          // theme still applies for this session; only persistence is lost.
        }
        setThemeState(next);
      },
    }),
    [theme, storageKey]
  );

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
