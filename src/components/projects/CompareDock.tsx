import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Sparkles, X } from 'lucide-react';

import TransitionLink from '@/components/ui/TransitionLink';
import { useAsk } from '@/components/ai/AskProvider';
import { projectStatus } from '@/lib/project';
import type { Project } from '@/types';
import { StatusText, TIER_TITLE, describeDepth, plural } from './tiers';
import ProjectArt from './ProjectArt';
import { depthOf, yearLabel } from './workModel';

/* ==========================================================================
   COMPARE

   Tick two or three projects anywhere in the section; a tray gathers them;
   the sheet sets them side by side, floating over the page like a proof
   laid on the table.

   The comparison a reader makes in their head — "the rate limiter and the
   reconciliation engine: same stack? which goes deeper?" — used to mean two
   tabs and a lot of scrolling. Here the same facts line up in columns, and
   the stack row does the one thing columns cannot: technologies every
   chosen project shares are underlined, ones only some share are in ink,
   ones only one uses are grey. Overlap and range, at a glance.

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
    openAsk({ question: `compare ${list}: how do their approaches and trade-offs differ?` });
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
            transition={{ duration: 0.45, ease: EASE }}
            className="fixed z-[60] inset-x-0 bottom-24 md:bottom-8 flex justify-center px-4 pointer-events-none"
          >
            <div
              role="region"
              aria-label="Projects to compare"
              className="pointer-events-auto flex items-center gap-3 max-w-full bg-popover/95 backdrop-blur-md shadow-[0_0_0_1px_hsl(var(--border)),0_24px_60px_-20px_rgba(0,0,0,0.85)] pl-4 pr-2 py-2"
            >
              <span className="t-caption shrink-0 hidden sm:inline">Compare</span>
              <ul className="flex items-center gap-3 min-w-0 overflow-x-auto [scrollbar-width:none]">
                <AnimatePresence initial={false}>
                  {projects.map((p) => (
                    <motion.li
                      key={p.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: EASE }}
                      className="flex items-center gap-1 shrink-0"
                    >
                      <span className="text-[13px] text-foreground max-w-[130px] truncate">{p.title}</span>
                      <button
                        type="button"
                        onClick={() => onRemove(p.id)}
                        aria-label={`Remove ${p.title} from compare`}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
                {Array.from({ length: Math.max(0, 2 - projects.length) }).map((_, i) => (
                  <li key={`slot-${i}`} className="t-caption italic shrink-0">
                    pick one more
                  </li>
                ))}
              </ul>
              <button
                ref={openerRef}
                type="button"
                disabled={!canCompare}
                onClick={() => setOpen(true)}
                className="btn-ink tap shrink-0 !px-4 !py-2 !text-[13px]"
              >
                Compare
                <ArrowRight className="nudge w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onClear}
                aria-label="Clear the comparison"
                className="shrink-0 p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
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
            className="fixed inset-0 z-[96] flex items-end md:items-center justify-center md:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
            <motion.div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="compare-title"
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 18, transition: { duration: 0.18 } }}
              transition={{ duration: 0.5, ease: EASE }}
              className="relative w-full max-w-6xl max-h-[92dvh] md:max-h-[88vh] flex flex-col bg-popover shadow-[0_0_0_1px_hsl(var(--border)),0_40px_100px_-30px_rgba(0,0,0,0.9)]"
            >
              <header className="flex items-end justify-between gap-6 px-5 md:px-8 pt-6 md:pt-8 pb-5">
                <div>
                  <h2 id="compare-title" className="t-heading text-foreground">
                    Side by side
                  </h2>
                  <p className="t-caption mt-1.5">
                    {shared.length
                      ? `${projects.length} projects, ${shared.length} ${shared.length === 1 ? 'tool' : 'tools'} in common`
                      : `${projects.length} projects, no tools in common`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close the comparison"
                  className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </header>

              <div className="flex-1 overflow-auto overscroll-contain border-t border-border" data-lenis-prevent>
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
                        initial={prefersReduced ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.08 * col, ease: EASE }}
                        className="flex flex-col min-w-0"
                        aria-label={p.title}
                      >
                        <ProjectArt project={p} compact className="aspect-[16/9]" />
                        <div className="p-5 md:p-6 flex flex-col gap-5 min-w-0">
                          <div>
                            <h3 className="t-subhead text-foreground">{p.title}</h3>
                            <p className="t-caption mt-1">{p.subtitle}</p>
                          </div>

                          <Row label="Type, status and year">
                            <span className="text-[13px] flex flex-wrap items-center gap-x-2">
                              <span className="text-foreground">{TIER_TITLE[p.tier]}</span>
                              <span className="text-muted-quiet">·</span>
                              <StatusText status={status} />
                              <span className="text-muted-quiet">·</span>
                              <span className="text-muted-foreground tabular-nums">{yearLabel(p.timeline)}</span>
                            </span>
                          </Row>

                          <Row label="Key numbers">
                            {p.metrics.length ? (
                              <dl className="space-y-1.5">
                                {p.metrics.map((m) => (
                                  <div key={m.label} className="flex items-baseline justify-between gap-3">
                                    <dt className="t-caption truncate">{m.label}</dt>
                                    <dd className="t-figure text-[13px] text-foreground text-right">{m.value}</dd>
                                  </div>
                                ))}
                              </dl>
                            ) : (
                              <span className="t-caption">None recorded</span>
                            )}
                          </Row>

                          <Row label="Built with">
                            <p className="text-[13px] leading-relaxed">
                              {p.stack.length ? (
                                p.stack.map((tech, i) => {
                                  const all = inAll(tech);
                                  const some = !all && inSome(tech);
                                  return (
                                    <span key={tech}>
                                      <span
                                        className={
                                          all
                                            ? 'text-foreground underline decoration-primary underline-offset-4'
                                            : some
                                              ? 'text-foreground'
                                              : 'text-muted-foreground'
                                        }
                                        title={all ? 'Used by all of these' : some ? 'Used by more than one of these' : 'Used by this one only'}
                                      >
                                        {tech}
                                      </span>
                                      {i < p.stack.length - 1 && <span className="text-muted-quiet"> · </span>}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-muted-foreground">Not built</span>
                              )}
                            </p>
                          </Row>

                          <Row label="Write-up">
                            <span className="text-[13px] text-foreground tabular-nums">
                              {describeDepth(depth.tradeoffs, depth.fieldNotes)}, {plural(depth.highlights, 'highlight')}
                            </span>
                          </Row>

                          {firstTradeoff && (
                            <Row label={firstTradeoff.decision}>
                              <p className="t-caption leading-relaxed">
                                Chose <span className="text-foreground">{firstTradeoff.chose}</span> over{' '}
                                <span className="line-through decoration-muted-foreground">{firstTradeoff.rejected}</span>
                              </p>
                            </Row>
                          )}

                          <TransitionLink
                            to={`/projects/${p.id}`}
                            onClick={() => setOpen(false)}
                            className="group mt-auto inline-flex items-center gap-2 text-[14px] text-foreground"
                          >
                            <span className="link-draw">Read the case study</span>
                            <ArrowRight className="nudge w-3.5 h-3.5" aria-hidden="true" />
                          </TransitionLink>
                        </div>
                      </motion.section>
                    );
                  })}
                </div>
              </div>

              <footer className="flex flex-wrap items-center justify-between gap-4 px-5 md:px-8 py-4 border-t border-border pb-[max(1rem,env(safe-area-inset-bottom))]">
                <span className="flex flex-wrap items-center gap-x-5 gap-y-1 t-caption">
                  <span>
                    <span className="text-foreground underline decoration-primary underline-offset-4">Underlined</span>: used by all
                  </span>
                  <span>
                    <span className="text-foreground">White</span>: used by more than one
                  </span>
                  <span>Grey: used by one</span>
                </span>
                <span className="flex items-center gap-6">
                  <button
                    type="button"
                    onClick={onClear}
                    className="tap text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                  <button type="button" onClick={askToCompare} className="btn-line tap !py-2.5 !text-[13px]">
                    <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                    Ask why they differ
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
    <div className="border-t border-border pt-3">
      <p className="t-caption mb-2">{label}</p>
      {children}
    </div>
  );
}
