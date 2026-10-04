/* ==========================================================================
   SHEET SNAP POINTS

   On a phone the dock is a bottom sheet that rests at one of three heights:
   a peek (the page stays readable above it), half, and full. A drag on the
   handle ends at the nearest one, thrown a little in the direction of the
   flick; dragged well below the peek, it closes. Only "full" locks the page.
   ========================================================================== */

export type SheetSnap = 'peek' | 'half' | 'full';

/** Fractions of the viewport's height. */
export const SNAP_FRACTION: Record<SheetSnap, number> = { peek: 0.32, half: 0.58, full: 0.92 };

const ORDER: SheetSnap[] = ['peek', 'half', 'full'];

export function snapHeight(snap: SheetSnap, viewport: number): number {
  return Math.round(SNAP_FRACTION[snap] * viewport);
}

/**
 * Where a drag ends. `height` is the sheet's height when released, `velocity`
 * the pointer's speed in px/s (positive = moving down = shrinking).
 */
export function settleSheet(height: number, velocity: number, viewport: number): SheetSnap | 'close' {
  // Where the flick would carry it, about 150ms on.
  const projected = height - velocity * 0.15;
  if (projected < snapHeight('peek', viewport) - Math.min(96, viewport * 0.1)) return 'close';
  let best: SheetSnap = 'peek';
  for (const snap of ORDER) {
    if (Math.abs(snapHeight(snap, viewport) - projected) < Math.abs(snapHeight(best, viewport) - projected)) best = snap;
  }
  return best;
}

/** One step up or down, for the handle's keyboard control. */
export function stepSnap(snap: SheetSnap, direction: 1 | -1): SheetSnap {
  const i = ORDER.indexOf(snap) + direction;
  return ORDER[Math.max(0, Math.min(ORDER.length - 1, i))];
}
