import { useState, type ElementType, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown, Hash, Sparkles } from 'lucide-react';

import { useAsk } from '@/components/ai/AskProvider';
import type { FieldNote, Project, Tradeoff } from '@/types';

/* ==========================================================================
   CASE SECTIONS

   The parts of a case study that are more than a paragraph.

   Each section heading carries a link to itself — hover it and a # copies
   the address of that exact section, the way documentation does — because
   "look at the trade-offs on this one" is a sentence people send.

   Each trade-off can be handed to the assistant as a question: "why X over
   Y?" is the natural follow-up to reading one, and the assistant is already
   told which page it is on.
   ========================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

/* ── Section ─────────────────────────────────────────────────────────── */

export function CaseSection({
  id,
  num,
  label,
  icon: Icon,
  children,
  aside,
}: {
  id: string;
  num: string;
  label: string;
  icon: ElementType;
  children: ReactNode;
  /** Right-hand detail in the heading row. */
  aside?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const prefersReduced = useReducedMotion();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${id}`);
      history.replaceState(history.state, '', `#${id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard refused — the heading is still a normal anchor target */
    }
  };

  return (
    /* The id is on the section rather than the heading, so the contents
       rail can measure how far through the *section* the reader is. The
       scroll margin clears the fixed navbar. */
    <motion.section
      id={id}
      className="scroll-mt-28"
      initial={prefersReduced ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <div className="group/heading flex items-center gap-3 mb-6 pb-4 border-b border-border">
        <span className="font-mono text-[11px] tabular-nums text-primary">{num}</span>
        <Icon className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
        <h2 className="text-[13px] font-mono uppercase tracking-[0.18em] text-foreground">{label}</h2>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy a link to ${label}`}
          className="p-1 text-muted-foreground opacity-0 group-hover/heading:opacity-100 focus-visible:opacity-100 hover:text-primary transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" /> : <Hash className="w-3.5 h-3.5" aria-hidden="true" />}
        </button>
        <span className="flex-1 h-px" aria-hidden="true" />
        {aside}
      </div>
      {children}
    </motion.section>
  );
}

/* ── Highlights ──────────────────────────────────────────────────────── */

/* Short, individually checkable facts — numbered, in two columns on wide
   screens, so eight of them read as a ledger rather than a wall. */
export function Highlights({ items }: { items: string[] }) {
  return (
    <ol className="mt-10 grid md:grid-cols-2 gap-px bg-border border border-border">
      {items.map((item, i) => (
        <li key={item} className="bg-background p-4 md:p-5 flex gap-3.5">
          <span className="font-mono text-[10px] tabular-nums text-primary pt-1">{String(i + 1).padStart(2, '0')}</span>
          <span className="text-[14px] text-foreground/85 leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  );
}

/* ── Trade-offs ──────────────────────────────────────────────────────── */

export function Tradeoffs({ project, tradeoffs }: { project: Project; tradeoffs: Tradeoff[] }) {
  const { openAsk } = useAsk();

  return (
    <>
      <p className="font-mono text-[11px] text-muted-foreground mb-5 max-w-[68ch]">
        Each decision names the option that was rejected, and why.
      </p>
      <ol className="flex flex-col gap-px bg-border border border-border">
        {tradeoffs.map((t, i) => (
          <li key={t.decision} className="group bg-card p-5 md:p-6 hover:bg-card/60 transition-colors">
            <div className="flex items-baseline justify-between gap-4 mb-4">
              <span className="flex items-baseline gap-2.5 min-w-0">
                <span className="font-mono text-[10px] tabular-nums text-primary">{String(i + 1).padStart(2, '0')}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">{t.decision}</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  openAsk({ question: `in ${project.title}, why ${t.chose} over ${t.rejected}? what would have gone wrong?` })
                }
                className="shrink-0 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground md:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-primary transition-all"
              >
                <Sparkles className="w-3 h-3 text-primary/80" aria-hidden="true" />
                ask why
              </button>
            </div>

            {/* Chosen and rejected on their own rows with a shared label
                column, so the pair reads as one comparison. */}
            <div className="grid grid-cols-[3.5rem_1fr] gap-x-3 gap-y-2 mb-4">
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground pt-1">chose</span>
              <span className="font-mono text-[13px] text-emerald-400 leading-snug">{t.chose}</span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground pt-1">over</span>
              <span className="font-mono text-[13px] text-muted-foreground leading-snug line-through decoration-muted-foreground/50">
                {t.rejected}
              </span>
            </div>

            <p className="text-[14px] text-foreground/75 leading-[1.75] max-w-[68ch] border-l border-primary/30 group-hover:border-primary/70 pl-4 transition-colors">
              {t.why}
            </p>
          </li>
        ))}
      </ol>
    </>
  );
}

/* ── Field notes ─────────────────────────────────────────────────────────
   Symptom, the explanations that did not hold, what it actually was, the
   fix, and what now stops it coming back — the part of engineering most
   write-ups leave out.

   Folded: title and symptom always visible, the rest a click away, the
   first one open. Four full debugging stories back to back ran longer than
   the rest of the page; folded, the reader sees every symptom at once and
   opens the ones they care about. */

export function FieldNotesList({ notes }: { notes: FieldNote[] }) {
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]));
  const prefersReduced = useReducedMotion();
  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <>
      <div className="flex items-baseline justify-between gap-4 mb-5">
        <p className="font-mono text-[12px] text-muted-foreground max-w-[60ch]">
          Bugs worth telling: what was seen, the explanations that did not hold, and what now stops each one coming back.
        </p>
        <button
          type="button"
          onClick={() => setOpen(open.size === notes.length ? new Set() : new Set(notes.map((_, i) => i)))}
          className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
        >
          {open.size === notes.length ? 'fold all' : 'open all'}
        </button>
      </div>

      <ol className="flex flex-col gap-px bg-border border border-border">
        {notes.map((note, i) => {
          const isOpen = open.has(i);
          const panelId = `field-note-${i}`;
          return (
            <li key={note.title} className="bg-card">
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="group w-full text-left p-5 md:p-7 hover:bg-foreground/[0.015] transition-colors"
              >
                <span className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] tabular-nums text-primary">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1 text-[16px] md:text-[17px] font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                    {note.title}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground shrink-0 translate-y-0.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-3 grid sm:grid-cols-[7.5rem_1fr] gap-x-5 text-[14px] leading-[1.7]">
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:pt-1">symptom</span>
                  <span className="text-foreground/85">{note.symptom}</span>
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={panelId}
                    initial={prefersReduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    animate={prefersReduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                    exit={prefersReduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <dl className="grid grid-cols-1 sm:grid-cols-[7.5rem_1fr] gap-x-5 gap-y-3 text-[14px] leading-[1.7] px-5 md:px-7 pb-6 md:pb-7">
                      {note.wrongTurns?.length ? (
                        <>
                          <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:pt-1">tried</dt>
                          <dd>
                            <ul className="space-y-1">
                              {note.wrongTurns.map((turn) => (
                                <li key={turn} className="text-muted-foreground line-through decoration-muted-foreground/40">
                                  {turn}
                                </li>
                              ))}
                            </ul>
                          </dd>
                        </>
                      ) : null}
                      <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary sm:pt-1">actually</dt>
                      <dd className="text-foreground">{note.rootCause}</dd>
                      <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:pt-1">fix</dt>
                      <dd className="text-foreground/85">{note.fix}</dd>
                      {note.guard && (
                        <>
                          <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-emerald-400/90 sm:pt-1">guarded by</dt>
                          <dd className="text-foreground/85">{note.guard}</dd>
                        </>
                      )}
                    </dl>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
    </>
  );
}
