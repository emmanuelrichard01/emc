import { useLayoutEffect, useState, type RefObject } from 'react';

/* ==========================================================================
   CARD PLACEMENT

   Where a small card opened from a word should sit: on its preferred side
   when there is room (above, under the fixed running head; or below, above
   the bottom of the screen), on the other side when there is not, and slid
   sideways to stay inside the screen. Measured from the card's parent, which
   is the thing it belongs to, and re-measured on scroll and resize.

   Null until measured, so a card never paints in the wrong place first.
   ========================================================================== */

export type Side = 'top' | 'bottom';

const NAV = 64; // the running head
const GAP = 12; // between the card and its anchor, and the card and the nav
const GUTTER = 16; // from the screen edges

export function useCardPlacement(ref: RefObject<HTMLElement | null>, prefer: Side = 'top') {
  const [place, setPlace] = useState<{ side: Side; shift: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const anchor = el?.parentElement;
    if (!el || !anchor) return;
    const measure = () => {
      const a = anchor.getBoundingClientRect();
      const h = el.offsetHeight;
      const w = el.offsetWidth;
      const roomAbove = a.top - GAP - h >= NAV + GAP;
      const roomBelow = a.bottom + GAP + h <= window.innerHeight - GUTTER;
      const side: Side =
        prefer === 'top' ? (roomAbove || !roomBelow ? 'top' : 'bottom') : roomBelow || !roomAbove ? 'bottom' : 'top';
      const left = Math.min(Math.max(a.left, GUTTER), window.innerWidth - GUTTER - w);
      const shift = Math.round(left - a.left);
      setPlace((prev) => (prev && prev.side === side && prev.shift === shift ? prev : { side, shift }));
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [ref, prefer]);

  return place;
}
