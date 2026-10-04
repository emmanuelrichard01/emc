import { Suspense, lazy, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { OPEN_CONSOLE_EVENT, peekLinkCommand } from './sessionStore';

/* ==========================================================================
   CONSOLE LAUNCHER

   The drop-down console carries the whole shell (parser, filesystem, query
   engine), which most visitors never open. This stays in the first download
   instead: it waits for the backtick, the palette's open event or a ?run=
   link off the home page, then loads the console and hands over. From then
   on the console listens for itself.
   ========================================================================== */

const DropConsole = lazy(() => import('./DropConsole'));

function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

export default function ConsoleLauncher() {
  const { pathname } = useLocation();
  // A ?run= link landing off the home page opens the console straight away.
  const [wanted, setWanted] = useState(() => pathname !== '/' && Boolean(peekLinkCommand()));

  useEffect(() => {
    if (wanted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '`' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditable(e.target) || document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      setWanted(true);
    };
    const onOpen = () => setWanted(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_CONSOLE_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_CONSOLE_EVENT, onOpen);
    };
  }, [wanted]);

  if (!wanted) return null;
  return (
    <Suspense fallback={null}>
      <DropConsole defaultOpen />
    </Suspense>
  );
}
