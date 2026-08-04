import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useKonamiCode } from "@/hooks/useKonamiCode";
import { scrollToSection } from "@/lib/scrollToSection";
import { useTheme } from "@/components/ThemeProvider";

const STORAGE_KEY = "emc-clearance";
const GRANTED = "granted";

interface UnlockOptions {
  /** Suppress the toast and the scroll, for callers that render their own confirmation. */
  silent?: boolean;
}

interface EasterEggState {
  /** Clearance is held, whether earned now or in a previous visit. */
  unlocked: boolean;
  /** True only when the unlock happened during this page view. */
  unlockedThisSession: boolean;
  unlock: (opts?: UnlockOptions) => void;
  relock: () => void;
}

const EasterEggContext = createContext<EasterEggState | undefined>(undefined);

function readStoredClearance(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === GRANTED;
  } catch {
    return false;
  }
}

interface ConsoleApi {
  unlock: () => string;
  relock: () => string;
  status: () => string;
}

type WindowWithApi = Window & { __emc?: ConsoleApi };

export function EasterEggProvider({ children }: { children: React.ReactNode }) {
  // Clearance persists across visits. Previously it lived only in memory, so
  // anyone who found the code lost it on the next reload — the reward
  // evaporated the moment they navigated to a case study and came back.
  const [unlocked, setUnlocked] = useState(readStoredClearance);
  const [unlockedThisSession, setUnlockedThisSession] = useState(false);
  const toasted = useRef(false);
  const { theme, setTheme } = useTheme();

  const unlock = useCallback(
    (opts?: UnlockOptions) => {
      setUnlocked(true);
      setUnlockedThisSession(true);

      try {
        localStorage.setItem(STORAGE_KEY, GRANTED);
      } catch {
        // Storage unavailable — clearance still applies for this session.
      }

      // Guarded separately from the state so re-entering the code doesn't
      // stack duplicate toasts.
      if (!opts?.silent && !toasted.current) {
        toasted.current = true;
        toast.success("Query layer online", {
          description: "You can now read this site's own tables with SQL. Try `schema` in the terminal.",
          icon: <Sparkles className="w-4 h-4" />,
        });
        scrollToSection("home");
      }
    },
    []
  );

  const relock = useCallback(() => {
    toasted.current = false;
    setUnlocked(false);
    setUnlockedThisSession(false);

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clean up if storage was never available.
    }

    // The hidden accent is part of what clearance buys, so revoking clearance
    // has to revoke the theme too — otherwise a relocked visitor is left
    // looking at a colour they can no longer reach or explain.
    if (theme === "phosphor") setTheme("amber");
  }, [theme, setTheme]);

  useKonamiCode(useCallback(() => unlock(), [unlock]));

  /* A third discovery route, for the kind of visitor who opens DevTools
     before they scroll. The console greeting in Index points here. */
  useEffect(() => {
    const api: ConsoleApi = {
      unlock: () => {
        unlock();
        return "QUERY LAYER ONLINE — try 'schema' or 'sql SELECT * FROM projects' in the terminal.";
      },
      relock: () => {
        relock();
        return "Clearance revoked.";
      },
      status: () => (unlocked ? "GRANTED — LEVEL Ω" : "LOCKED"),
    };

    (window as WindowWithApi).__emc = api;
    return () => {
      delete (window as WindowWithApi).__emc;
    };
  }, [unlock, relock, unlocked]);

  const value = useMemo<EasterEggState>(
    () => ({ unlocked, unlockedThisSession, unlock, relock }),
    [unlocked, unlockedThisSession, unlock, relock]
  );

  return <EasterEggContext.Provider value={value}>{children}</EasterEggContext.Provider>;
}

export const useEasterEgg = () => {
  const context = useContext(EasterEggContext);
  if (context === undefined) throw new Error("useEasterEgg must be used within an EasterEggProvider");
  return context;
};
