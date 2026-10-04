import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

import { useAsk } from '@/components/ai/AskProvider';
import { comboboxProps, useTerminalSession } from '@/components/hero/useTerminalSession';
import ShellLog, { CompletionList } from './ShellLog';
import { OPEN_CONSOLE_EVENT, peekLinkCommand } from './sessionStore';

/* ==========================================================================
   DROP-DOWN CONSOLE

   The same shell as the hero, from any page: press the backtick key and it
   slides down from the top, the way a game console does. Same scrollback,
   history and working directory as the hero (sessionStore.ts), so a command
   started on the home page is still there on a case study.

   The key is ignored while typing in a field, in anything editable, or
   while a modal is open, so it never steals a character. Backtick again or
   Esc closes it, and focus goes back where it was. While open, focus stays
   inside it. Drag the bottom edge to resize. Under reduced motion it
   appears in place rather than sliding.

   Opened from elsewhere with `window.dispatchEvent(new Event('emc:open-console'))`
   (the ⌘K palette does this).
   ========================================================================== */

const MIN_HEIGHT = 0.3;
const MAX_HEIGHT = 0.85;
const DEFAULT_HEIGHT = 0.55;

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

export default function DropConsole({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const reduced = useReducedMotion();
  const { pathname } = useLocation();
  const { openAsk } = useAsk();

  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  const show = useCallback(() => {
    if (!document.activeElement || !panelRef.current?.contains(document.activeElement)) {
      returnFocus.current = document.activeElement as HTMLElement | null;
    }
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    const target = returnFocus.current;
    returnFocus.current = null;
    if (target && document.contains(target)) target.focus({ preventScroll: true });
  }, []);

  const session = useTerminalSession({
    enabled: open,
    idPrefix: 'console',
    onEnterAi: (question) => {
      close();
      openAsk(question ? { question } : undefined);
    },
    onNavigate: close,
  });
  const { inputRef, inputValue, setInputValue, ghost, running, menu, hint, entries, focusInput } = session;

  /* The backtick, from anywhere it is not someone's text. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '`' || e.ctrlKey || e.metaKey || e.altKey) return;
      const inside = panelRef.current?.contains(e.target as Node) ?? false;
      if (!inside) {
        if (isEditable(e.target)) return;
        const modal = [...document.querySelectorAll('[aria-modal="true"]')].some((m) => !panelRef.current?.contains(m));
        if (modal) return;
      }
      e.preventDefault();
      if (open) close();
      else show();
    };
    const onOpen = () => show();
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_CONSOLE_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_CONSOLE_EVENT, onOpen);
    };
  }, [close, open, show]);

  /* Loaded by the launcher on the first key press, palette pick or ?run=
     link, so it opens on arrival. A ?run= link that lands somewhere without
     the hero opens it too; on the home page the hero takes it. */
  useEffect(() => {
    if (defaultOpen || (pathname !== '/' && peekLinkCommand())) show();
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => focusInput());
  }, [focusInput, open]);

  // Newest output in view, as a console does.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, open]);

  /* Focus stays inside while open. Tab in the prompt is completion, so the
     trap only acts on the console's other controls. */
  const onPanelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || e.defaultPrevented) return;
    const items = [...(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && !session.escapeIsLocal) {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey && !inputValue && !ghost && !menu) {
      // Nothing to complete: let Tab leave the prompt for the console's buttons.
      return;
    }
    session.handleKeyDown(e);
  };

  /* Drag the bottom edge. */
  const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const move = (event: PointerEvent) => {
      const ratio = event.clientY / window.innerHeight;
      setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, ratio)));
    };
    const stop = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', stop);
      target.removeEventListener('pointercancel', stop);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', stop);
    target.addEventListener('pointercancel', stop);
  };

  const onResizeKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowUp') setHeight((h) => Math.max(MIN_HEIGHT, h - 0.05));
    else if (e.key === 'ArrowDown') setHeight((h) => Math.min(MAX_HEIGHT, h + 0.05));
    else return;
    e.preventDefault();
  };

  const status = running ? (running.name === '?' ? 'asking the helper' : `running ${running.name}`) : 'ready';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          key="drop-console"
          role="dialog"
          aria-modal="true"
          aria-label="Terminal"
          onKeyDown={onPanelKeyDown}
          initial={reduced ? { opacity: 1 } : { y: '-100%' }}
          animate={reduced ? { opacity: 1 } : { y: 0 }}
          exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { y: '-100%' }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{ height: `${Math.round(height * 100)}vh` }}
          className="fixed inset-x-0 top-0 z-[90] flex flex-col bg-background border-b border-rule-strong font-mono text-[12.5px] md:text-[13px] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]"
        >
          {/* Caption strip */}
          <div className="shrink-0 flex items-center justify-between gap-3 h-10 px-4 md:px-6 border-b border-border font-sans text-[12px] text-muted-foreground">
            <span className="flex items-center gap-2 min-w-0">
              <span className={`w-1.5 h-1.5 shrink-0 ${running ? 'bg-primary status-live' : 'bg-status-ok'}`} aria-hidden="true" />
              <span className="font-mono text-[11.5px] text-foreground/85 truncate">{session.prompt.replace(/\$$/, '')}</span>
              <span className="hidden sm:inline text-muted-ghost" aria-hidden="true">
                ·
              </span>
              <span className="hidden sm:inline truncate" aria-live="polite">
                {status}
              </span>
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <span className="hidden md:flex items-center gap-1.5 text-muted-quiet mr-2" aria-hidden="true">
                <kbd className="kbd">`</kbd> or <kbd className="kbd">Esc</kbd> closes
              </span>
              <button type="button" onClick={close} className="tap px-2 py-1 text-muted-foreground hover:text-foreground transition-colors">
                Close
              </button>
            </span>
          </div>

          {/* Scrollback */}
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-3 leading-[1.75]" data-lenis-prevent>
            {entries.length === 0 ? (
              <div className="text-muted-quiet font-sans text-[13px]">
                The same terminal as the home page. Type <span className="font-mono text-foreground">help</span>, or{' '}
                <span className="font-mono text-foreground">ls</span> to look around.
              </div>
            ) : (
              <ShellLog session={session} className="max-w-4xl" />
            )}
          </div>

          {/* Prompt */}
          <form
            className="relative shrink-0 border-t border-border"
            onSubmit={(e) => {
              e.preventDefault();
              session.submit(inputValue);
            }}
          >
            {menu && <CompletionList menu={menu} onPick={session.acceptCandidate} className="absolute left-3 right-3 md:left-5 md:right-auto md:min-w-[22rem] bottom-full mb-px z-10" />}
            <div className="flex items-center gap-2.5 px-4 md:px-6 py-2.5">
              {running ? (
                <button type="button" onClick={session.cancelRunning} className="tap flex items-center gap-2 text-left w-full group" aria-label={`Cancel ${running.name}`}>
                  <span className="w-1.5 h-1.5 bg-primary status-live shrink-0" aria-hidden="true" />
                  <span className="text-primary">{running.name}</span>
                  <span className="text-muted-quiet group-hover:text-primary transition-colors">running, tap or press ^C to stop</span>
                </button>
              ) : (
                <>
                  <span className="text-primary shrink-0 select-none max-w-[45%] truncate [direction:rtl] text-left" aria-hidden="true">
                    <bdi>{session.linePrompt}</bdi>
                  </span>
                  <div className="relative flex-1 min-w-0 flex items-center">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={onInputKeyDown}
                      onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
                      spellCheck={false}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      aria-label="Terminal command input. Type help for available commands."
                      {...comboboxProps(session)}
                      className="relative z-10 w-full bg-transparent border-none outline-none focus:outline-none focus-visible:outline-none text-foreground p-0 caret-primary text-base md:text-[13px]"
                    />
                    {ghost && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 z-0 whitespace-pre text-muted-ghost flex items-center text-base md:text-[13px]"
                        style={{ transform: `translateX(${-scrollLeft}px)` }}
                      >
                        <span className="invisible">{inputValue}</span>
                        {ghost}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="px-4 md:px-6 pb-2 -mt-1 min-h-[1.25rem] text-[11.5px] text-muted-quiet truncate" aria-live="polite">
              {hint ?? <span className="font-sans">Tab completes, ↑ recalls, Ctrl+R searches, ? &lt;words&gt; asks for a command.</span>}
            </div>
          </form>

          {/* Resize handle */}
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize the terminal"
            aria-valuemin={MIN_HEIGHT * 100}
            aria-valuemax={MAX_HEIGHT * 100}
            aria-valuenow={Math.round(height * 100)}
            tabIndex={0}
            onPointerDown={startResize}
            onKeyDown={onResizeKey}
            className="shrink-0 h-3 -mb-1.5 relative cursor-row-resize touch-none flex items-center justify-center group focus-visible:outline-none"
          >
            <span className="w-10 h-[3px] bg-rule-strong group-hover:bg-primary/60 group-focus-visible:bg-primary transition-colors" aria-hidden="true" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
