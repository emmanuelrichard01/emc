/* ==========================================================================
   TENURE

   Duration and position, derived from the period string already on each role.

   The ledger listed five roles at identical weight when their actual spans
   run from two months to three and a half years, so the one quantity a
   ledger exists to record was the one thing it did not show. Four of the
   five also carry a note explaining that they overlap something else — TAC
   AFRICA sits entirely inside the AfriHUB engagement — which meant the
   timeline was real but survived only as prose footnotes.

   Parsing the existing string rather than adding start/end fields keeps a
   single source of truth: a period edited in the data file cannot disagree
   with the bar drawn beside it.
   ========================================================================== */

const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

/** Months since year 0, so spans can be compared and subtracted directly. */
export interface Point {
  /** Absolute month index. */
  index: number;
  year: number;
  month: number;
}

export interface Span {
  start: Point;
  end: Point;
  /** Inclusive: "Mar — Oct 2024" is eight months worked, not seven elapsed. */
  months: number;
}

const point = (year: number, month: number): Point => ({
  index: year * 12 + month,
  year,
  month,
});

const monthIndex = (name: string): number =>
  MONTHS.indexOf(name.trim().slice(0, 3).toLowerCase());

/**
 * Accepts the two shapes the data actually uses — "Oct 2020 — Mar 2024" and
 * the elided "Mar — Oct 2024", where a single trailing year covers both ends
 * — plus an open "Present" end. Returns null rather than guessing, so an
 * unrecognised format degrades to no bar instead of a wrong one.
 */
export function parsePeriod(period: string, now = new Date()): Span | null {
  const [rawStart, rawEnd] = period.split(/\s*[—–-]\s*/);
  if (!rawStart || !rawEnd) return null;

  const endIsOpen = /present|current|now/i.test(rawEnd);

  const endMatch = rawEnd.match(/([A-Za-z]+)\s*(\d{4})?/);
  const startMatch = rawStart.match(/([A-Za-z]+)\s*(\d{4})?/);
  if (!startMatch || (!endMatch && !endIsOpen)) return null;

  const end = endIsOpen
    ? point(now.getFullYear(), now.getMonth())
    : (() => {
        const m = monthIndex(endMatch![1]);
        const y = endMatch![2] ? Number(endMatch![2]) : NaN;
        return m < 0 || Number.isNaN(y) ? null : point(y, m);
      })();
  if (!end) return null;

  const startMonth = monthIndex(startMatch[1]);
  if (startMonth < 0) return null;
  // The elided form omits the start year because it equals the end year.
  const startYear = startMatch[2] ? Number(startMatch[2]) : end.year;
  const start = point(startYear, startMonth);

  if (end.index < start.index) return null;

  return { start, end, months: end.index - start.index + 1 };
}

/** "8 mos", "1 yr 1 mo", "2 yr" — compact enough to sit inline with the dates. */
export function formatDuration(months: number): string {
  if (months < 12) return `${months} mo${months === 1 ? '' : 's'}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = `${years} yr`;
  return rest === 0 ? y : `${y} ${rest} mo`;
}

/** Smallest window containing every span, for a shared horizontal axis. */
export function careerWindow(spans: (Span | null)[]): { from: number; to: number } | null {
  const present = spans.filter((s): s is Span => s !== null);
  if (!present.length) return null;
  return {
    from: Math.min(...present.map((s) => s.start.index)),
    to: Math.max(...present.map((s) => s.end.index)),
  };
}

/**
 * Fractional offset and width within the window, as percentages. A span of
 * one month in an eight-year window is only ~1% wide, so the result is
 * floored — a bar too thin to see reads as missing data.
 */
export function spanBar(
  span: Span,
  window: { from: number; to: number },
): { left: number; width: number } {
  const total = window.to - window.from + 1;
  if (total <= 0) return { left: 0, width: 100 };
  const left = ((span.start.index - window.from) / total) * 100;
  const width = Math.max((span.months / total) * 100, 2);
  return { left: Math.min(left, 100 - width), width };
}

/**
 * Percentage offsets of each January strictly inside the window.
 *
 * Without them a bar floats on an unlabelled eight-year rule: you can compare
 * two bars to each other but you cannot read *when* either one happened. The
 * ticks are shared by every row, so the column resolves into one chart
 * instead of five unrelated sliders.
 *
 * Boundaries at 0% and 100% are dropped — they would land under the track's
 * own edges and read as a rendering seam.
 */
export function yearTicks(window: { from: number; to: number }): number[] {
  const total = window.to - window.from + 1;
  if (total <= 0) return [];
  const ticks: number[] = [];
  for (let year = Math.floor(window.from / 12) + 1; year * 12 <= window.to; year++) {
    const pct = ((year * 12 - window.from) / total) * 100;
    if (pct > 0 && pct < 100) ticks.push(pct);
  }
  return ticks;
}
