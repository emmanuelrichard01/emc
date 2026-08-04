import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Maximize2, Minimize2 } from 'lucide-react';

import { useTheme } from '@/components/ThemeProvider';
import { useEasterEgg } from '@/components/EasterEggProvider';
import { emitCircuitSignal } from '@/lib/circuitBus';
import { PROJECTS } from '@/data/projects';
import {
  ALIASES,
  ID_COMMANDS,
  UNLOCK_BANNER,
  useConsoleCommands,
  type CommandSpec,
} from './useConsoleCommands';
import { FPS_SAMPLES, formatUptime, useSystemTelemetry } from './useSystemTelemetry';

/* ==========================================================================
   OPS CONSOLE

   A scripted boot log that hands off to a real, typeable shell.

   Commands can be synchronous, asynchronous, or streaming. A streaming
   command owns the prompt while it runs, writes output as it happens, and
   stops on Ctrl+C through an AbortSignal — so `watch` and `ping` behave the
   way they would in a real terminal rather than blocking and then dumping.
   ========================================================================== */

type Severity = 'info' | 'success' | 'warn' | 'error' | 'cmd' | 'sys' | 'data';

interface ConsoleEntry {
  severity: Severity;
  text: string;
  hold: number;
}

const CONSOLE_SEQUENCE: ConsoleEntry[] = [
  { severity: 'sys', text: 'BOOT // portfolio.runtime — loading subsystems', hold: 160 },
  { severity: 'cmd', text: '$ systemctl status ingestion-worker', hold: 220 },
  { severity: 'success', text: '● active (running) — 3/3 replicas healthy', hold: 200 },
  { severity: 'cmd', text: '$ make pipeline.deploy ENV=prod', hold: 260 },
  { severity: 'info', text: 'compiling DAG — resolving 14 dependencies', hold: 200 },
  { severity: 'warn', text: '⚠ broker p99 142ms (threshold 150ms)', hold: 240 },
  { severity: 'success', text: '✓ deployed — all health checks passing', hold: 200 },
  { severity: 'cmd', text: '$ dbt run --select marts.core', hold: 240 },
  { severity: 'data', text: '{"models":18,"ok":18,"rows":2400000,"elapsed":"11.3s"}', hold: 220 },
  { severity: 'sys', text: 'HANDOFF // operator console ready', hold: 260 },
];

const TYPE_SPEED: Record<Severity, number> = {
  cmd: 16,
  data: 2,
  sys: 10,
  info: 5,
  success: 5,
  warn: 5,
  error: 5,
};

const SEVERITY_STYLES: Record<Severity, string> = {
  info: 'text-muted-foreground',
  success: 'text-emerald-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
  cmd: 'text-foreground font-medium',
  sys: 'text-primary/70 uppercase tracking-widest text-[10px]',
  data: 'text-blue-400/80',
};

const SEVERITY_PREFIX: Record<Severity, string> = {
  info: '',
  success: '',
  warn: '',
  error: '',
  cmd: '❯ ',
  sys: '# ',
  data: '',
};

const HISTORY_KEY = 'emc-terminal-history';
const HISTORY_LIMIT = 50;

/* A bare SQL statement typed at the prompt.

   Non-SELECT verbs are included on purpose: routing `DROP TABLE projects` to
   the query layer gets the engine's own "only SELECT is supported" reply,
   which is both more informative and more fun than "command not found: drop". */
const SQL_STATEMENT = /^\s*(select|insert|update|delete|drop|create|alter|truncate)\b/i;

/* ── JSON syntax highlighting for `data` lines ── */
function highlightJSON(text: string): React.ReactNode {
  if (!text.trim().startsWith('{')) return text;

  const tokenRegex =
    /(?<key>"(?:\\.|[^"\\])*")(?=\s*:)|(?<string>"(?:\\.|[^"\\])*")|(?<number>-?\d+\.?\d*)|(?<bool>true|false|null)|(?<punct>[{}[\],:])/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const groups = match.groups!;
    const cls = groups.key
      ? 'text-primary/80'
      : groups.string
        ? 'text-emerald-400/80'
        : groups.number
          ? 'text-blue-300'
          : groups.bool
            ? 'text-amber-400'
            : 'text-muted-foreground/50';
    nodes.push(
      <span key={key++} className={cls}>
        {match[0]}
      </span>
    );
    lastIndex = tokenRegex.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/** Levenshtein distance, used to turn a typo into a suggestion. */
function editDistance(a: string, b: string): number {
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = curr.slice();
  }
  return prev[b.length];
}

