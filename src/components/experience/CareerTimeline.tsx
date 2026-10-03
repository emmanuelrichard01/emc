import { useMemo } from 'react';

import type { ExperienceItem } from '@/types';
import { formatDuration, spanBar, yearTicks } from '@/lib/tenure';
import type { Span } from '@/lib/tenure';
import { Reveal } from '@/components/ui/Reveal';
import { overlapRuns } from './ledgerModel';

/* ==========================================================================
   CAREER TIMELINE

   The whole career on one axis, one lane per role, drawn in hairlines on the
   page rather than in a box.

   What it shows that the list cannot:
     · length, as length — two months and three and a half years are not
       the same size here, as they are as rows
     · concurrency, as a band — the months when two roles ran at once are a
       faint field behind every lane, and named in their own row at the foot,
       so "part-time, alongside a degree" is a shape before it is a note
     · a technology's reach — pick one below and only the roles that used
       it stay at full ink

   Every lane is a button: it takes you to that role's entry (opening the
   earlier roles if it is folded among them). Pointing at a lane lights its
   entry and the reverse, in the accent, so the chart and the list read as
   one thing.
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
}

/** Label column · bars · duration. The duration column drops on a phone. */
const COLUMNS = 'grid grid-cols-[88px_minmax(0,1fr)] sm:grid-cols-[168px_minmax(0,1fr)_72px] gap-x-4';

export default function CareerTimeline({ roles, spans, axis, activeRole, onActiveRole, lit, onOpenRole }: Props) {
  const ticks = useMemo(() => yearTicks(axis), [axis]);
  const overlaps = useMemo(() => overlapRuns(spans), [spans]);
  const bands = useMemo(() => overlaps.map((run) => ({ key: run.start.index, ...spanBar(run, axis) })), [overlaps, axis]);
  const firstYear = Math.floor(axis.from / 12);
  // A label per January tick: the year it opens.
  const labels = ticks.map((left, i) => ({ left, year: firstYear + i + 1 }));

  /** The faint concurrency field and the year rules, behind one lane. */
  const ground = (
    <>
      {bands.map((b) => (
        <span
          key={b.key}
          className="absolute inset-y-0 bg-foreground/[0.045]"
          style={{ left: `${b.left}%`, width: `${b.width}%` }}
          aria-hidden="true"
        />
      ))}
      {ticks.map((t) => (
        <span key={t} className="absolute inset-y-0 w-px bg-border" style={{ left: `${t}%` }} aria-hidden="true" />
      ))}
    </>
  );

  return (
    <Reveal>
     <figure className="m-0" aria-label="Career timeline">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mb-8">
        <h3 className="t-subhead text-foreground">Timeline</h3>
        <figcaption className="t-caption">Each line is one role, drawn to scale. Select a line to jump to that role.</figcaption>
      </div>

      {/* The axis, in the bars' own coordinate space. */}
      <div className={`${COLUMNS} border-b border-border pb-3`} aria-hidden="true">
        <span />
        <div className="relative h-4">
          {labels.map(({ left, year }) => (
            <span key={year} className="t-folio absolute -translate-x-1/2 top-0" style={{ left: `${left}%` }}>
              <span className="sm:hidden">’{String(year).slice(2)}</span>
              <span className="hidden sm:inline">{year}</span>
            </span>
          ))}
        </div>
        <span className="hidden sm:block" />
      </div>

      <ol>
        {roles.map((role, i) => {
          const span = spans[i];
          if (!span) return null;
          const bar = spanBar(span, axis);
          const active = activeRole === role.id;
          const isLit = Boolean(lit?.has(role.id));
          const dim = (lit && !isLit) || (activeRole !== null && !active);
          return (
            <li key={role.id} className={`${COLUMNS} items-center`}>
              <span
                className={`text-[13px] truncate transition-colors duration-300 ${
                  active || isLit ? 'text-foreground' : 'text-muted-foreground'
                }`}
                aria-hidden="true"
              >
                {role.company}
              </span>

              <div className="relative h-10">
                {ground}
                {/* The whole lane height is the target; the visible bar is a
                    thin rule of ink inside it. */}
                <button
                  type="button"
                  onClick={() => onOpenRole(role.id)}
                  onPointerEnter={() => onActiveRole(role.id)}
                  onPointerLeave={() => onActiveRole(null)}
                  onFocus={() => onActiveRole(role.id)}
                  onBlur={() => onActiveRole(null)}
                  aria-label={`${role.company}, ${role.role}: ${role.period}, ${formatDuration(span.months)}. Go to this role.`}
                  className={`group absolute inset-y-0 outline-offset-2 transition-opacity duration-300 ${dim ? 'opacity-30' : 'opacity-100'}`}
                  style={{ left: `${bar.left}%`, width: `${bar.width}%` }}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 transition-[height,background-color] duration-300 ease-out-expo ${
                      active ? 'h-[5px] bg-primary' : isLit ? 'h-[3px] bg-primary' : 'h-[3px] bg-foreground/80 group-hover:bg-foreground'
                    }`}
                  />
                </button>
              </div>

              <span
                className={`hidden sm:block text-right text-[12px] tabular-nums transition-colors duration-300 ${
                  active ? 'text-foreground' : 'text-muted-quiet'
                }`}
                aria-hidden="true"
              >
                {formatDuration(span.months)}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Concurrency, named: the same runs as the field behind the lanes. */}
      {bands.length > 0 && (
        <div className={`${COLUMNS} items-center border-t border-border pt-3`} aria-hidden="true">
          <span className="text-[13px] text-muted-foreground">Two roles at once</span>
          <div className="relative h-3">
            {bands.map((b) => (
              <span
                key={b.key}
                className="absolute inset-y-0 bg-foreground/25"
                style={{ left: `${b.left}%`, width: `${b.width}%` }}
              />
            ))}
          </div>
          <span className="hidden sm:block" />
        </div>
      )}
     </figure>
    </Reveal>
  );
}
