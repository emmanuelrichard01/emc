import { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Plus } from 'lucide-react';

import { formatDuration } from '@/lib/tenure';
import type { Tenure } from './ledgerModel';

/* ==========================================================================
   STACK TENURE

   "Years of Python" is the first question a recruiter's form asks and the
   one a CV answers worst — by adjective. This answers it from the dates:
   for each technology, the months in which at least one role used it,
   overlaps counted once. The hairline under each row is that span against
   the whole career.

   Disclosed, not shown: it is a lookup, so it waits behind one control
   until it is wanted. Choosing a technology — here, or from any role's
   stack below — lights the roles that used it in the timeline and the list;
   where Work has built projects in it, a link filters the catalogue to
   them. What the selection found is said in a line that stays visible with
   the list folded, so a choice made further down is never invisible here.
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
const EASE = [0.16, 1, 0.3, 1] as const;

export default function StackTenure({ tenure, total, selected, onSelect, projectCount, onShowProjects }: Props) {
  const prefersReduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const panelId = useId();
  // The selection stays visible even if it is in the collapsed tail.
  const shown = all ? tenure : tenure.filter((t, i) => i < FIRST || t.name === selected);
  const projects = selected ? projectCount(selected) : 0;
  const selectedTenure = selected ? tenure.find((t) => t.name === selected) : undefined;

  return (
    <div className="mt-16 md:mt-20 border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="tap group w-full flex items-center justify-between gap-6 py-6 text-left"
      >
        <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="t-subhead text-foreground">
            <span className="link-draw">Time in each technology</span>
          </span>
          <span className="t-caption">
            How long each of the {tenure.length} technologies was used, based on the dates above.
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0 text-[13px] text-muted-foreground group-hover:text-foreground transition-colors">
          {open ? 'Hide' : 'Show'}
          <Plus className={`w-4 h-4 transition-transform duration-500 ease-out-expo ${open ? 'rotate-45' : ''}`} aria-hidden="true" />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="tenure"
            initial={prefersReduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={prefersReduced ? { opacity: 0, transition: { duration: 0 } } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="overflow-hidden"
          >
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 pb-4" aria-label="Technologies by time in use">
              {shown.map((t) => {
                const on = selected === t.name;
                return (
                  <li key={t.name}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => onSelect(on ? null : t.name)}
                      className="tap group relative w-full flex items-center justify-between gap-4 py-3 border-b border-border text-left"
                    >
                      <span className={`text-[14px] transition-colors ${on ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                        {t.name}
                      </span>
                      <span className={`t-figure text-[13px] transition-colors ${on ? 'text-primary' : 'text-foreground/85'}`}>
                        {formatDuration(t.months)}
                      </span>
                      {/* Share of the career, as a hairline along the row's foot. */}
                      <span
                        className={`absolute left-0 -bottom-px h-px transition-colors duration-300 ${on ? 'bg-primary' : 'bg-rule-strong'}`}
                        style={{ width: `${(t.months / total) * 100}%` }}
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
            {tenure.length > FIRST && (
              <button
                type="button"
                onClick={() => setAll((v) => !v)}
                aria-expanded={all}
                className="tap group mb-6 inline-flex items-center py-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="link-draw">{all ? 'Show fewer' : `Show all ${tenure.length}`}</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* What the selection found — said in words, for everyone, and read
          out when it changes. */}
      <div className="min-h-[28px]" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          {selected && (
            <motion.p
              key={selected}
              initial={prefersReduced ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.3, ease: EASE }}
              className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-muted-foreground"
            >
              <span>
                <span className="text-primary">{selected}</span>
                {selectedTenure && <>: used for {formatDuration(selectedTenure.months)},</>} in {selectedTenure?.roles.length ?? 0}{' '}
                of the roles below (marked in the list).
              </span>
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="tap inline-flex items-center text-muted-quiet hover:text-foreground transition-colors"
              >
                Clear
              </button>
              {projects > 0 && (
                <button
                  type="button"
                  onClick={() => onShowProjects(selected)}
                  className="tap group inline-flex items-center gap-1 text-foreground"
                >
                  <span className="link-draw">
                    See {projects} {projects === 1 ? 'project' : 'projects'} built with it
                  </span>
                  <ArrowUpRight className="nudge-up w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
