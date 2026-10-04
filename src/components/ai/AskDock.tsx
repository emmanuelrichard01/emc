import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUp, AtSign, Link2, Mic, MicOff, RotateCcw, Sparkles, Square, X } from 'lucide-react';
import { toast } from 'sonner';

import AiTranscript from '@/components/hero/AiTranscript';
import { MAX_QUESTION_CHARS } from '@/lib/aiHistory';
import { AUDIENCES, permalinkFor } from '@/lib/aiStarters';
import type { Audience } from '@/lib/aiStarters';
import { MODIFIER_KEY } from '@/lib/platform';
import { activeMention, insertMention, matchMentions, stillMentions, type Mention } from './answer/mentions';
import { settleSheet, snapHeight, stepSnap, type SheetSnap } from './answer/sheetSnap';
import type { DockMode } from './modes';
import { useAsk } from './AskProvider';
import { useSpeechInput } from './useSpeechInput';

const FitMode = lazy(() => import('./modes/FitMode'));
const BriefMode = lazy(() => import('./modes/BriefMode'));
const TourMode = lazy(() => import('./modes/TourMode'));

/* ==========================================================================
   ASK DOCK

   The assistant as a companion you keep open while you read.

     ≥1280px   docked: a column on the right, and the page reflows beside it
               (`data-ask-docked` on <html>) instead of being covered. No
               scroll lock, no focus trap; Esc closes it from anywhere.
     768–1279  the same column floating over the page's right edge, still
               non-modal: the page stays scrollable and clickable.
     phones    a bottom sheet with three heights: a peek (the page stays
               readable above it), half, and full. Dragged by its handle;
               only "full" locks the page underneath.

   Four modes share the frame: Ask (the conversation, owned here), Role fit,
   Project and Tour (components/ai/modes, mounted with ModeProps). Every
   answer is the same transcript the terminal renders, in its reading
   register: same citations, same checks, same evidence drawer.
   ========================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

/* How each answer style is named and explained here. The ids and the
   prompts behind them live in aiStarters; this is only the wording. */
const LENS_COPY: Record<Audience, { label: string; hint: string }> = {
  general: { label: 'Anyone', hint: 'Balanced answers for any reader' },
  hiring: { label: 'Hiring', hint: 'Focus on results and scope, in plain language' },
  engineer: { label: 'Engineers', hint: 'Focus on how it works, what can fail, and what was ruled out' },
};

const MODES: { id: DockMode; label: string }[] = [
  { id: 'ask', label: 'Ask' },
  { id: 'fit', label: 'Role fit' },
  { id: 'brief', label: 'Project' },
  { id: 'tour', label: 'Tour' },
];

/** Said verbatim under the starters: what happens to a question the site cannot answer. */
const INSIGHTS_NOTICE =
  'If the site can’t answer something, the question is saved without any personal details so Emmanuel can add what’s missing.';

type Layout = 'docked' | 'overlay' | 'sheet';

