import type { PointerEvent } from 'react';

/* ── Pointer light ───────────────────────────────────────────────────────
   A soft light that follows the pointer across a surface. Written straight
   to two custom properties on the element — no React state, so moving the
   mouse re-renders nothing — and painted by .pointer-glow in index.css. */
export function trackPointer(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== 'mouse') return;
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--gx', `${e.clientX - rect.left}px`);
  el.style.setProperty('--gy', `${e.clientY - rect.top}px`);
}
