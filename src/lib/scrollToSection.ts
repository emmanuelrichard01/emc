/**
 * Smooth-scrolls to a `[id]` section, offsetting for the fixed navbar height.
 * Shared by the navbar, command palette, and hero terminal so all three
 * navigate identically instead of drifting out of sync.
 */
export function scrollToSection(id: string, offset = 80) {
  const element = document.getElementById(id);
  if (!element) return false;
  const y = element.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: y, behavior: "smooth" });
  return true;
}

/* ==========================================================================
   SCROLL AND LAND

   For a jump that is triggered *together with* a change to the page — "show
   me the work with Python" filters the catalogue and goes to it in one
   click. A plain smooth scroll measures its target once, at the click; the
   filter then re-renders the list, the page's height changes under a scroll
   already in flight, and the visitor comes to rest short of where they were
   sent — "half way".

   So this waits for the change to be painted, measures, scrolls, and when
   the scroll has come to rest, measures again: if anything moved, it
   finishes the job (a few times at most, in case a layout is still
   settling). The landing is checked, not assumed.
   ========================================================================== */

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** Resolves once the page has stopped scrolling for `quiet` ms (or after `max`). */
function scrollSettled(quiet = 140, max = 1600): Promise<void> {
  return new Promise((resolve) => {
    let last = window.scrollY;
    let still = 0;
    const started = performance.now();
    const tick = () => {
      const now = performance.now();
      if (window.scrollY === last) still += 16;
      else {
        still = 0;
        last = window.scrollY;
      }
      if (still >= quiet || now - started > max) resolve();
      else setTimeout(tick, 16);
    };
    setTimeout(tick, 16);
  });
}

export async function scrollToElementAndLand(id: string, offset = 96): Promise<boolean> {
  // Two frames: one for the state change to commit, one for layout to follow.
  await nextFrame();
  await nextFrame();

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior: ScrollBehavior = reduced ? "auto" : "smooth";

  for (let attempt = 0; attempt < 3; attempt++) {
    const element = document.getElementById(id);
    if (!element) return false;
    const target = Math.max(0, element.getBoundingClientRect().top + window.scrollY - offset);
    if (Math.abs(window.scrollY - target) <= 4) return true;
    window.scrollTo({ top: target, behavior: attempt === 0 ? behavior : "smooth" });
    await scrollSettled();
  }
  return true;
}
