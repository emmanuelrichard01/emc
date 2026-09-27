import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

import { formatDuration } from '@/lib/tenure';
import type { Tenure } from './ledgerModel';

/* ==========================================================================
   STACK TENURE

   "Years of Python" is the first question a recruiter's form asks and the
   one a CV answers worst — by adjective. This answers it from the dates:
   for each technology, the months in which at least one role used it,
   overlaps counted once. The bar is that span against the whole career.

   Choosing one lights the roles that used it, above in the timeline and
   below in the list; where the Work section has built projects in it, a
   link filters the catalogue to them. The selection is a toggle, not a
   hover, so it survives scrolling down the list to read the rows it lit.
   ========================================================================== */

interface Props {
  tenure: readonly Tenure[];
  /** Months on the ledger, the bar's full scale. */
  total: number;
  selected: string | null;
  onSelect: (name: string | null) => void;
  /** Built projects per technology, for the link into Work. */
  projectCount: (name: string) => number;
  onShowProjects: (name: string) => void;
}

/** How many to show before "show all": the long tail is two-month tools. */
const FIRST = 8;

export default function StackTenure({ tenure, total, selected, onSelect, projectCount, onShowProjects }: Props) {
  const prefersReduced = useReducedMotion();
  const [all, setAll] = useState(false);
  // The selection stays visible even if it is in the collapsed tail.
  const shown = all ? tenure : tenure.filter((t, i) => i < FIRST || t.name === selected);
  const projects = selected ? projectCount(selected) : 0;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mb-3">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">Time in the stack</h3>
        <p className="font-mono text-[10px] text-muted-foreground">months a role used it, by the dates above · overlaps counted once</p>
      </div>

      <ul className="flex flex-wrap gap-1.5" aria-label="Technologies by time in use">
        {shown.map((t) => {
          const on = selected === t.name;
          return (
            <li key={t.name}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onSelect(on ? null : t.name)}
                className={`tap group relative flex items-center gap-2.5 border px-2.5 py-1.5 font-mono text-[11px] transition-colors ${
                  on ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                <span>{t.name}</span>
                <span className={`tabular-nums ${on ? 'text-primary' : 'text-foreground/85'}`}>{formatDuration(t.months)}</span>
                {/* Share of the career, as a hairline along the chip's foot. */}
                <span className="absolute left-0 bottom-0 h-px bg-primary/70 transition-[width] duration-300" style={{ width: `${(t.months / total) * 100}%` }} aria-hidden="true" />
              </button>
            </li>
          );
        })}
        {tenure.length > FIRST && (
          <li>
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              aria-expanded={all}
              className="tap flex items-center px-2.5 py-1.5 font-mono text-[11px] text-primary hover:text-foreground transition-colors"
            >
              {all ? 'fewer' : `+${tenure.length - FIRST} more`}
            </button>
          </li>
        )}
      </ul>

      {/* What the selection found — said in words, for everyone, and read
          out when it changes. */}
      <div className="min-h-[28px] mt-3" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          {selected && (
            <motion.p
              key={selected}
              initial={prefersReduced ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.25 }}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground"
            >
              <span>
                <span className="text-foreground">{selected}</span> in{' '}
                {tenure.find((t) => t.name === selected)?.roles.length ?? 0} of the roles below, lit in the list
              </span>
              {projects > 0 && (
                <button
                  type="button"
                  onClick={() => onShowProjects(selected)}
                  className="tap group inline-flex items-center gap-1 text-primary hover:text-foreground transition-colors"
                >
                  {projects} built {projects === 1 ? 'project' : 'projects'} with it
                  <ArrowUpRight className="w-3 h-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
              )}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
