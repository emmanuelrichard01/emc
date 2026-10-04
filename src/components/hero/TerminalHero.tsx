import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

import { MAX_QUESTION_CHARS as AI_MAX_QUESTION_CHARS } from '@/lib/aiHistory';
import { useTerminalSession } from './useTerminalSession';
import { useAsk } from '@/components/ai/AskProvider';
import AiTranscript, { AI_SUGGESTIONS } from './AiTranscript';
import SuggestionMarquee from '@/components/ai/SuggestionMarquee';
import { looksLikeQuestion } from '@/lib/fuzzy';
import { emitCircuitSignal } from '@/lib/circuitBus';

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
/** The session, named once in the caption strip. */
const SESSION = 'em@builtbyem';
/** The line itself carries only the shell's own glyph. */
const LINE_PROMPT = '~ $';

/* Shell or Ask: the prompt takes both, and this says so out loud.
   It used to be discoverable only by typing a question and noticing the
   hint change; now the two modes are named on the instrument, and the
   underline slides to whichever is live. Each side is the same action the
   keyboard already has (`ai` / Esc), so nothing new is learned. */
function ModeSwitch({
  ai,
  disabled,
  onShell,
  onAsk,
  reduced,
}: {
  ai: boolean;
  disabled: boolean;
  onShell: () => void;
  onAsk: () => void;
  reduced: boolean;
}) {
  const options = [
    { id: 'shell', label: 'Shell', active: !ai, onPick: onShell },
    { id: 'ask', label: 'Ask', active: ai, onPick: onAsk },
  ] as const;
  return (
    <div role="group" aria-label="Prompt mode" className="flex items-center">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={option.active}
          disabled={disabled || option.active}
          onClick={(e) => {
            e.stopPropagation();
            option.onPick();
          }}
          className={`tap relative flex items-center gap-1.5 h-10 px-3 text-[12px] transition-colors disabled:cursor-default ${
            option.active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {option.id === 'ask' && <Sparkles className={`w-3 h-3 ${option.active ? 'text-primary' : ''}`} aria-hidden="true" />}
          {option.label}
          {option.active && (
            <motion.span
              layoutId="hero-mode"
              className="absolute left-3 right-3 -bottom-px h-px bg-primary"
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
              aria-hidden="true"
            />
          )}
        </button>
      ))}
    </div>
  );
}

/* One token for every element on the prompt line.

   The prompt, the off-screen ruler, the input, the ghost completion and the
   cancel row all have to render at the same size or the measured cell width
   stops matching the text it positions the block caret over. They were five
   separate `text-[14px]` literals, which is a drift waiting to happen — and
   it mattered the moment mobile needed a different size.

   16px below `md` is not a style choice: iOS Safari zooms the page whenever a
   focused input is under 16px, so tapping the prompt — the hero's whole
   invitation — shoved the layout sideways on first touch. */
const TERMINAL_TEXT = 'text-base md:text-[17px]';

/* The actions under the prompt, and the page's two doors. Each runs the
   shell command of the same name rather than bypassing it, so pressing one
   is the same as typing it. "Download CV" is the door for hiring teams and
   "Get in touch" the door for anyone with a project, with equal weight. */
const CHIPS = [
  { chip: 'ai', label: 'Ask the assistant' },
  { chip: 'work', label: 'See the work' },
  { chip: 'resume', label: 'Download CV' },
  { chip: 'contact', label: 'Get in touch' },
] as const;

/* Typed into the empty prompt, one after another, so it is never a blank
   stare. Questions and commands alternate on purpose: the prompt takes both,
   and this is how a visitor finds that out without being told. */
const EXAMPLES = [
  'what has he actually shipped?',
  'work',
  'how does the reconciliation engine work?',
  'resume',
  'what trade-offs did he make, and why?',
  'ls',
] as const;

/* A phone's prompt line holds about 22 characters at 16px mono (the size
   iOS needs to not zoom). The long examples were cut mid-word there, so
   narrow screens get their own, each a complete thought at that width. */
const SHORT_EXAMPLES = ['what has he shipped?', 'work', 'how does mmr work?', 'resume', 'ls'] as const;

function narrowScreen() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;
}

/* The empty prompt types its examples out, holds them, and erases them.
   Driven by one timeout chain; stops entirely while anything is typed. */
function useTypedExample(active: boolean, reduced: boolean): string {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!active || reduced) return;
    let example = 0;
    let index = 0;
    let erasing = false;
    let timer: ReturnType<typeof setTimeout>;
    const list: readonly string[] = narrowScreen() ? SHORT_EXAMPLES : EXAMPLES;
    const tick = () => {
      const current = list[example];
      if (!erasing) {
        index += 1;
        setText(current.slice(0, index));
        if (index >= current.length) {
          erasing = true;
          timer = setTimeout(tick, 2200);
          return;
        }
        timer = setTimeout(tick, 55 + Math.random() * 45);
        return;
      }
      index -= 2;
      setText(current.slice(0, Math.max(0, index)));
      if (index <= 0) {
        erasing = false;
        index = 0;
        example = (example + 1) % list.length;
        timer = setTimeout(tick, 600);
        return;
      }
      timer = setTimeout(tick, 22);
    };
    timer = setTimeout(tick, 1400);
    return () => clearTimeout(timer);
  }, [active, reduced]);
  return reduced ? (narrowScreen() ? 'ask, or type help' : 'ask a question, or type help') : text;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/* ── Hero ───────────────────────────────────────────────────────────────── */

interface TerminalHeroProps {
  /** False while the boot overlay is still up. Gates focus and telemetry only. */
  live: boolean;
}

export default function TerminalHero({ live }: TerminalHeroProps) {
  const prefersReduced = useReducedMotion();

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

  /* ── AI mode ─────────────────────────────────────────────────────────────
     A distinct mode rather than a replacement for the shell. Commands stay
     commands: `ls` still lists, `sql` still queries, and "command not found"
     still suggests a correction. Routing unrecognised input to a model would
     have removed all of that and turned every typo into a billed call.

     Declared here rather than beside the handlers that use it because the
     scrollback effect below reads `ai.turns` in its dependency array — and a
     dependency array is evaluated during render, so a `const ai` further down
     the body would still be in the temporal dead zone and throw. */
  /* The shared session (AskProvider): a question asked here is still there
     when the dock opens further down the page, or on a case study. */
  const ai = useAsk().session;
  const [aiMode, setAiMode] = useState(false);

  /* The empty prompt types its examples while nothing else is happening. */
  const example = useTypedExample(live && !aiMode && inputValue === '' && !running, Boolean(prefersReduced));
  const typedQuestion = !aiMode && looksLikeQuestion(inputValue);

  /* The background listens. An answer in progress spins the disk up, the
     same way a running command does (useTerminalSession emits that one). */
  useEffect(() => {
    emitCircuitSignal({ type: 'load', value: ai.busy ? 1 : 0 });
  }, [ai.busy]);

  /* Where the visitor is standing in their own question history. */
  const [askedHistoryIndex, setAskedHistoryIndex] = useState<number | null>(null);
  const askedQuestions = useMemo(
    () => ai.turns.filter((turn) => turn.role === 'user').map((turn) => turn.text),
    [ai.turns]
  );

  /* ── Block caret ─────────────────────────────────────────────────────────
     A terminal's cursor is a filled cell, not the hairline the browser draws.
     Rendering a real block means knowing where it goes, and the font here is
     monospace — so one measured character width times the caret index is the
     exact offset, with no per-keystroke text measurement.

     The native caret is hidden rather than removed: the input still holds
     focus, selection and IME behaviour, and only its painted caret is
     replaced. */
  const rulerRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [charWidth, setCharWidth] = useState(0);
  const [caretIndex, setCaretIndex] = useState(0);

  /* How far the input has scrolled itself.
     Once the value is longer than the field, the browser scrolls the input to
     keep the real caret in view — so `index * charWidth` stops describing a
     position on screen and starts describing a position in the *string*. See
     the block below for what that looked like. */
  const [scrollLeft, setScrollLeft] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    const measure = () => {
      const el = rulerRef.current;
      if (!el) return;
      // A ten-character sample, so sub-pixel advance width does not compound
      // into a visible drift by the end of a long command.
      setCharWidth(el.getBoundingClientRect().width / 10);
      const track = trackRef.current;
      if (track) setTrackWidth(track.getBoundingClientRect().width);
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
    if (!el) return;
    setCaretIndex(el.selectionStart ?? el.value.length);
    setScrollLeft(el.scrollLeft);
  }, [inputRef]);

  /* The input's own scroll is the authoritative correction.

     Reading it in the key and pointer handlers is not enough on its own: the
     browser adjusts scrollLeft as part of laying the field out, which can
     land after the event that caused it. `scroll` fires exactly when that
     adjustment happens, so it catches the cases the others miss — held
     backspace, IME commits, autofill, and momentum-scrolling the field with
     a finger, which is a gesture that exists only on touch. */
  const syncScroll = useCallback(() => {
    const el = inputRef.current;
    if (el) setScrollLeft(el.scrollLeft);
  }, [inputRef]);

  /* Clamped to the current value rather than tracked independently.

     Submitting clears the input through the session hook, which does not go
     via setInput — so the stored index survived the clear and the block sat
     two cells right of an empty prompt. Deriving it costs nothing and cannot
     drift, where an effect syncing the two would be the cascading-render
     pattern React's rules flag. */
  const caret = Math.min(caretIndex, inputValue.length);

  /* Where the block actually goes, in the field's visible coordinates.

     Clamped out of existence rather than pinned to an edge when it falls
     outside the window. A block parked against the left rule while the caret
     is really 40 characters away is a lie about where typing will land; drawn
     nowhere, the field simply reads as scrolled, which is what it is. In
     normal use this never triggers — the browser keeps the caret in view —
     so it only catches the edge cases, chiefly a blurred field whose scroll
     has been reset under a stale index. */
  const rawCaretLeft = caret * charWidth - scrollLeft;

  /* Held one cell inside the right edge.

     A field scrolled as far as it goes puts the caret exactly on the
     boundary — there is nowhere further to scroll — so a full cell drawn from
     there hangs a whole character outside the input, over the `exit` control
     at the narrowest width. Trimming the cell to fit was the first attempt
     and measured worse: at the end of a long line it left 0.6px of block,
     which is no cursor at all, and losing the cursor while typing is the
     complaint rather than the fix.

     So the block is pulled back instead, and sits over the last character
     rather than in the empty cell after it. Min() only bites at the boundary;
     everywhere else the caret already has its cell of room and this is a
     no-op. */
  const caretLeft = trackWidth > 0 ? Math.min(rawCaretLeft, trackWidth - charWidth) : rawCaretLeft;

  /* Drawn nowhere rather than pinned to an edge when the caret is genuinely
     off-screen to the left. A block parked against the left rule while the
     caret is 40 characters away is a lie about where typing will land; absent,
     the field simply reads as scrolled, which is what it is. In normal use
     this never fires — the browser keeps the caret in view — so it only
     catches the edge cases, chiefly a blurred field whose scroll has been
     reset under a stale index. */
  const caretVisible = trackWidth === 0 || (rawCaretLeft >= -1 && caretLeft >= -1);

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
     one-shot: running `queries` produces a list taller than the region, and
     bottom-anchoring scrolled straight past its heading and first entries, so
     the answer opened mid-list. Anchoring the command line to the top of the
     viewport shows a result from its beginning, which is what a reader wants
     and what they would get in a full-height terminal anyway. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (running || ai.busy || !stickToBottom.current) {
      if (stickToBottom.current) el.scrollTop = el.scrollHeight;
      return;
    }

    /* Both kinds of exchange, not just shell commands.

       This queried `[data-line-type="cmd"]` alone and ran on `[sessionLog,
       running]` — neither of which changes when an AI turn arrives. So the
       transcript never scrolled itself at all: ask a second question and the
       answer landed below the fold with nothing indicating it had. The AI
       question rows now carry `data-anchor` and the deps include the turn
       count, so an answer opens at its own first line the way a command's
       output does. */
    const anchors = el.querySelectorAll<HTMLElement>('[data-line-type="cmd"], [data-anchor]');
    const latest = anchors[anchors.length - 1];
    if (!latest) {
      el.scrollTop = el.scrollHeight;
      return;
    }

    // offsetTop is relative to the nearest positioned ancestor, so measure
    // against the scroll container rather than trusting the layout tree.
    const delta = latest.getBoundingClientRect().top - el.getBoundingClientRect().top;
    el.scrollTop = Math.min(el.scrollTop + delta, el.scrollHeight - el.clientHeight);
  }, [sessionLog, running, ai.turns, ai.busy]);

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

  const enterAi = useCallback(() => {
    setAiMode(true);
    setInput('');
    focusInput();
  }, [focusInput, setInput]);

  const exitAi = useCallback(() => {
    setAiMode(false);
    ai.cancel();
    setInput('');
    setAskedHistoryIndex(null);
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
        /* A question typed at the shell goes to the assistant.

           "command not found: how" is the correct answer from a shell and
           the wrong one from a portfolio: the visitor who types a question
           into the only box on the screen has told us exactly what they
           want. Commands never read as questions (none starts with a
           question word and runs to three words), so nothing a command
           user types is taken from them. */
        const question = inputValue.trim();
        if (looksLikeQuestion(question)) {
          if (question.length > AI_MAX_QUESTION_CHARS) {
            ai.reject(`That question is ${question.length} characters long. Please keep it under ${AI_MAX_QUESTION_CHARS}.`);
            return;
          }
          setAiMode(true);
          setInput('');
          emitCircuitSignal({ type: 'burst', strength: 0.8 });
          void ai.send(question);
          return;
        }
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
          `That question is ${question.length} characters long. Please keep it under ${AI_MAX_QUESTION_CHARS}.`
        );
        return;
      }
      setInput('');
      // Back to the live prompt, as a shell does the moment you run something
      // — otherwise the next up-arrow resumes from wherever the last recall
      // left off rather than from the question just asked.
      setAskedHistoryIndex(null);
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
      // In AI mode the shell's completion bindings do not apply; Escape
      // leaves, Ctrl+C cancels an in-flight question.
      if (e.key === 'Escape') {
        e.preventDefault();
        exitAi();
        return;
      }
      if (e.key === 'c' && e.ctrlKey) {
        e.preventDefault();
        ai.cancel();
        return;
      }

      /* History does apply, though — it just has to be this mode's own.

         Up-arrow recalls the last command everywhere else on this prompt, and
         in AI mode it did nothing at all, which is the sort of small
         inconsistency that makes a terminal feel like a costume. The list is
         derived from the transcript rather than tracked separately, so it
         cannot fall out of step with what is on screen.

         Rephrasing is the common case here in a way it isn't for `ls`: a
         question that got a vague answer is usually asked again with two
         words changed, and retyping the other eight is the whole friction. */
      // `null` is the live prompt, one step below the newest entry — the
      // position a shell returns you to when you arrow back down past the end.
      if (e.key === 'ArrowUp') {
        if (!askedQuestions.length) return;
        e.preventDefault();
        const target =
          askedHistoryIndex === null
            ? askedQuestions.length - 1
            : Math.max(askedHistoryIndex - 1, 0);
        setAskedHistoryIndex(target);
        setInput(askedQuestions[target]);
        return;
      }

      if (e.key === 'ArrowDown') {
        if (askedHistoryIndex === null) return;
        e.preventDefault();
        const target = askedHistoryIndex + 1;
        if (target >= askedQuestions.length) {
          setAskedHistoryIndex(null);
          setInput('');
          return;
        }
        setAskedHistoryIndex(target);
        setInput(askedQuestions[target]);
      }
    },
    [ai, aiMode, askedHistoryIndex, askedQuestions, exitAi, handleKeyDown, setInput]
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
  const compact = hasOutput || (aiMode && (ai.turns.length > 0 || ai.busy));

  /* The resting hint teaches the prompt; once the visitor has used it —
     a command run, or the AI opened — it has done its job and steps aside
     for the rest of the visit, even after `clear`. Held as state set during
     render rather than in an effect: it only ever flips one way. */
  const [taught, setTaught] = useState(false);
  if (compact && !taught) setTaught(true);

  // Output on screen: the black hole steps back so the text wins.
  useEffect(() => {
    emitCircuitSignal({ type: 'recede', value: compact ? 1 : 0 });
  }, [compact]);

  return (
    /* The rail is a flex sibling, not absolutely positioned.
       It used to be pinned with `absolute bottom-0` inside this container —
       which is fine at rest and wrong the moment a command produces output:
       the container grows past the viewport and takes the rail, and the
       socials with it, off the bottom of the screen. As a sibling it cannot
       be pushed anywhere; the scrollback above absorbs the growth instead. */
    <div className="relative flex-1 flex flex-col min-h-0">
      {/* Centred at rest — the one thing in the middle of the screen; in
          use, the column fills it for output. */}
      {/* Wide enough for the one-line title; the terminal, its output and
          the Ask suggestions keep the narrower measure inside it. */}
      <div className="w-full max-w-4xl mx-auto px-1 flex-1 flex flex-col justify-center min-h-0 py-2">
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
            compact
              ? 'flex-1 mb-5 pt-6 [mask-image:linear-gradient(to_bottom,transparent,#000_2.75rem)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_2.75rem)]'
              : 'shrink-0 mb-7 md:mb-9'
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
            className="overflow-hidden text-center font-sans"
          >
            {/* A masthead: the name on its own line in the display face (the
                page's h1), then one quieter dateline that says what he does,
                where he is, and whether he is free. The time zone sits inside
                the place, so it is one fact rather than two, and availability
                ends the line in ink behind its live square, because it is the
                one item a visitor acts on. On a phone the dateline breaks on
                purpose: the title, the place, then availability. */}
            <motion.h1
              {...reveal(0.15)}
              className="font-display text-[2rem] sm:text-[2.25rem] lg:text-[2.5rem] font-[560] leading-[1.05] tracking-[-0.025em] text-foreground"
            >
              Emmanuel Moghalu
            </motion.h1>
            <motion.p
              {...reveal(0.24)}
              className="mt-3.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-[13px] md:text-[14px] text-muted-foreground"
            >
              <span className="basis-full md:basis-auto">Software &amp; Data Engineer</span>
              <span aria-hidden="true" className="hidden md:inline text-muted-ghost">·</span>
              <span>
                Abuja, Nigeria <span className="tabular-nums">(UTC+1)</span>
              </span>
              <span aria-hidden="true" className="hidden sm:inline text-muted-ghost">·</span>
              <span className="basis-full sm:basis-auto inline-flex items-center justify-center gap-2 text-foreground">
                <span className="w-1.5 h-1.5 bg-status-ok status-live" aria-hidden="true" />
                Open to new roles and projects
              </span>
            </motion.p>
          </motion.div>

          {hasOutput && (
            <div
              className={`w-full max-w-2xl mx-auto border-l border-primary/20 pl-4 leading-[1.75] ${compact ? '' : 'mt-5'}`}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-label="Terminal output"
            >
              {sessionLog.map((line) => (
                <div key={line.id} className="w-full min-w-0" data-line-type={line.type}>
                  {line.type === 'cmd' ? (
                    <span className="text-foreground font-medium whitespace-pre-wrap break-all">
                      <span className="text-primary/80">{PROMPT} </span>
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
                className="mt-3 inline-flex items-center gap-2 font-sans text-[12px] text-muted-quiet hover:text-foreground transition-colors"
              >
                Clear <kbd className="kbd">⌃L</kbd>
              </button>
            </div>
          )}

          {aiMode && (
            <div className={`w-full max-w-2xl mx-auto ${compact ? '' : 'mt-5'}`}>
              {/* Shorter and legible, where this was three lines at 50%
                  opacity — about 2.4:1 — restating both the placeholder above
                  it ("ask anything about his work") and the hint below it
                  ("answers are generated and cite the data behind them").
                  What is left is the one claim neither of those makes. */}
              {ai.turns.length === 0 && !ai.busy && (
                <div className="font-sans text-[14px] text-muted-foreground text-center [text-wrap:balance] max-w-[44ch] mx-auto">
                  Every number in an answer comes from this site&rsquo;s own data, and you can open the
                  evidence under it.
                </div>
              )}
              <AiTranscript
                turns={ai.turns}
                busy={ai.busy}
                onCancel={ai.cancel}
                onRetry={ai.retry}
                canRetry={ai.canRetry}
                onAsk={(question) => {
                  setInput('');
                  void ai.send(question);
                }}
              />
            </div>
          )}
        </div>

        {/* ── The prompt ──
            An instrument rather than a form field: a caption strip naming the
            session, its state and its mode; the line you type on; and a strip
            saying what the keys do. Hero measures this box (#hero-prompt) and
            draws the black hole's disk straight through it, so the prompt sits
            on the horizon's equator at every screen size. */}
        <motion.div {...reveal(0.45)} id="hero-prompt" className="relative shrink-0 w-full max-w-2xl mx-auto">
          <form
            onSubmit={handleSubmit}
            onClick={() => focusInput()}
            className={`relative flex flex-col border bg-background/85 transition-[border-color,box-shadow] duration-500 cursor-text ${
              aiMode
                ? `ai-border border-transparent ${ai.busy ? 'ai-border--busy' : ''}`
                : inputFocused
                  ? 'border-rule-strong shadow-[0_32px_90px_-34px_hsl(var(--primary)/0.45)]'
                  : 'border-border hover:border-rule-strong'
            }`}
          >
            {/* Caption strip */}
            <div className="flex items-center justify-between gap-4 pl-4 md:pl-5 pr-2 h-10 border-b border-border font-sans text-[12px]">
              <span className="flex items-center gap-2 min-w-0 text-muted-foreground">
                <span
                  className={`w-1.5 h-1.5 shrink-0 transition-colors duration-500 ${
                    running || ai.busy ? 'bg-primary status-live' : 'bg-status-ok'
                  }`}
                  aria-hidden="true"
                />
                <span className="font-mono text-[11.5px] text-foreground/85">{SESSION}</span>
                <span className="hidden sm:inline text-muted-ghost" aria-hidden="true">·</span>
                <span className="hidden sm:inline truncate" aria-live="polite">
                  {running ? `running ${running.name}` : ai.busy ? 'thinking' : aiMode ? 'talking to the assistant' : 'ready'}
                </span>
              </span>
              <ModeSwitch ai={aiMode} disabled={running !== null} onShell={exitAi} onAsk={enterAi} reduced={Boolean(prefersReduced)} />
            </div>

            {/* The line */}
            <div className="flex items-center gap-2.5 px-4 md:px-5 py-4 md:py-[18px]">
                {running ? (
                  /* Tappable as well as Ctrl+C — a phone has no Ctrl key, so a
                     keyboard-only cancel would strand a streaming command. */
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelRunning();
                    }}
                    className={`flex items-center gap-2 min-w-0 text-left group font-mono ${TERMINAL_TEXT} w-full`}
                    aria-label={`Cancel ${running.name}`}
                  >
                    <span className="w-1.5 h-1.5 bg-primary status-live shrink-0" aria-hidden="true" />
                    <span className="text-primary shrink-0">{running.name}</span>
                    <span className="text-muted-quiet truncate group-hover:text-primary transition-colors">
                      running, tap or press ^C to stop
                    </span>
                  </button>
                ) : (
                  <>
                    <span
                      className={`font-mono ${TERMINAL_TEXT} text-primary shrink-0 select-none flex items-center gap-1.5`}
                      aria-hidden="true"
                    >
                      {aiMode ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          ask
                          <span className="text-muted-quiet">?</span>
                        </>
                      ) : (
                        LINE_PROMPT
                      )}
                    </span>

                    <div ref={trackRef} className="relative flex-1 min-w-0 flex items-center">
                      {/* Off-screen ruler for the monospace advance width. */}
                      <span
                        ref={rulerRef}
                        aria-hidden="true"
                        className={`pointer-events-none absolute -left-[9999px] top-0 font-mono ${TERMINAL_TEXT} whitespace-pre`}
                      >
                        0000000000
                      </span>

                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => {
                          setInput(e.target.value);
                          // Each keystroke is a small flare in the disk behind.
                          emitCircuitSignal({ type: 'burst', strength: 0.12 });
                        }}
                        onKeyDown={handlePromptKeyDown}
                        onKeyUp={syncCaret}
                        onClick={syncCaret}
                        onSelect={syncCaret}
                        onScroll={syncScroll}
                        onFocus={() => {
                          setInputFocused(true);
                          syncCaret();
                        }}
                        onBlur={() => {
                          setInputFocused(false);
                          // Blurring can reset the field's scroll to 0 while the
                          // caret index stays where it was; without this the
                          // hollow block reappears far to the right of the text.
                          syncScroll();
                        }}
                        spellCheck={false}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        readOnly={autoTyping}
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
                        className={`relative z-10 w-full bg-transparent border-none outline-none focus:outline-none focus-visible:outline-none text-foreground font-mono ${TERMINAL_TEXT} p-0 caret-transparent`}
                      />

                      {/* The block. Solid and blinking while focused; hollow and
                          still when not, which is how a terminal shows that the
                          window no longer has the keyboard.

                          Offset by the field's own scroll, which is the whole
                          difference between a caret and a runaway. `caret *
                          charWidth` is a distance into the *string*; the field
                          only shows a window onto that string, and once the value
                          outgrows the box the browser slides the window along.
                          Without the subtraction the block kept walking right —
                          out of the prompt, over the `exit` control, and off the
                          edge of the screen — while the text it was supposed to
                          be sitting on scrolled the other way underneath it.

                          Worst on a phone by construction: the field is at its
                          narrowest and the type at its largest (16px, to stop iOS
                          zooming), so a value overflows after far fewer
                          characters than it does on a desktop. */}
                      {charWidth > 0 && !running && caretVisible && (
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 z-20 h-[1.2em] ${
                            inputFocused
                              ? `bg-primary ${autoTyping ? '' : 'terminal-caret'}`
                              : 'border border-primary/50'
                          }`}
                          /* One cell wide, measured rather than assumed. The
                             hardcoded 8px matched 14px text only, so it no longer
                             covered a character once mobile rendered at 16px. */
                          style={{ left: `${caretLeft}px`, width: `${charWidth}px` }}
                        />
                      )}

                      {ghost && !autoTyping && (
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute inset-0 z-0 font-mono ${TERMINAL_TEXT} whitespace-pre text-muted-ghost flex items-center`}
                          /* Same correction as the block: the completion is drawn
                             after an invisible copy of the value, so it has to
                             travel with the text it is completing. */
                          style={{ transform: `translateX(${-scrollLeft}px)` }}
                        >
                          <span className="invisible">{inputValue}</span>
                          {ghost}
                        </span>
                      )}

                      {/* The typed example — offset past the block caret so the
                          caret never sits on its first letter. */}
                      {!aiMode && inputValue === '' && !running && example && charWidth > 0 && (
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute inset-y-0 z-0 font-mono ${TERMINAL_TEXT} whitespace-pre text-muted-ghost flex items-center truncate`}
                          style={{ left: charWidth * 1.6, right: 0 }}
                        >
                          {example}
                        </span>
                      )}

                      {/* Ask mode's placeholder, drawn the same way and for the
                          same reason: a native placeholder starts at the
                          caret, so the block sat on its first letter. */}
                      {aiMode && inputValue === '' && !running && charWidth > 0 && (
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute inset-y-0 z-0 font-mono ${TERMINAL_TEXT} whitespace-pre text-muted-ghost flex items-center truncate`}
                          style={{ left: charWidth * 1.6, right: 0 }}
                        >
                          ask about his work…
                        </span>
                      )}
                    </div>

                    {/* The way out, as a control rather than a keybinding.

                        AI mode advertised "esc to leave" at every width, and a
                        phone has no Escape key — so the only exit on touch was
                        typing `exit`, which nothing on screen mentioned. Same
                        reasoning as the cancel row above: a keyboard-only verb
                        strands the devices that cannot press it.

                        Labelled `exit` rather than `esc` because that is also the
                        word the prompt accepts, so the button and the command
                        agree. py-2 -my-2 clears the 24px minimum without changing
                        the row's height. */}
                    {aiMode && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          exitAi();
                        }}
                        /* Full-strength, not the /60 the rail's other mono labels
                           use: at 11px that measured 2.65:1, and this is the one
                           control on the row a stuck visitor is looking for. */
                        className="shrink-0 -mr-2 px-2 py-2 -my-2 font-sans text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Leave the assistant and go back to the terminal"
                      >
                        Exit
                      </button>
                    )}

                    {unlocked && (
                      <span
                        className="font-mono text-[10px] text-primary/80 shrink-0 hidden sm:inline"
                        title="Query layer unlocked"
                      >
                        Ω
                      </span>
                    )}
                  </>
                )}
            </div>

            {/* Key strip: what Enter will do, said as it changes. */}
            <div className="flex items-center justify-between gap-4 px-4 md:px-5 min-h-10 py-2 border-t border-border font-sans text-[12px] text-muted-quiet">
              <span className="min-w-0">
                {typedQuestion ? (
                  <>Enter asks the assistant. Its answers show where each fact comes from.</>
                ) : aiMode ? (
                  <>Answers are written by AI and show their sources.</>
                ) : (
                  <span className={`transition-opacity duration-700 ${taught ? 'opacity-60' : ''}`}>
                    <span className="md:hidden">Ask anything, or tap an option below.</span>
                    <span className="hidden md:inline">
                      Ask in your own words, or type <span className="font-mono text-foreground">help</span>.
                    </span>
                  </span>
                )}
              </span>
              <span className="hidden md:flex items-center gap-3 shrink-0" aria-hidden="true">
                {aiMode ? (
                  <span className="flex items-center gap-1.5">
                    <kbd className="kbd">Esc</kbd> back
                  </span>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5">
                      <kbd className="kbd">Tab</kbd> complete
                    </span>
                    <span className="flex items-center gap-1.5">
                      <kbd className="kbd">↑</kbd> history
                    </span>
                  </>
                )}
                <span className="flex items-center gap-1.5">
                  <kbd className="kbd">↵</kbd> {aiMode || typedQuestion ? 'ask' : 'run'}
                </span>
              </span>
            </div>
          </form>
        </motion.div>

        {/* ── Chips ──
            In AI mode these become starter questions instead of commands, so
            the empty prompt is never a blank stare. */}
        {/* In AI mode the starters run as one slow ticker instead of a wall of
            chips — one row at any width, paused under the pointer. */}
        {aiMode && ai.turns.length === 0 && (
          <motion.div {...reveal(0.1)} className={`shrink-0 w-full max-w-2xl mx-auto ${compact ? 'mt-4' : 'mt-8'}`}>
            <SuggestionMarquee
              items={AI_SUGGESTIONS}
              disabled={ai.busy}
              onPick={(suggestion) => {
                setInput('');
                void ai.send(suggestion);
              }}
            />
          </motion.div>
        )}
        <motion.div {...reveal(0.65)} className={`flex flex-wrap items-center justify-center gap-x-2 md:gap-x-1 gap-y-2 shrink-0 ${aiMode ? 'hidden' : compact ? 'mt-4' : 'mt-7'}`}>
          {!aiMode &&
            CHIPS.map(({ chip, label }, i) => (
              <React.Fragment key={chip}>
                {i > 0 && (
                  <span className="hidden md:inline text-muted-ghost text-[13px] px-2.5" aria-hidden="true">
                    ·
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => (chip === 'ai' ? enterAi() : runChip(chip))}
                  disabled={autoTyping || running !== null}
                  /* Bordered tiles on a phone, where they are the main way in;
                     text with a drawn underline on a desktop, where the prompt is. */
                  className={`tap group font-sans text-[13px] md:text-[14px] border border-border hover:border-rule-strong md:border-0 px-3 md:px-0 py-1.5 md:py-2 md:-my-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    chip === 'ai' ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5 md:bg-[linear-gradient(currentColor,currentColor)] md:bg-no-repeat md:bg-[length:0%_1px] md:bg-[position:0_100%] md:pb-0.5 md:transition-[background-size] md:duration-500 md:ease-out-expo md:group-hover:bg-[length:100%_1px] md:group-focus-visible:bg-[length:100%_1px]">
                    {chip === 'ai' && (
                      <Sparkles className="w-3.5 h-3.5 transition-transform duration-500 ease-out-expo group-hover:rotate-12" aria-hidden="true" />
                    )}
                    {label}
                  </span>
                </button>
              </React.Fragment>
            ))}
        </motion.div>
      </div>

    </div>
  );
}
