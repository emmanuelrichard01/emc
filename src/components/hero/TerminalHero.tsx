import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

import { LOGO_PATHS } from '@/components/ui/LogoMark';
import { MAX_QUESTION_CHARS as AI_MAX_QUESTION_CHARS } from '@/lib/aiHistory';
import { buildMotd, type MotdTone } from '@/lib/motd';
import { useTerminalSession } from './useTerminalSession';
import StatusRail from './StatusRail';
import { useAiSession } from './useAiSession';
import AiTranscript, { AI_SUGGESTIONS } from './AiTranscript';

/* ==========================================================================
   TERMINAL HERO

   A shell that is calm at rest and wakes up when you use it.

   Two states, deliberately:

     · At rest it is close to nothing — a wordmark, one bordered prompt, one
       dim line of instruction, and a great deal of empty space. That is the
       whole first impression, and it is the shape the reference sets.
     · The moment a command runs, output opens above the prompt and the panel
       materialises around it. The interface earns its complexity instead of
       arriving pre-loaded with it.

   What is deliberately *not* here: a title bar. An earlier pass had one, and
   between it, the boot overlay, the nav pill and the wordmark the same mark
   appeared four times before a visitor had done anything. The mark is drawn
   once during boot and stated once here; everything else is chrome that was
   repeating the identity rather than adding to it.

   Reveal never waits on the boot animation. Content animates in on mount and
   the overlay simply covers it, so a decorative sequence can never leave the
   page blank — which is exactly what an earlier version did when its "live"
   flag failed to flip.
   ========================================================================== */

const PROMPT = 'em@builtbyem:~/$';

const MOTD_TONE_CLASS: Record<MotdTone, string> = {
  identity: 'text-foreground/90',
  meta: 'text-muted-foreground',
  stat: 'text-muted-foreground/70',
  hint: 'text-muted-foreground/40',
};

/* Chips double as the page's calls to action. `work`, `resume` and `contact`
   are the buttons the old hero rendered — spelled as commands, so pressing
   one runs the shell rather than bypassing it. */
const CHIPS = ['ai', 'ask', 'work', 'resume', 'contact'] as const;

const EASE = [0.16, 1, 0.3, 1] as const;

/* ── Hero ───────────────────────────────────────────────────────────────── */

interface TerminalHeroProps {
  /** False while the boot overlay is still up. Gates focus and telemetry only. */
  live: boolean;
}

