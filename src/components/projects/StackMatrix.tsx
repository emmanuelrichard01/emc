import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import TransitionLink from '@/components/ui/TransitionLink';
import type { Project } from '@/types';
import { TIER_RANK } from './tiers';
import type { Result } from './workModel';

/* ==========================================================================
   STACK MATRIX

   Projects down the side, technologies across the top, a mark where one
   uses the other.

   It answers the question a technical reader actually brings to a list of
   projects — "has he used X for real, and how often?" — in a single glance
   that neither the index nor the cards can give: the heavy columns are the
   core of the practice, the sparse ones are the range. A skills list claims
   a technology; this shows the systems it went into.

   A real <table>, because it is one: a screen reader can move by row and
   column and hear "PostgreSQL, used" for each cell. Hovering draws a
   crosshair through the row and column; clicking a column header filters
   the whole section by that technology.

   Columns are technologies used by at least two projects, ranked by use —
   one-offs are counted in the last column rather than given a column each,
   which would make the matrix mostly empty.
   ========================================================================== */

const MAX_COLUMNS = 14;

interface StackMatrixProps {
  results: Result[];
  /** Every project, so the columns do not reshuffle as filters change. */
  all: Project[];
  selectedStack: string[];
  onToggleStack: (tech: string) => void;
}

export default function StackMatrix({ results, all, selectedStack, onToggleStack }: StackMatrixProps) {
  const prefersReduced = useReducedMotion();
  const [row, setRow] = useState<string | null>(null);
  const [col, setCol] = useState<string | null>(null);

  const columns = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of all) for (const t of p.stack) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, MAX_COLUMNS)
      .map(([name]) => name);
  }, [all]);

  const projects = results.map((r) => r.project);
  const colTotals = columns.map((c) => projects.filter((p) => p.stack.includes(c)).length);

  return (
    <div className="border border-border bg-card/20">
      <div className="overflow-x-auto overscroll-x-contain" onMouseLeave={() => {
          setRow(null);
          setCol(null);
        }}>
        <table className="w-full border-collapse min-w-[760px]">
          <caption className="sr-only">Technologies used by each project</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-card text-left align-bottom w-[260px] px-4 pb-3 pt-4 font-mono text-[10px] font-normal uppercase tracking-[0.18em] text-muted-foreground">
                system
              </th>
              {columns.map((tech) => {
                const selected = selectedStack.includes(tech);
                return (
                  <th key={tech} scope="col" className="align-bottom px-0 pb-2 pt-4 font-normal">
                    <button
                      type="button"
                      onClick={() => onToggleStack(tech)}
                      onMouseEnter={() => setCol(tech)}
                      onFocus={() => setCol(tech)}
                      aria-pressed={selected}
                      aria-label={`Filter by ${tech}`}
                      className={`mx-auto flex flex-col items-center gap-2 px-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                        selected ? 'text-primary' : col === tech ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="[writing-mode:vertical-rl] rotate-180 whitespace-nowrap max-h-[120px] truncate">{tech}</span>
                      <span className={`w-1 h-1 ${selected ? 'bg-primary' : 'bg-transparent'}`} aria-hidden="true" />
                    </button>
                  </th>
                );
              })}
              <th scope="col" className="align-bottom px-3 pb-3 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-muted-foreground text-right whitespace-nowrap">
                + other
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project, i) => {
              const others = project.stack.filter((t) => !columns.includes(t)).length;
              const active = row === project.id;
              return (
                <motion.tr
                  key={project.id}
                  initial={prefersReduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.2) }}
                  onMouseEnter={() => setRow(project.id)}
                  className={`border-t border-border/60 transition-colors ${active ? 'bg-primary/[0.05]' : ''}`}
                >
                  <th scope="row" className={`sticky left-0 z-10 text-left font-normal px-4 py-2.5 transition-colors ${active ? 'bg-[hsl(var(--card))]' : 'bg-card'}`}>
                    <TransitionLink
                      to={`/projects/${project.id}`}
                      onFocus={() => setRow(project.id)}
                      className="group flex items-center gap-2.5 min-w-0"
                    >
                      <span className="font-mono text-[9px] text-primary/80 w-6 shrink-0 tracking-[0.1em]" aria-hidden="true">
                        {TIER_RANK[project.tier]}
                      </span>
                      <span className={`font-mono text-[12px] truncate max-w-[210px] transition-colors ${active ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
                        {project.title}
                      </span>
                    </TransitionLink>
                  </th>
                  {columns.map((tech) => {
                    const uses = project.stack.includes(tech);
                    const cross = col === tech || active;
                    return (
                      <td
                        key={tech}
                        className={`text-center px-0 py-2.5 transition-colors ${col === tech ? 'bg-primary/[0.05]' : ''}`}
                        onMouseEnter={() => setCol(tech)}
                        aria-label={uses ? `${tech}, used` : `${tech}, not used`}
                      >
                        {uses ? (
                          <span
                            className={`inline-block w-2.5 h-2.5 transition-all duration-200 ${
                              active && col === tech ? 'bg-primary scale-125' : cross ? 'bg-primary' : 'bg-primary/70'
                            }`}
                            style={active && col === tech ? { boxShadow: '0 0 10px hsl(var(--primary) / 0.7)' } : undefined}
                            aria-hidden="true"
                          />
                        ) : (
                          <span className={`inline-block w-[3px] h-[3px] ${cross ? 'bg-muted-foreground/60' : 'bg-border'}`} aria-hidden="true" />
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-right font-mono text-[10px] text-muted-foreground tabular-nums">
                    {others ? `+${others}` : '—'}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border">
              <th scope="row" className="sticky left-0 z-10 bg-card text-left px-4 py-3 font-mono text-[10px] font-normal uppercase tracking-[0.18em] text-muted-foreground">
                used by
              </th>
              {colTotals.map((n, i) => (
                <td
                  key={columns[i]}
                  className={`text-center py-3 font-mono text-[10px] tabular-nums transition-colors ${
                    col === columns[i] ? 'text-primary' : n ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {n}
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="px-4 py-3 border-t border-border font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        click a technology to filter · technologies in one project only are counted under + other
      </p>
    </div>
  );
}
