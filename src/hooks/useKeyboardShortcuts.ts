import { useEffect, useState, useCallback, useMemo } from 'react';

interface KeyboardShortcuts {
  [key: string]: (e: KeyboardEvent) => void;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcuts) => {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ignore shortcuts if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      // Build key string (e.g., "ctrl+k")
      const keys = [];
      if (event.ctrlKey || event.metaKey) keys.push('ctrl'); // normalized meta/ctrl
      if (event.shiftKey) keys.push('shift');
      if (event.altKey) keys.push('alt');

      // Handle special keys vs characters
      const keyName = event.key.toLowerCase();
      if (!['control', 'shift', 'alt', 'meta'].includes(keyName)) {
        keys.push(keyName);
      }

      const combo = keys.join('+');

      // Check for exact match first
      if (shortcuts[combo]) {
        event.preventDefault(); // Prevent default browser actions (like Ctrl+P)
        shortcuts[combo](event);
        return;
      }

      // Fallback for single keys if no modifier combo matched
      if (keys.length === 1 && shortcuts[keyName]) {
        shortcuts[keyName](event);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [shortcuts]);
};

export const useKonamiCode = (callback: () => void) => {
  const [input, setInput] = useState<string[]>([]);
  // Up, Up, Down, Down, Left, Right, Left, Right, B, A
  const sequence = useMemo<string[]>(
    () => [
      'ArrowUp', 'ArrowUp',
      'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight',
      'ArrowLeft', 'ArrowRight',
      'b', 'a'
    ],
    []
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setInput((prev) => {
        const newSequence = [...prev, e.key];
        if (newSequence.length > sequence.length) {
          newSequence.shift();
        }

        // Check match
        if (JSON.stringify(newSequence) === JSON.stringify(sequence)) {
          callback();
          return []; // Reset after success
        }

        return newSequence;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callback, sequence]);
};