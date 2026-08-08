import { describe, expect, it } from 'vitest';

import { cumulativeLengths, edgePoints, isOrthogonal } from '@/lib/circuitGeometry';

/* The hero's packets travel these exact paths, so "stays on the grid" is a
   property of the product, not of the drawing code. Asserted as a property
   over many random pairs rather than a couple of examples, because the
   failure it guards against — a diagonal cut corner — only showed up at
   certain relative offsets. */

describe('edgePoints', () => {
  it('never produces a diagonal segment', () => {
    for (let i = 0; i < 500; i++) {
      const ax = Math.round(Math.random() * 40) * 48;
      const ay = Math.round(Math.random() * 20) * 48;
      const bx = Math.round(Math.random() * 40) * 48;
      const by = Math.round(Math.random() * 20) * 48;

      for (const hFirst of [true, false]) {
        const pts = edgePoints(ax, ay, bx, by, hFirst);
        expect(isOrthogonal(pts), `diagonal in ${JSON.stringify(pts)}`).toBe(true);
      }
    }
  });

  it('starts at a and ends at b', () => {
    const pts = edgePoints(0, 0, 240, 96, true);
    expect([pts[0], pts[1]]).toEqual([0, 0]);
    expect([pts[pts.length - 2], pts[pts.length - 1]]).toEqual([240, 96]);
  });

  it('turns exactly once on a diagonal pair', () => {
    // Three points = two segments = one corner.
    expect(edgePoints(0, 0, 240, 96, true)).toHaveLength(6);
    expect(edgePoints(0, 0, 240, 96, false)).toHaveLength(6);
  });

  it('emits a straight run when the points already share an axis', () => {
    expect(edgePoints(0, 0, 240, 0, true)).toEqual([0, 0, 240, 0]);
    expect(edgePoints(0, 0, 0, 96, false)).toEqual([0, 0, 0, 96]);
  });

  it('routes through the opposite corner when hFirst flips', () => {
    const horizontalFirst = edgePoints(0, 0, 240, 96, true);
    const verticalFirst = edgePoints(0, 0, 240, 96, false);
    // The corner is the middle point, and it differs between the two.
    expect([horizontalFirst[2], horizontalFirst[3]]).toEqual([240, 0]);
    expect([verticalFirst[2], verticalFirst[3]]).toEqual([0, 96]);
  });

  it('has the same total length either way — Manhattan distance', () => {
    const a = cumulativeLengths(edgePoints(0, 0, 240, 96, true));
    const b = cumulativeLengths(edgePoints(0, 0, 240, 96, false));
    expect(a[a.length - 1]).toBeCloseTo(240 + 96);
    expect(b[b.length - 1]).toBeCloseTo(240 + 96);
  });
});

describe('cumulativeLengths', () => {
  it('starts at zero and increases monotonically', () => {
    const cum = cumulativeLengths(edgePoints(0, 0, 240, 96, true));
    expect(cum[0]).toBe(0);
    for (let i = 1; i < cum.length; i++) expect(cum[i]).toBeGreaterThanOrEqual(cum[i - 1]);
  });
});

describe('isOrthogonal', () => {
  it('rejects a genuine diagonal', () => {
    // The 45° chamfer the previous implementation produced.
    expect(isOrthogonal([0, 0, 20, 20])).toBe(false);
  });
});
