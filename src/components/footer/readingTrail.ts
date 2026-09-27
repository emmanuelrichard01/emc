/* ==========================================================================
   READING TRAIL

   How much of each section this visitor has actually had on screen. A long
   page is read by jumping — the nav, a filter link, the dive — and whoever
   reaches the footer has no way to know what they skipped. The sitemap can
   tell them: each link carries how much of its section they have seen, and
   the ones they have not are named.

   A section's "seen" is the set of its own pixel rows that have been inside
   the viewport, kept as merged intervals: scrolling back over the same
   part never counts twice, and a jump from the top of a section to its end
   does not count the middle it skipped.
   ========================================================================== */

/** Seen rows of a section, as sorted, non-overlapping [from, to] offsets from its top. */
export type Seen = [number, number][];

/** Adds the visible part of a section to what has been seen of it. */
export function markSeen(seen: Seen, sectionTop: number, sectionHeight: number, viewTop: number, viewBottom: number): Seen {
  const from = Math.max(0, viewTop - sectionTop);
  const to = Math.min(sectionHeight, viewBottom - sectionTop);
  if (to <= from) return seen;
  const merged: Seen = [];
  let next: [number, number] = [from, to];
  for (const [a, b] of seen) {
    if (b < next[0]) merged.push([a, b]);
    else if (a > next[1]) {
      merged.push(next);
      next = [a, b];
    } else next = [Math.min(a, next[0]), Math.max(b, next[1])];
  }
  merged.push(next);
  return merged;
}

/** Fraction of the section seen, 0..1. */
export function coverage(seen: Seen, sectionHeight: number): number {
  if (sectionHeight <= 0) return 0;
  const rows = seen.reduce((n, [a, b]) => n + (b - a), 0);
  return Math.min(1, rows / sectionHeight);
}

/** Below this, a section counts as skipped; above the other, as read. */
export const SKIPPED = 0.15;
export const READ = 0.85;
