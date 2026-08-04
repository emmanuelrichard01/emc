import { useEffect, useRef } from 'react';

const KONAMI_CODE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

/**
 * Fires `callback` when the Konami code is entered.
 *
 * The buffer lives in a ref rather than state, deliberately. The previous
 * version held it in `useState`, and because this hook runs inside a provider
 * that wraps the whole application, every single keypress anywhere on the
 * page — including every character typed into the contact form or the
 * terminal — re-rendered the entire tree. It also invoked `callback` from
 * inside the state updater, which React StrictMode double-invokes.
 *
 * Nothing here needs to be reactive: the buffer is never rendered.
 */
export function useKonamiCode(callback: () => void) {
  const buffer = useRef<string[]>([]);
  const callbackRef = useRef(callback);

  // Kept in a ref so a changing callback identity never re-subscribes the
  // listener — which would drop the in-progress buffer mid-sequence.
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Match the letters case-insensitively so Caps Lock doesn't silently
      // break the sequence.
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      buffer.current = [...buffer.current, key].slice(-KONAMI_CODE.length);
      if (buffer.current.length < KONAMI_CODE.length) return;

      for (let i = 0; i < KONAMI_CODE.length; i++) {
        if (buffer.current[i] !== KONAMI_CODE[i]) return;
      }

      buffer.current = [];
      callbackRef.current();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