function useMatch(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

function useLayout(): Layout {
  const wide = useMatch('(min-width: 1280px)');
  const tablet = useMatch('(min-width: 768px)');
  return wide ? 'docked' : tablet ? 'overlay' : 'sheet';
}

function useViewportHeight(): number {
  const [height, setHeight] = useState(() => window.innerHeight);
  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return height;
}

export default function AskDock() {
  const { open, closeAsk, ask, mode, setMode, session, audience, setAudience, project, starters } = useAsk();
  const { turns, busy, cancel, retry, canRetry, reset } = session;
  const layout = useLayout();
  const sheet = layout === 'sheet';
  const prefersReduced = useReducedMotion();
  const viewport = useViewportHeight();
  const listId = useId();

  const [question, setQuestion] = useState('');
  const [scope, setScope] = useState<Mention | null>(null);
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [snap, setSnap] = useState<SheetSnap>('half');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const pendingCaret = useRef<number | null>(null);

  const matches = mention ? matchMentions(mention.query) : [];
  const listOpen = mode === 'ask' && matches.length > 0;

  /* ── Asking ─────────────────────────────────────────────────────────── */

  const send = useCallback(
    (text: string) => {
      if (!text.trim() || busy) return;
      setQuestion('');
      setMention(null);
      stickToBottom.current = true;
      ask(text, scope?.kind === 'project' ? { projectId: scope.id } : undefined);
      setScope(null);
      // An answer needs room: a sheet at its peek opens to half.
      setSnap((s) => (s === 'peek' ? 'half' : s));
    },
    [ask, busy, scope]
  );

  const askFromMode = useCallback(
    (text: string) => {
      setMode('ask');
      send(text);
    },
    [send, setMode]
  );

  const speech = useSpeechInput(
    useCallback((text: string) => setQuestion(text), []),
    useCallback((text: string) => send(text), [send])
  );

  /* ── Docked: the page makes room ──────────────────────────────────────
     The attribute is the whole mechanism; index.css narrows the page and
     the running head by the dock's width while it is set. */
  useEffect(() => {
    if (!open || layout !== 'docked') return;
    document.documentElement.setAttribute('data-ask-docked', '');
    return () => document.documentElement.removeAttribute('data-ask-docked');
  }, [open, layout]);

  /* ── Sheet height ─────────────────────────────────────────────────────
     Opens at half; asking from the peek raises it. The motion value is the
     sheet's height, so the composer stays at the bottom edge at every
     snap point instead of being pushed off screen. */
  const height = useMotionValue(snapHeight('half', viewport));
  useEffect(() => {
    if (!open) setSnap('half');
  }, [open]);
  useEffect(() => {
    if (!sheet) return;
    const target = snapHeight(snap, viewport);
    if (prefersReduced) {
      height.set(target);
      return;
    }
    const controls = animate(height, target, { type: 'spring', stiffness: 420, damping: 42 });
    return () => controls.stop();
  }, [snap, viewport, sheet, height, prefersReduced]);

  const drag = useRef<{ y: number; h: number; t: number; v: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const onHandleDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragged.current = false;
    drag.current = { y: e.clientY, h: height.get(), t: performance.now(), v: 0, moved: false };
  };
  const onHandleMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const now = performance.now();
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > 4) d.moved = true;
    const next = Math.max(64, Math.min(snapHeight('full', viewport), d.h - dy));
    const dt = Math.max(1, now - d.t);
    d.v = ((height.get() - next) / dt) * 1000;
    d.t = now;
    height.set(next);
  };
  const onHandleUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.moved) return;
    // The click that follows a drag is not a tap.
    dragged.current = true;
    const settled = settleSheet(height.get(), d.v, viewport);
    if (settled === 'close') closeAsk();
    else {
      setSnap(settled);
      // Same snap as before: the effect will not run, so settle it here.
      animate(height, snapHeight(settled, viewport), { type: 'spring', stiffness: 420, damping: 42 });
    }
  };
  const onHandleClick = () => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    setSnap((s) => (s === 'full' ? 'half' : stepSnap(s, 1)));
  };
  const onHandleKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      setSnap((s) => stepSnap(s, e.key === 'ArrowUp' ? 1 : -1));
    }
  };

  /* Only a full-height sheet is modal: at peek and half the page above it
     is still the thing being read. */
  const locked = open && sheet && snap === 'full';
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);

  /* ── Focus ─────────────────────────────────────────────────────────────
     Into the composer on open, beside a page only: on a phone, focusing a
     field raises the keyboard before the visitor has decided to type.
     Back to whatever opened the dock on close. */
  useEffect(() => {
    if (open) {
      restoreFocus.current = document.activeElement as HTMLElement | null;
      if (!sheet && mode === 'ask') {
        const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 60);
        return () => clearTimeout(t);
      }
      return;
    }
    const target = restoreFocus.current;
    restoreFocus.current = null;
    if (target && document.contains(target)) target.focus({ preventScroll: true });
    // Focus on open only, not on every mode change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sheet]);

  /* Esc from the page, too: the dock is non-modal, so focus is often out on
     the page while it is open. Skipped while the palette is up, and when the
     composer's mention list took the key first. */
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

  /* ── Scrollback ────────────────────────────────────────────────────────
     Follows the stream while the visitor is at the bottom, and lets go the
     moment they scroll up to reread. */
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [turns, busy, open, mode]);

  /* Grow with the question, up to a limit; and put the caret where an
     inserted mention or a recalled question left it. */
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
    if (pendingCaret.current !== null) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  }, [question]);

  /* Deleting "@MMR Engine" from the question drops its scope. */
  useEffect(() => {
    if (scope && !stillMentions(question, scope)) setScope(null);
  }, [question, scope]);

  const readMention = (text: string, caret: number) => {
    const next = activeMention(text, caret);
    setMention(next);
    if (next?.query !== mention?.query) setMentionIndex(0);
  };

  const pick = (m: Mention) => {
    const el = inputRef.current;
    if (!el || !mention) return;
    const result = insertMention(question, el.selectionStart ?? question.length, mention.start, m);
    pendingCaret.current = result.caret;
    setQuestion(result.text);
    setMention(null);
    if (m.kind === 'project') setScope(m);
    el.focus();
  };

  const lastQuestion = [...turns].reverse().find((turn) => turn.role === 'user')?.text;

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (listOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setMentionIndex((i) => (i + step + matches.length) % matches.length);
        return;
      }
      if ((e.key === 'Enter' && !e.metaKey && !e.ctrlKey) || e.key === 'Tab') {
        e.preventDefault();
        pick(matches[mentionIndex] ?? matches[0]);
        return;
      }
      if (e.key === 'Escape') {
        // Closes the list, not the dock.
        e.preventDefault();
        setMention(null);
        return;
      }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
      e.preventDefault();
      send(question);
      return;
    }
    // ↑ on an empty composer brings back the last question, as a shell does.
    if (e.key === 'ArrowUp' && !question && lastQuestion) {
      e.preventDefault();
      pendingCaret.current = lastQuestion.length;
      setQuestion(lastQuestion);
    }
  };

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
    send(question);
  };

  /* Tabs move with the arrow keys, as a tablist should. */
  const onTabsKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const i = MODES.findIndex((m) => m.id === mode);
    const next =
      e.key === 'Home' ? 0 : e.key === 'End' ? MODES.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + MODES.length) % MODES.length;
    setMode(MODES[next].id);
    document.getElementById(`ask-tab-${MODES[next].id}`)?.focus();
  };

  const remaining = MAX_QUESTION_CHARS - question.trim().length;
  // A sheet below full height keeps its header to the title and the tabs, to leave room for the answer.
  const roomy = !sheet || snap === 'full';

  const panelMotion = sheet
    ? {
        initial: prefersReduced ? { opacity: 0 } : { y: '100%' },
        animate: { y: 0, opacity: 1 },
        exit: prefersReduced ? { opacity: 0 } : { y: '100%' },
        transition: { type: 'spring' as const, stiffness: 380, damping: 40 },
      }
    : {
        initial: prefersReduced ? { opacity: 0 } : { opacity: 0, x: 24 },
        animate: { opacity: 1, x: 0 },
        exit: prefersReduced ? { opacity: 0 } : { opacity: 0, x: 16, transition: { duration: 0.18, ease: EASE } },
        transition: { duration: 0.36, ease: EASE },
      };

  const iconButton = 'tap w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors';

  return (
    <AnimatePresence>
      {open && (
        <>
          {locked && (
            <motion.div
              key="ask-backdrop"
              className="fixed inset-0 z-[94] bg-background/75"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSnap('half')}
              aria-hidden="true"
            />
          )}

          <motion.aside
            key="ask-dock"
            {...panelMotion}
            role="dialog"
            aria-modal={locked}
            aria-labelledby="ask-dock-title"
            style={sheet ? { height } : undefined}
            data-layout={layout}
            /* A reading pane: the stock one step lighter, a hairline at its
               inner edge, and a shadow because it floats (docked, it sits in
               the page's own plane: a hairline only). */
            className={`fixed z-[95] flex flex-col bg-popover ${
              sheet
                ? 'inset-x-0 bottom-0 shadow-[0_-1px_0_hsl(var(--border)),0_-24px_64px_-24px_rgba(0,0,0,0.85)]'
                : layout === 'docked'
                  ? 'top-0 bottom-0 right-0 w-[var(--ask-dock-w)] shadow-[-1px_0_0_hsl(var(--border))]'
                  : 'top-0 bottom-0 right-0 w-[min(460px,100vw)] shadow-[-1px_0_0_hsl(var(--border)),-32px_0_80px_-32px_rgba(0,0,0,0.85)]'
            }`}
          >
            {/* Live edge: a hairline of the accent along the top while an
                answer is being written, and nothing at rest. */}
            <div
              className={`absolute top-0 inset-x-0 h-px bg-primary origin-left transition-[opacity,transform] duration-700 ease-out-expo ${
                busy ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
              }`}
              aria-hidden="true"
            />

            {/* The handle: the only place a drag starts, so scrolling the
                transcript never moves the sheet. Tap or arrow keys step it. */}
            {sheet && (
              <button
                type="button"
                className="shrink-0 flex justify-center w-full pt-2.5 pb-1.5 touch-none cursor-grab active:cursor-grabbing"
                onPointerDown={onHandleDown}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                onPointerCancel={onHandleUp}
                onClick={onHandleClick}
                onKeyDown={onHandleKey}
                aria-label={`Panel height: ${snap === 'peek' ? 'small' : snap}. Tap to change, or use the arrow keys.`}
              >
                <span className="w-9 h-[3px] bg-rule-strong" aria-hidden="true" />
              </button>
            )}

            {/* ── Header ── */}
            <header className={`shrink-0 px-5 md:px-7 border-b border-border ${sheet ? 'pt-1' : 'pt-6'}`}>
              <div className="flex items-start gap-3">
                <div className="min-w-0">
                  <h2 id="ask-dock-title" className="t-subhead text-[18px] md:text-[20px] text-foreground flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    Ask about the work
                  </h2>
                  {mode === 'ask' && roomy && (
                    <p
                      className="mt-1 text-[12.5px] text-muted-foreground truncate"
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
                  )}
                </div>

                <div className="ml-auto -mr-2 -mt-1.5 flex items-center shrink-0">
                  {mode === 'ask' && lastQuestion && (
                    <button type="button" onClick={share} className={iconButton} aria-label="Copy a link that asks the last question" title="Copy a link that asks this question">
                      <Link2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                  {mode === 'ask' && turns.length > 0 && (
                    <button type="button" onClick={reset} className={iconButton} aria-label="Start a new conversation" title="New conversation">
                      <RotateCcw className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                  <button type="button" onClick={closeAsk} className={iconButton} aria-label="Close the assistant">
                    <X className="w-[18px] h-[18px]" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Modes. A tab row, hairline-underlined; the accent stays out of it. */}
              <div role="tablist" aria-label="What the assistant does" className="mt-3 -mb-px flex items-center gap-5 overflow-x-auto" onKeyDown={onTabsKey}>
                {MODES.map((m) => {
                  const selected = m.id === mode;
                  return (
                    <button
                      key={m.id}
                      id={`ask-tab-${m.id}`}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls="ask-dock-panel"
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setMode(m.id)}
                      className={`tap relative shrink-0 py-2.5 text-[13px] transition-colors ${
                        selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {m.label}
                      {selected && (
                        <motion.span
                          layoutId="ask-mode"
                          className="absolute left-0 right-0 bottom-0 h-px bg-foreground"
                          transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </header>

            <div id="ask-dock-panel" role="tabpanel" aria-labelledby={`ask-tab-${mode}`} className="flex-1 min-h-0 flex flex-col">
              {mode === 'ask' ? (
                <>
                  {/* Lens. Changes how answers are pitched, never what they may
                      claim; said in the hint so nobody reads it as a filter on
                      the truth. */}
                  {roomy && (
                    <div className="shrink-0 px-5 md:px-7 py-2 flex items-center gap-4 border-b border-border">
                      <span className="text-[12px] text-muted-quiet shrink-0">Written for</span>
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
                              className={`tap relative py-1 text-[12.5px] transition-colors ${
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
                  )}

                  {/* ── Conversation ── */}
                  <div
                    ref={scrollRef}
                    onScroll={onScroll}
                    className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 md:px-7 py-6"
                    data-lenis-prevent
                  >
                    {turns.length === 0 ? (
                      <EmptyState starters={starters} onAsk={send} onMode={setMode} busy={busy} projectTitle={project?.title} />
                    ) : (
                      <AiTranscript
                        turns={turns}
                        busy={busy}
                        onCancel={cancel}
                        onRetry={retry}
                        canRetry={canRetry}
                        onAsk={send}
                        suggestions={starters}
                        register="reading"
                      />
                    )}
                  </div>

                  {/* ── Composer ── */}
                  <form
                    onSubmit={onSubmit}
                    className="relative shrink-0 border-t border-border px-5 md:px-7 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))]"
                  >
                    {/* @ mentions: a list that floats over the conversation, above the field. */}
                    {listOpen && (
                      <ul
                        id={listId}
                        role="listbox"
                        aria-label="Projects and roles"
                        className="absolute left-5 right-5 md:left-7 md:right-7 bottom-full mb-1 z-[3] bg-popover py-1 shadow-[0_0_0_1px_hsl(var(--rule-strong)),0_16px_40px_-16px_rgba(0,0,0,0.8)]"
                      >
                        {matches.map((m, i) => (
                          <li
                            key={`${m.kind}:${m.id}`}
                            id={`${listId}-${i}`}
                            role="option"
                            aria-selected={i === mentionIndex}
                            onPointerDown={(e) => {
                              // Keep focus (and the caret) in the field.
                              e.preventDefault();
                              pick(m);
                            }}
                            onPointerEnter={() => setMentionIndex(i)}
                            className={`tap flex items-baseline gap-3 px-3 py-2 cursor-pointer ${i === mentionIndex ? 'bg-foreground/[0.06]' : ''}`}
                          >
                            <span className="text-[13.5px] text-foreground truncate">{m.label}</span>
                            <span className="text-[12px] text-muted-quiet truncate min-w-0 flex-1">{m.detail}</span>
                            <span className="text-[11px] text-muted-quiet shrink-0">{m.kind === 'project' ? 'Project' : 'Role'}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {scope && (
                      <div className="mb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
                        <span>About</span>
                        <span className="inline-flex items-center gap-1 pl-2 pr-0.5 text-foreground shadow-[inset_0_0_0_1px_hsl(var(--rule-strong))]">
                          {scope.label}
                          <button
                            type="button"
                            onClick={() => setScope(null)}
                            className="tap w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground"
                            aria-label={`Stop scoping this question to ${scope.label}`}
                          >
                            <X className="w-3 h-3" aria-hidden="true" />
                          </button>
                        </span>
                      </div>
                    )}

                    <div
                      className={`flex items-end gap-1.5 border pl-3.5 pr-1.5 py-1.5 transition-colors duration-300 ${
                        busy ? 'ai-border ai-border--busy border-transparent' : 'border-border hover:border-rule-strong focus-within:border-rule-strong'
                      }`}
                    >
                      <label htmlFor="ask-dock-input" className="sr-only">
                        Ask a question about Emmanuel&rsquo;s work. Type @ to name a project or role.
                      </label>
                      <textarea
                        id="ask-dock-input"
                        ref={inputRef}
                        rows={1}
                        value={question}
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={listOpen}
                        aria-controls={listOpen ? listId : undefined}
                        aria-activedescendant={listOpen ? `${listId}-${mentionIndex}` : undefined}
                        onChange={(e) => {
                          setQuestion(e.target.value);
                          readMention(e.target.value, e.target.selectionStart ?? e.target.value.length);
                        }}
                        onSelect={(e) => readMention(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)}
                        onBlur={() => setMention(null)}
                        onFocus={() => setSnap((s) => (s === 'peek' ? 'half' : s))}
                        onKeyDown={onKeyDown}
                        maxLength={MAX_QUESTION_CHARS + 50}
                        placeholder={
                          speech.listening ? 'Listening…' : project ? `Ask about ${project.title}…` : 'Ask anything about his work…'
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

                    <div className="mt-2 flex items-center justify-between gap-3 text-[12px] text-muted-quiet">
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
                            <kbd className="kbd">@</kbd> Name a project
                          </span>
                          <span className="flex items-center gap-1.5">
                            <kbd className="kbd">↑</kbd> Last question
                          </span>
                          <span className="flex items-center gap-1.5">
                            <kbd className="kbd">Esc</kbd> {busy ? 'Stop' : 'Close'}
                          </span>
                        </span>
                      )}
                      {remaining < 100 ? (
                        <span className={`ml-auto tabular-nums ${remaining < 60 ? 'text-status-warn' : ''}`}>{remaining} characters left</span>
                      ) : layout !== 'sheet' ? (
                        <span className="ml-auto hidden 2xl:inline">{MODIFIER_KEY}+J opens this anywhere</span>
                      ) : null}
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 min-h-0 flex flex-col pb-[env(safe-area-inset-bottom)]">
                  <Suspense fallback={<p className="px-5 md:px-7 py-6 text-[13px] text-muted-quiet">Loading…</p>}>
                    <div className="flex-1 min-h-0">
                      {mode === 'fit' ? (
                        <FitMode onClose={closeAsk} onAsk={askFromMode} />
                      ) : mode === 'brief' ? (
                        <BriefMode onClose={closeAsk} onAsk={askFromMode} />
                      ) : (
                        <TourMode onClose={closeAsk} onAsk={askFromMode} />
                      )}
                    </div>
                  </Suspense>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────
   Says what the assistant is bound by before offering to use it: the
   grounding is the feature, and a visitor deciding whether to trust an
   answer should know the rules before the first one arrives. Then what
   else it does, then where to start. */
function EmptyState({
  starters,
  onAsk,
  onMode,
  busy,
  projectTitle,
}: {
  starters: string[];
  onAsk: (question: string) => void;
  onMode: (mode: DockMode) => void;
  busy: boolean;
  projectTitle?: string;
}) {
  const modeLink = 'link-draw text-foreground hover:text-foreground';
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
        <span className="text-muted-foreground">Each one shows its sources, and anything it can&rsquo;t confirm is marked.</span>
      </p>

      <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
        It can also{' '}
        <button type="button" className={modeLink} onClick={() => onMode('fit')}>
          check a role against the work
        </button>
        ,{' '}
        <button type="button" className={modeLink} onClick={() => onMode('brief')}>
          draft a project brief
        </button>{' '}
        or{' '}
        <button type="button" className={modeLink} onClick={() => onMode('tour')}>
          give you a short tour
        </button>
        .
      </p>

      <p className="mt-7 mb-1 t-caption">Try one of these</p>
      <ul className="border-t border-border" aria-label="Suggested questions">
        {starters.map((starter, i) => (
          <li key={starter}>
            <button
              type="button"
              onClick={() => onAsk(starter)}
              disabled={busy}
              className="tap group w-full flex items-baseline gap-4 py-3 border-b border-border text-left text-[14px] leading-snug text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
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

      <p className="mt-5 flex items-start gap-2 text-[12.5px] text-muted-quiet leading-relaxed">
        <AtSign className="w-3.5 h-3.5 mt-[3px] shrink-0" aria-hidden="true" />
        Type @ to ask about one project from anywhere, or select a sentence on the page to ask about it.
      </p>
      <p className="mt-3 text-[12px] text-muted-quiet leading-relaxed">{INSIGHTS_NOTICE}</p>
    </div>
  );
}
