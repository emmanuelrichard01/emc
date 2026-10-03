import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Hash, Plus, Sparkles } from 'lucide-react';

import { Reveal, RevealText, Rule } from '@/components/ui/Reveal';
import { useAsk } from '@/components/ai/AskProvider';
import type { FieldNote, Project, Tradeoff } from '@/types';

/* ==========================================================================
   CASE SECTIONS

   The parts of a case study that are more than a paragraph, set as the
   parts of a chapter: a drawn rule, a title, then the text.

   Each title carries a link to itself — point at it and a # copies the
   address of that exact section, the way documentation does — because
   "look at the trade-offs on this one" is a sentence people send.

   Each trade-off can be handed to the assistant as a question: "why X over
   Y?" is the natural follow-up to reading one, and the assistant is already
   told which page it is on.
   ========================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

/* ── Section ─────────────────────────────────────────────────────────── */

export function CaseSection({
  id,
  label,
  children,
  aside,
}: {
  id: string;
  label: string;
  children: ReactNode;
  /** Quiet detail on the right of the rule — a count. */
  aside?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);

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
       scroll margin clears the running head. */
    <section id={id} className="scroll-mt-28">
      <div className="flex items-center gap-6 mb-8 md:mb-10">
        <Rule className="flex-1" />
        {aside && <span className="shrink-0 t-caption tabular-nums">{aside}</span>}
      </div>
      <div className="group/heading flex items-start gap-3 mb-8 md:mb-10">
        <RevealText as="h2" className="t-heading text-foreground text-[clamp(1.625rem,1.2rem+1.4vw,2.375rem)]">
          {label}
        </RevealText>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy a link to ${label}`}
          className="tap mt-1 p-1.5 text-muted-foreground opacity-0 group-hover/heading:opacity-100 focus-visible:opacity-100 hover:text-foreground transition-opacity"
        >
          {copied ? <Check className="w-4 h-4 text-status-ok" aria-hidden="true" /> : <Hash className="w-4 h-4" aria-hidden="true" />}
        </button>
      </div>
      <Reveal>{children}</Reveal>
    </section>
  );
}

/* ── Highlights ──────────────────────────────────────────────────────── */

/* Short, individually checkable facts — numbered, between hairlines, so a
   list of eight reads as a ledger rather than a wall. */
export function Highlights({ items }: { items: string[] }) {
  return (
    <ol className="mt-12 border-b border-border">
      {items.map((item, i) => (
        <li key={item} className="grid grid-cols-[2.25rem_1fr] gap-x-3 border-t border-border py-4 md:py-5">
          <span className="t-folio pt-[0.3em]">{String(i + 1).padStart(2, '0')}</span>
          <span className="text-[15px] md:text-[16px] text-foreground/85 leading-[1.65] max-w-[60ch]">{item}</span>
        </li>
      ))}
    </ol>
  );
}

/* ── Trade-offs ──────────────────────────────────────────────────────────
   A comparison table: what was being decided, what was chosen, what lost,
   and why. A grid rather than a <table> so the "why" can run the full width
   under each row and the whole thing can stack on a phone; the column
   labels are a real header for sighted readers, and each cell carries its
   own label for everyone else. */

export function Tradeoffs({ project, tradeoffs }: { project: Project; tradeoffs: Tradeoff[] }) {
  const { openAsk } = useAsk();

  return (
    <>
      <p className="t-body mb-8 max-w-[60ch]">For each choice: what was picked, what was turned down, and why.</p>

      <div
        aria-hidden="true"
        className="hidden md:grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-8 pb-3 t-caption"
      >
        <span>The choice</span>
        <span>Picked</span>
        <span>Instead of</span>
      </div>

      <ol className="border-b border-border">
        {tradeoffs.map((t, i) => (
          <li key={t.decision} className="group border-t border-border py-6 md:py-7">
            <dl className="grid grid-cols-1 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-8 gap-y-3">
              <div className="flex items-baseline gap-3 min-w-0">
                <span className="t-folio">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <dt className="sr-only">The choice</dt>
                  <dd className="t-subhead text-foreground">{t.decision}</dd>
                </div>
              </div>
              <div className="min-w-0 grid grid-cols-[5.5rem_1fr] md:block gap-x-3">
                <dt className="t-caption md:sr-only">Picked</dt>
                <dd className="text-[15px] text-foreground leading-snug">{t.chose}</dd>
              </div>
              <div className="min-w-0 grid grid-cols-[5.5rem_1fr] md:block gap-x-3">
                <dt className="t-caption md:sr-only">Instead of</dt>
                <dd className="text-[15px] text-muted-foreground leading-snug line-through decoration-muted-ghost">{t.rejected}</dd>
              </div>
              <div className="md:col-start-2 md:col-span-2 min-w-0 mt-2 md:mt-3">
                <dt className="sr-only">Why</dt>
                <dd className="text-[15px] text-foreground/80 leading-[1.7] max-w-[60ch]">{t.why}</dd>
                <button
                  type="button"
                  onClick={() =>
                    openAsk({ question: `in ${project.title}, why ${t.chose} over ${t.rejected}? what would have gone wrong?` })
                  }
                  className="tap mt-3 inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground md:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-[opacity,color] duration-300"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  Ask why
                </button>
              </div>
            </dl>
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
   first one open. Several full debugging stories back to back run longer
   than the rest of the page; folded, the reader sees every symptom at once
   and opens the ones they care about. */

function NoteRow({ label, children, strong }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <>
      <dt className="t-caption sm:pt-[0.2em]">{label}</dt>
      <dd className={`text-[15px] leading-[1.7] max-w-[60ch] ${strong ? 'text-foreground' : 'text-foreground/80'}`}>{children}</dd>
    </>
  );
}

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
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 mb-8">
        <p className="t-body max-w-[56ch]">
          Real bugs from building it: what went wrong, the guesses that were wrong, the real cause, and what now stops it from happening again.
        </p>
        <button
          type="button"
          onClick={() => setOpen(open.size === notes.length ? new Set() : new Set(notes.map((_, i) => i)))}
          className="tap shrink-0 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {open.size === notes.length ? 'Close all' : 'Open all'}
        </button>
      </div>

      <ol className="border-b border-border">
        {notes.map((note, i) => {
          const isOpen = open.has(i);
          const panelId = `field-note-${i}`;
          return (
            <li key={note.title} className="border-t border-border">
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="group w-full text-left py-6 md:py-7"
              >
                <span className="grid grid-cols-[2.25rem_1fr_auto] gap-x-3 items-baseline">
                  <span className="t-folio">{String(i + 1).padStart(2, '0')}</span>
                  <span className="t-subhead text-[1.125rem] md:text-[1.25rem] text-foreground">{note.title}</span>
                  <Plus
                    className={`w-4 h-4 text-muted-foreground translate-y-0.5 transition-transform duration-500 ease-out-expo group-hover:text-foreground ${
                      isOpen ? 'rotate-45' : ''
                    }`}
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-4 grid grid-cols-1 sm:grid-cols-[2.25rem_9.5rem_1fr] gap-x-3">
                  <span className="hidden sm:block" aria-hidden="true" />
                  <span className="t-caption sm:pt-[0.2em]">What went wrong</span>
                  <span className="text-[15px] leading-[1.7] text-foreground/85 max-w-[60ch]">{note.symptom}</span>
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={panelId}
                    initial={prefersReduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    animate={prefersReduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                    exit={prefersReduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <dl className="grid grid-cols-1 sm:grid-cols-[9.5rem_1fr] gap-x-3 gap-y-1 sm:gap-y-4 sm:pl-[calc(2.25rem+0.75rem)] pb-8">
                      {note.wrongTurns?.length ? (
                        <NoteRow label="First guesses">
                          <ul className="space-y-1">
                            {note.wrongTurns.map((turn) => (
                              <li key={turn} className="text-muted-foreground line-through decoration-muted-ghost">
                                {turn}
                              </li>
                            ))}
                          </ul>
                        </NoteRow>
                      ) : null}
                      <NoteRow label="The real cause" strong>
                        {note.rootCause}
                      </NoteRow>
                      <NoteRow label="The fix">{note.fix}</NoteRow>
                      {note.guard && (
                        <NoteRow label="What stops it coming back">
                          <span className="inline-flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-status-ok shrink-0 mt-[0.4em]" aria-hidden="true" />
                            <span>{note.guard}</span>
                          </span>
                        </NoteRow>
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
