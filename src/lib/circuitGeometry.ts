/* ==========================================================================
   CIRCUIT GEOMETRY

   Pure path maths for the hero's board, kept out of the canvas component so
   it can be tested without a DOM.

   The invariant that matters lives here: every run is horizontal or
   vertical. An earlier version cut corners at 45°, which is how a real PCB
   routes — but on a square grid a diagonal is the one direction the
   substrate does not contain, so packets visibly left the ruling. The test
   beside this file asserts the property rather than the implementation, so
   any future routing change still has to stay on the grid.
   ========================================================================== */

/**
 * Orthogonal path between two points: one turn, always through a right angle.
 *
 * @param hFirst travel horizontally then vertically, rather than the reverse.
 *   Alternating it is what keeps a field of right angles from reading as one
 *   repeated stencil.
 * @returns flat [x0, y0, x1, y1, …] — flat so the same array can be stroked
 *   into the substrate and walked by a packet without copying.
 */
export function edgePoints(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  hFirst: boolean
): number[] {
  if (ax === bx || ay === by) return [ax, ay, bx, by];
  return hFirst ? [ax, ay, bx, ay, bx, by] : [ax, ay, ax, by, bx, by];
}

/** Cumulative distance at each point; the last entry is the total length. */
export function cumulativeLengths(pts: ArrayLike<number>): Float32Array {
  const count = pts.length / 2;
  const cum = new Float32Array(count);
  let total = 0;

  for (let i = 1; i < count; i++) {
    const dx = pts[i * 2] - pts[(i - 1) * 2];
    const dy = pts[i * 2 + 1] - pts[(i - 1) * 2 + 1];
    total += Math.hypot(dx, dy);
    cum[i] = total;
  }
  return cum;
}

/**
 * True when every segment of a flat point list is axis-aligned.
 *
 * Exported for the test, and cheap enough to be worth having: a path that
 * leaves the grid is the specific defect this module exists to prevent.
 */
export function isOrthogonal(pts: ArrayLike<number>): boolean {
  for (let i = 1; i < pts.length / 2; i++) {
    const dx = pts[i * 2] - pts[(i - 1) * 2];
    const dy = pts[i * 2 + 1] - pts[(i - 1) * 2 + 1];
    if (dx !== 0 && dy !== 0) return false;
  }
  return true;
}
