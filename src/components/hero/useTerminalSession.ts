import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useTheme } from '@/components/ThemeProvider';
import { useEasterEgg } from '@/components/EasterEggProvider';
import { useAsk } from '@/components/ai/AskProvider';
import { emitCircuitSignal } from '@/lib/circuitBus';
import { MAX_QUESTION_CHARS } from '@/lib/aiHistory';
import { commonPrefix, complete, type Candidate, type CompletionContext } from '@/lib/shell/complete';
import { displayPath } from '@/lib/shell/fs';
import { getopt, lastSegment, parseLine, wordsOf, type ParsedCommand } from '@/lib/shell/parse';
import { errorLines, lines, outputToText, type LinesOutput, type ShellOutput, type TableOutput } from '@/lib/shell/types';
import { MAX_RUN_CHARS } from '@/lib/shell/runLink';
import type { CommandSuggestion } from '@/lib/shell/manual';
import {
  appendOutput,
  changeDirectory,
  clearLog,
  finishEntry,
  getShell,
  note,
  patchEntry,
  pushHistory,
  setShell,
  startEntry,
  takeLinkCommand,
  useShell,
  type LogEntry,
  type RunningCommand,
} from '@/components/shell/sessionStore';
import { ALIASES, UNLOCK_BANNER, useConsoleCommands, type CommandResult, type CommandSpec } from './useConsoleCommands';

/* ==========================================================================
   TERMINAL SESSION

   Everything a shell does that is not painting: parsing, pipes and `&&`,
   streaming commands and cancellation, history and reverse search, the
   completion menu, line editing, and the `?` helper.

   The session itself (scrollback, history, working directory, the running
   command) lives in components/shell/sessionStore.ts, shared by the hero and
   the drop-down console. This hook holds what belongs to one prompt: the
   line being typed, its menu, its search.
   ========================================================================== */

/* A bare SQL statement typed at the prompt. Non-SELECT verbs are included on
   purpose: `DROP TABLE projects` gets the engine's own "only SELECT" reply,
   which is more informative than "command not found". */
const SQL_VERB = /^(select|insert|update|delete|drop|create|alter|truncate)$/i;

const SESSION_NAME = 'em@builtbyem';

export const promptFor = (cwd: string) => `${SESSION_NAME}:${displayPath(cwd)}$`;

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

function nearest(name: string, pool: string[]): string | null {
  const best = pool
    .map((candidate) => ({ candidate, distance: editDistance(name, candidate) }))
    .filter((c) => c.distance <= 2 && c.distance < Math.max(2, name.length))
    .sort((a, b) => a.distance - b.distance)[0];
  return best?.candidate ?? null;
}

/** Legacy output (a string or a node) as typed output. */
function toOutput(value: React.ReactNode | ShellOutput): ShellOutput | undefined {
  if (value === undefined || value === null || value === false) return undefined;
  if (typeof value === 'object' && 'kind' in (value as object)) {
    const kind = (value as { kind: unknown }).kind;
    if (kind === 'lines' || kind === 'table' || kind === 'node') return value as ShellOutput;
  }
  if (typeof value === 'string' || typeof value === 'number') return lines(String(value));
  return { kind: 'node', node: value as React.ReactNode };
}

const resultOutput = (result: CommandResult | undefined) => (result ? (result.data ?? toOutput(result.output)) : undefined);

export interface CompletionMenu {
  id: string;
  items: Candidate[];
  active: number;
  start: number;
}

export interface ReverseSearch {
  query: string;
  match: string | null;
}

export interface TerminalSession {
  /** The shared scrollback. */
  entries: LogEntry[];
  /** Kept for the hero: the same entries. */
  sessionLog: LogEntry[];
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
  cwd: string;
  /** `em@builtbyem:~/projects$` */
  prompt: string;
  /** What the line itself shows: `~/projects $`. */
  linePrompt: string;
  menu: CompletionMenu | null;
  acceptCandidate: (index: number) => void;
  search: ReverseSearch | null;
  /** The line under the prompt: usage, a correction, a proposal's reason. */
  hint: string | null;
  /** Esc belongs to the prompt (closing a menu or a search) rather than its window. */
  escapeIsLocal: boolean;
  /* Per-entry actions */
  rerun: (entry: LogEntry) => void;
  copyEntry: (entry: LogEntry) => Promise<boolean>;
  askAbout: ((entry: LogEntry) => void) | null;
  runPending: (entry: LogEntry) => void;
  usePending: (entry: LogEntry) => void;
  dismissPending: (entry: LogEntry) => void;
}

