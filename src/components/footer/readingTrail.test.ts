import { describe, expect, it } from 'vitest';

import { coverage, markSeen, type Seen } from './readingTrail';

// A 3000px section starting at y = 1000, viewed through an 800px window.
const TOP = 1000;
const H = 3000;
const view = (seen: Seen, scrollY: number) => markSeen(seen, TOP, H, scrollY, scrollY + 800);

describe('reading trail', () => {
  it('sees nothing of a section still below the fold', () => {
    expect(coverage(view([], 0), H)).toBe(0);
  });

  it('counts only the part inside the viewport', () => {
    expect(coverage(view([], 1000), H)).toBeCloseTo(800 / 3000);
  });

  it('does not count a part twice when scrolling back over it', () => {
    let seen: Seen = [];
    for (const y of [1000, 1400, 1000, 1400]) seen = view(seen, y);
    expect(seen).toEqual([[0, 1200]]);
  });

  it('does not credit the middle of a section that was jumped over', () => {
    let seen: Seen = view([], 1000); // its first 800px
    seen = view(seen, 3200); // then straight to its end
    expect(seen).toEqual([[0, 800], [2200, 3000]]);
    expect(coverage(seen, H)).toBeCloseTo(1600 / 3000);
  });

  it('joins ranges once the gap between them is read', () => {
    let seen: Seen = [[0, 800], [2200, 3000]];
    seen = view(seen, 1700); // rows 700–1500
    seen = view(seen, 2400); // rows 1400–2200
    expect(seen).toEqual([[0, 3000]]);
    expect(coverage(seen, H)).toBe(1);
  });
});
