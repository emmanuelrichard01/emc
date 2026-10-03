import type { Project, ProjectStatus } from '@/types';

/* ==========================================================================
   TIER LADDER

   The tier system, in one place, so the index, the cards and the case
   studies cannot drift into naming it two different ways.

   In the monograph a tier is a quiet sub-head over its run of rows — a name
   and a count — rather than a banner or a glyph. Design-stage work is set
   apart by line, not by colour: its rows sit under a dashed rule and its
   plates carry a dashed hairline frame, so a blueprint never reads as
   something running even before its label is read.
   ========================================================================== */

/** Rank glyphs, kept for the case-study pages that still print them. */
export const TIER_RANK: Record<string, string> = {
  flagship: '▍▍▍',
  production: '▍▍',
  system: '▍',
  design: '┆',
};

/* Design-stage work is set in hairline outline: drawn, not built, so it
   reads as a blueprint before any label does. The text stays real text;
   under forced colours (Windows high contrast) it falls back to solid
   CanvasText, since a transparent fill would vanish there. Used at title
   sizes only; below ~15px an outline stops reading and solid grey is used. */
export const DESIGN_OUTLINE =
  "text-transparent [-webkit-text-stroke:1px_hsl(var(--muted-foreground))] forced-colors:text-[CanvasText] forced-colors:[-webkit-text-stroke:0]";

/** The same, from md up only: a 17px index title outlined on a phone reads
    as a rendering fault, so there it is solid grey (the dashed rule and the
    status word still mark it). */
export const DESIGN_OUTLINE_MD =
  "text-muted-foreground md:text-transparent md:[-webkit-text-stroke:1px_hsl(var(--muted-foreground))] forced-colors:text-[CanvasText] forced-colors:[-webkit-text-stroke:0]";

/** Lower-case tier names, as used in filters and sentences. */
export const TIER_LABEL: Record<string, string> = {
  flagship: 'flagship',
  production: 'production',
  system: 'prototype',
  design: 'design study',
};

/** Title-case tier names, for sub-heads. */
export const TIER_TITLE: Record<string, string> = {
  flagship: 'Flagships',
  production: 'In production',
  system: 'Prototypes',
  design: 'Designed, not built',
};

/** Status in sentence case — the monograph does not shout. */
export const STATUS_TEXT: Record<ProjectStatus, string> = {
  live: 'Live',
  'source-available': 'Public code',
  private: 'Private code',
  design: 'Designed, not built',
};

/** "1 trade-off", "3 trade-offs". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** How much a write-up covers, in a sentence: "5 trade-offs and 3 debugging stories". */
export function describeDepth(tradeoffs: number, fieldNotes: number): string {
  if (!tradeoffs && !fieldNotes) return 'Short summary';
  const parts = [];
  if (tradeoffs) parts.push(plural(tradeoffs, 'trade-off'));
  if (fieldNotes) parts.push(plural(fieldNotes, 'debugging story', 'debugging stories'));
  return parts.join(' and ');
}

/** Consecutive runs, since PROJECTS is authored in tier order. */
export function groupByTier(projects: Project[]): { tier: string; items: Project[] }[] {
  const groups: { tier: string; items: Project[] }[] = [];
  for (const project of projects) {
    const last = groups[groups.length - 1];
    if (last && last.tier === project.tier) last.items.push(project);
    else groups.push({ tier: project.tier, items: [project] });
  }
  return groups;
}

interface TierRuleProps {
  tier: string;
  count: number;
  className?: string;
}

/** A tier's sub-head: its name and how many, over a rule. */
export function TierRule({ tier, count, className = '' }: TierRuleProps) {
  return (
    <div className={`flex items-baseline gap-3 ${className}`} aria-hidden="true">
      <span className="t-caption text-foreground">{TIER_TITLE[tier] ?? tier}</span>
      <span className="t-folio">{count}</span>
    </div>
  );
}

/** Status as a word, with a dot only when something is actually live. Amber
    is for live state only, so "Designed, not built" is set in caption grey:
    the outlined title and the dashed rule already set it apart. */
export function StatusText({ status, className = '' }: { status: ProjectStatus; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${status === 'live' ? 'text-foreground' : 'text-muted-foreground'} ${className}`}>
      {status === 'live' && <span className="w-1.5 h-1.5 bg-status-ok status-live shrink-0" aria-hidden="true" />}
      {STATUS_TEXT[status]}
    </span>
  );
}
