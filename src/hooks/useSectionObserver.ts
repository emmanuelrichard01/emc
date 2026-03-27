import { useState, useEffect } from 'react';

/**
 * Tracks the current scroll position and returns the ID of the section
 * currently occupying the main viewing area.
 */
export function useSectionObserver() {
  const [activeSection, setActiveSection] = useState<string>('home');

  useEffect(() => {
    const handleScroll = () => {
      const sections = Array.from(document.querySelectorAll('[data-section]'));
      if (!sections.length) return;

      let current = 'home';
      
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        // If the top of the section is above the 40% vertical mark of the viewport, 
        // consider it the active section. As we map sequentially, the deepest valid section wins.
        if (rect.top <= window.innerHeight * 0.4) {
          current = section.getAttribute('data-section') || current;
        }
      });

      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check (with slight delay to ensure DOM and animations have settled)
    const timeout = setTimeout(handleScroll, 100);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeout);
    };
  }, []);

  return activeSection;
}
