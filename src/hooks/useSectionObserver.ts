import { useState, useEffect } from 'react';

/**
 * Tracks the current scroll position and returns the ID of the section
 * currently occupying the main viewing area.
 * 
 * Uses IntersectionObserver for better performance.
 * Retries finding elements to support lazy-loaded routes.
 */
export function useSectionObserver() {
  const [activeSection, setActiveSection] = useState<string>('home');

  useEffect(() => {
    let observer: IntersectionObserver;
    let retryInterval: NodeJS.Timeout;

    const setupObserver = () => {
      const sections = document.querySelectorAll('[data-section]');
      if (!sections.length) return false;

      observer = new IntersectionObserver(
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
      return true;
    };

    if (!setupObserver()) {
      retryInterval = setInterval(() => {
        if (setupObserver()) {
          clearInterval(retryInterval);
        }
      }, 500);
    }

    return () => {
      if (retryInterval) clearInterval(retryInterval);
      if (observer) observer.disconnect();
    };
  }, []);

  return activeSection;
}
