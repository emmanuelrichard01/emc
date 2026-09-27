import { useEffect, useRef, useState } from 'react';

import { coverage, markSeen, type Seen } from './readingTrail';

/* ==========================================================================
   useReadingTrail

   Tracks, for the landing page's sections, how much of each has been on
   screen this visit (readingTrail.ts has the arithmetic). The footer lives
   for the whole visit, so this starts counting from the first frame and
   keeps what it has seen across a trip to a case study and back.

   One passive scroll listener, at most one measurement per frame, and React
   hears only when a section's coverage moves by a visible step (5%).
   ========================================================================== */

const STEP = 0.05;

export function useReadingTrail(ids: readonly string[], enabled: boolean): Record<string, number> {
  const seen = useRef<Record<string, Seen>>({});
  const [trail, setTrail] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const viewTop = window.scrollY;
      const viewBottom = viewTop + window.innerHeight;
      const next: Record<string, number> = {};
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const top = rect.top + viewTop;
        seen.current[id] = markSeen(seen.current[id] ?? [], top, rect.height, viewTop, viewBottom);
        next[id] = Math.round(coverage(seen.current[id], rect.height) / STEP) * STEP;
      }
      setTrail((prev) => (ids.every((id) => prev[id] === next[id]) ? prev : { ...prev, ...next }));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    // The first screen counts, before anyone scrolls — and after the route
    // has laid out, which is a frame away.
    frame = requestAnimationFrame(measure);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ids, enabled]);

  return trail;
}
