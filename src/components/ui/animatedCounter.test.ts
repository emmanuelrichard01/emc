import { describe, expect, it } from 'vitest';

/* ==========================================================================
   COUNTER EASING

   The curve AnimatedCounter runs, extracted here as a pure function so the
   property that matters can be asserted: the displayed value never leaves
   [0, target * 1.02], whatever timestamp arrives.

   This is a regression, not a hypothetical. requestAnimationFrame reports
   the time the frame *began*, which can precede the performance.now() taken
   when the frame was scheduled — so the first tick could arrive with a
   negative progress, which the cubic below inverts into a negative multiple.
   The page painted "-2.8%" against a 99.5 target and "-1K+" against 50K.
   ========================================================================== */

/** Mirrors the easing in AnimatedCounter, including the progress clamp. */
function easedFraction(rawProgress: number): number {
  const progress = Math.min(Math.max(rawProgress, 0), 1);
  const eased =
    progress < 0.8
      ? 1 - Math.pow(1 - progress / 0.8, 3)
      : 1 + Math.sin((progress - 0.8) * Math.PI * 5) * 0.02 * (1 - progress);
  return Math.min(eased, 1.02);
}

describe('counter easing', () => {
  it('never returns a negative fraction, even for a timestamp before the start', () => {
    for (const raw of [-5, -1, -0.25, -0.001, 0]) {
      expect(easedFraction(raw), `raw=${raw}`).toBeGreaterThanOrEqual(0);
    }
  });

  it('stays within [0, 1.02] across the whole sweep and beyond', () => {
    for (let raw = -1; raw <= 2; raw += 0.005) {
      const value = easedFraction(raw);
      expect(value, `raw=${raw.toFixed(3)}`).toBeGreaterThanOrEqual(0);
      expect(value, `raw=${raw.toFixed(3)}`).toBeLessThanOrEqual(1.02);
    }
  });

  it('starts at zero and reaches full', () => {
    expect(easedFraction(0)).toBe(0);
    expect(easedFraction(1)).toBeCloseTo(1, 5);
  });

  it('rises monotonically through the main sweep', () => {
    let previous = -1;
    for (let raw = 0; raw <= 0.8; raw += 0.02) {
      const value = easedFraction(raw);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it('never renders a negative figure for the real metrics on the page', () => {
    // The values About and the projects spotlight actually animate.
    for (const target of [1.5, 220, 50, 99.5]) {
      for (const raw of [-0.5, -0.01, 0, 0.5, 1]) {
        expect(easedFraction(raw) * target).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
