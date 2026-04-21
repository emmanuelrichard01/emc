import { useState, useEffect, useRef } from 'react';

/**
 * Tracks the current scroll position and returns the ID of the section
 * currently occupying the main viewing area.
 * 
 * Uses requestAnimationFrame for frame-aligned updates (no jank on low-end devices).
 */
export function useSectionObserver() {
  const [activeSection, setActiveSection] = useState<string>('home');
  const rafId = useRef<number>(0);

  useEffect(() => {
    const update = () => {
      const sections = Array.from(document.querySelectorAll('[data-section]'));
      if (!sections.length) return;

      let current = 'home';

      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        // If the top of the section is above the 40% vertical mark of the viewport,
        // consider it the active section. The deepest valid section wins.
        if (rect.top <= window.innerHeight * 0.4) {
          current = section.getAttribute('data-section') || current;
        }
      });

      setActiveSection(current);
    };

    const handleScroll = () => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial check (slight delay for DOM/animations to settle)
    const timeout = setTimeout(update, 100);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId.current);
      clearTimeout(timeout);
    };
  }, []);

  return activeSection;
}
