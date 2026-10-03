import { scrollToY } from "./smoothScroll";
import { shouldVeil, veilTo } from "./sectionVeil";
import { SECTIONS } from "../data/sections";

/**
 * Takes the reader to a `[id]` section, offsetting for the fixed navbar.
 * Shared by the navbar, command palette, hero terminal and footer so all of
 * them navigate identically.
 *
 * A nearby section is smooth-scrolled to; a distant one is reached by a
 * page turn (lib/sectionVeil.ts), which is faster and keeps the reader
 * oriented. Reduced motion jumps.
 */
/** Air between the running head and a section's opening rule on arrival. */
const LANDING_MARGIN = 28;
/** The reveal stage's pin, as a share of the viewport (REVEAL_LENGTH in Hero.tsx). */
const REVEAL_PIN = 0.45;

/**
 * Where a jump to a section should come to rest.
 *
 * Not the section's top edge: every section carries generous top padding so
 * it breathes when scrolled into, and landing on the edge put the title a
 * quarter of the way down the screen with an empty band above it. A jump
 * lands on the section's opening instead (its first <header>, the drawn rule
 * and title), just under the running head.
 *
 * The header's distance is taken inside the section and added to the
 * section's own position, rather than read from the header directly: About
 * is pinned on the hero's reveal stage, and a pinned element's live position
 * is where it is stuck, not where the page will come to rest.
 */
function landingY(element: HTMLElement, offset: number): number {
  if (element.id === "home") return 0;
  const head =
    element.querySelector<HTMLElement>("header") ??
    element.querySelector<HTMLElement>(".page-max > :first-child") ??
    element;
  // Distance from the section's top to its opening, from layout offsets, so
  // a transform in flight (the reveal stage's scale) cannot skew it.
  let inside = 0;
  for (let node: HTMLElement | null = head; node && node !== element; node = node.offsetParent as HTMLElement | null) {
    inside += node.offsetTop;
    if (!element.contains(node.offsetParent)) break;
  }
  // A section on the hero's reveal stage is pinned while it grows in; it
  // comes to rest where the stage releases it, one pin-length below the
  // stage's top, and that is where the page should land.
  const stage = element.closest<HTMLElement>("#hero-stage");
  const top = stage
    ? stage.getBoundingClientRect().top + window.scrollY + window.innerHeight * REVEAL_PIN
    : element.getBoundingClientRect().top + window.scrollY;
  return Math.max(0, top + inside - offset - (head === element ? 0 : LANDING_MARGIN));
}

export function scrollToSection(id: string, offset = 64) {
  const element = document.getElementById(id);
  if (!element) return false;
  const y = landingY(element, offset);
  if (shouldVeil(y)) {
    const label = SECTIONS.find((section) => section.id === id)?.label;
    void veilTo(y, label);
  } else {
    scrollToY(y);
  }
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
function scrollSettled(quiet = 140, max = 2200): Promise<void> {
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

  for (let attempt = 0; attempt < 3; attempt++) {
    const element = document.getElementById(id);
    if (!element) return false;
    const target = Math.max(0, element.getBoundingClientRect().top + window.scrollY - offset);
    if (Math.abs(window.scrollY - target) <= 4) return true;
    scrollToY(target);
    await scrollSettled();
  }
  return true;
}
