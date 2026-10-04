import { useSyncExternalStore } from 'react';

import type { ShellOutput } from '@/lib/shell/types';
import { parseRunParam, withoutRunParam } from '@/lib/shell/runLink';

/* ==========================================================================
   ONE SESSION, TWO WINDOWS

   The hero terminal and the drop-down console (the backtick key) are two
   views of the same shell: the same scrollback, history, working directory
   and running command. Kept in a module-level store rather than a provider,
   so the console can mount anywhere without the app tree knowing about it,
   and a command started in one can be cancelled from the other.

   What stays per view is only what belongs to a view: the line being typed,
   the completion menu, the reverse search.
   ========================================================================== */

/** Dispatched on window to open the drop-down console (the palette does). */
export const OPEN_CONSOLE_EVENT = 'emc:open-console';

const HISTORY_KEY = 'emc-terminal-history';
export const HISTORY_LIMIT = 50;

export interface LogBlock {
  id: number;
  output: ShellOutput;
}

export interface PendingCommand {
  /** `link`: arrived in a ?run= URL. `assistant`: proposed by `? words`. */
  source: 'link' | 'assistant';
  command: string;
  why?: string;
}

export interface LogEntry {
  id: number;
  /** `cmd` echoes a command line; `note` is the shell speaking for itself. */
  kind: 'cmd' | 'note';
  line?: string;
  /** Where the command ran, for its prompt. */
  cwd?: string;
  blocks: LogBlock[];
  /** Exit status, once finished. */
  status?: number;
  /** Tappable next steps, shown under the newest entry only. */
  next?: string[];
  done: boolean;
  /** A command waiting for the visitor's go-ahead. Never run on its own. */
  pending?: PendingCommand;
}

export interface RunningCommand {
  name: string;
  line: string;
  controller: AbortController;
}

export interface ShellState {
  entries: LogEntry[];
  history: string[];
  cwd: string;
  prevCwd: string;
  running: RunningCommand | null;
  lastStatus: number;
  /** The unlock banner has been printed this visit. */
  announced: boolean;
  /** Ghost text for the empty prompt: a typo's correction, or a `?` proposal. */
  proposal: { command: string; why: string } | null;
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

let state: ShellState = {
  entries: [],
  history: typeof window === 'undefined' ? [] : readStoredHistory(),
  cwd: '/',
  prevCwd: '/',
  running: null,
  lastStatus: 0,
  announced: false,
  proposal: null,
};

const listeners = new Set<() => void>();
let nextId = 0;
export const newId = () => ++nextId;

export function getShell(): ShellState {
  return state;
}

export function setShell(patch: Partial<ShellState> | ((s: ShellState) => Partial<ShellState>)) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useShell(): ShellState {
  return useSyncExternalStore(subscribe, getShell, getShell);
}

/* ── Entries ────────────────────────────────────────────────────────────── */

export function startEntry(entry: Omit<LogEntry, 'id' | 'blocks' | 'done'> & { blocks?: LogBlock[]; done?: boolean }): number {
  const id = newId();
  setShell((s) => ({ entries: [...s.entries, { blocks: [], done: false, ...entry, id }] }));
  return id;
}

export function appendOutput(entryId: number, output: ShellOutput) {
  setShell((s) => ({
    entries: s.entries.map((e) => (e.id === entryId ? { ...e, blocks: [...e.blocks, { id: newId(), output }] } : e)),
  }));
}

export function finishEntry(entryId: number, status: number, next?: string[]) {
  setShell((s) => ({
    lastStatus: status,
    entries: s.entries.map((e) => (e.id === entryId ? { ...e, status, next, done: true } : e)),
  }));
}

export function patchEntry(entryId: number, patch: Partial<LogEntry>) {
  setShell((s) => ({ entries: s.entries.map((e) => (e.id === entryId ? { ...e, ...patch } : e)) }));
}

/** A line printed by the shell itself, outside any command. */
export function note(output: ShellOutput, extra: Partial<LogEntry> = {}): number {
  return startEntry({ kind: 'note', blocks: [{ id: newId(), output }], done: true, ...extra });
}

export function clearLog() {
  setShell({ entries: [] });
}

/* ── History ────────────────────────────────────────────────────────────── */

export function pushHistory(line: string) {
  const history = [...state.history, line].slice(-HISTORY_LIMIT);
  setShell({ history });
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // History simply won't persist if storage is unavailable.
  }
}

/* ── Directory ──────────────────────────────────────────────────────────── */

export function changeDirectory(path: string) {
  setShell((s) => (path === s.cwd ? {} : { cwd: path, prevCwd: s.cwd }));
}

/* ── ?run= links ────────────────────────────────────────────────────────── */

let linkChecked = false;
let linkCommand: string | null = null;

/** The command a ?run= link carried, without consuming it. */
export function peekLinkCommand(): string | null {
  if (!linkChecked && typeof window !== 'undefined') {
    linkChecked = true;
    linkCommand = parseRunParam(window.location.search);
    if (linkCommand) {
      // Taken off the address bar at once, so a reload does not offer it again.
      const { pathname, hash, search } = window.location;
      window.history.replaceState(window.history.state, '', `${pathname}${withoutRunParam(search)}${hash}`);
    }
  }
  return linkCommand;
}

/** Hands the link's command to whichever view shows it first. */
export function takeLinkCommand(): string | null {
  const command = peekLinkCommand();
  linkCommand = null;
  return command;
}
