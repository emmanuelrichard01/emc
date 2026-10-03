import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUp, Link2, Mic, MicOff, RotateCcw, Sparkles, Square, X } from 'lucide-react';
import { toast } from 'sonner';

import AiTranscript from '@/components/hero/AiTranscript';
import { MAX_QUESTION_CHARS } from '@/lib/aiHistory';
import { AUDIENCES, permalinkFor } from '@/lib/aiStarters';
import type { Audience } from '@/lib/aiStarters';
import { MODIFIER_KEY } from '@/lib/platform';
import { useAsk } from './AskProvider';
import { useSpeechInput } from './useSpeechInput';

/* ==========================================================================
   ASK DOCK

   The assistant as a panel you can keep open while you read.

   Desktop: a column docked to the right edge, non-modal — the page stays
   scrollable and clickable behind it, because the point is to ask about
   what you are looking at *while* looking at it. A modal would make the
   visitor choose between the question and the page.

   Phone: a bottom sheet, modal (there is no "beside" at 390px), dragged
   down by its handle to dismiss, with the composer pinned at thumb height
   and safe-area padding under it.

   Everything inside is the same transcript the terminal renders — same
   evidence drawer, same grounding marks, same sources — so an answer looks
   like the same kind of thing wherever it was asked.
   ========================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

/* How each answer style is named and explained here. The ids and the
   prompts behind them live in aiStarters; this is only the wording. */
const LENS_COPY: Record<Audience, { label: string; hint: string }> = {
  general: { label: 'Anyone', hint: 'Balanced answers for any reader' },
  hiring: { label: 'Hiring', hint: 'Focus on results and scope, in plain language' },
  engineer: { label: 'Engineers', hint: 'Focus on how it works, what can fail, and what was ruled out' },
};

function useDesktop(): boolean {
  const query = '(min-width: 768px)';
  const [desktop, setDesktop] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return desktop;
}