export default function TerminalHero({ live }: TerminalHeroProps) {
  const prefersReduced = useReducedMotion();
  const motd = useMemo(() => buildMotd(), []);

  const {
    sessionLog,
    inputValue,
    setInputValue,
    ghost,
    running,
    submit,
    cancelRunning,
    handleKeyDown,
    clearSession,
    unlocked,
    inputRef,
    focusInput,
  } = useTerminalSession({ enabled: live });

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const [inputFocused, setInputFocused] = useState(false);

  const hasOutput = sessionLog.length > 0;

  /* ── Block caret ─────────────────────────────────────────────────────────
     A terminal's cursor is a filled cell, not the hairline the browser draws.
     Rendering a real block means knowing where it goes, and the font here is
     monospace — so one measured character width times the caret index is the
     exact offset, with no per-keystroke text measurement.

     The native caret is hidden rather than removed: the input still holds
     focus, selection and IME behaviour, and only its painted caret is
     replaced. */
  const rulerRef = useRef<HTMLSpanElement>(null);
  const [charWidth, setCharWidth] = useState(0);
  const [caretIndex, setCaretIndex] = useState(0);

  useEffect(() => {
    const measure = () => {
      const el = rulerRef.current;
      if (!el) return;
      // A ten-character sample, so sub-pixel advance width does not compound
      // into a visible drift by the end of a long command.
      setCharWidth(el.getBoundingClientRect().width / 10);
    };
    measure();
    window.addEventListener('resize', measure);
    // Fonts land after first paint; without this the caret is measured
    // against the fallback face and sits wrong until the next resize.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => window.removeEventListener('resize', measure);
  }, []);

  /* Driven by events rather than by an effect watching `inputValue`.

     keyup covers typing and arrow movement, click and select cover pointer
     placement, and history recall (↑/↓, handled inside the session hook)
     lands on the same keyup. Writing the value through `setInput` below
     covers the paths that set it programmatically. An effect would have to
     setState on every render of a changed value, which is the cascading
     pattern React's rules flag. */
  const syncCaret = useCallback(() => {
    const el = inputRef.current;
    if (el) setCaretIndex(el.selectionStart ?? el.value.length);
  }, [inputRef]);

  /* Clamped to the current value rather than tracked independently.

     Submitting clears the input through the session hook, which does not go
     via setInput — so the stored index survived the clear and the block sat
     two cells right of an empty prompt. Deriving it costs nothing and cannot
     drift, where an effect syncing the two would be the cascading-render
     pattern React's rules flag. */
  const caret = Math.min(caretIndex, inputValue.length);

  /** Sets the value and parks the caret at the end, as a shell would. */
  const setInput = useCallback(
    (value: string) => {
      setInputValue(value);
      setCaretIndex(value.length);
    },
    [setInputValue]
  );

  // Focus the prompt once the overlay is gone — never before, or the page
  // scrolls to the input underneath a full-screen overlay.
  useEffect(() => {
    if (live) focusInput();
  }, [live, focusInput]);

  /* Scroll to the *start* of the newest command, not to the bottom.

     Sticking to the bottom is right for a stream — `watch` and `ping` emit
     over time and the newest line is the interesting one. It is wrong for a
     one-shot: running `ask` produces a list taller than the region, and
     bottom-anchoring scrolled straight past its heading and first entries, so
     the answer opened mid-list. Anchoring the command line to the top of the
     viewport shows a result from its beginning, which is what a reader wants
     and what they would get in a full-height terminal anyway. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (running || !stickToBottom.current) {
      if (stickToBottom.current) el.scrollTop = el.scrollHeight;
      return;
    }

    const commandLines = el.querySelectorAll<HTMLElement>('[data-line-type="cmd"]');
    const latest = commandLines[commandLines.length - 1];
    if (!latest) {
      el.scrollTop = el.scrollHeight;
      return;
    }

    // offsetTop is relative to the nearest positioned ancestor, so measure
    // against the scroll container rather than trusting the layout tree.
    const delta = latest.getBoundingClientRect().top - el.getBoundingClientRect().top;
    el.scrollTop = Math.min(el.scrollTop + delta, el.scrollHeight - el.clientHeight);
  }, [sessionLog, running]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  }, []);

  /* ── Chips that type themselves ──────────────────────────────────────────
     A chip writes its command into the prompt and runs it, so the interface
     teaches itself: someone who clicks `work` has now seen how `work` is
     typed, which is the only reason to put a terminal on a portfolio rather
     than a nav bar. */
  const [autoTyping, setAutoTyping] = useState(false);
  const typeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (typeTimer.current) clearTimeout(typeTimer.current);
    },
    []
  );

  const runChip = useCallback(
    (command: string) => {
      if (autoTyping || running) return;

      if (prefersReduced) {
        submit(command);
        return;
      }

      setAutoTyping(true);
      stickToBottom.current = true;
      let index = 0;

      const tick = () => {
        index += 1;
        setInput(command.slice(0, index));

        if (index < command.length) {
          typeTimer.current = setTimeout(tick, 42);
          return;
        }
        typeTimer.current = setTimeout(() => {
          setAutoTyping(false);
          submit(command);
        }, 190);
      };

      tick();
    },
    [autoTyping, prefersReduced, running, setInput, submit]
  );

  /* ── AI mode ─────────────────────────────────────────────────────────────
     A distinct mode rather than a replacement for the shell. Commands stay
     commands: `ls` still lists, `sql` still queries, and "command not found"
     still suggests a correction. Routing unrecognised input to a model would
     have removed all of that and turned every typo into a billed call. */
  const ai = useAiSession();
  const [aiMode, setAiMode] = useState(false);

  const enterAi = useCallback(() => {
    setAiMode(true);
    setInput('');
    focusInput();
  }, [focusInput, setInput]);

  const exitAi = useCallback(() => {
    setAiMode(false);
    ai.cancel();
    setInput('');
    focusInput();
  }, [ai, focusInput, setInput]);

  // The `ai` command lives in the shared registry, so `help` documents it and
  // tab-completion knows it; it signals back here through this event rather
  // than the registry needing a reference to this component's state.
  useEffect(() => {
    const onEnter = () => enterAi();
    window.addEventListener('emc:enter-ai', onEnter);
    return () => window.removeEventListener('emc:enter-ai', onEnter);
  }, [enterAi]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!aiMode) {
        submit(inputValue);
        return;
      }

      const question = inputValue.trim();
      if (!question) return;
      if (question === 'exit' || question === 'quit') {
        exitAi();
        return;
      }
      // Caught here rather than as a 400 from the endpoint. The server keeps
      // its own cap as the real boundary; this only spares the user a round
      // trip to be told something the input already knew.
      if (question.length > AI_MAX_QUESTION_CHARS) {
        ai.reject(
          `question is ${question.length} characters — keep it under ${AI_MAX_QUESTION_CHARS}.`
        );
        return;
      }
      setInput('');
      void ai.send(question);
    },
    [ai, aiMode, exitAi, inputValue, setInput, submit]
  );

  const handlePromptKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!aiMode) {
        handleKeyDown(e);
        return;
      }
      // In AI mode the shell's history and completion bindings do not apply;
      // Escape leaves, Ctrl+C cancels an in-flight question.
      if (e.key === 'Escape') {
        e.preventDefault();
        exitAi();
        return;
      }
      if (e.key === 'c' && e.ctrlKey) {
        e.preventDefault();
        ai.cancel();
      }
    },
    [ai, aiMode, exitAi, handleKeyDown]
  );

  /* Reveal runs on mount, never gated on `live`. */
  const reveal = (delay: number) =>
    prefersReduced
      ? {}
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: EASE },
        };

  /* Compact once the shell is in use.
     The wordmark is the largest thing on a resting screen and the least
     useful one on a working screen, so it gives up its space to output. */
  const compact = hasOutput || aiMode;

  return (
    /* The rail is a flex sibling, not absolutely positioned.
       It used to be pinned with `absolute bottom-0` inside this container —
       which is fine at rest and wrong the moment a command produces output:
       the container grows past the viewport and takes the rail, and the
       socials with it, off the bottom of the screen. As a sibling it cannot
       be pushed anywhere; the scrollback above absorbs the growth instead. */
    <div className="relative flex-1 flex flex-col min-h-0">
      <div className="w-full max-w-3xl mx-auto px-1 flex-1 flex flex-col justify-center min-h-0 py-2">
        {/* ── Wordmark ── */}
        <motion.div
          {...reveal(0.05)}
          animate={{
            // Scale rather than a font/size swap: it is one compositor
            // property, so the shrink is smooth and costs no layout.
            scale: compact ? 0.62 : 1,
            marginBottom: compact ? 4 : 44,
            opacity: compact ? 0.75 : 1,
          }}
          transition={{ duration: prefersReduced ? 0 : 0.45, ease: EASE }}
          style={{ transformOrigin: 'left top' }}
          className="flex items-end gap-5 md:gap-6 shrink-0"
        >
          <svg
            viewBox="0 0 200 120"
            className="w-14 h-8 md:w-[72px] md:h-11 text-primary shrink-0"
            aria-hidden="true"
            style={{ filter: 'drop-shadow(0 0 14px hsl(var(--primary) / 0.35))' }}
          >
            {LOGO_PATHS.map((d, i) => (
              <path key={i} d={d} fill="currentColor" />
            ))}
          </svg>
          <span className="font-mono text-[28px] md:text-[42px] leading-none tracking-[0.34em] text-foreground uppercase select-none">
            E·MC
          </span>
        </motion.div>

        {/* ── Scrollback ──
            The banner and the session share one scroll region, because on a
            real login that is what they are: the MOTD is simply the first
            thing printed, and it scrolls away as you work. Keeping it pinned
            above a separate output box meant the identity block held its
            space forever and pushed the prompt off a short viewport as soon
            as any command produced more than a few lines. */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={`min-h-0 overflow-y-auto font-mono text-[12px] md:text-[13px] leading-[2] pr-2 -mr-2 ${
            compact ? 'flex-1 mb-5' : 'shrink-0 mb-12 md:mb-16'
          }`}
        >
          {/* The banner folds away once the shell is in use.

              Collapsed to zero height rather than unmounted, deliberately:
              the identity line is this page's h1, and removing it would take
              the document's only heading with it the moment anyone typed a
              command — leaving assistive tech and crawlers with a page that
              has no name. Height and opacity animate; the text stays in the
              DOM and stays exposed.

              Clearing the session brings it back, which is the natural way
              back to a resting screen. */}
          <motion.div
            initial={false}
            animate={{
              height: compact ? 0 : 'auto',
              opacity: compact ? 0 : 1,
            }}
            transition={{ duration: prefersReduced ? 0 : 0.4, ease: EASE }}
            className="space-y-1.5 overflow-hidden"
          >
            {motd.map((line, i) =>
              line.tone === 'identity' ? (
                <motion.h1
                  key={line.text}
                  {...reveal(0.15 + i * 0.06)}
                  className={`text-[13px] md:text-[15px] font-normal ${MOTD_TONE_CLASS[line.tone]}`}
                >
                  {line.text}
                </motion.h1>
              ) : (
                <motion.p
                  key={line.text}
                  {...reveal(0.15 + i * 0.06)}
                  className={MOTD_TONE_CLASS[line.tone]}
                >
                  {line.text}
                </motion.p>
              )
            )}
          </motion.div>

          {hasOutput && (
            <div
              className={`border-l border-primary/20 pl-4 leading-[1.75] ${compact ? '' : 'mt-5'}`}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-label="Terminal output"
            >
              {sessionLog.map((line) => (
                <div key={line.id} className="w-full min-w-0" data-line-type={line.type}>
                  {line.type === 'cmd' ? (
                    <span className="text-foreground font-medium whitespace-pre-wrap break-all">
                      <span className="text-primary/50">{PROMPT} </span>
                      {line.content}
                    </span>
                  ) : (
                    <div className="text-muted-foreground whitespace-pre-wrap break-words mb-1">
                      {line.content}
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  clearSession();
                  focusInput();
                }}
                className="mt-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground/30 hover:text-primary transition-colors"
              >
                clear ⌃L
              </button>
            </div>
          )}

          {aiMode && (
            <div className={compact ? '' : 'mt-5'}>
              {ai.turns.length === 0 && !ai.busy && (
                <div className="text-muted-foreground/50">
                  ask anything about his work. answers are grounded in this site's own data —
                  every figure comes from the query engine, and you can open the evidence
                  behind it.
                </div>
              )}
              <AiTranscript turns={ai.turns} busy={ai.busy} />
            </div>
          )}
        </div>

        {/* ── The prompt ── */}
        <motion.div {...reveal(0.45)} className="relative shrink-0">
          {/* Corner brackets — the box reads as an instrument, not a form
              field, and they brighten with focus. */}
          {(['top-0 left-0 border-t border-l', 'top-0 right-0 border-t border-r', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'] as const).map(
            (pos) => (
              <span
                key={pos}
                aria-hidden="true"
                className={`absolute w-2.5 h-2.5 z-10 transition-colors duration-300 ${pos} ${
                  inputFocused ? 'border-primary' : 'border-primary/40'
                }`}
              />
            )
          )}

          <form
            onSubmit={handleSubmit}
            onClick={() => focusInput()}
            className={`flex items-center gap-2.5 border px-5 md:px-6 py-4 md:py-5 bg-background/30 backdrop-blur-sm transition-colors duration-300 cursor-text ${
              aiMode
                ? 'ai-border border-transparent'
                : inputFocused
                  ? 'border-primary/60'
                  : 'border-border'
            }`}
            style={inputFocused && !aiMode ? { boxShadow: 'var(--shadow-glow)' } : undefined}
          >
            {running ? (
              /* Tappable as well as Ctrl+C — a phone has no Ctrl key, so a
                 keyboard-only cancel would strand a streaming command. */
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cancelRunning();
                }}
                className="flex items-center gap-2 min-w-0 text-left group font-mono text-[14px] w-full"
                aria-label={`Cancel ${running.name}`}
              >
                <span className="w-1.5 h-1.5 bg-primary status-live shrink-0" aria-hidden="true" />
                <span className="text-primary shrink-0">{running.name}</span>
                <span className="text-muted-foreground/50 truncate group-hover:text-primary transition-colors">
                  running — tap or ^C to cancel
                </span>
              </button>
            ) : (
              <>
                <span
                  className="font-mono text-[14px] text-primary shrink-0 select-none flex items-center gap-1.5"
                  aria-hidden="true"
                >
                  {aiMode ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      ask
                      <span className="text-muted-foreground/40">?</span>
                    </>
                  ) : (
                    PROMPT
                  )}
                </span>

                <div className="relative flex-1 min-w-0 flex items-center">
                  {/* Off-screen ruler for the monospace advance width. */}
                  <span
                    ref={rulerRef}
                    aria-hidden="true"
                    className="pointer-events-none absolute -left-[9999px] top-0 font-mono text-[14px] whitespace-pre"
                  >
                    0000000000
                  </span>

                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handlePromptKeyDown}
                    onKeyUp={syncCaret}
                    onClick={syncCaret}
                    onSelect={syncCaret}
                    onFocus={() => {
                      setInputFocused(true);
                      syncCaret();
                    }}
                    onBlur={() => setInputFocused(false)}
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    readOnly={autoTyping}
                    placeholder={aiMode ? 'ask anything about his work…' : undefined}
                    aria-label={
                      aiMode
                        ? "Ask a question about Emmanuel's work"
                        : 'Terminal command input. Type help for available commands.'
                    }
                    aria-autocomplete="inline"
                    aria-busy={running !== null}
                    /* caret-transparent hides only the painted hairline — the
                       block below stands in for it. The global focus-visible
                       ring is suppressed too: on a bare inline input it draws
                       a heavy box, and here the lit border is the indicator. */
                    className="relative z-10 w-full bg-transparent border-none outline-none focus:outline-none focus-visible:outline-none text-foreground font-mono text-[14px] p-0 caret-transparent"
                  />

                  {/* The block. Solid and blinking while focused; hollow and
                      still when not, which is how a terminal shows that the
                      window no longer has the keyboard. */}
                  {charWidth > 0 && !running && (
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute top-1/2 -translate-y-1/2 z-20 w-[8px] h-[17px] ${
                        inputFocused
                          ? `bg-primary ${autoTyping ? '' : 'terminal-caret'}`
                          : 'border border-primary/50'
                      }`}
                      style={{ left: `${caret * charWidth}px` }}
                    />
                  )}

                  {ghost && !autoTyping && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 z-0 font-mono text-[14px] whitespace-pre text-muted-foreground/25 flex items-center"
                    >
                      <span className="invisible">{inputValue}</span>
                      {ghost}
                    </span>
                  )}
                </div>

                {unlocked && (
                  <span
                    className="font-mono text-[10px] text-primary/70 shrink-0 hidden sm:inline"
                    title="Query layer unlocked"
                  >
                    Ω
                  </span>
                )}
              </>
            )}
          </form>
        </motion.div>

        {/* ── Hint ── */}
        <motion.p
          {...reveal(0.55)}
          className={`font-mono text-[11px] md:text-[12px] text-muted-foreground/45 shrink-0 ${compact ? 'mt-2.5' : 'mt-4'}`}
        >
          {aiMode ? (
            <>
              <span className="text-primary/70">esc</span> to leave · answers are generated and
              cite the data behind them
            </>
          ) : (
            <>
              type <span className="text-primary/70">'help'</span> for more information
            </>
          )}
        </motion.p>

        {/* ── Chips ──
            In AI mode these become starter questions instead of commands, so
            the empty prompt is never a blank stare. */}
        <motion.div {...reveal(0.65)} className={`flex flex-wrap items-center gap-x-1 gap-y-2 shrink-0 ${compact ? 'mt-4' : 'mt-8'}`}>
          {aiMode
            ? AI_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setInput('');
                    void ai.send(suggestion);
                  }}
                  disabled={ai.busy}
                  className="font-mono text-[11px] border border-border px-2.5 py-1 text-muted-foreground/70 hover:border-primary/60 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {suggestion}
                </button>
              ))
            : CHIPS.map((chip, i) => (
                <React.Fragment key={chip}>
                  {i > 0 && (
                    <span
                      className="text-muted-foreground/20 font-mono text-[11px] px-1.5"
                      aria-hidden="true"
                    >
                      ·
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => (chip === 'ai' ? enterAi() : runChip(chip))}
                    disabled={autoTyping || running !== null}
                    className={`font-mono text-[11px] md:text-[12px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed underline-offset-4 hover:underline decoration-primary/40 ${
                      chip === 'ai'
                        ? 'text-primary/80 hover:text-primary'
                        : 'text-muted-foreground/60 hover:text-primary'
                    }`}
                  >
                    {chip === 'ai' ? 'ask ai' : chip}
                  </button>
                </React.Fragment>
              ))}
        </motion.div>
      </div>

      {/* ── Status rail — pinned to the bottom edge, tmux-style ── */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        className="shrink-0 border-t border-border/60 px-1 pt-2 pb-1"
      >
        <StatusRail active={live} />
      </motion.div>
    </div>
  );
}
