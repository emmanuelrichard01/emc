import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ExternalLink, Github } from 'lucide-react';

import type { Project } from '@/types';
import { STATUS_CLASS, STATUS_LABEL, projectStatus } from '@/lib/project';
import { TierRule, groupByTier } from '@/components/projects/tiers';

/* ==========================================================================
   PROJECT INDEX

   The scannable view, in the terminal's language.

   The section used to be eleven cards, each repeating category, year, title,
   subtitle, a metric row, a paragraph, two architecture decisions and the
   full stack — 7.6 screens, half the page, to say what a reader wanted to
   scan in ten seconds. The long-form writing already exists, and is better,
   on the case-study pages; this exists to get people into them.

   Deliberately close to what `ls` prints in the hero. That command was
   already the best projects interface on the site, and having the section
   speak a different visual language from the terminal above it was what made
   the page read as two sites stitched together.

   Tier is carried by the shared group rule in ./tiers — the same one the
   card grid uses, so the two views cannot show the hierarchy differently.

   CONTRAST
   Every piece of text here is at full token opacity. Dimming
   muted-foreground to 40% measures 1.76:1 against this background where AA
   wants 4.5:1; only opacity ≥ 0.9 passes. Anything that looks "quiet" below
   does it with size and tracking, never with alpha.

   A list of links rather than a <table>: every row navigates, so the row
   *is* the control, and a screen reader should hear a list of destinations
   rather than a data grid it has to traverse cell by cell.
   ========================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

/* Grid, not a table, so columns align while each row stays one link. Tracks
   are declared once and reused by the header — the only way the two can be
   guaranteed to line up. */
const COLUMNS =
  'grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1.7fr)_7rem_minmax(0,1fr)_4rem_1rem] gap-x-5 items-baseline';

const IndexHeader = () => (
  <div
    className={`${COLUMNS} px-4 pt-4 pb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground`}
    aria-hidden="true"
  >
    <span>system</span>
    <span className="hidden md:block">status</span>
    <span className="hidden md:block">stack</span>
    <span className="hidden md:block text-right">year</span>
    <span className="hidden md:block" />
  </div>
);

const IndexRow = ({ project, index }: { project: Project; index: number }) => {
  const status = projectStatus(project);
  const prefersReduced = useReducedMotion();

  return (
    <motion.li
      initial={prefersReduced ? false : { opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.025, 0.2), ease: EASE }}
      className="border-b border-border/60 last:border-b-0"
    >
      <Link
        to={`/projects/${project.id}`}
        className={`${COLUMNS} group relative px-4 py-3.5 hover:bg-primary/[0.05] focus-visible:bg-primary/[0.07] transition-colors`}
      >
        {/* Lit edge on hover — the same affordance the terminal rows use. */}
        <span
          className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary scale-y-0 group-hover:scale-y-100 group-focus-visible:scale-y-100 origin-center transition-transform duration-200"
          aria-hidden="true"
        />

        <span className="min-w-0">
          <span className="block font-mono text-[13px] text-foreground group-hover:text-primary transition-colors truncate">
            {project.title}
          </span>
          <span className="block text-[11px] text-muted-foreground truncate mt-0.5">
            {project.subtitle}
          </span>
        </span>

        <span
          className={`font-mono text-[10px] uppercase tracking-wider justify-self-end md:justify-self-start ${STATUS_CLASS[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>

        <span className="hidden md:block font-mono text-[10px] text-muted-foreground truncate">
          {project.stack.length ? project.stack.slice(0, 3).join(' · ') : '—'}
        </span>

        <span className="hidden md:block font-mono text-[10px] text-muted-foreground text-right tabular-nums whitespace-nowrap">
          {project.timeline.replace(/\s*—\s*Present/i, '→').replace(/\s*—\s*/, '–')}
        </span>

        <ArrowRight
          className="hidden md:block w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
          aria-hidden="true"
        />
      </Link>
    </motion.li>
  );
};

interface ProjectIndexProps {
  projects: Project[];
  /** False when a tier filter is active — every row would share one rule. */
  grouped?: boolean;
}

export default function ProjectIndex({ projects, grouped = true }: ProjectIndexProps) {
  if (!projects.length) return null;

  const groups = groupByTier(projects);
  let row = 0;

  return (
    <div className="border border-border bg-card/20">
      <IndexHeader />
      <ul className="border-t border-border">
        {groups.map((group) => (
          <React.Fragment key={group.tier}>
            {grouped && (
              <li>
                <TierRule tier={group.tier} count={group.items.length} className="px-4 pt-5 pb-2.5" />
              </li>
            )}
            {group.items.map((project) => (
              <IndexRow key={project.id} project={project} index={row++} />
            ))}
          </React.Fragment>
        ))}
      </ul>

      {/* External links are deliberately not in the rows: a row's job is to
          open the case study, and a second competing target inside a link is
          how people land on GitHub when they meant to read the write-up. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3 border-t border-border font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="tabular-nums">{projects.length} shown</span>
        <span className="flex items-center gap-1.5">
          <Github className="w-3 h-3" aria-hidden="true" />
          <span className="tabular-nums">{projects.filter((p) => p.github).length}</span> with source
        </span>
        <span className="flex items-center gap-1.5">
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
          <span className="tabular-nums">{projects.filter((p) => p.liveUrl).length}</span> live
        </span>
      </div>
    </div>
  );
}
