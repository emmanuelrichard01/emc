import React from 'react';

import type { Project } from '@/types';

/* ==========================================================================
   TIER LADDER

   The tier system, in one place, so the index and the card grid cannot drift
   into showing it two different ways.

   The section used to carry four full-width banners — "01 Flagship
   Architecture" through "04 Architecture Studies" — which is a heading block
   per tier on a page whose job is scanning. This says the same thing in one
   line: a rank glyph that reads as depth at a glance, the name, and a count.

   The glyph matters more than it looks. Three bars against one is legible
   before you have read the label, so the hierarchy survives skimming, and
   design work gets a dotted mark rather than a shorter solid one — a
   different kind of thing, not simply less of it.
   ========================================================================== */

export const TIER_RANK: Record<string, string> = {
  flagship: '▍▍▍',
  production: '▍▍',
  system: '▍',
  design: '┆',
};

export const TIER_LABEL: Record<string, string> = {
  flagship: 'flagship',
  production: 'production',
  system: 'prototype',
  design: 'design study',
};

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

export function TierRule({ tier, count, className = '' }: TierRuleProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden="true">
      <span className="font-mono text-[11px] text-primary tracking-[0.15em] leading-none">
        {TIER_RANK[tier] ?? '▍'}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {TIER_LABEL[tier] ?? tier}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{count}</span>
      <span className="flex-1 h-px bg-border" />
    </div>
  );
}
