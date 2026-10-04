import type Lenis from 'lenis';

/* ==========================================================================
   SMOOTH SCROLL

   One owner for the page's scroll position. Lenis smooths the wheel and
   trackpad (touch keeps the platform's own physics); everything that moves
   the page programmatically goes through `scrollToY` so it rides the same
   easing instead of fighting Lenis with a native smooth scroll.

   The instance is registered by <SmoothScroll> and is absent under reduced
   motion, on the server, and before mount. Every helper falls back to the
   native call when it is absent, so callers never have to know.
   ========================================================================== */

let instance: Lenis | null = null;

export function registerLenis(lenis: Lenis | null) {
  instance = lenis;
}

export function getLenis(): Lenis | null {
  return instance;
}

/* ── Page hold ─────────────────────────────────────────────────────────────
   While the hero terminal is in full mode the page holds still, so a wheel
   through the scrollback never drags the page (and the dive) along with it.
   Any jump (a nav link, Scroll, the palette) goes through scrollToY, which
   lets go first, so the hold can never trap anyone on the first screen. */

export const PAGE_HOLD_ATTR = 'data-page-hold';
const holdListeners = new Set<(held: boolean) => void>();

export function isPageHeld(): boolean {
  return typeof document !== 'undefined' && document.documentElement.hasAttribute(PAGE_HOLD_ATTR);
}

export function holdPage(on: boolean) {
  if (typeof document === 'undefined' || on === isPageHeld()) return;
  document.documentElement.toggleAttribute(PAGE_HOLD_ATTR, on);
  // Lenis follows the attribute (SmoothScroll.tsx); set it here too so a
  // scroll that follows in the same tick is not swallowed.
  if (on) instance?.stop();
  else instance?.start();
  holdListeners.forEach((listener) => listener(on));
}

export function onPageHold(listener: (held: boolean) => void): () => void {
  holdListeners.add(listener);
  return () => holdListeners.delete(listener);
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Scrolls the page to `top`, eased by Lenis when it is running. */
export function scrollToY(top: number, options: { immediate?: boolean } = {}) {
  const immediate = options.immediate || prefersReducedMotion();
  holdPage(false);
  if (instance) {
    instance.scrollTo(top, {
      immediate,
      // Long enough to read as travel, short enough not to feel like a wait.
      duration: Math.min(1.6, 0.6 + Math.abs(window.scrollY - top) / 4000),
      easing: (t) => 1 - Math.pow(1 - t, 4),
    });
    return;
  }
  window.scrollTo({ top, behavior: immediate ? 'auto' : 'smooth' });
}
