import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

/* ==========================================================================
   TERMINAL SESSION

   Everything a shell does that is not painting: dispatch, streaming commands
   and cancellation, history, inline completion, key handling.

   Extracted from the old OpsConsole so the new full-screen hero can be
   almost entirely presentation. The chrome changed completely in the
   redesign; this behaviour did not, and rewriting it alongside the visuals
   would have been the easiest way to lose Ctrl+C, the abort-on-unmount, or
   the ghost-completion rules by accident.
   ========================================================================== */

const HISTORY_KEY = 'emc-terminal-history';
const HISTORY_LIMIT = 50;

/* A bare SQL statement typed at the prompt.

   Non-SELECT verbs are included on purpose: routing `DROP TABLE projects` to
   the query layer gets the engine's own "only SELECT is supported" reply,
   which is both more informative and more fun than "command not found". */
const SQL_STATEMENT = /^\s*(select|insert|update|delete|drop|create|alter|truncate)\b/i;

export interface SessionLine {
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

export interface TerminalSession {
  sessionLog: SessionLine[];
  inputValue: string;
  setInputValue: (value: string) => void;
  /** Ghost text completing the current input, or ''. */
  ghost: string;
  running: RunningCommand | null;
  submit: (raw: string) => void;
  cancelRunning: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  clearSession: () => void;
  unlocked: boolean;
  /** Command names available at the current clearance, for chips and hints. */
  completionNames: string[];
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Focuses the prompt without scrolling the page to it. */
  focusInput: () => void;
}

export function useTerminalSession({ enabled }: { enabled: boolean }): TerminalSession {
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const { unlocked, unlockedThisSession, unlock, relock } = useEasterEgg();

  const [sessionLog, setSessionLog] = useState<SessionLine[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [running, setRunning] = useState<RunningCommand | null>(null);
  const [cmdHistory, setCmdHistory] = useState<string[]>(readStoredHistory);

  const historyCursor = useRef<number | null>(null);
  const lineIdRef = useRef(0);
  const runningRef = useRef<AbortController | null>(null);
  const announcedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const nextLineId = () => ++lineIdRef.current;

  const focusInput = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const emit = useCallback((content: React.ReactNode) => {
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
     command that actually returns a promise takes the terminal into its
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
        // that the input was wrong — so point at what does work.
        if (isStatement) {
          emit("raw SQL is locked. try 'queries' for prepared questions about this work.");
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
          focusInput();
        });
    },
    [completionNames, emit, focusInput, resolve]
  );

  // Abort anything still in flight if the terminal unmounts mid-command.
  // Tracked through a ref rather than the state value, because an effect
  // keyed on `running` would tear down on every transition — firing an abort
  // each time a command merely *finished*.
  useEffect(() => () => runningRef.current?.abort(), []);

  const cancelRunning = useCallback(() => {
    if (!running) return;
    running.controller.abort();
    emit('^C');
  }, [emit, running]);

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

      setSessionLog((prev) => [...prev, { id: nextLineId(), type: 'cmd', content: raw }]);

      // The terminal and the background are the same machine: every command
      // fires a visible packet across the board behind it.
      emitCircuitSignal({ type: 'burst' });
      execute(raw);
    },
    [cmdHistory, execute, running]
  );

  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  // The unlock banner is announced once, and only after the shell is live so
  // it does not race the boot animation.
  useEffect(() => {
    if (!unlockedThisSession || !enabled || announcedRef.current) return;
    announcedRef.current = true;
    emit(UNLOCK_BANNER);
  }, [unlockedThisSession, enabled, emit]);

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

  const handleKeyDown = useCallback(
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

  return {
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
    completionNames,
    inputRef,
    focusInput,
  };
}
