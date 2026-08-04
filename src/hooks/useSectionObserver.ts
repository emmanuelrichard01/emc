import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/* The horizontal band, as a fraction of viewport height, that decides which
   section counts as "current". A section is active when it occupies more of
   this band than any other — matching where a reader's eyes actually sit
   rather than where the section boundary happens to be. */
const BAND_TOP = 0.2;
const BAND_BOTTOM = 0.4;

/**
 * Returns the `data-section` id of the section currently occupying the
 * reading band.
 *
 * IntersectionObserver is used purely as a *trigger* — it fires only when a
 * section enters or leaves the band, so there is no scroll-handler spam. The
 * decision itself is made by measuring live geometry inside the callback.
 *
 * That split matters: an IO entry only tells you about the one element that
 * crossed a threshold, and `intersectionRatio` is relative to the *target's*
 * own height, so a tall section fully covering the band scores lower than a
 * short section that barely clips it. Comparing entries directly therefore
 * picks the wrong section, and comparing against previously-cached entries
 * compares stale data. Measuring all sections at decision time avoids both.
 */
export function useSectionObserver(): string | null {
  // Null rather than 'home' — on routes that have no sections at all (a
  // project case study, the 404 page) there is no current section, and
  // defaulting to 'home' made the nav highlight Home on every one of them.
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    let observer: IntersectionObserver | undefined;
    let mutationObserver: MutationObserver | undefined;
    let elements: HTMLElement[] = [];

    const pickActive = () => {
      const bandTop = window.innerHeight * BAND_TOP;
      const bandBottom = window.innerHeight * BAND_BOTTOM;

      let bestId: string | null = null;
      let bestOverlap = 0;

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        const overlap = Math.min(rect.bottom, bandBottom) - Math.max(rect.top, bandTop);
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestId = el.dataset.section ?? null;
        }
      }

      // At the very top and very bottom of the document nothing occupies the
      // band. Holding the previous value there is deliberate — snapping back
      // to 'home' would make the nav flicker at both ends of every scroll.
      if (bestId) setActiveSection(bestId);
    };

    const setupObserver = () => {
      elements = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'));
      if (!elements.length) return false;

      observer = new IntersectionObserver(pickActive, {
        rootMargin: `-${BAND_TOP * 100}% 0px -${(1 - BAND_BOTTOM) * 100}% 0px`,
        threshold: 0,
      });
      elements.forEach((el) => observer!.observe(el));

      pickActive();
      return true;
    };

    if (!setupObserver()) {
      // Sections arrive late on lazy-loaded routes. Watch for them instead of
      // polling on an interval — the old 500ms retry never stopped on routes
      // that legitimately have no sections at all (e.g. project detail
      // pages), so it ticked forever for the life of the page.
      mutationObserver = new MutationObserver(() => {
        if (setupObserver()) {
          mutationObserver?.disconnect();
          mutationObserver = undefined;
        }
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    // Section offsets move when the viewport resizes, and the band is defined
    // in viewport-relative terms, so both need a re-evaluation.
    const onResize = () => pickActive();
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      window.removeEventListener('resize', onResize);
      mutationObserver?.disconnect();
      observer?.disconnect();
    };
    // Re-scan on navigation. The captured element list belongs to the page
    // that was mounted when the effect ran; after a route change those nodes
    // are detached, and measuring a detached node returns zeros forever.
  }, [pathname]);

  return activeSection;
}
