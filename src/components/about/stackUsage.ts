import type { ExperienceItem, Project } from '@/types';
import { IMPLIED_BY, usesTech } from '@/lib/techFamily';
import { parsePeriod } from '@/lib/tenure';
import { unionMonths } from '@/components/experience/ledgerModel';

/* ==========================================================================
   STACK USAGE

   A skills list asserts; this counts. For each technology in the About
   section's stack, which built projects and which roles actually used it —
   read from the same arrays the Work and Experience sections render, so the
   bar beside "PostgreSQL" is the number of places PostgreSQL really went.

   Design studies are excluded: a blueprint names technologies it never ran,
   and counting them would be exactly the inflation this section refuses.

   How long, and how recently, come from the same dates the career ledger
   draws: months at work are a union of the roles that used it (two jobs at
   once count once), and the last year is the latest of those roles and of
   the projects built with it.
   ========================================================================== */

export interface Usage {
  name: string;
  projects: { id: string; title: string }[];
  roles: string[];
  /** Projects + roles. */
  count: number;
  /** For a family like SQL: the tools that also counted (PostgreSQL, dbt…). */
  implied: readonly string[];
  /** Months in a job that used it, overlaps counted once. 0 if no job did. */
  months: number;
  /** The latest year a job or a built project used it, or null if none says. */
  lastUsed: number | null;
}

/** The latest year a project's timeline names: "2025 – Present" → this year. */
export function timelineEnd(timeline: string, now = new Date()): number | null {
  if (/present|current|now/i.test(timeline)) return now.getFullYear();
  const years = timeline.match(/\b(19|20)\d{2}\b/g);
  return years ? Math.max(...years.map(Number)) : null;
}

export function stackUsage(names: readonly string[], projects: Project[], roles: ExperienceItem[], now = new Date()): Usage[] {
  const built = projects.filter((p) => p.tier !== 'design');
  return names.map((name) => {
    const usedIn = built.filter((p) => usesTech(p.stack, name));
    const usedAt = roles.filter((r) => usesTech(r.stack, name));
    const spans = usedAt.map((r) => parsePeriod(r.period, now));
    const ends = [
      ...spans.map((s) => s?.end.year ?? null),
      ...usedIn.map((p) => timelineEnd(p.timeline, now)),
    ].filter((y): y is number => y !== null);
    return {
      name,
      projects: usedIn.map((p) => ({ id: p.id, title: p.title })),
      roles: usedAt.map((r) => r.company),
      count: usedIn.length + usedAt.length,
      implied: IMPLIED_BY[name] ?? [],
      months: unionMonths(spans),
      lastUsed: ends.length ? Math.max(...ends) : null,
    };
  });
}
