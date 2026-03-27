import { useState, useEffect } from 'react';

const KONAMI_CODE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a'
];

export function useKonamiCode(callback: () => void) {
  const [keys, setKeys] = useState<string[]>([]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      setKeys((prev) => {
        const newKeys = [...prev, e.key].slice(-KONAMI_CODE.length);
        if (JSON.stringify(newKeys) === JSON.stringify(KONAMI_CODE)) {
          callback();
        }
        return newKeys;
      });
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [callback]);
}
