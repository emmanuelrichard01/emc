import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion';
import { ArrowUp, Link2, Mic, MicOff, RotateCcw, Sparkles, Square, X } from 'lucide-react';
import { toast } from 'sonner';

import AiTranscript from '@/components/hero/AiTranscript';
import { MAX_QUESTION_CHARS } from '@/lib/aiHistory';
import { AUDIENCES, permalinkFor } from '@/lib/aiStarters';
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
      toast.success('Link to this question copied', {
        description: 'Whoever opens it gets the answer generated fresh against the site’s data.',
      });
    } catch {
      toast.error('Could not copy — the link is in the address bar format /?ask=…');
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(question);
  };

  const remaining = MAX_QUESTION_CHARS - question.trim().length;

  const panelMotion = desktop
    ? {
        initial: prefersReduced ? { opacity: 0 } : { opacity: 0, x: 28 },
        animate: { opacity: 1, x: 0 },
        exit: prefersReduced ? { opacity: 0 } : { opacity: 0, x: 28 },
        transition: { duration: 0.32, ease: EASE },
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
              className="fixed inset-0 z-[94] bg-background/70 backdrop-blur-[2px]"
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
            className="fixed z-[95] flex flex-col bg-card/95 backdrop-blur-xl border border-border shadow-2xl
                       inset-x-0 bottom-0 h-[88dvh] border-b-0
                       md:inset-x-auto md:top-4 md:bottom-4 md:right-4 md:h-auto md:w-[min(440px,calc(100vw-2rem))] md:border-b"
          >
            {/* Top edge — the accent hairline the rest of the site uses to
                mark a live surface. Brighter while an answer is in flight. */}
            <div
              className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent transition-opacity duration-500 ${
                busy ? 'opacity-100' : 'opacity-40'
              }`}
              aria-hidden="true"
            />

            {/* Drag handle — phones only, and the only place a drag starts, so
                scrolling the transcript never moves the sheet. */}
            {!desktop && (
              <div
                className="flex justify-center pt-2.5 pb-1 touch-none cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
                aria-hidden="true"
              >
                <span className="w-10 h-1 bg-muted-foreground/40" />
              </div>
            )}

            {/* ── Header ── */}
            <header className="shrink-0 px-4 md:px-5 pt-2 md:pt-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                <h2 id="ask-dock-title" className="font-mono text-[12px] uppercase tracking-[0.2em] text-foreground">
                  Ask
                </h2>
                <span
                  className="ml-1 min-w-0 truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground border border-border px-1.5 py-0.5"
                  title={project ? `"this" means ${project.title}` : 'answers draw on the whole site'}
                >
                  {project ? `reading · ${project.title}` : 'whole site'}
                </span>

                <div className="ml-auto flex items-center gap-0.5 shrink-0">
                  {lastQuestion && (
                    <button
                      type="button"
                      onClick={share}
                      className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                      aria-label="Copy a link that asks the last question"
                      title="Copy a link that asks this question"
                    >
                      <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                  {turns.length > 0 && (
                    <button
                      type="button"
                      onClick={reset}
                      className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                      aria-label="Start a new conversation"
                      title="New conversation"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeAsk}
                    className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Close the assistant"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Lens. Changes how answers are pitched, never what they may
                  claim — said in the hint so nobody reads it as a filter on
                  the truth. */}
              <div className="mt-3 flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 shrink-0">
                  pitch for
                </span>
                <div className="flex border border-border" role="radiogroup" aria-label="Who the answers are pitched for">
                  {AUDIENCES.map((option) => {
                    const selected = option.id === audience;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        title={option.hint}
                        onClick={() => setAudience(option.id)}
                        className={`relative px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                          selected ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {selected && (
                          <motion.span
                            layoutId="ask-lens"
                            className="absolute inset-0 bg-primary"
                            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                          />
                        )}
                        <span className="relative">{option.label}</span>
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
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-5 py-4"
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
              className="shrink-0 border-t border-border px-3 md:px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <div
                className={`flex items-end gap-1.5 border px-2.5 py-1.5 transition-colors ${
                  busy ? 'ai-border ai-border--busy border-transparent' : 'border-border focus-within:border-primary/60'
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
                      ? 'listening…'
                      : project
                        ? `ask about ${project.title.toLowerCase()}…`
                        : 'ask anything about his work…'
                  }
                  // 16px on phones: anything smaller makes iOS zoom the page on focus.
                  className="relative z-[2] flex-1 resize-none bg-transparent font-mono text-[16px] md:text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none py-1"
                />

                {speech.supported && !busy && (
                  <button
                    type="button"
                    onClick={speech.listening ? speech.stop : speech.start}
                    className={`relative z-[2] shrink-0 w-8 h-8 flex items-center justify-center transition-colors ${
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
                    className="relative z-[2] shrink-0 w-8 h-8 flex items-center justify-center border border-border text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors"
                  >
                    <Square className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!question.trim()}
                    aria-label="Ask"
                    className="relative z-[2] shrink-0 w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground disabled:bg-transparent disabled:text-muted-foreground/60 transition-colors"
                  >
                    <ArrowUp className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                {speech.error ? (
                  <span className="text-amber-300/90 normal-case tracking-normal text-[11px]" role="status">
                    {speech.error}
                  </span>
                ) : (
                  <span className="hidden md:inline">
                    ↵ ask · ⇧↵ newline · esc {busy ? 'stop' : 'close'} · {MODIFIER_KEY}+J
                  </span>
                )}
                <span className={`ml-auto tabular-nums ${remaining < 60 ? 'text-amber-300/90' : ''}`}>
                  {remaining < 100 ? `${remaining} left` : 'grounded'}
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
    <div className="font-mono">
      <p className="text-[12px] text-muted-foreground leading-relaxed">
        {projectTitle ? (
          <>
            answers about <span className="text-foreground">{projectTitle}</span> and the rest of the site.
          </>
        ) : (
          <>answers about emmanuel&rsquo;s work, from the site&rsquo;s own data.</>
        )}{' '}
        every figure is checked against that data, the queries behind an answer open under it, and anything it can&rsquo;t
        find is marked.
      </p>

      <p className="mt-5 mb-2 text-[10px] uppercase tracking-[0.2em] text-primary">// start with</p>
      <ul className="border-t border-border" aria-label="Suggested questions">
        {starters.map((starter, i) => (
          <li key={starter}>
            <button
              type="button"
              onClick={() => onAsk(starter)}
              disabled={busy}
              className="group w-full flex items-baseline gap-3 py-2.5 border-b border-border text-left text-[12px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              <span className="text-[10px] text-muted-foreground/50 tabular-nums group-hover:text-primary transition-colors">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="flex-1">{starter}</span>
              <span
                className="text-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                aria-hidden="true"
              >
                →
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-[11px] text-muted-foreground/70 leading-relaxed">
        tip: select any sentence on the page to ask about it.
      </p>
    </div>
  );
}
