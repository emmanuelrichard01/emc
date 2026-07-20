import { useState, useEffect } from 'react';

/**
 * Tracks the current scroll position and returns the ID of the section
 * currently occupying the main viewing area.
 * 
 * Uses IntersectionObserver for better performance.
 */
export function useSectionObserver() {
  const [activeSection, setActiveSection] = useState<string>('home');

  useEffect(() => {
    const sections = document.querySelectorAll('[data-section]');
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.find(entry => entry.isIntersecting);
        if (intersecting) {
          setActiveSection(intersecting.target.getAttribute('data-section') || 'home');
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
    };
  }, []);

  return activeSection;
}