export default function AskDock() {
  const { open, closeAsk, ask, session, audience, setAudience, project, starters } = useAsk();
  const { turns, busy, cancel, retry, canRetry, reset } = session;
  const desktop = useDesktop();
  const prefersReduced = useReducedMotion();
  const dragControls = useDragControls();

  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const speech = useSpeechInput(
    useCallback((text: string) => setQuestion(text), []),
    useCallback(
      (text: string) => {
        setQuestion('');
        ask(text);
      },
      [ask]
    )
  );

  const submit = (text: string) => {
    if (!text.trim() || busy) return;
    setQuestion('');
    stickToBottom.current = true;
    ask(text);
  };

  /* ── Focus ─────────────────────────────────────────────────────────────
     Into the composer on open — on desktop only, where it costs nothing. On
     a phone, focusing a field raises the keyboard over half the sheet
     before the visitor has decided to type; the starters are one tap away
     and so is the field. Back to whatever opened the dock on close. */
  useEffect(() => {
    if (open) {
      restoreFocus.current = document.activeElement as HTMLElement | null;
      if (desktop) {
        const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 60);
        return () => clearTimeout(t);
      }
      return;
    }
    const target = restoreFocus.current;
    restoreFocus.current = null;
    if (target && document.contains(target)) target.focus({ preventScroll: true });
  }, [open, desktop]);

  /* Esc from the page, too. The dock is non-modal on desktop, so focus is
     often out on the page while it is open — and a panel that only closes
     from inside itself reads as stuck. Skipped while the palette is up,
     which owns Esc for itself. */
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('[aria-label="Command palette"]')) return;
      if (busy) cancel();
      else closeAsk();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, busy, cancel, closeAsk]);

  /* The sheet is modal on phones, so the page under it should not scroll. */
  useEffect(() => {
    if (!open || desktop) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, desktop]);

  /* ── Scrollback ────────────────────────────────────────────────────────
     Follows the stream while the visitor is at the bottom, and lets go the
     moment they scroll up to reread — a transcript that yanks you back down
     mid-sentence is worse than one that never scrolls. */
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [turns, busy, open]);

  /* Grow with the question, up to a limit, rather than scrolling a one-line
     field sideways under the visitor's thumb. */
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [question]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit(question);
    }
  };

  const lastQuestion = [...turns].reverse().find((turn) => turn.role === 'user')?.text;

  const share = async () => {
    if (!lastQuestion) return;
    const url = permalinkFor(window.location.origin, window.location.pathname, lastQuestion);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied', {
        description: 'Anyone who opens it will get a fresh answer to the same question.',
      });
    } catch {
      toast.error('Could not copy the link', {
        description: 'You can share a question by adding /?ask= and the question to the site address.',
      });
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(question);
  };

  const remaining = MAX_QUESTION_CHARS - question.trim().length;

  const panelMotion = desktop
    ? {
        initial: prefersReduced ? { opacity: 0 } : { opacity: 0, x: 24 },
        animate: { opacity: 1, x: 0 },
        exit: prefersReduced ? { opacity: 0 } : { opacity: 0, x: 16, transition: { duration: 0.18, ease: EASE } },
        transition: { duration: 0.36, ease: EASE },
      }
    : {
        initial: prefersReduced ? { opacity: 0 } : { y: '100%' },
        animate: { y: 0, opacity: 1 },
        exit: prefersReduced ? { opacity: 0 } : { y: '100%' },
        transition: { type: 'spring' as const, stiffness: 380, damping: 40 },
      };

  return (
    <AnimatePresence>
      {open && (
        <>
          {!desktop && (
            <motion.div
              key="ask-backdrop"
              className="fixed inset-0 z-[94] bg-background/75"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAsk}
              aria-hidden="true"
            />
          )}

          <motion.aside
            key="ask-dock"
            {...panelMotion}
            role="dialog"
            aria-modal={!desktop}
            aria-labelledby="ask-dock-title"
            drag={desktop ? false : 'y'}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 650) closeAsk();
            }}
            /* A reading pane: the stock one step lighter, a hairline at its
               inner edge, and the only shadow on the page — it floats. */
            className="fixed z-[95] flex flex-col bg-popover
                       inset-x-0 bottom-0 h-[88dvh] shadow-[0_-1px_0_hsl(var(--border)),0_-24px_64px_-24px_rgba(0,0,0,0.85)]
                       md:inset-x-auto md:top-0 md:bottom-0 md:right-0 md:h-auto md:w-[min(460px,100vw)] md:shadow-[-1px_0_0_hsl(var(--border)),-32px_0_80px_-32px_rgba(0,0,0,0.85)]"
          >
            {/* Live edge: a hairline of the accent along the top while an
                answer is being written, and nothing at rest. */}
            <div
              className={`absolute top-0 inset-x-0 h-px bg-primary origin-left transition-[opacity,transform] duration-700 ease-out-expo ${
                busy ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
              }`}
              aria-hidden="true"
            />

            {/* Drag handle — phones only, and the only place a drag starts, so
                scrolling the transcript never moves the sheet. */}
            {!desktop && (
              <div
                className="flex justify-center pt-3 pb-1 touch-none cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
                aria-hidden="true"
              >
                <span className="w-9 h-[3px] bg-rule-strong" />
              </div>
            )}

            {/* ── Header ── */}
            <header className="shrink-0 px-5 md:px-7 pt-3 md:pt-7 pb-4 border-b border-border">
              <div className="flex items-start gap-3">
                <div className="min-w-0">
                  <h2 id="ask-dock-title" className="t-subhead text-[19px] md:text-[21px] text-foreground flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    Ask about the work
                  </h2>
                  <p
                    className="mt-1.5 text-[12.5px] text-muted-foreground truncate"
                    title={project ? `Questions about "this" mean ${project.title}` : 'Answers use everything on this site'}
                  >
                    {project ? (
                      <>
                        You&rsquo;re reading <span className="text-foreground">{project.title}</span>, so &ldquo;this&rdquo; means
                        that project
                      </>
                    ) : (
                      'Answers use everything on this site'
                    )}
                  </p>
                </div>

                <div className="ml-auto -mr-2 -mt-1 flex items-center shrink-0">
                  {lastQuestion && (
                    <button
                      type="button"
                      onClick={share}
                      className="tap w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Copy a link that asks the last question"
                      title="Copy a link that asks this question"
                    >
                      <Link2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                  {turns.length > 0 && (
                    <button
                      type="button"
                      onClick={reset}
                      className="tap w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Start a new conversation"
                      title="New conversation"
                    >
                      <RotateCcw className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeAsk}
                    className="tap w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Close the assistant"
                  >
                    <X className="w-[18px] h-[18px]" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Lens. Changes how answers are pitched, never what they may
                  claim — said in the hint so nobody reads it as a filter on
                  the truth. */}
              <div className="mt-5 flex items-center gap-4">
                <span className="text-[12.5px] text-muted-quiet shrink-0">Written for</span>
                <div className="flex items-center gap-4" role="radiogroup" aria-label="Who the answers are written for">
                  {AUDIENCES.map((option) => {
                    const selected = option.id === audience;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        title={LENS_COPY[option.id]?.hint ?? option.hint}
                        onClick={() => setAudience(option.id)}
                        className={`tap relative py-1 text-[13px] transition-colors ${
                          selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {LENS_COPY[option.id]?.label ?? option.label}
                        {selected && (
                          <motion.span
                            layoutId="ask-lens"
                            className="absolute left-0 right-0 bottom-0 h-px bg-foreground"
                            transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </header>

            {/* ── Conversation ── */}
            <div
              ref={scrollRef}
              onScroll={onScroll}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 md:px-7 py-6"
              data-lenis-prevent
            >
              {turns.length === 0 ? (
                <EmptyState starters={starters} onAsk={submit} busy={busy} projectTitle={project?.title} />
              ) : (
                <AiTranscript
                  turns={turns}
                  busy={busy}
                  onCancel={cancel}
                  onRetry={retry}
                  canRetry={canRetry}
                  onAsk={submit}
                  suggestions={starters}
                />
              )}
            </div>

            {/* ── Composer ── */}
            <form
              onSubmit={onSubmit}
              className="shrink-0 border-t border-border px-5 md:px-7 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <div
                className={`flex items-end gap-1.5 border pl-3.5 pr-1.5 py-1.5 transition-colors duration-300 ${
                  busy ? 'ai-border ai-border--busy border-transparent' : 'border-border hover:border-rule-strong focus-within:border-rule-strong'
                }`}
              >
                <label htmlFor="ask-dock-input" className="sr-only">
                  Ask a question about Emmanuel&rsquo;s work
                </label>
                <textarea
                  id="ask-dock-input"
                  ref={inputRef}
                  rows={1}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={onKeyDown}
                  maxLength={MAX_QUESTION_CHARS + 50}
                  placeholder={
                    speech.listening
                      ? 'Listening…'
                      : project
                        ? `Ask about ${project.title}…`
                        : 'Ask anything about his work…'
                  }
                  // 16px on phones: anything smaller makes iOS zoom the page on focus.
                  className="relative z-[2] flex-1 resize-none bg-transparent text-[16px] md:text-[14.5px] leading-relaxed text-foreground placeholder:text-muted-quiet focus:outline-none focus-visible:outline-none py-1.5"
                />

                {speech.supported && !busy && (
                  <button
                    type="button"
                    onClick={speech.listening ? speech.stop : speech.start}
                    className={`tap relative z-[2] shrink-0 w-9 h-9 flex items-center justify-center transition-colors ${
                      speech.listening ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    aria-label={speech.listening ? 'Stop listening' : 'Ask by voice'}
                    aria-pressed={speech.listening}
                  >
                    {speech.listening ? (
                      <span className="relative flex items-center justify-center">
                        <span className="absolute w-6 h-6 bg-primary/20 animate-ping" aria-hidden="true" />
                        <MicOff className="w-4 h-4 relative" aria-hidden="true" />
                      </span>
                    ) : (
                      <Mic className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                )}

                {busy ? (
                  <button
                    type="button"
                    onClick={cancel}
                    aria-label="Stop answering"
                    className="tap relative z-[2] shrink-0 w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground shadow-[inset_0_0_0_1px_hsl(var(--rule-strong))] transition-colors"
                  >
                    <Square className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!question.trim()}
                    aria-label="Ask"
                    className="tap relative z-[2] shrink-0 w-9 h-9 flex items-center justify-center bg-foreground text-background hover:bg-white disabled:bg-transparent disabled:text-muted-quiet disabled:shadow-[inset_0_0_0_1px_hsl(var(--border))] transition-colors"
                  >
                    <ArrowUp className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-3 text-[12px] text-muted-quiet">
                {speech.error ? (
                  <span className="text-status-warn" role="status">
                    {speech.error}
                  </span>
                ) : (
                  <span className="hidden md:flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <kbd className="kbd">↵</kbd> Ask
                    </span>
                    <span className="flex items-center gap-1.5">
                      <kbd className="kbd">⇧</kbd>
                      <kbd className="kbd -ml-1">↵</kbd> New line
                    </span>
                    <span className="flex items-center gap-1.5">
                      <kbd className="kbd">Esc</kbd> {busy ? 'Stop' : 'Close'}
                    </span>
                  </span>
                )}
                <span className={`ml-auto tabular-nums ${remaining < 100 ? '' : 'hidden md:inline'} ${remaining < 60 ? 'text-status-warn' : ''}`}>
                  {remaining < 100 ? `${remaining} characters left` : `${MODIFIER_KEY}+J opens this from anywhere`}
                </span>
              </div>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────
   Says what the assistant is bound by before offering to use it — the
   grounding is the feature, and a visitor deciding whether to trust an
   answer should know the rules before the first one arrives. */
function EmptyState({
  starters,
  onAsk,
  busy,
  projectTitle,
}: {
  starters: string[];
  onAsk: (question: string) => void;
  busy: boolean;
  projectTitle?: string;
}) {
  return (
    <div>
      <p className="text-[15px] leading-[1.65] text-foreground/90">
        {projectTitle ? (
          <>
            Ask about <span className="text-foreground">{projectTitle}</span>, or anything else on this site.
          </>
        ) : (
          <>Ask anything about Emmanuel&rsquo;s work. Answers come from what is on this site.</>
        )}{' '}
        <span className="text-muted-foreground">
          Every number is checked against it, you can open the sources under each answer, and anything it
          can&rsquo;t find is clearly marked.
        </span>
      </p>

      <p className="mt-8 mb-1 t-caption">Try one of these</p>
      <ul className="border-t border-border" aria-label="Suggested questions">
        {starters.map((starter, i) => (
          <li key={starter}>
            <button
              type="button"
              onClick={() => onAsk(starter)}
              disabled={busy}
              className="tap group w-full flex items-baseline gap-4 py-3.5 border-b border-border text-left text-[14px] leading-snug text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              <span className="t-folio w-5 shrink-0 group-hover:text-foreground transition-colors">{i + 1}</span>
              <span className="flex-1">{starter}</span>
              <ArrowRight
                className="w-3.5 h-3.5 shrink-0 self-center opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-[12.5px] text-muted-quiet leading-relaxed">
        Tip: select any sentence on the page to ask about it.
      </p>
    </div>
  );
}
