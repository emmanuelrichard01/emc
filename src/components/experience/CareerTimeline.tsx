import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import type { ExperienceItem } from '@/types';
import { formatDuration, spanBar, yearTicks } from '@/lib/tenure';
import type { Span } from '@/lib/tenure';
import { overlapRuns } from './ledgerModel';

/* ==========================================================================
   CAREER TIMELINE

   The whole career on one axis, one lane per role — the chart each row
   used to carry a small copy of, drawn once and large enough to read.

   What it shows that the list cannot:
     · length, as length — two months and three and a half years are not
       the same size here, as they were as rows
     · concurrency, as a band — the months when two roles ran at once are
       shaded across every lane, so "part-time, alongside a degree" is a
       shape you see before it is a note you read
     · a technology's reach — pick one below and only the roles that used
       it stay lit

   Every lane is a button: it takes you to that role's row (and opens it on
   a phone, where older rows start collapsed). Hovering a lane or its row
   lights the other, so the chart and the list read as one thing.
   ========================================================================== */

interface Props {
  roles: readonly ExperienceItem[];
  spans: readonly (Span | null)[];
  axis: { from: number; to: number };
  /** The role being pointed at, here or in the list. */
  activeRole: string | null;
  onActiveRole: (id: string | null) => void;
  /** Roles that used the selected technology, or null for none selected. */
  lit: ReadonlySet<string> | null;
  onOpenRole: (id: string) => void;
  inView: boolean;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export default function CareerTimeline({ roles, spans, axis, activeRole, onActiveRole, lit, onOpenRole, inView }: Props) {
  const prefersReduced = useReducedMotion();
  const ticks = useMemo(() => yearTicks(axis), [axis]);
  const overlaps = useMemo(() => overlapRuns(spans), [spans]);
  const firstYear = Math.floor(axis.from / 12);
  // A label per January tick: the year it opens.
  const labels = ticks.map((left, i) => ({ left, year: firstYear + i + 1 }));

  return (
    <figure className="border border-border bg-card/20" aria-label="Career timeline">
      <div className="px-4 sm:px-6 pt-5 pb-4">
        {/* The axis, in the bars' own coordinate space: offset by the lane
            label column so a year sits over the months it names. */}
        <div className="grid grid-cols-[84px_minmax(0,1fr)] sm:grid-cols-[148px_minmax(0,1fr)] gap-3" aria-hidden="true">
          <span />
          <div className="relative h-4 font-mono text-[10px] text-muted-foreground tabular-nums">
            {labels.map(({ left, year }) => (
              <span key={year} className="absolute -translate-x-1/2 top-0" style={{ left: `${left}%` }}>
                <span className="sm:hidden">’{String(year).slice(2)}</span>
                <span className="hidden sm:inline">{year}</span>
              </span>
            ))}
          </div>
        </div>

        <ol className="mt-2 space-y-1.5">
          {roles.map((role, i) => {
            const span = spans[i];
            if (!span) return null;
            const bar = spanBar(span, axis);
            const active = activeRole === role.id;
            const dim = (lit && !lit.has(role.id)) || (activeRole !== null && !active);
            return (
              <li key={role.id} className="grid grid-cols-[84px_minmax(0,1fr)] sm:grid-cols-[148px_minmax(0,1fr)] gap-3 items-center">
                <span
                  className={`font-mono text-[11px] truncate transition-colors duration-200 ${
                    active || (lit && lit.has(role.id)) ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                  aria-hidden="true"
                >
                  {role.company}
                </span>
                <div className="relative h-7">
                  {/* The lane: a hairline for the whole window, and the
                      year boundaries, so each lane is a ruler. */}
                  <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden="true" />
                  {ticks.map((t) => (
                    <span key={t} className="absolute top-1.5 bottom-1.5 w-px bg-border/70" style={{ left: `${t}%` }} aria-hidden="true" />
                  ))}
                  <motion.button
                    type="button"
                    onClick={() => onOpenRole(role.id)}
                    onPointerEnter={() => onActiveRole(role.id)}
                    onPointerLeave={() => onActiveRole(null)}
                    onFocus={() => onActiveRole(role.id)}
                    onBlur={() => onActiveRole(null)}
                    aria-label={`${role.company}, ${role.role}: ${role.period}, ${formatDuration(span.months)}. Go to this role.`}
                    className={`group absolute top-1/2 -translate-y-1/2 h-3 origin-left outline-offset-4 transition-[opacity,background-color,height] duration-200 ${
                      active ? 'bg-primary h-4' : 'bg-primary/85 hover:bg-primary'
                    } ${dim ? 'opacity-25' : 'opacity-100'}`}
                    style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                    initial={prefersReduced ? false : { scaleX: 0 }}
                    animate={inView || prefersReduced ? { scaleX: 1 } : { scaleX: 0 }}
                    transition={{ duration: 0.7, delay: 0.15 + i * 0.07, ease: EASE }}
                  >
                    {/* The duration rides on the bar where there is room for it. */}
                    {bar.width > 16 && (
                      <span className="absolute inset-0 flex items-center px-1.5 font-mono text-[9px] leading-none text-primary-foreground tabular-nums whitespace-nowrap overflow-hidden">
                        {formatDuration(span.months)}
                      </span>
                    )}
                  </motion.button>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Concurrency, as a band behind the lanes. Drawn in its own row,
            aligned to the same columns, so it can be labelled. */}
        {overlaps.length > 0 && (
          <div className="mt-3 grid grid-cols-[84px_minmax(0,1fr)] sm:grid-cols-[148px_minmax(0,1fr)] gap-3 items-center" aria-hidden="true">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">at once</span>
            <div className="relative h-2">
              <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
              {overlaps.map((run) => {
                const b = spanBar(run, axis);
                return (
                  <span
                    key={run.start.index}
                    className="absolute inset-y-0 bg-status-warn/70"
                    style={{ left: `${b.left}%`, width: `${b.width}%` }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </figure>
  );
}
