/* ==========================================================================
   VITALS — this visit, measured

   The footer's build receipt says what was shipped. This says how it
   arrived: the Core Web Vitals of the visit being read, measured by the
   visitor's own browser through its Performance APIs, rated against the
   thresholds Google publishes. Not a lab score and not a claim — the one
   number on a portfolio a reader cannot be asked to take on trust, because
   it is theirs.

   The arithmetic is here, pure and tested; the observers are in
   useVisitVitals. The definitions follow the web-vitals library:

     LCP   the last largest-contentful-paint before the visitor interacts
     CLS   the worst "session window" of layout shifts — shifts less than
           1 s apart, a window at most 5 s long — excluding shifts right
           after input, which the visitor caused
     INP   the slowest interaction (for a visit with fewer than fifty),
           an interaction being every event sharing one interactionId
     TTFB  navigation responseStart
   ========================================================================== */

export type Metric = 'LCP' | 'CLS' | 'INP' | 'TTFB' | 'FCP';
export type Rating = 'good' | 'needs-improvement' | 'poor';

/** [good ≤ a, needs improvement ≤ b, poor above] — web.dev/articles/vitals. */
const THRESHOLDS: Record<Metric, [number, number]> = {
  LCP: [2500, 4000],
  CLS: [0.1, 0.25],
  INP: [200, 500],
  TTFB: [800, 1800],
  FCP: [1800, 3000],
};

export function rate(metric: Metric, value: number): Rating {
  const [good, ni] = THRESHOLDS[metric];
  return value <= good ? 'good' : value <= ni ? 'needs-improvement' : 'poor';
}

export function formatMetric(metric: Metric, value: number): string {
  if (metric === 'CLS') return value < 0.001 ? '0' : value.toFixed(value < 0.1 ? 3 : 2);
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(value < 10_000 ? 2 : 1)} s`;
}

export interface Shift {
  value: number;
  startTime: number;
  hadRecentInput: boolean;
}

/** Cumulative Layout Shift: the largest session window, per the metric's definition. */
export function clsFromShifts(shifts: readonly Shift[]): number {
  let worst = 0;
  let windowValue = 0;
  let windowStart = -Infinity;
  let last = -Infinity;
  for (const s of shifts) {
    if (s.hadRecentInput) continue;
    if (s.startTime - last < 1000 && s.startTime - windowStart < 5000) {
      windowValue += s.value;
    } else {
      windowValue = s.value;
      windowStart = s.startTime;
    }
    last = s.startTime;
    worst = Math.max(worst, windowValue);
  }
  return worst;
}

export interface InteractionEvent {
  interactionId: number;
  duration: number;
}

/**
 * Interaction to Next Paint. Events sharing an interactionId are one
 * interaction, as long as its longest event; the worst interaction is the
 * INP, except that past fifty interactions one outlier per fifty is
 * forgiven (the 98th percentile). Null before the first interaction.
 */
export function inpFromEvents(events: readonly InteractionEvent[]): number | null {
  const byId = new Map<number, number>();
  for (const e of events) {
    if (!e.interactionId) continue;
    byId.set(e.interactionId, Math.max(byId.get(e.interactionId) ?? 0, e.duration));
  }
  if (!byId.size) return null;
  const worstFirst = [...byId.values()].sort((a, b) => b - a);
  const skip = Math.min(worstFirst.length - 1, Math.floor(byId.size / 50));
  return worstFirst[skip];
}

/** "412 KB", "1.3 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
