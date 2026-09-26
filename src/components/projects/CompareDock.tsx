import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, GitCompare, Sparkles, X } from 'lucide-react';

import TransitionLink from '@/components/ui/TransitionLink';
import { useAsk } from '@/components/ai/AskProvider';
import { STATUS_CLASS, STATUS_LABEL, projectStatus } from '@/lib/project';
import type { Project } from '@/types';
import { TIER_LABEL } from './tiers';
import ProjectArt from './ProjectArt';
import { depthOf, yearLabel } from './workModel';

/* ==========================================================================
   COMPARE

   Tick two or three projects anywhere in the section; a tray gathers them;
   the sheet sets them side by side.

   The comparison a reader makes in their head — "the rate limiter and the
   reconciliation engine: same stack? which goes deeper?" — used to mean two
   tabs and a lot of scrolling. Here the same facts line up in columns, and
   the stack row does the one thing columns cannot: technologies every
   chosen project shares are lit, ones only some share are plain, ones only
   one uses are dim. Overlap and range, at a glance.

   The sheet ends by handing the question to the assistant, which has a
   compare_projects tool for exactly this and will explain the *why* behind
   the differences — grounded in the same data these columns show.
   ========================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

interface CompareDockProps {
  projects: Project[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function CompareDock({ projects, onRemove, onClear }: CompareDockProps) {
  const [open, setOpen] = useState(false);
  const prefersReduced = useReducedMotion();
  const { openAsk } = useAsk();
  const sheetRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  const canCompare = projects.length >= 2;
  const sheetOpen = open && canCompare;

  /* Modal behaviour: Esc closes, the page underneath stops scrolling, focus
     goes in on open and back to the tray's button on close. */
  useEffect(() => {
    if (!sheetOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
      if (e.key === 'Tab' && sheetRef.current) {
        const focusable = sheetRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => sheetRef.current?.querySelector<HTMLElement>('button')?.focus(), 50);
    const opener = openerRef.current;
    return () => {
      clearTimeout(t);
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
      opener?.focus({ preventScroll: true });
    };
  }, [sheetOpen]);

  const inAll = (tech: string) => projects.every((p) => p.stack.includes(tech));
  const inSome = (tech: string) => projects.filter((p) => p.stack.includes(tech)).length > 1;
  const shared = projects.length ? projects[0].stack.filter(inAll) : [];

  const askToCompare = () => {
    const names = projects.map((p) => p.title);
    const list = names.length === 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
    setOpen(false);
    openAsk({ question: `compare ${list} — how do their approaches and trade-offs differ?` });
  };

  return (
    <>
      {/* ── Tray ── */}
      <AnimatePresence>
        {projects.length > 0 && !sheetOpen && (
          <motion.div
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            className="fixed z-[60] inset-x-0 bottom-24 md:bottom-6 flex justify-center px-4 pointer-events-none"
          >
            <div
              role="region"
              aria-label="Projects to compare"
              className="pointer-events-auto flex items-center gap-2 max-w-full bg-card/95 backdrop-blur-xl border border-border shadow-2xl pl-3 pr-2 py-2"
            >
              <GitCompare className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
              <ul className="flex items-center gap-1.5 min-w-0 overflow-x-auto [scrollbar-width:none]">
                <AnimatePresence initial={false}>
                  {projects.map((p) => (
                    <motion.li
                      key={p.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.18, ease: EASE }}
                      className="flex items-center gap-1 border border-border pl-2 pr-1 py-1 shrink-0"
                    >
                      <span className="font-mono text-[10px] uppercase tracking-wider text-foreground max-w-[120px] truncate">{p.title}</span>
                      <button
                        type="button"
                        onClick={() => onRemove(p.id)}
                        aria-label={`Remove ${p.title} from compare`}
                        className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
                {Array.from({ length: Math.max(0, 2 - projects.length) }).map((_, i) => (
                  <li key={`slot-${i}`} className="border border-dashed border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                    pick one more
                  </li>
                ))}
              </ul>
              <button
                ref={openerRef}
                type="button"
                disabled={!canCompare}
                onClick={() => setOpen(true)}
                className="shrink-0 flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest disabled:bg-transparent disabled:text-muted-foreground disabled:border disabled:border-border transition-colors"
              >
                compare
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onClear}
                aria-label="Clear the comparison"
                className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sheet ── */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            key="compare-sheet"
            className="fixed inset-0 z-[96] flex items-end md:items-center justify-center md:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
            <motion.div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="compare-title"
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985, transition: { duration: 0.15 } }}
              transition={{ duration: 0.3, ease: EASE }}
              className="relative w-full max-w-5xl max-h-[92dvh] md:max-h-[86vh] flex flex-col bg-card border border-border shadow-2xl"
            >
              <span className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" aria-hidden="true" />
              <header className="flex items-center justify-between gap-4 px-5 md:px-6 py-4 border-b border-border">
                <h2 id="compare-title" className="flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.2em] text-foreground">
                  <GitCompare className="w-4 h-4 text-primary" aria-hidden="true" />
                  compare {projects.length}
                </h2>
                <span className="hidden sm:block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {shared.length ? `${shared.length} shared ${shared.length === 1 ? 'technology' : 'technologies'}` : 'no technology in common'}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close the comparison"
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </header>

              <div className="flex-1 overflow-auto overscroll-contain">
                <div
                  className="grid min-w-[560px] divide-x divide-border"
                  style={{ gridTemplateColumns: `repeat(${projects.length}, minmax(0, 1fr))` }}
                >
                  {projects.map((p, col) => {
                    const status = projectStatus(p);
                    const depth = depthOf(p);
                    const firstTradeoff = p.caseStudy?.tradeoffs?.[0];
                    return (
                      <motion.section
                        key={p.id}
                        initial={prefersReduced ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.06 * col, ease: EASE }}
                        className="flex flex-col min-w-0"
                        aria-label={p.title}
                      >
                        <ProjectArt project={p} compact className="aspect-[16/9] border-b border-border" />
                        <div className="p-4 md:p-5 flex flex-col gap-4 min-w-0">
                          <div>
                            <h3 className="font-mono text-[14px] text-foreground leading-tight">{p.title}</h3>
                            <p className="text-[12px] text-muted-foreground mt-1 leading-snug">{p.subtitle}</p>
                          </div>

                          <Row label="tier · status · year">
                            <span className="font-mono text-[11px] uppercase tracking-wider">
                              <span className="text-foreground">{TIER_LABEL[p.tier]}</span>
                              <span className="text-muted-foreground"> · </span>
                              <span className={STATUS_CLASS[status]}>{STATUS_LABEL[status]}</span>
                              <span className="text-muted-foreground"> · {yearLabel(p.timeline)}</span>
                            </span>
                          </Row>

                          <Row label="measured">
                            {p.metrics.length ? (
                              <dl className="space-y-1.5">
                                {p.metrics.map((m) => (
                                  <div key={m.label} className="flex items-baseline justify-between gap-3">
                                    <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground truncate">{m.label}</dt>
                                    <dd className="font-mono text-[12px] text-primary tabular-nums text-right">{m.value}</dd>
                                  </div>
                                ))}
                              </dl>
                            ) : (
                              <span className="font-mono text-[11px] text-muted-foreground">—</span>
                            )}
                          </Row>

                          <Row label="stack">
                            <ul className="flex flex-wrap gap-1">
                              {p.stack.map((tech) => {
                                const all = inAll(tech);
                                const some = !all && inSome(tech);
                                return (
                                  <li
                                    key={tech}
                                    className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 border ${
                                      all
                                        ? 'border-primary/60 text-primary bg-primary/10'
                                        : some
                                          ? 'border-border text-foreground'
                                          : 'border-border/50 text-muted-foreground'
                                    }`}
                                    title={all ? 'in every project here' : some ? 'shared with another here' : 'only this one'}
                                  >
                                    {tech}
                                  </li>
                                );
                              })}
                              {!p.stack.length && <li className="font-mono text-[11px] text-muted-foreground">not built</li>}
                            </ul>
                          </Row>

                          <Row label="documented">
                            <span className="font-mono text-[11px] text-foreground tabular-nums">
                              {depth.tradeoffs} trade-offs · {depth.fieldNotes} field notes · {depth.highlights} highlights
                            </span>
                          </Row>

                          {firstTradeoff && (
                            <Row label={firstTradeoff.decision.toLowerCase()}>
                              <p className="text-[12px] leading-relaxed text-muted-foreground">
                                chose <span className="text-foreground">{firstTradeoff.chose}</span> over{' '}
                                <span className="line-through decoration-muted-foreground/60">{firstTradeoff.rejected}</span>
                              </p>
                            </Row>
                          )}

                          <TransitionLink
                            to={`/projects/${p.id}`}
                            onClick={() => setOpen(false)}
                            className="mt-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-primary hover:gap-2.5 transition-all"
                          >
                            case study <ArrowRight className="w-3 h-3" aria-hidden="true" />
                          </TransitionLink>
                        </div>
                      </motion.section>
                    );
                  })}
                </div>
              </div>

              <footer className="flex flex-wrap items-center justify-between gap-3 px-5 md:px-6 py-3.5 border-t border-border pb-[max(0.875rem,env(safe-area-inset-bottom))]">
                <span className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-primary/40 border border-primary/60" aria-hidden="true" />in all</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 border border-border" aria-hidden="true" />shared</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 border border-border/50 opacity-50" aria-hidden="true" />one only</span>
                </span>
                <span className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={onClear}
                    className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  >
                    clear
                  </button>
                  <button
                    type="button"
                    onClick={askToCompare}
                    className="flex items-center gap-2 border border-primary/50 bg-primary/10 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    ask ai why they differ
                  </button>
                </span>
              </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-border/60 pt-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{label}</p>
      {children}
    </div>
  );
}
