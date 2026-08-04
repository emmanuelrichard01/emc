import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/* ==========================================================================
   COMMAND PALETTE STATE

   Palette open/close lives in context rather than in MainLayout's local
   state so that anything on the page can open it by calling a function.

   The hero previously reached the palette by constructing and dispatching a
   synthetic Ctrl+K KeyboardEvent — simulating a user pressing a key in order
   to talk to a component two levels up. That works right up until the
   shortcut changes, a second listener appears, or someone tries to open the
   palette while focus is in a text field.
   ========================================================================== */

interface CommandPaletteState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteState | null>(null);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  const value = useMemo(() => ({ isOpen, open, close, toggle }), [isOpen, open, close, toggle]);

  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;
}

export const useCommandPalette = () => {
  const context = useContext(CommandPaletteContext);
  if (!context) throw new Error('useCommandPalette must be used within a CommandPaletteProvider');
  return context;
};
