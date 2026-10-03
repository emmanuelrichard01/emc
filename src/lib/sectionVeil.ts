import { scrollToY } from "./smoothScroll";

/* ==========================================================================
   SECTION VEIL

   Going to a section that is far away. A smooth scroll across five screens
   of content is a blur of everything in between: it takes a second or more,
   it is hard on the eyes, and it says nothing about where you are going.
   Cutting straight there is fast but disorienting.

   So a long jump is a page turn instead. The page's own black wipes up over
   the screen with the destination's name set in the title face, the page
   moves underneath while it is covered, and the black lifts away upwards to
   show the section, whose title then rises in on its own. About seven
   tenths of a second end to end.

   Short hops (under ~1.4 screens) keep the smooth scroll, which is the
   clearer motion when the destination is nearly in view. Reduced motion
   gets neither: the page is simply moved.

   Plain DOM and the Web Animations API rather than React: the veil lives
   for under a second, belongs to no component, and must work from anywhere
   that calls scrollToSection (nav, palette, terminal, footer).
   ========================================================================== */

const EASE = "cubic-bezier(0.77, 0, 0.18, 1)";
const COVER_MS = 380;
const HOLD_MS = 160;
const REVEAL_MS = 520;

/** Distance, in viewport heights, past which a jump is a page turn. */
export const VEIL_THRESHOLD = 1.4;

let travelling = false;

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** True when a jump to `top` should turn the page rather than scroll. */
export function shouldVeil(top: number) {
  if (typeof window === "undefined" || reducedMotion()) return false;
  if (typeof document.body.animate !== "function") return false;
  return Math.abs(window.scrollY - top) > window.innerHeight * VEIL_THRESHOLD;
}

/**
 * Covers the screen, moves the page to `top`, and uncovers it.
 * `label` is the destination's name, shown while the page is covered.
 */
export async function veilTo(top: number, label?: string) {
  if (travelling) return;
  travelling = true;

  const veil = document.createElement("div");
  veil.className = "section-veil";
  veil.setAttribute("aria-hidden", "true");
  if (label) {
    const name = document.createElement("span");
    name.className = "section-veil__label";
    name.textContent = label;
    const rule = document.createElement("span");
    rule.className = "section-veil__rule";
    veil.append(name, rule);
  }
  document.body.appendChild(veil);

  try {
    const cover = veil.animate([{ clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)" }], {
      duration: COVER_MS,
      easing: EASE,
      fill: "forwards",
    });
    const name = veil.querySelector<HTMLElement>(".section-veil__label");
    const rule = veil.querySelector<HTMLElement>(".section-veil__rule");
    name?.animate(
      [
        { opacity: 0, transform: "translateY(40%)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: COVER_MS + 120, delay: 120, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" }
    );
    rule?.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
      duration: COVER_MS + HOLD_MS,
      delay: 160,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      fill: "both",
    });

    await cover.finished;
    scrollToY(top, { immediate: true });
    // Let the page lay out and paint at its new position before uncovering it.
    await nextFrame();
    await nextFrame();
    await wait(HOLD_MS);

    const lift = veil.animate([{ clipPath: "inset(0 0 0% 0)" }, { clipPath: "inset(0 0 100% 0)" }], {
      duration: REVEAL_MS,
      easing: EASE,
      fill: "forwards",
    });
    name?.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(-30%)" }], {
      duration: REVEAL_MS * 0.6,
      easing: "cubic-bezier(0.7, 0, 0.84, 0)",
      fill: "forwards",
    });
    await lift.finished;
  } finally {
    veil.remove();
    travelling = false;
  }
}