/* ── Live status bar ── */

const SPARKLINE_W = 46;
const SPARKLINE_H = 12;
const FPS_CEILING = 70;

const StatusBar = () => {
  const telemetry = useSystemTelemetry();

  const points = useMemo(
    () =>
      telemetry.fpsHistory
        .map((value, i) => {
          const x = (i / (FPS_SAMPLES - 1)) * SPARKLINE_W;
          const y = SPARKLINE_H - Math.min(1, value / FPS_CEILING) * SPARKLINE_H;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' '),
    [telemetry.fpsHistory]
  );

  const pending = telemetry.fps === null;
  const healthy = pending || telemetry.fps >= 50;

  return (
    <div className="flex items-center gap-3 text-[9px] font-mono uppercase tracking-widest">
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 status-live ${healthy ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        <svg
          width={SPARKLINE_W}
          height={SPARKLINE_H}
          viewBox={`0 0 ${SPARKLINE_W} ${SPARKLINE_H}`}
          className={`shrink-0 ${healthy ? 'text-emerald-400/70' : 'text-amber-400/70'}`}
          aria-hidden="true"
        >
          {telemetry.fpsHistory.length > 1 && (
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
        </svg>
        <span className={`tabular-nums ${healthy ? 'text-emerald-400' : 'text-amber-400'}`}>
          {pending ? '--' : telemetry.fps}
        </span>
        <span className="text-muted-foreground/50">fps</span>
      </div>

      <div className="w-[1px] h-3 bg-border" />

      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground tabular-nums">{formatUptime(telemetry.uptimeSeconds)}</span>
        <span className="text-muted-foreground/50">up</span>
      </div>

      <div className="hidden sm:flex items-center gap-3">
        <div className="w-[1px] h-3 bg-border" />
        <div className="flex items-center gap-1.5">
          {telemetry.heapMB !== null ? (
            <>
              <span className="text-primary tabular-nums">{telemetry.heapMB.toFixed(1)}</span>
              <span className="text-muted-foreground/50">mb</span>
            </>
          ) : (
            <>
              <span className="text-primary tabular-nums">{telemetry.domNodes}</span>
              <span className="text-muted-foreground/50">nodes</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Session ── */

interface SessionLine {
  id: number;
  type: 'cmd' | 'output';
  content: React.ReactNode;
}

interface RunningCommand {
  name: string;
  controller: AbortController;
}

function readStoredHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** True on touch-first devices, where typing a command is genuinely painful. */
function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  );

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)');
    const onChange = (e: MediaQueryListEvent) => setCoarse(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return coarse;
}

/* ── Console ── */

const OpsConsole = () => {
  const [history, setHistory] = useState<ConsoleEntry[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const [bootComplete, setBootComplete] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState<RunningCommand | null>(null);
  const [inputFocused, setInputFocused] = useState(false);

  const prefersReduced = useReducedMotion();
  const coarsePointer = useCoarsePointer();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stickToBottom = useRef(true);
  const announcedRef = useRef(false);

  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const { unlocked, unlockedThisSession, unlock, relock } = useEasterEgg();

  const [sessionLog, setSessionLog] = useState<SessionLine[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>(readStoredHistory);
  const historyCursor = useRef<number | null>(null);
  const lineIdRef = useRef(0);
  const nextLineId = () => ++lineIdRef.current;

  const [mountTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  const timeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'local';
    } catch {
      return 'local';
    }
  }, []);

  const entry = CONSOLE_SEQUENCE[currentIdx];
  const visibleText = prefersReduced ? entry.text : displayed;

  const emit = useCallback((content: React.ReactNode) => {
    stickToBottom.current = true;
    setSessionLog((prev) => [...prev, { id: ++lineIdRef.current, type: 'output', content }]);
  }, []);

  const clearSession = useCallback(() => setSessionLog([]), []);
  const markAnnounced = useCallback(() => {
    announcedRef.current = true;
  }, []);

  /* Rendered output can run further commands (the `ask` list is tappable).
     Routed through a ref so the callback identity stays stable: passing
     `submit` directly would make commands → execute → submit → commands a
     cycle, and rebuild the whole registry on every keystroke. */
  const submitRef = useRef<(input: string) => void>(() => {});
  const runFromOutput = useCallback((input: string) => submitRef.current(input), []);

  const commands = useConsoleCommands({
    runCommand: runFromOutput,
    navigate,
    setTheme,
    unlocked,
    unlock,
    relock,
    clearSession,
    history: cmdHistory,
    markAnnounced,
  });

  const completionNames = useMemo(
    () =>
      commands
        .filter((c) => !c.hidden && (!c.requiresClearance || unlocked))
        .map((c) => c.name)
        .sort(),
    [commands, unlocked]
  );

  const resolve = useCallback(
    (name: string): CommandSpec | undefined => {
      const canonical = ALIASES[name] ?? name;
      return commands.find((c) => c.name === canonical && (!c.requiresClearance || unlocked));
    },
    [commands, unlocked]
  );

  /* ── Execution ──────────────────────────────────────────────────────────
     Sync commands complete inline so the prompt never flickers. Only a
     command that actually returns a promise takes the console into its
     running state and gets a cancel affordance. */

  const execute = useCallback(
    (raw: string) => {
      const input = raw.trim();
      if (!input) return;

      // A statement typed without the `sql` prefix is still a query. The
      // whole line becomes the argument, since the verb is part of it.
      const isStatement = SQL_STATEMENT.test(input);

      // Only the command name is normalised. The argument keeps its original
      // case, because `sql` carries string literals where case is meaningful.
      const spaceIndex = input.indexOf(' ');
      const name = isStatement
        ? 'sql'
        : (spaceIndex === -1 ? input : input.slice(0, spaceIndex)).toLowerCase();
      const arg = isStatement ? input : spaceIndex === -1 ? '' : input.slice(spaceIndex + 1).trim();

      const spec = resolve(name);

      if (!spec) {
        // Reaching here with a statement means the query layer is locked, not
        // that the input was wrong — so point at what does work rather than
        // reporting the SQL verb as an unknown command.
        if (isStatement) {
          emit("raw SQL is locked. try 'ask' for prepared questions about this work.");
          return;
        }

        const near = completionNames
          .map((candidate) => ({ candidate, distance: editDistance(name, candidate) }))
          .filter((c) => c.distance <= 2)
          .sort((a, b) => a.distance - b.distance)[0];

        emit(
          near
            ? `command not found: ${name}. did you mean '${near.candidate}'?`
            : `command not found: ${name}. type 'help' for available commands.`
        );
        return;
      }

      const controller = new AbortController();
      const outcome = spec.run({ arg, emit, signal: controller.signal });

      if (!(outcome instanceof Promise)) {
        if (outcome?.output !== undefined) emit(outcome.output);
        outcome?.sideEffect?.();
        return;
      }

      runningRef.current = controller;
      setRunning({ name: spec.name, controller });
      // Sustained work shows on the board as sustained throughput.
      emitCircuitSignal({ type: 'load', value: 1 });

      outcome
        .then((result) => {
          if (result?.output !== undefined) emit(result.output);
          result?.sideEffect?.();
        })
        .catch((error: unknown) => {
          // An abort is the operator's own doing, not a failure to report.
          if (controller.signal.aborted) return;
          emit(`error: ${error instanceof Error ? error.message : String(error)}`);
        })
        .finally(() => {
          runningRef.current = null;
          setRunning(null);
          emitCircuitSignal({ type: 'load', value: 0 });
          // Focus can be lost while the command owns the prompt; put it back
          // so the next command can be typed without a click.
          inputRef.current?.focus({ preventScroll: true });
        });
    },
    [completionNames, emit, resolve]
  );

  // Abort anything still in flight if the console unmounts mid-command.
  // Tracked through a ref rather than the state value, because an effect
  // keyed on `running` would tear down on every transition — firing an abort
  // each time a command merely *finished*.
  const runningRef = useRef<AbortController | null>(null);
  useEffect(() => () => runningRef.current?.abort(), []);

  const cancelRunning = useCallback(() => {
    if (!running) return;
    running.controller.abort();
    emit('^C');
  }, [emit, running]);

  /* ── Boot ─────────────────────────────────────────────────────────────── */

  const skipBoot = useCallback(() => {
    setHistory(CONSOLE_SEQUENCE);
    setBootComplete(true);
  }, []);

  useEffect(() => {
    if (bootComplete || prefersReduced) return;

    const speed = TYPE_SPEED[entry.severity];
    const startTime = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const chars = Math.min(entry.text.length, Math.floor((now - startTime) / speed));
      setDisplayed(entry.text.slice(0, chars));
      if (chars < entry.text.length) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [currentIdx, entry.text, entry.severity, prefersReduced, bootComplete]);

  useEffect(() => {
    if (bootComplete) return;

    const speed = TYPE_SPEED[entry.severity];
    const typeDuration = prefersReduced ? 0 : entry.text.length * speed;

    const timer = setTimeout(() => {
      setHistory((prev) => [...prev, entry]);
      if (currentIdx + 1 >= CONSOLE_SEQUENCE.length) setBootComplete(true);
      else setCurrentIdx((i) => i + 1);
    }, typeDuration + entry.hold);

    return () => clearTimeout(timer);
  }, [currentIdx, entry, prefersReduced, bootComplete]);

  useEffect(() => {
    if (!bootComplete) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [bootComplete]);

  /* ── Scroll ───────────────────────────────────────────────────────────── */

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickToBottom.current) return;
    el.scrollTop = el.scrollHeight;
  }, [history, visibleText, sessionLog, expanded]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    const interval = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(interval);
  }, [prefersReduced]);

  useEffect(() => {
    if (!unlockedThisSession || !bootComplete || announcedRef.current) return;
    announcedRef.current = true;
    emit(UNLOCK_BANNER);
  }, [unlockedThisSession, bootComplete, emit]);

  const isTypingDone = prefersReduced || visibleText.length === entry.text.length;

  /* ── Submit ───────────────────────────────────────────────────────────── */

  const submit = useCallback(
    (raw: string) => {
      if (!raw.trim() || running) return;

      const nextHistory = [...cmdHistory, raw].slice(-HISTORY_LIMIT);
      setCmdHistory(nextHistory);
      historyCursor.current = null;
      setInputValue('');

      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
      } catch {
        // History simply won't persist if storage is unavailable.
      }

      stickToBottom.current = true;
      setSessionLog((prev) => [...prev, { id: nextLineId(), type: 'cmd', content: raw }]);

      // The console and the background are the same machine: every command
      // fires a visible packet across the board behind it.
      emitCircuitSignal({ type: 'burst' });
      execute(raw);
    },
    [cmdHistory, execute, running]
  );

  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      submit(inputValue);
    },
    [inputValue, submit]
  );

  /* ── Inline completion ────────────────────────────────────────────────── */

  const ghost = useMemo(() => {
    if (running || !inputValue || inputValue.endsWith(' ')) return '';

    const parts = inputValue.split(/\s+/);
    if (parts.length === 1) {
      const match = completionNames.find((n) => n.startsWith(inputValue) && n !== inputValue);
      return match ? match.slice(inputValue.length) : '';
    }
    if (parts.length !== 2) return '';

    const canonical = ALIASES[parts[0].toLowerCase()] ?? parts[0].toLowerCase();
    const partial = parts[1];

    const pool = ID_COMMANDS.has(canonical)
      ? PROJECTS.map((p) => p.id)
      : canonical === 'man'
        ? completionNames
        : canonical === 'theme'
          ? unlocked
            ? ['amber', 'purple', 'phosphor']
            : ['amber', 'purple']
          : [];

    const match = pool.find((c) => c.startsWith(partial) && c !== partial);
    return match ? match.slice(partial.length) : '';
  }, [completionNames, inputValue, running, unlocked]);

  const acceptGhost = useCallback(() => {
    if (!ghost) return false;
    setInputValue((prev) => prev + ghost);
    return true;
  }, [ghost]);

  const listCompletions = useCallback(() => {
    const parts = inputValue.trim().split(/\s+/);

    if (parts.length === 1) {
      const pool = completionNames.filter((n) => n.startsWith(parts[0] ?? ''));
      if (pool.length > 1) emit(pool.join('  '));
      return;
    }

    const canonical = ALIASES[parts[0].toLowerCase()] ?? parts[0].toLowerCase();
    if (!ID_COMMANDS.has(canonical)) return;

    const pool = PROJECTS.map((p) => p.id).filter((id) => id.startsWith(parts[1] ?? ''));
    if (pool.length > 1) emit(pool.join('  '));
  }, [completionNames, emit, inputValue]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Ctrl+C cancels a running command first — that binding has to win over
      // everything else while something owns the prompt.
      if (e.key === 'c' && e.ctrlKey) {
        e.preventDefault();
        if (running) {
          cancelRunning();
          return;
        }
        if (inputValue) {
          stickToBottom.current = true;
          setSessionLog((prev) => [...prev, { id: nextLineId(), type: 'cmd', content: `${inputValue}^C` }]);
        }
        setInputValue('');
        historyCursor.current = null;
        return;
      }

      if (running) {
        // The command owns the line; swallow everything else.
        e.preventDefault();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        if (!acceptGhost()) listCompletions();
        return;
      }

      if (e.key === 'ArrowRight' && ghost && e.currentTarget.selectionStart === inputValue.length) {
        e.preventDefault();
        acceptGhost();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setInputValue('');
        historyCursor.current = null;
        return;
      }

      if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        clearSession();
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!cmdHistory.length) return;
        const next =
          historyCursor.current === null ? cmdHistory.length - 1 : Math.max(0, historyCursor.current - 1);
        historyCursor.current = next;
        setInputValue(cmdHistory[next]);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!cmdHistory.length || historyCursor.current === null) return;
        const next = historyCursor.current + 1;
        if (next >= cmdHistory.length) {
          historyCursor.current = null;
          setInputValue('');
        } else {
          historyCursor.current = next;
          setInputValue(cmdHistory[next]);
        }
      }
    },
    [acceptGhost, cancelRunning, clearSession, cmdHistory, ghost, inputValue, listCompletions, running]
  );

  const handleBodyClick = useCallback(() => {
    if (!bootComplete) {
      skipBoot();
      return;
    }
    if (window.getSelection()?.toString()) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [bootComplete, skipBoot]);

  /* Shown while the session is empty (discoverability) or on touch devices,
     where typing `sql SELECT ...` on a soft keyboard is not a realistic ask.
     Hidden once a desktop visitor is clearly on their way. */
  /* `ask` leads: it is the one command that pays off immediately for a
     visitor who has no interest in typing anything else. */
  const suggestions = useMemo(
    () => (unlocked ? ['ask', 'ls', 'sql', 'watch'] : ['ask', 'ls', 'help', 'ping']),
    [unlocked]
  );
  const showSuggestions = bootComplete && !running && (sessionLog.length === 0 || coarsePointer);

  return (
    <div
      className="w-full max-w-[620px] border border-border bg-card relative flex flex-col overflow-hidden"
      style={{ boxShadow: 'var(--shadow-lg), var(--shadow-glow)' }}
      role="group"
      aria-label="Operations console — a live terminal you can type into"
    >
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 status-live" />
            <span className="text-[9px] font-mono text-emerald-400/70 uppercase tracking-widest">live</span>
          </div>
          <div className="w-[1px] h-3 bg-border" />
          <span className="font-mono text-[10px] text-muted-foreground/80 uppercase tracking-widest truncate">
            ops.console
          </span>
          {unlocked && (
            <>
              <div className="w-[1px] h-3 bg-border" />
              <span className="font-mono text-[9px] text-primary uppercase tracking-widest">Ω</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!bootComplete ? (
            <button
              type="button"
              onClick={skipBoot}
              className="font-mono text-[9px] text-muted-foreground/70 hover:text-primary uppercase tracking-widest transition-colors"
            >
              skip ▸
            </button>
          ) : (
            <span className="font-mono text-[9px] text-muted-foreground/40 tracking-wider hidden sm:inline">
              {mountTime} local
            </span>
          )}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-pressed={expanded}
            aria-label={expanded ? 'Collapse console' : 'Expand console'}
            className="text-muted-foreground/50 hover:text-primary transition-colors"
          >
            {expanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onClick={handleBodyClick}
        className={`p-4 overflow-y-auto font-mono text-[11px] leading-[1.7] flex flex-col gap-0.5 cursor-text transition-[height] duration-300 ${
          expanded ? 'h-[420px] lg:h-[520px]' : 'h-[260px] lg:h-[320px]'
        }`}
      >
        {/* Scripted boot log — decorative, hidden from assistive tech. */}
        <div aria-hidden="true" className="contents">
          {history.map((line, i) => (
            <div key={i} className="flex items-start w-full opacity-60 hover:opacity-100 transition-opacity">
              <span className={`${SEVERITY_STYLES[line.severity]} whitespace-pre-wrap break-all`}>
                {SEVERITY_PREFIX[line.severity]}
                {line.severity === 'data' ? highlightJSON(line.text) : line.text}
              </span>
            </div>
          ))}

          {!bootComplete && (
            <div className="flex items-start w-full">
              <span className={`${SEVERITY_STYLES[entry.severity]} whitespace-pre-wrap break-all`}>
                {SEVERITY_PREFIX[entry.severity]}
                {entry.severity === 'data' ? highlightJSON(visibleText) : visibleText}
                <span
                  className="inline-block ml-0.5 align-middle"
                  style={{
                    width: '5px',
                    height: '13px',
                    background:
                      cursorVisible && !isTypingDone
                        ? 'hsl(var(--primary))'
                        : isTypingDone && cursorVisible
                          ? 'hsl(var(--muted-foreground))'
                          : 'transparent',
                    transition: 'background 0.1s',
                  }}
                />
              </span>
            </div>
          )}
        </div>

        {/* Interactive session */}
        <AnimatePresence>
          {bootComplete && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReduced ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="min-w-0"
            >
              {sessionLog.length === 0 && (
                <div className="text-muted-foreground/40 mb-1">
                  Interactive shell. Try <span className="text-primary">ask</span> for answers about this
                  work, or <span className="text-primary">help</span> for everything else.
                </div>
              )}

              <div role="log" aria-live="polite" aria-relevant="additions" aria-label="Terminal output">
                {sessionLog.map((line) => (
                  <div key={line.id} className="w-full min-w-0">
                    {line.type === 'cmd' ? (
                      <span className="text-foreground font-medium whitespace-pre-wrap break-all">
                        ❯ {line.content}
                      </span>
                    ) : (
                      <div className="text-muted-foreground whitespace-pre-wrap break-words">{line.content}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Prompt, or the running command that currently owns it. */}
              <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
                {running ? (
                  /* Tappable as well as Ctrl+C. There is no Ctrl key on a
                     phone, so a keyboard-only cancel would leave a streaming
                     command running with no way to stop it. */
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelRunning();
                    }}
                    className="flex items-center gap-1.5 min-w-0 text-left group"
                    aria-label={`Cancel ${running.name}`}
                  >
                    <span className="w-1.5 h-1.5 bg-primary status-live shrink-0" aria-hidden="true" />
                    <span className="text-primary shrink-0">{running.name}</span>
                    <span className="text-muted-foreground/40 truncate group-hover:text-primary transition-colors">
                      running — tap or ^C to cancel
                    </span>
                  </button>
                ) : (
                  /* The prompt carries the focus state instead of an outline.
                     The global *:focus-visible rule draws a 2px ring, which
                     on a bare inline input reads as a heavy box around the
                     command line — wrong for a terminal, where the caret and
                     an active prompt are the conventional indicator. */
                  <span
                    className={`font-medium shrink-0 transition-colors ${
                      inputFocused ? 'text-primary' : 'text-muted-foreground'
                    }`}
                    aria-hidden="true"
                  >
                    ❯
                  </span>
                )}

                <div className={`relative flex-1 min-w-0 ${running ? 'sr-only' : ''}`}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    aria-label="Terminal command input. Type help for available commands."
                    aria-autocomplete="inline"
                    aria-busy={running !== null}
                    className="relative z-10 w-full bg-transparent border-none outline-none focus:outline-none focus-visible:outline-none text-foreground font-mono text-[11px] p-0"
                  />
                  {ghost && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 z-0 font-mono text-[11px] whitespace-pre text-muted-foreground/30"
                    >
                      <span className="invisible">{inputValue}</span>
                      {ghost}
                    </span>
                  )}
                </div>
              </form>

              {showSuggestions && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/30">
                    try
                  </span>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        submit(suggestion);
                      }}
                      className="border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20 gap-3">
        <StatusBar />
        <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest hidden md:inline truncate">
          {timeZone}
        </span>
      </div>
    </div>
  );
};

export default OpsConsole;
