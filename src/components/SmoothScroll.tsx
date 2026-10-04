import { useEffect } from 'react';
import Lenis from 'lenis';

import { isPageHeld, PAGE_HOLD_ATTR, registerLenis } from '@/lib/smoothScroll';

/* ==========================================================================
   SMOOTH SCROLL — the driver

   Mounted once, above the routes. Smooths wheel and trackpad input only;
   touch scrolling stays native, because a phone's own momentum is already
   the best version of this and replacing it reads as lag.

   Three things keep it from fighting the rest of the site:

   1. Nested scroll areas (the terminal's scrollback, the assistant dock, the
      palette's results, the case-study contents) scroll themselves —
      `allowNestedScroll` hands the wheel to whichever scrollable element is
      under the pointer.
   2. Overlays lock the page by setting `overflow: hidden` on <body>. Lenis
      moves the page with scrollTo, which `overflow: hidden` does not stop,
      so the body's style is watched and Lenis is paused while it is locked.
   3. Reduced motion: no Lenis at all. The page scrolls exactly as the
      platform scrolls it.
   ========================================================================== */

export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      // Exponential settle: most of the travel early, a long soft landing.
      lerp: 0.11,
      wheelMultiplier: 1,
      smoothWheel: true,
      syncTouch: false,
      allowNestedScroll: true,
      // Elements that own their own wheel, by attribute, for the cases the
      // nested-scroll check cannot see (a canvas, a horizontal strip).
      prevent: (node) => node.hasAttribute?.('data-lenis-prevent'),
    });
    registerLenis(lenis);

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    const syncLock = () => {
      const locked = document.body.style.overflow === 'hidden' || isPageHeld();
      if (locked) lenis.stop();
      else lenis.start();
    };
    const observer = new MutationObserver(syncLock);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: [PAGE_HOLD_ATTR] });
    syncLock();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      registerLenis(null);
      lenis.destroy();
    };
  }, []);

  return null;
}
