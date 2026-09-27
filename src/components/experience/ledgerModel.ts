import type { ExperienceItem } from '@/types';
import type { Span } from '@/lib/tenure';

/* ==========================================================================
   LEDGER MODEL

   What the career ledger can say about the career as a whole, computed from
   the same five rows it renders — so every number in the section is one a
   reader could work out from the dates below it, and none is typed in.

   Months are counted as a union, never a sum. Several roles ran at once, so
   adding their lengths would claim more working time than the calendar
   holds: the exact inflation a ledger exists to prevent.
   ========================================================================== */

/** Months covered by at least one span — overlaps counted once. */
export function unionMonths(spans: readonly (Span | null)[]): number {
  const covered = new Set<number>();
  for (const s of spans) {
    if (!s) continue;
    for (let m = s.start.index; m <= s.end.index; m++) covered.add(m);
  }
  return covered.size;
}

/** Months in which two or more spans were running. */
export function concurrentMonths(spans: readonly (Span | null)[]): number {
  const count = new Map<number, number>();
  for (const s of spans) {
    if (!s) continue;
    for (let m = s.start.index; m <= s.end.index; m++) count.set(m, (count.get(m) ?? 0) + 1);
  }
  let n = 0;
  for (const c of count.values()) if (c >= 2) n += 1;
  return n;
}

/**
 * The runs of months with two or more roles at once, as spans — drawn on
 * the timeline so the overlaps read as a shape, not a footnote.
 */
export function overlapRuns(spans: readonly (Span | null)[]): Span[] {
  const count = new Map<number, number>();
  for (const s of spans) {
    if (!s) continue;
    for (let m = s.start.index; m <= s.end.index; m++) count.set(m, (count.get(m) ?? 0) + 1);
  }
  const months = [...count.entries()].filter(([, c]) => c >= 2).map(([m]) => m).sort((a, b) => a - b);
  const runs: [number, number][] = [];
  for (const m of months) {
    const last = runs[runs.length - 1];
    if (last && last[1] + 1 === m) last[1] = m;
    else runs.push([m, m]);
  }
  const at = (index: number) => ({ index, year: Math.floor(index / 12), month: index % 12 });
  return runs.map(([from, to]) => ({ start: at(from), end: at(to), months: to - from + 1 }));
}

export interface Tenure {
  name: string;
  /** Months with at least one role using it, overlaps counted once. */
  months: number;
  /** Ids of the roles that used it, in ledger order. */
  roles: string[];
}

/**
 * How long each technology has been in daily use, by the ledger's own
 * dates. Sorted longest first, then by how many roles used it, then by
 * name, so ties are stable across renders.
 */
export function stackTenure(roles: readonly ExperienceItem[], spans: readonly (Span | null)[]): Tenure[] {
  const byTech = new Map<string, { spans: Span[]; roles: string[] }>();
  roles.forEach((role, i) => {
    const span = spans[i];
    for (const tech of role.stack) {
      const entry = byTech.get(tech) ?? { spans: [], roles: [] };
      if (span) entry.spans.push(span);
      entry.roles.push(role.id);
      byTech.set(tech, entry);
    }
  });
  return [...byTech.entries()]
    .map(([name, { spans: s, roles: r }]) => ({ name, months: unionMonths(s), roles: r }))
    .sort((a, b) => b.months - a.months || b.roles.length - a.roles.length || a.name.localeCompare(b.name));
}

/* ── Figures ────────────────────────────────────────────────────────────── */

export interface TextPart {
  text: string;
  figure: boolean;
}

/*
   A measured outcome — "~40%", "50,000+", "~45%" — is the most important
   thing in a line of a CV and was set in the same weight as "collaborated
   with designers". This marks them so they can carry a little more.

   A figure is a number with a unit of meaning: a percentage, a count with
   a thousands separator or a trailing "+", or a number preceded by "~".
   Bare numbers (a year, "B.Eng. 2") are left alone.
*/
const FIGURE = /~?\d{1,3}(?:,\d{3})+\+?|~?\d+(?:\.\d+)?%|~\d+(?:\.\d+)?\+?|\d+\+/g;

export function markFigures(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(FIGURE)) {
    const at = match.index ?? 0;
    if (at > last) parts.push({ text: text.slice(last, at), figure: false });
    parts.push({ text: match[0], figure: true });
    last = at + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), figure: false });
  return parts;
}