export interface TerminalSessionOptions {
  /** Live: the boot overlay is gone (hero) or the console is open. */
  enabled: boolean;
  /** `ai`. Default: tell the hero to switch its prompt to Ask. */
  onEnterAi?: (question?: string) => void;
  /** Told where the caret went after the session moved it. */
  onCaret?: (index: number) => void;
  /** A command took the visitor somewhere on the page. */
  onNavigate?: () => void;
  /** Distinguishes this prompt's listbox from another view's. */
  idPrefix?: string;
}

export function useTerminalSession({ enabled, onEnterAi, onCaret, onNavigate, idPrefix = 'shell' }: TerminalSessionOptions): TerminalSession {
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const { unlocked, unlockedThisSession, unlock, relock } = useEasterEgg();
  const { openAsk } = useAsk();
  const shell = useShell();

  const [inputValue, setInputState] = useState('');
  const [menu, setMenu] = useState<CompletionMenu | null>(null);
  const [searchState, setSearchState] = useState<{ origin: string; skip: number } | null>(null);

  const historyCursor = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const focusInput = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  /** Moves the real caret after React has written the new value. */
  const placeCaret = useCallback(
    (index: number) => {
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        el.setSelectionRange(index, index);
        onCaret?.(index);
      });
    },
    [onCaret]
  );

  const setLine = useCallback(
    (value: string, caret = value.length) => {
      setInputState(value);
      setMenu(null);
      placeCaret(caret);
    },
    [placeCaret]
  );

  /* Typing closes the menu: its candidates were for the old word. */
  const setInputValue = useCallback((value: string) => {
    setInputState(value);
    setMenu(null);
  }, []);

  const clearSession = useCallback(() => clearLog(), []);
  const markAnnounced = useCallback(() => setShell({ announced: true }), []);
  const getHistory = useCallback(() => getShell().history, []);
  const getPrevCwd = useCallback(() => getShell().prevCwd, []);
  const getLastStatus = useCallback(() => getShell().lastStatus, []);
  const lastLineRef = useRef<string | null>(null);
  const getLastLine = useCallback(() => lastLineRef.current, []);

  const enterAi = useCallback(
    (question?: string) => {
      if (onEnterAi) onEnterAi(question);
      else window.dispatchEvent(new CustomEvent('emc:enter-ai', { detail: question }));
    },
    [onEnterAi]
  );

  const commands = useConsoleCommands({
    navigate,
    setTheme,
    unlocked,
    unlock,
    relock,
    clearSession,
    getHistory,
    markAnnounced,
    setCwd: changeDirectory,
    getPrevCwd,
    getLastStatus,
    getLastLine,
    openAsk,
    enterAi,
    onNavigate,
  });

  const visible = useMemo(() => commands.filter((c) => !c.hidden && (!c.requiresClearance || unlocked)), [commands, unlocked]);
  const completionNames = useMemo(() => visible.map((c) => c.name).sort(), [visible]);

  const resolve = useCallback(
    (name: string): CommandSpec | undefined => {
      const canonical = ALIASES[name] ?? name;
      return commands.find((c) => c.name === canonical && (!c.requiresClearance || unlocked));
    },
    [commands, unlocked]
  );

  /* ── Running one command ──────────────────────────────────────────────── */

  const invoke = useCallback(
    (
      cmd: ParsedCommand,
      input: LinesOutput | TableOutput | undefined,
      piped: boolean,
      emit: (o: React.ReactNode | ShellOutput) => void,
      signal: AbortSignal,
      fullLine: string
    ): CommandResult | undefined | Promise<CommandResult | undefined> => {
      // A statement typed without the `sql` prefix is still a query; the
      // verb is part of it, so the whole command becomes the argument.
      const statement = SQL_VERB.test(cmd.name);
      const name = statement ? 'sql' : cmd.name;
      const spec = resolve(name);

      if (!spec) {
        // Reaching here with a statement means the query layer is locked.
        if (statement) return { data: errorLines("raw SQL is locked. try 'queries' for prepared questions about this work."), status: 127, next: ['queries'] };
        const near = nearest(cmd.name, [...completionNames, ...Object.keys(ALIASES)]);
        if (near) {
          const fixed = fullLine.replace(cmd.text, `${near}${cmd.raw ? ` ${cmd.raw}` : ''}`);
          setShell({ proposal: { command: fixed, why: `did you mean '${near}'? → or Tab puts it on the line` } });
        }
        return {
          data: errorLines(near ? `command not found: ${cmd.name}. did you mean '${near}'?` : `command not found: ${cmd.name}. type 'help' for available commands.`),
          status: 127,
          next: near ? [] : ['help'],
        };
      }

      const words = statement ? [{ value: cmd.name, quoted: false, start: 0, end: 0 }, ...cmd.words] : cmd.words;
      const { flags, args } = getopt(words, spec.valued);
      return spec.run({
        arg: statement ? cmd.text : cmd.raw,
        args,
        flags,
        words,
        input,
        piped,
        cwd: getShell().cwd,
        emit,
        signal,
      });
    },
    [completionNames, resolve]
  );

  /* ── Running a line ───────────────────────────────────────────────────── */

  const execute = useCallback(
    (raw: string) => {
      const line = raw.trim();
      const entryId = startEntry({ kind: 'cmd', line: raw, cwd: getShell().cwd });
      const emit = (value: React.ReactNode | ShellOutput) => {
        const output = toOutput(value);
        if (output) appendOutput(entryId, output);
      };

      const parsed = parseLine(line);
      if (!parsed.ok) {
        appendOutput(entryId, errorLines(`parse error: ${parsed.error}`));
        finishEntry(entryId, 2);
        return;
      }

      const controller = new AbortController();
      let next: string[] | undefined;
      let wentAsync = false;

      /** Handles one finished command. Returns its status, or null to keep piping. */
      const settle = (
        result: CommandResult | undefined,
        piped: boolean,
        name: string,
        carry: { input?: LinesOutput | TableOutput }
      ): { status: number; stop: boolean } => {
        const output = resultOutput(result);
        const status = result?.status ?? 0;

        if (piped) {
          // An error mid-pipe goes to the screen and ends the pipe, as stderr would.
          if (output?.kind === 'lines' && output.style === 'error') {
            appendOutput(entryId, output);
            return { status: status || 1, stop: true };
          }
          if (output?.kind === 'node') {
            appendOutput(entryId, errorLines(`${name} prints a card, which cannot be piped. run it on its own, or pipe a command that prints text.`));
            return { status: 1, stop: true };
          }
          carry.input = output ?? lines([]);
          result?.sideEffect?.();
          return { status, stop: false };
        }

        if (output) appendOutput(entryId, output);
        if (result?.next) next = result.next;
        result?.sideEffect?.();
        return { status, stop: false };
      };

      const runPipeline = (commandsInPipe: ParsedCommand[]): number | Promise<number> => {
        const carry: { input?: LinesOutput | TableOutput } = {};
        let status = 0;

        const step = (from: number): number | Promise<number> => {
          for (let i = from; i < commandsInPipe.length; i++) {
            const cmd = commandsInPipe[i];
            const piped = i < commandsInPipe.length - 1;
            const input = carry.input;
            carry.input = undefined;
            const outcome = invoke(cmd, input, piped, emit, controller.signal, line);

            if (outcome instanceof Promise) {
              if (!wentAsync) {
                wentAsync = true;
                setShell({ running: { name: cmd.name, line: raw, controller } });
                // Sustained work shows on the board as sustained throughput.
                emitCircuitSignal({ type: 'load', value: 1 });
              } else {
                setShell((s) => (s.running ? { running: { ...s.running, name: cmd.name } } : {}));
              }
              return outcome.then((result) => {
                const settled = settle(result, piped, cmd.name, carry);
                if (settled.stop || controller.signal.aborted) return settled.status || (controller.signal.aborted ? 130 : 1);
                status = settled.status;
                return step(i + 1);
              });
            }

            const settled = settle(outcome, piped, cmd.name, carry);
            if (settled.stop) return settled.status;
            status = settled.status;
          }
          return status;
        };
        return step(0);
      };

      const runFrom = (index: number): number | Promise<number> => {
        for (let p = index; p < parsed.pipelines.length; p++) {
          const status = runPipeline(parsed.pipelines[p].commands);
          const last = p === parsed.pipelines.length - 1;
          if (status instanceof Promise) {
            return status.then((s) => (s !== 0 || last || controller.signal.aborted ? s : runFrom(p + 1)));
          }
          // `&&`: the next part runs only if this one succeeded.
          if (status !== 0 || last) return status;
        }
        return 0;
      };

      const done = (status: number) => finishEntry(entryId, status, next?.slice(0, 3));

      let outcome: number | Promise<number>;
      try {
        outcome = runFrom(0);
      } catch (error) {
        appendOutput(entryId, errorLines(`error: ${error instanceof Error ? error.message : String(error)}`));
        done(1);
        return;
      }

      if (!(outcome instanceof Promise)) {
        done(outcome);
        return;
      }

      outcome
        .then(done)
        .catch((error: unknown) => {
          // An abort is the operator's own doing, not a failure to report.
          if (!controller.signal.aborted) appendOutput(entryId, errorLines(`error: ${error instanceof Error ? error.message : String(error)}`));
          done(controller.signal.aborted ? 130 : 1);
        })
        .finally(() => {
          setShell({ running: null });
          emitCircuitSignal({ type: 'load', value: 0 });
          focusInput();
        });
    },
    [focusInput, invoke]
  );

  /* ── `? words`: ask the helper for a command ──────────────────────────── */

  const validateProposal = useCallback(
    (command: string): string | null => {
      if (!command.trim()) return 'it was empty';
      if (command.length > MAX_RUN_CHARS) return 'it was too long';
      if (/^\s*\?/.test(command)) return 'it was another question';
      const parsed = parseLine(command);
      if (!parsed.ok) return parsed.error;
      for (const pipeline of parsed.pipelines) {
        for (const cmd of pipeline.commands) {
          if (SQL_VERB.test(cmd.name)) {
            if (!unlocked) return 'it needs clearance';
            continue;
          }
          const spec = resolve(cmd.name);
          if (!spec || spec.hidden) return `there is no '${cmd.name}' command`;
        }
      }
      return null;
    },
    [resolve, unlocked]
  );

  const askForCommand = useCallback(
    (raw: string, text: string) => {
      const cwd = getShell().cwd;
      const entryId = startEntry({ kind: 'cmd', line: raw, cwd });
      if (text.length > 300) {
        appendOutput(entryId, errorLines(`that is ${text.length} characters. keep it under 300.`));
        finishEntry(entryId, 2);
        return;
      }

      const controller = new AbortController();
      setShell({ running: { name: '?', line: raw, controller } });
      emitCircuitSignal({ type: 'load', value: 1 });

      const finish = (status: number, message?: string, next?: string[]) => {
        if (message) appendOutput(entryId, errorLines(message));
        finishEntry(entryId, status, next);
      };

      fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, cwd }),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (response.status === 404) {
            finish(1, "the command helper is not running here. try 'help', or ask the assistant with 'ai'.", ['help', 'ai']);
            return;
          }
          const body = (await response.json().catch(() => null)) as (Partial<CommandSuggestion> & { error?: string }) | null;
          if (!response.ok || !body || body.error || typeof body.command !== 'string') {
            finish(1, body?.error ?? `the command helper could not answer (${response.status}). try 'help'.`, ['help']);
            return;
          }
          const command = body.command.trim();
          const why = typeof body.why === 'string' ? body.why.trim() : '';
          const problem = validateProposal(command);
          if (problem) {
            finish(1, `the helper suggested \`${command}\`, which this shell cannot run (${problem}). try 'help'.`, ['help']);
            return;
          }
          // Shown, never run: the visitor takes it onto the line, or runs it.
          patchEntry(entryId, { pending: { source: 'assistant', command, why } });
          setShell({ proposal: { command, why: why ? `${why}  (→ or Tab to use it)` : '→ or Tab puts it on the line' } });
          finishEntry(entryId, 0);
        })
        .catch(() => {
          if (controller.signal.aborted) finish(130);
          else finish(1, "could not reach the command helper. try 'help'.", ['help']);
        })
        .finally(() => {
          setShell({ running: null });
          emitCircuitSignal({ type: 'load', value: 0 });
          focusInput();
        });
    },
    [focusInput, validateProposal]
  );

  /* ── Submit ───────────────────────────────────────────────────────────── */

  const submit = useCallback(
    (raw: string) => {
      if (!raw.trim() || getShell().running) return;

      pushHistory(raw);
      historyCursor.current = null;
      setLine('');
      setSearchState(null);
      setShell({ proposal: null });
      // The terminal and the background are the same machine: every command
      // fires a visible packet across the board behind it.
      emitCircuitSignal({ type: 'burst' });

      const question = /^\s*\?\s+(\S[\s\S]*)$/.exec(raw);
      if (question) askForCommand(raw.trim(), question[1].trim());
      else execute(raw);

      if (!question && raw.trim() !== 'share' && !raw.trim().startsWith('share ')) lastLineRef.current = raw.trim();
    },
    [askForCommand, execute, setLine]
  );

  const cancelRunning = useCallback(() => {
    const running = getShell().running;
    if (!running) return;
    running.controller.abort();
    note(lines('^C', { style: 'muted' }));
  }, []);

  // Abort anything still in flight if the last view unmounts mid-command is
  // deliberately NOT done here: the console and the hero share the command,
  // and closing one must not cancel what the other is showing.

  // The unlock banner is announced once, and only after the shell is live so
  // it does not race the boot animation.
  useEffect(() => {
    if (!unlockedThisSession || !enabled || getShell().announced) return;
    setShell({ announced: true });
    note(lines(UNLOCK_BANNER));
  }, [unlockedThisSession, enabled]);

  // A ?run= link: typed on the line with a Run button. Never run on its own.
  useEffect(() => {
    if (!enabled) return;
    const command = takeLinkCommand();
    if (!command) return;
    note(lines('a shared link typed this command for you. nothing has run.', { style: 'muted' }), {
      pending: { source: 'link', command },
    });
    setLine(command);
  }, [enabled, setLine]);

  /* ── Completion ───────────────────────────────────────────────────────── */

  const themes = useMemo(() => (unlocked ? ['amber', 'purple', 'phosphor'] : ['amber', 'purple']), [unlocked]);

  const completionContext = useMemo<CompletionContext>(
    () => ({
      commands: visible.map((c) => ({ name: c.name, arg: c.arg, flags: c.flags })),
      aliases: ALIASES,
      cwd: shell.cwd,
      themes,
      sqlUnlocked: unlocked,
    }),
    [shell.cwd, themes, unlocked, visible]
  );

  const completion = useMemo(() => complete(inputValue, completionContext), [completionContext, inputValue]);

  /* A typo in the first word, while it is being typed: offered, not forced. */
  const liveFix = useMemo(() => {
    const segment = lastSegment(inputValue);
    const words = wordsOf(segment.text);
    const first = words[0]?.toLowerCase();
    if (!first || SQL_VERB.test(first) || resolve(first) || first.startsWith('?')) return null;
    // Only once the word is finished, or nothing could complete it.
    const finished = segment.text.length > first.length || !completionNames.some((n) => n.startsWith(first));
    if (!finished) return null;
    const near = nearest(first, completionNames);
    if (!near) return null;
    const start = segment.offset;
    return { near, line: `${inputValue.slice(0, start)}${near}${inputValue.slice(start + first.length)}` };
  }, [completionNames, inputValue, resolve]);

  const search = useMemo<ReverseSearch | null>(() => {
    if (!searchState) return null;
    const query = inputValue;
    if (!query) return { query, match: null };
    const seen = new Set<string>();
    const hits = [...shell.history].reverse().filter((h) => h.includes(query) && !seen.has(h) && seen.add(h));
    return { query, match: hits[Math.min(searchState.skip, Math.max(0, hits.length - 1))] ?? null };
  }, [inputValue, searchState, shell.history]);

  const ghost = useMemo(() => {
    if (shell.running || searchState || menu) return '';
    const proposal = shell.proposal;
    if (proposal && proposal.command.startsWith(inputValue) && proposal.command !== inputValue) {
      return proposal.command.slice(inputValue.length);
    }
    if (!inputValue || inputValue.endsWith(' ')) return '';
    const first = completion.candidates[0];
    if (first && first.value.startsWith(completion.token) && first.value !== completion.token) {
      return first.value.slice(completion.token.length);
    }
    return '';
  }, [completion, inputValue, menu, searchState, shell.proposal, shell.running]);

  const acceptCandidate = useCallback(
    (index: number) => {
      const source = menu?.items ?? completion.candidates;
      const start = menu?.start ?? completion.start;
      const candidate = source[index];
      if (!candidate) return;
      const open = candidate.value.endsWith('/') || candidate.value.endsWith('=');
      setLine(`${inputValue.slice(0, start)}${candidate.value}${open ? '' : ' '}`);
      focusInput();
    },
    [completion, focusInput, inputValue, menu, setLine]
  );

  const acceptGhost = useCallback(() => {
    if (!ghost) return false;
    setLine(inputValue + ghost);
    return true;
  }, [ghost, inputValue, setLine]);

  const hint = useMemo(() => {
    if (searchState) return null;
    if (shell.proposal && (inputValue === '' || shell.proposal.command.startsWith(inputValue)) && shell.proposal.command !== inputValue) {
      return shell.proposal.why;
    }
    if (!inputValue.trim()) return null;
    if (/^\s*\?\s/.test(inputValue)) return 'Enter asks the helper for a command. It is shown to you, never run.';
    if (liveFix) return `did you mean '${liveFix.near}'? → or Tab to fix`;
    const segment = lastSegment(inputValue);
    const words = wordsOf(segment.text);
    const first = words[0]?.toLowerCase();
    if (!first) return null;
    const spec = SQL_VERB.test(first) ? resolve('sql') : resolve(first);
    if (!spec || (words.length === 1 && !segment.text.endsWith(' '))) return null;
    return `${spec.usage?.split('\n')[0] ?? spec.name} · ${spec.summary}`;
  }, [inputValue, liveFix, resolve, searchState, shell.proposal]);

  /* ── Keys ─────────────────────────────────────────────────────────────── */

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const el = e.currentTarget;
      const caret = el.selectionStart ?? inputValue.length;
      const running = getShell().running;

      // Ctrl+C cancels a running command first; that binding wins over everything.
      if (e.key === 'c' && e.ctrlKey) {
        e.preventDefault();
        if (running) {
          cancelRunning();
          return;
        }
        if (inputValue) startEntry({ kind: 'cmd', line: `${inputValue}^C`, cwd: getShell().cwd, done: true });
        setSearchState(null);
        setLine('');
        historyCursor.current = null;
        return;
      }

      if (running) {
        // The command owns the line; swallow everything else.
        e.preventDefault();
        return;
      }

      /* Reverse search. The line holds the query; Enter, Tab or → take the
         match onto the line (a second Enter runs it); Esc puts back what was
         there before. */
      if (searchState) {
        if ((e.key === 'r' && e.ctrlKey) || (e.key === 'ArrowUp' && search?.match)) {
          e.preventDefault();
          setSearchState({ ...searchState, skip: searchState.skip + 1 });
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowRight') {
          e.preventDefault();
          setSearchState(null);
          setLine(search?.match ?? searchState.origin);
          return;
        }
        if (e.key === 'Escape' || (e.key === 'g' && e.ctrlKey)) {
          e.preventDefault();
          setSearchState(null);
          setLine(searchState.origin);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSearchState({ ...searchState, skip: Math.max(0, searchState.skip - 1) });
        }
        return;
      }

      if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault();
        setSearchState({ origin: inputValue, skip: 0 });
        setLine('');
        return;
      }

      /* The completion menu: a listbox the arrows walk. */
      if (menu) {
        if (e.key === 'Tab' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const back = e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey);
          const count = menu.items.length;
          setMenu({ ...menu, active: (menu.active + (back ? -1 : 1) + count) % count });
          return;
        }
        if (e.key === 'Enter' || e.key === 'ArrowRight') {
          e.preventDefault();
          acceptCandidate(menu.active);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setMenu(null);
          return;
        }
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) return;
        const proposal = getShell().proposal;
        if (proposal && proposal.command.startsWith(inputValue) && proposal.command !== inputValue) {
          setLine(proposal.command);
          return;
        }
        if (liveFix && !completion.candidates.length) {
          setLine(liveFix.line);
          return;
        }
        const { candidates, token, start } = completion;
        if (!candidates.length) return;
        if (candidates.length === 1) {
          acceptCandidate(0);
          return;
        }
        // Extend to what every candidate shares, then offer the rest.
        const prefix = commonPrefix(candidates.map((c) => c.value));
        if (prefix.length > token.length) {
          const line = `${inputValue.slice(0, start)}${prefix}`;
          setInputState(line);
          placeCaret(line.length);
          setMenu({ id: `${idPrefix}-menu`, items: candidates, active: 0, start });
          return;
        }
        setMenu({ id: `${idPrefix}-menu`, items: candidates, active: 0, start });
        return;
      }

      if (e.key === 'ArrowRight' && caret === inputValue.length) {
        if (liveFix && !ghost) {
          e.preventDefault();
          setLine(liveFix.line);
          return;
        }
        if (ghost) {
          e.preventDefault();
          acceptGhost();
          return;
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setLine('');
        setShell({ proposal: null });
        historyCursor.current = null;
        return;
      }

      if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        clearSession();
        return;
      }

      /* Line editing, as readline does it. */
      if (e.ctrlKey && (e.key === 'u' || e.key === 'w' || e.key === 'k')) {
        e.preventDefault();
        if (e.key === 'u') setLine(inputValue.slice(caret), 0);
        else if (e.key === 'k') setLine(inputValue.slice(0, caret), caret);
        else {
          const before = inputValue.slice(0, caret).replace(/\S+\s*$/, '');
          setLine(before + inputValue.slice(caret), before.length);
        }
        return;
      }

      const history = getShell().history;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!history.length) return;
        const next = historyCursor.current === null ? history.length - 1 : Math.max(0, historyCursor.current - 1);
        historyCursor.current = next;
        setLine(history[next]);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!history.length || historyCursor.current === null) return;
        const next = historyCursor.current + 1;
        if (next >= history.length) {
          historyCursor.current = null;
          setLine('');
        } else {
          historyCursor.current = next;
          setLine(history[next]);
        }
      }
    },
    [acceptCandidate, acceptGhost, cancelRunning, clearSession, completion, ghost, idPrefix, inputValue, liveFix, menu, placeCaret, search, searchState, setLine]
  );

  /* ── Entry actions ────────────────────────────────────────────────────── */

  const rerun = useCallback(
    (entry: LogEntry) => {
      if (entry.line) submit(entry.line);
    },
    [submit]
  );

  const copyEntry = useCallback(async (entry: LogEntry) => {
    const text = [entry.line ? `${promptFor(entry.cwd ?? '/')} ${entry.line}` : '', ...entry.blocks.map((b) => outputToText(b.output))]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  const askAbout = useCallback(
    (entry: LogEntry) => {
      const output = entry.blocks.map((b) => outputToText(b.output)).join('\n').trim();
      const lead = `I ran \`${entry.line ?? ''}\` in the terminal on this site. What does this show?`;
      const room = MAX_QUESTION_CHARS - lead.length - 2;
      const body = output.length > room ? `${output.slice(0, Math.max(0, room - 3))}...` : output;
      openAsk({ question: body ? `${lead}\n\n${body}` : lead });
    },
    [openAsk]
  );

  const runPending = useCallback(
    (entry: LogEntry) => {
      if (!entry.pending) return;
      patchEntry(entry.id, { pending: undefined });
      submit(entry.pending.command);
    },
    [submit]
  );

  const usePending = useCallback(
    (entry: LogEntry) => {
      if (!entry.pending) return;
      setLine(entry.pending.command);
      focusInput();
    },
    [focusInput, setLine]
  );

  const dismissPending = useCallback(
    (entry: LogEntry) => {
      const command = entry.pending?.command;
      patchEntry(entry.id, { pending: undefined });
      if (getShell().proposal?.command === command) setShell({ proposal: null });
      if (command && inputValue === command) setLine('');
    },
    [inputValue, setLine]
  );

  return {
    entries: shell.entries,
    sessionLog: shell.entries,
    inputValue,
    setInputValue,
    ghost,
    running: shell.running,
    submit,
    cancelRunning,
    handleKeyDown,
    clearSession,
    unlocked,
    completionNames,
    inputRef,
    focusInput,
    cwd: shell.cwd,
    prompt: promptFor(shell.cwd),
    linePrompt: searchState ? '(reverse-i-search)' : `${displayPath(shell.cwd)} $`,
    menu,
    acceptCandidate,
    search,
    hint: search ? `${search.match ?? (search.query ? 'no match' : 'type to search your history')} · Enter takes it, Esc goes back` : hint,
    escapeIsLocal: menu !== null || searchState !== null,
    rerun,
    copyEntry,
    askAbout,
    runPending,
    usePending,
    dismissPending,
  };
}

/** ARIA for a prompt input that owns a completion listbox. */
export function comboboxProps(session: Pick<TerminalSession, 'menu'>): React.InputHTMLAttributes<HTMLInputElement> {
  const menu = session.menu;
  return {
    role: 'combobox',
    'aria-expanded': menu !== null,
    'aria-controls': menu?.id,
    'aria-activedescendant': menu ? `${menu.id}-${menu.active}` : undefined,
    'aria-autocomplete': 'list',
  };
}
