import { useEffect, useRef, useState } from 'react';

import { clsFromShifts, inpFromEvents, type InteractionEvent, type Shift } from './vitals';

/* ==========================================================================
   useVisitVitals

   Feeds vitals.ts from the browser's own Performance APIs. Each metric is
   null until the browser has something to report, and `supported` says
   which ones it can report at all — Safari exposes no event timing, so its
   INP is "not measured", never a made-up number.

   Every observer is `buffered`, so what happened before the footer mounted
   (the load itself) is included. Collection runs for the whole visit, as
   it must — the load and every interaction count — but React hears about
   it only while the footer is on screen, at most once a second: measuring
   the page must not become a cost to it.
   ========================================================================== */

export interface VisitVitals {
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  ttfb: number | null;
  /** Bytes over the network for the document and every same-origin or timing-allowed resource. */
  bytes: number;
  requests: number;
  /** Requests answered from the browser's cache. */
  cached: number;
  supported: { lcp: boolean; cls: boolean; inp: boolean };
}

const types = (): readonly string[] =>
  typeof PerformanceObserver !== 'undefined' ? (PerformanceObserver.supportedEntryTypes ?? []) : [];

const EMPTY: VisitVitals = {
  lcp: null,
  cls: null,
  inp: null,
  ttfb: null,
  bytes: 0,
  requests: 0,
  cached: 0,
  supported: { lcp: false, cls: false, inp: false },
};

interface Collected {
  shifts: Shift[];
  events: InteractionEvent[];
  lcp: number | null;
  dirty: boolean;
}

export function useVisitVitals(active: boolean): VisitVitals {
  const collected = useRef<Collected>({ shifts: [], events: [], lcp: null, dirty: true });
  const [vitals, setVitals] = useState<VisitVitals>(() => {
    const t = types();
    return { ...EMPTY, supported: { lcp: t.includes('largest-contentful-paint'), cls: t.includes('layout-shift'), inp: t.includes('event') } };
  });

  useEffect(() => {
    if (typeof performance === 'undefined') return;
    const t = types();
    const c = collected.current;
    let lcpFinal = false;
    const observers: PerformanceObserver[] = [];

    const observe = (type: string, onEntries: (entries: PerformanceEntryList) => void, extra: Record<string, unknown> = {}) => {
      if (!t.includes(type)) return;
      try {
        const o = new PerformanceObserver((list) => {
          onEntries(list.getEntries());
          c.dirty = true;
        });
        o.observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
        observers.push(o);
      } catch {
        // An engine that lists a type it will not observe: leave it unmeasured.
      }
    };

    observe('largest-contentful-paint', (entries) => {
      if (lcpFinal) return;
      const last = entries[entries.length - 1];
      if (last) c.lcp = last.startTime;
    });
    observe('layout-shift', (entries) => {
      for (const e of entries as unknown as (PerformanceEntry & Shift)[]) {
        c.shifts.push({ value: e.value, startTime: e.startTime, hadRecentInput: e.hadRecentInput });
      }
    });
    observe(
      'event',
      (entries) => {
        for (const e of entries as unknown as (PerformanceEntry & InteractionEvent)[]) {
          if (e.interactionId) c.events.push({ interactionId: e.interactionId, duration: e.duration });
        }
      },
      // The spec's floor; shorter events are never an interaction's worst.
      { durationThreshold: 16 },
    );
    observe('resource', () => {});

    // LCP stops being measured once the visitor interacts: what they see
    // after that is a response, not the page loading.
    const finalise = () => {
      lcpFinal = true;
    };
    window.addEventListener('pointerdown', finalise, { once: true, capture: true });
    window.addEventListener('keydown', finalise, { once: true, capture: true });

    return () => {
      observers.forEach((o) => o.disconnect());
      window.removeEventListener('pointerdown', finalise, { capture: true });
      window.removeEventListener('keydown', finalise, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (!active || typeof performance === 'undefined') return;
    const t = types();
    const c = collected.current;
    // Anything that happened while off screen is due on arrival.
    c.dirty = true;
    const publish = () => {
      if (!c.dirty) return;
      c.dirty = false;
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      let bytes = nav?.transferSize ?? 0;
      let cached = 0;
      for (const r of resources) {
        bytes += r.transferSize;
        // Nothing crossed the network, yet a body was decoded: the cache answered.
        if (r.transferSize === 0 && r.decodedBodySize > 0) cached += 1;
      }
      setVitals((v) => ({
        ...v,
        lcp: c.lcp,
        cls: t.includes('layout-shift') ? clsFromShifts(c.shifts) : null,
        inp: inpFromEvents(c.events),
        ttfb: nav && nav.responseStart > 0 ? nav.responseStart : null,
        bytes,
        requests: resources.length + (nav ? 1 : 0),
        cached,
      }));
    };

    publish();
    const timer = setInterval(publish, 1000);
    return () => clearInterval(timer);
  }, [active]);

  return vitals;
}
