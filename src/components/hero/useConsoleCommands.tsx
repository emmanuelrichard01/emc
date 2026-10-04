import React, { useMemo } from 'react';
import type { NavigateFunction } from 'react-router-dom';

import { PROJECTS } from '@/data/projects';
import { EXPERIENCE } from '@/data/experience';
import { describeSchema, describeTable, isQueryError, listTables, runQuery } from '@/lib/portfolioQuery';
import { CURATED_QUESTIONS } from '@/lib/portfolioQuestions';
import type { ColorTheme } from '@/components/ThemeProvider';
import type { DockMode } from '@/components/ai/modes';
import { CV_FILE_NAME, downloadCV } from '@/lib/cv';
import { navigateWithTransition } from '@/lib/viewTransition';
import { runAction } from '@/lib/aiActions';
import type { CaseSectionId } from '@/lib/aiProtocol';
import type { ArgKind, FlagHint } from '@/lib/shell/complete';
import { FILTERS, type FilterName } from '@/lib/shell/filters';
import {
  CONTACT_EMAIL,
  CORE_STACK,
  SITE_STACK,
  bodyText,
  displayPath,
  filterProjects,
  find,
  lookup,
  resolvePath,
  tree,
  type FsNode,
  type OpenTarget,
} from '@/lib/shell/fs';
import type { Word } from '@/lib/shell/parse';
import { buildRunLink } from '@/lib/shell/runLink';
import { errorLines, lines, type LinesOutput, type ShellOutput, type TableOutput } from '@/lib/shell/types';
import { STATUS_LABEL, projectStatus } from '@/lib/project';
import { measureFps, readDomNodes, readHeapMB } from './useSystemTelemetry';

/* ==========================================================================
   COMMAND REGISTRY

   One array is the source of truth for dispatch, `help`, `man`, completion,
   the argument hint under the prompt, and the reference the `?` helper is
   given (lib/shell/manual.ts, checked against this list by a test). Adding a
   command here makes it runnable, documented and completable at once.

   Commands return typed output (lib/shell/types.ts): lines and tables can
   be piped into grep, sort and the rest; a rendered card cannot, and says
   so. Each returns an exit status, so `cd x && ls` stops when `cd` fails.

   Commands may be synchronous, asynchronous or streaming. A streaming
   command receives an `emit` callback and an AbortSignal, so it can write
   output over time and stop cleanly on Ctrl+C.
   ========================================================================== */

export interface CommandContext {
  /** Text after the command name, exactly as typed. */
  arg: string;
  /** Arguments with flags removed (see `valued` on the spec). */
  args: string[];
  flags: Record<string, string | true>;
  words: Word[];
  /** Output of the command before this one in a pipe. */
  input?: LinesOutput | TableOutput;
  /** This command's output goes to another command, not to the screen. */
  piped: boolean;
  /** The working directory when the command started. */
  cwd: string;
  /** Write output as it happens, before the command finishes. */
  emit: (output: React.ReactNode | ShellOutput) => void;
  /** Aborted when the operator cancels. Long loops must check it. */
  signal: AbortSignal;
}

export interface CommandResult {
  /** Typed output. Preferred. */
  data?: ShellOutput;
  /** Legacy: a string prints as lines, anything else as a rendered node. */
  output?: React.ReactNode;
  /** Exit status. 0 when omitted. */
  status?: number;
  /** Suggested next commands, offered as tappable chips. */
  next?: string[];
  sideEffect?: () => void;
}

/* `undefined` rather than `void` for the empty case: TypeScript does not let
   you read a property off a `void` union even with optional chaining. */
export type CommandRun = (ctx: CommandContext) => CommandResult | undefined | Promise<CommandResult | undefined>;

export type Topic = 'navigate' | 'read' | 'search' | 'ask' | 'site' | 'query';

export interface CommandSpec {
  name: string;
  summary: string;
  topic: Topic;
  usage?: string;
  detail?: string;
  examples?: string[];
  /** Runnable, but absent from help and completion. */
  hidden?: boolean;
  requiresClearance?: boolean;
  /** Long-running: the console shows a cancel affordance while it runs. */
  streaming?: boolean;
  /** What the arguments are, for completion. */
  arg?: ArgKind;
  flags?: FlagHint[];
  /** Short flags and long flags that take a value (`-n 5`, `--name x`). */
  valued?: string[];
  /** Reads piped input. */
  filter?: boolean;
  run: CommandRun;
}

export const ALIASES: Record<string, string> = {
  '?': 'help',
  ll: 'ls',
  dir: 'ls',
  cv: 'resume',
  clr: 'clear',
  cls: 'clear',
  /* `queries` was called `ask` until the `ask ai` chip made the word
     ambiguous. Kept as an alias: it is the verb a visitor reaches for. */
  ask: 'queries',
  // The projects section is labelled "Work" in the nav and the hero chips.
  work: 'projects',
  less: 'cat',
  more: 'cat',
  // psql's own spelling, for anyone with the habit.
  '\\dt': '\\d',
};

/** Kept for anything that still asks which commands take a project id. */
export const ID_COMMANDS = new Set(['open', 'cat', 'cd']);

export const QUERY_EXAMPLES = [
  "SELECT title, stack FROM projects WHERE stack NOT LIKE '%Docker%'",
  'SELECT tier, COUNT(*) AS n FROM projects GROUP BY tier ORDER BY n DESC',
  "SELECT id FROM projects WHERE tier = 'design' OR stack LIKE '%Redis%'",
  "SELECT company, role, period FROM experience WHERE type = 'Contract'",
  'SELECT DISTINCT tier FROM projects',
];

export const UNLOCK_BANNER = [
  'ACCESS GRANTED: QUERY LAYER ONLINE',
  '',
  'This site keeps its projects and roles in tables. You can now read them',
  'directly, with SQL, against the same arrays that render the page.',
  '',
  '  schema                describe the tables (or \\d)',
  '  sql <query>           run a SELECT',
  '  theme phosphor        the accent that is not in the toggle',
  '',
  `  e.g.  sql ${QUERY_EXAMPLES[1]}`,
].join('\n');

const TELEMETRY_EXPLAINER = [
  'The status bar is measured, not simulated:',
  '',
  '  fps      frames this page actually painted in the last second',
  '  up       seconds since document start (performance.timeOrigin)',
  '  heap     used JS heap (Chromium only; falls back to DOM node count)',
  '',
  'No invented throughput figures. If a number moves, the browser moved it.',
  "Run 'watch' to stream the same readings live, or 'ping' to measure the network.",
];

const TOPICS: { id: Topic; label: string }[] = [
  { id: 'navigate', label: 'navigate' },
  { id: 'read', label: 'read' },
  { id: 'search', label: 'search' },
  { id: 'ask', label: 'ask' },
  { id: 'site', label: 'site' },
  { id: 'query', label: 'query' },
];

/** The five most useful commands, first in `help`. */
const START_HERE: [string, string, string][] = [
  ['ls', 'see what is here', 'ls'],
  ['cd projects', 'go into the work', 'cd projects'],
  ['cat <file>', 'read a file (try cat mmr-engine)', 'cat mmr-engine'],
  ['open <id>', 'open a case study on the page', 'man open'],
  ['ai', 'ask a question in your own words', 'ai'],
];

/* ── Helpers ────────────────────────────────────────────────────────────── */

/** Resolves for `ms`, or immediately when aborted. */
function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(finish, ms);

    function finish() {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    }
    signal.addEventListener('abort', finish, { once: true });
  });
}

function clockNow(): string {
  const now = new Date();
  return [now.getHours(), now.getMinutes(), now.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
}

const ok = (data: ShellOutput, extra: Omit<CommandResult, 'data'> = {}): CommandResult => ({ data, ...extra });
const fail = (message: string, status = 1, next?: string[]): CommandResult => ({ data: errorLines(message), status, next });

/** A path, or a project id from anywhere: `cat mmr-engine` works in any directory. */
function resolveTarget(cwd: string, arg: string): FsNode | null {
  const node = lookup(resolvePath(cwd, arg));
  if (node) return node;
  if (!arg.includes('/')) return lookup(`/projects/${arg.replace(/\/$/, '')}`);
  return null;
}

/** A path relative to where the visitor stands, for chips that read naturally. */
function relativeTo(cwd: string, path: string): string {
  if (cwd === '/') return path.slice(1);
  if (path.startsWith(`${cwd}/`)) return path.slice(cwd.length + 1);
  return displayPath(path);
}

/** The file a node prints: a file's body, or a project directory's readme. */
function fileOf(node: FsNode): FsNode | null {
  if (node.type === 'file') return node;
  if (node.path.startsWith('/projects/') && node.path.split('/').length === 3) {
    return node.children.find((c) => c.name === 'readme') ?? null;
  }
  return null;
}

function nodeOutput(node: FsNode & { type: 'file' }): LinesOutput {
  const body = node.body;
  if (body.kind === 'prose') return lines(body.paragraphs, { style: 'prose' });
  if (body.kind === 'code') return lines(body.code.split('\n'), { lang: body.lang });
  return lines(body.lines);
}

function readForFilter(ctx: CommandContext, index: number, name: string): LinesOutput | TableOutput | CommandResult {
  if (ctx.input) return ctx.input;
  const path = ctx.args[index];
  if (path === undefined) {
    return fail(`${name}: nothing to read. pipe something in, e.g. ls /projects | ${name}${name === 'grep' ? ' redis' : ''}`, 2);
  }
  const node = resolveTarget(ctx.cwd, path);
  const file = node && fileOf(node);
  if (!file || file.type !== 'file') return fail(`${name}: ${path}: no such file`, 1);
  return nodeOutput(file);
}

const isResult = (value: LinesOutput | TableOutput | CommandResult): value is CommandResult => !('kind' in value);

function projectsTable(projects = PROJECTS, long = false): TableOutput {
  const columns = long ? ['id', 'tier', 'status', 'year', 'tradeoffs', 'stack'] : ['id', 'tier', 'status', 'title'];
  return {
    kind: 'table',
    columns,
    rows: projects.map((p) =>
      long
        ? [p.id, p.tier, STATUS_LABEL[projectStatus(p)], p.timeline, p.caseStudy?.tradeoffs?.length ?? 0, p.stack.slice(0, 3).join(', ')]
        : [p.id, p.tier, STATUS_LABEL[projectStatus(p)], p.title]
    ),
    runs: projects.map((p) => `open ${p.id}`),
    footer: `${projects.length} system${projects.length === 1 ? '' : 's'}. Pick one to open its case study.`,
  };
}

function toCsv(columns: string[], rows: (string | number | boolean)[][]): string[] {
  const cell = (value: string | number | boolean) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [columns.map(cell).join(','), ...rows.map((row) => row.map(cell).join(','))];
}

/* ── whoami ─────────────────────────────────────────────────────────────── */

/* The mark in text: no box to keep square, since box drawing is the one
   thing a fallback font misaligns. */
const MARK = ['E·MC', '────', 'built', 'by em'];

function whoamiFacts(): [string, string][] {
  const studies = PROJECTS.filter((p) => p.caseStudy).length;
  const tradeoffs = PROJECTS.reduce((n, p) => n + (p.caseStudy?.tradeoffs?.length ?? 0), 0);
  return [
    ['role', 'Software & Data Engineer'],
    ['location', 'Abuja, Nigeria (UTC+1)'],
    ['status', 'open to new roles and projects'],
    ['work', `${PROJECTS.length} systems, ${studies} case studies, ${tradeoffs} trade-offs written down`],
    ['career', `${EXPERIENCE.length} roles`],
    ['stack', CORE_STACK.slice(0, 6).join(', ')],
    ['site', SITE_STACK.join(', ')],
    ['build', __COMMIT_SHA__],
  ];
}

const WhoamiCard = () => (
  <div className="flex flex-col sm:flex-row gap-x-6 gap-y-2 py-1">
    <pre aria-hidden="true" className="text-primary leading-[1.35] shrink-0 select-none">
      {MARK.join('\n')}
    </pre>
    <div className="min-w-0">
      <div className="text-foreground">
        <span className="text-primary">emmanuel</span>@builtbyem
      </div>
      <div className="text-muted-ghost" aria-hidden="true">
        ─────────────────
      </div>
      {whoamiFacts().map(([key, value]) => (
        <div key={key} className="flex gap-3 min-w-0">
          <span className="text-foreground/85 w-[8ch] shrink-0">{key}</span>
          <span className="text-muted-foreground break-words min-w-0">{value}</span>
        </div>
      ))}
    </div>
  </div>
);

/* ── Registry ───────────────────────────────────────────────────────────── */

export interface CommandDeps {
  navigate: NavigateFunction;
  setTheme: (theme: ColorTheme) => void;
  unlocked: boolean;
  unlock: (opts?: { silent?: boolean }) => void;
  relock: () => void;
  clearSession: () => void;
  getHistory: () => string[];
  /** Suppresses the duplicate unlock banner when `konami` prints it inline. */
  markAnnounced: () => void;
  setCwd: (path: string) => void;
  getPrevCwd: () => string;
  getLastStatus: () => number;
  /** The line run before this one, for `share` with no argument. */
  getLastLine: () => string | null;
  /** Opens the assistant dock, on a mode or with a question. Absent if there is no dock. */
  openAsk?: (options?: { question?: string; mode?: DockMode }) => void;
  /** `ai`: the hero switches its prompt to Ask; the console opens the dock. */
  enterAi: (question?: string) => void;
  /** Told when a command takes the visitor somewhere on the page. */
  onNavigate?: () => void;
}

export function buildCommands(deps: CommandDeps): CommandSpec[] {
  const {
    navigate,
    setTheme,
    unlocked,
    unlock,
    relock,
    clearSession,
    getHistory,
    markAnnounced,
    setCwd,
    getPrevCwd,
    getLastStatus,
    getLastLine,
    openAsk,
    enterAi,
    onNavigate,
  } = deps;

  // Populated below. `help` and `man` close over this same array reference,
  // so they can describe a registry they are themselves part of.
  const specs: CommandSpec[] = [];

  const listable = () => specs.filter((s) => !s.hidden && (!s.requiresClearance || unlocked));
  const findSpec = (name: string) => {
    const canonical = ALIASES[name] ?? name;
    return specs.find((s) => s.name === canonical && (!s.requiresClearance || unlocked));
  };

  const go = (target: OpenTarget) => {
    onNavigate?.();
    switch (target.kind) {
      case 'case':
        if (!target.section) navigateWithTransition(navigate, `/projects/${target.id}`);
        else void runAction({ kind: 'open-case', label: '', id: target.id, section: target.section as CaseSectionId }, navigate);
        return;
      case 'section':
        void runAction({ kind: 'go-to', label: '', section: target.section }, navigate);
        return;
      case 'role':
        void runAction({ kind: 'open-role', label: '', id: target.id }, navigate);
        return;
      case 'home':
        navigate('/');
        window.scrollTo({ top: 0 });
    }
  };

  const navTo = (id: 'about' | 'projects' | 'experience' | 'contact'): CommandSpec => ({
    name: id,
    topic: 'navigate',
    summary: `jump to the ${id} section`,
    run: () => ({ data: lines(`→ ${id}`), sideEffect: () => go({ kind: 'section', section: id }) }),
  });

  const themeNames: ColorTheme[] = unlocked ? ['amber', 'purple', 'phosphor'] : ['amber', 'purple'];

  const dockMode = (mode: DockMode, what: string): CommandRun => () =>
    openAsk
      ? { data: lines(`opening ${what} in the assistant...`), sideEffect: () => openAsk({ mode }) }
      : fail(`${what} lives in the assistant. use the Ask button on the page to open it.`);

  const filter = (name: FilterName, summary: string, usage: string, detail: string, examples: string[], valued: string[] = []): CommandSpec => ({
    name,
    topic: 'search',
    summary,
    usage,
    detail,
    examples,
    filter: true,
    arg: 'path',
    valued,
    run: (ctx) => {
      // grep's first argument is the pattern; for the rest, the file comes first.
      const fileIndex = name === 'grep' ? 1 : 0;
      const source = readForFilter(ctx, fileIndex, name);
      if (isResult(source)) return source;
      // A file argument is consumed here; the filter sees only its own options.
      const words = [...ctx.words];
      if (!ctx.input) {
        const at = words.map((w) => w.value).lastIndexOf(ctx.args[fileIndex]);
        if (at !== -1) words.splice(at, 1);
      }
      const { output, status } = FILTERS[name](words, source);
      return { data: output, status };
    },
  });

  specs.push(
    /* ── read ─────────────────────────────────────────────────────────── */
    {
      name: 'help',
      topic: 'read',
      summary: 'list commands, grouped by what they do',
      usage: 'help [topic]',
      examples: ['help', 'help search'],
      run: ({ args }) => {
        const topic = args[0]?.toLowerCase();
        const available = listable();
        if (topic) {
          const group = available.filter((s) => s.topic === topic);
          if (!group.length) return fail(`no topic '${topic}'. topics: ${TOPICS.filter((t) => t.id !== 'query' || unlocked).map((t) => t.label).join(', ')}`, 2);
          const width = Math.max(...group.map((s) => s.name.length)) + 4;
          return ok(lines(group.map((s) => `${s.name.padEnd(width)}${s.summary}`), { runs: group.map((s) => `man ${s.name}`) }));
        }

        const out: string[] = ['start here'];
        const runs: (string | undefined)[] = [undefined];
        for (const [cmd, what, run] of START_HERE) {
          out.push(`  ${cmd.padEnd(16)}${what}`);
          runs.push(run);
        }
        out.push('');
        runs.push(undefined);
        for (const { id, label } of TOPICS) {
          const names = available.filter((s) => s.topic === id).map((s) => s.name);
          if (id === 'ask') names.splice(1, 0, '? <words>');
          if (!names.length) continue;
          out.push(`${label.padEnd(10)}${names.join('  ')}`);
          runs.push(`help ${id}`);
        }
        out.push('', 'man <command> for detail. Tab completes, ↑ recalls, Ctrl+R searches.', '? <words> asks for a command. The backtick key opens this on any page.');
        runs.push(undefined, undefined, undefined);
        return ok(lines(out, { runs }), { next: ['ls', 'whoami', 'cd projects'] });
      },
    },
    {
      name: 'man',
      topic: 'read',
      summary: 'the manual page for a command',
      usage: 'man <command>',
      arg: 'command',
      examples: ['man ls', 'man grep'],
      run: ({ args }) => {
        if (!args[0]) return fail('usage: man <command>', 2);
        const spec = findSpec(args[0].toLowerCase());
        if (!spec) return fail(`no manual entry for ${args[0]}`);
        const out = [`NAME`, `    ${spec.name}: ${spec.summary}`, '', 'SYNOPSIS', ...(spec.usage ?? spec.name).split('\n').map((u) => `    ${u}`)];
        const runs: (string | undefined)[] = out.map(() => undefined);
        if (spec.detail) {
          out.push('', 'DESCRIPTION', ...spec.detail.split('\n').map((d) => (d ? `    ${d}` : '')));
        }
        if (spec.flags?.length) {
          out.push('', 'OPTIONS', ...spec.flags.map((f) => `    ${f.name.padEnd(12)}${f.summary ?? ''}`));
        }
        while (runs.length < out.length) runs.push(undefined);
        if (spec.examples?.length) {
          out.push('', 'EXAMPLES');
          runs.push(undefined, undefined);
          for (const example of spec.examples) {
            out.push(`    ${example}`);
            runs.push(example);
          }
        }
        return ok(lines(out, { runs }));
      },
    },
    {
      name: 'cat',
      topic: 'read',
      summary: 'print a file',
      usage: 'cat <file> [file ...]\ncat <project-id>     the project readme, from anywhere',
      detail: 'Prose prints at reading width; code prints highlighted. A project id or a project directory prints its readme.',
      arg: 'target',
      examples: ['cat mmr-engine', 'cat /projects/mmr-engine/tradeoffs', 'cat /about/principles', 'cat contact'],
      run: (ctx) => {
        if (ctx.input) return ok(ctx.input);
        if (!ctx.args.length) return fail("usage: cat <file>. run 'ls' to see what is here.", 2);

        const outputs: LinesOutput[] = [];
        let last: FsNode | null = null;
        for (const path of ctx.args) {
          const node = resolveTarget(ctx.cwd, path);
          if (!node) return fail(`cat: ${path}: no such file. run 'ls' to see what is here.`, 1, ['ls']);
          const file = fileOf(node);
          if (!file || file.type !== 'file') return fail(`cat: ${path}: is a directory. try 'ls ${path}'`, 1, [`ls ${path}`]);
          outputs.push(nodeOutput(file));
          last = file;
        }

        const output = outputs.length === 1 ? outputs[0] : lines(outputs.flatMap((o) => o.lines), { style: outputs[0].style });
        const file = last as FsNode & { type: 'file' };

        if (!ctx.piped && file.body.kind === 'code' && outputs.length === 1) {
          if (file.body.caption) ctx.emit(lines(file.body.caption, { style: 'muted' }));
        }

        // Siblings worth reading next, and the page this file comes from.
        const parent = lookup(file.path.slice(0, file.path.lastIndexOf('/')) || '/');
        const next: string[] = [];
        if (parent?.type === 'dir' && file.path.startsWith('/projects/')) {
          const id = file.path.split('/')[2];
          const siblings = parent.children.filter((c) => c.type === 'file' && c.name !== file.name).slice(0, 2);
          for (const s of siblings) next.push(`cat ${relativeTo(ctx.cwd, s.path)}`);
          next.push(`open ${id}`);
        } else if (file.path.startsWith('/career/')) {
          next.push(`open ${relativeTo(ctx.cwd, parent?.path ?? '/career')}`);
        }

        const href = file.body.kind === 'code' ? file.body.href : undefined;
        if (!ctx.piped && href) {
          return ok(output, {
            next,
            sideEffect: () => ctx.emit(lines(`source: ${href.replace(/^https:\/\//, '')}`, { style: 'muted' })),
          });
        }
        return ok(output, { next });
      },
    },
    {
      name: 'whoami',
      topic: 'read',
      summary: 'who runs this terminal',
      detail: 'A card with the live counts: the numbers are read from the same data the page renders.',
      run: () => ({
        data: {
          kind: 'node',
          node: <WhoamiCard />,
          text: ['emmanuel@builtbyem', ...whoamiFacts().map(([k, v]) => `${k.padEnd(10)}${v}`)].join('\n'),
        },
        next: ['ls', 'cat contact', 'resume'],
      }),
    },
    {
      name: 'stack',
      topic: 'read',
      summary: 'core tech stack',
      run: () => ok(lines(CORE_STACK), { next: ['cat /about/stack', 'ls /projects --stack=Redis'] }),
    },
    {
      name: 'history',
      topic: 'read',
      summary: 'show recent commands',
      detail: 'Persisted across visits, capped at the last 50. Tap one to run it again, or press Ctrl+R at the prompt to search it.',
      run: () => {
        const history = getHistory();
        if (!history.length) return ok(lines('no commands yet.', { style: 'muted' }));
        return ok(lines(history.map((cmd, i) => `${String(i + 1).padStart(4)}  ${cmd}`), { runs: [...history] }));
      },
    },
    {
      name: 'echo',
      topic: 'read',
      summary: 'print text ($? is the last exit status)',
      usage: 'echo <text>',
      examples: ['echo $?', 'cd nowhere && echo found'],
      run: ({ args }) => ok(lines(args.join(' ').replace(/\$\?/g, String(getLastStatus())))),
    },
    {
      name: 'build',
      topic: 'site',
      summary: 'show the deployed build',
      detail: 'Commit SHA and timestamp are inlined at build time, so this reports the real deployment.',
      run: () =>
        ok(
          lines([
            `commit    ${__COMMIT_SHA__}`,
            `built     ${new Date(__BUILD_TIME__).toLocaleString()}`,
            `mode      ${import.meta.env.MODE}`,
            `viewport  ${window.innerWidth}×${window.innerHeight} @ ${window.devicePixelRatio}x`,
          ])
        ),
    },
    {
      name: 'telemetry',
      topic: 'site',
      summary: 'explain the status bar numbers',
      run: () => ok(lines(TELEMETRY_EXPLAINER), { next: ['watch', 'ping'] }),
    },

    /* ── navigate ─────────────────────────────────────────────────────── */
    {
      name: 'pwd',
      topic: 'navigate',
      summary: 'print the working directory',
      run: ({ cwd }) => ok(lines(displayPath(cwd))),
    },
    {
      name: 'cd',
      topic: 'navigate',
      summary: 'change directory',
      usage: 'cd [dir]     no argument goes home (~)\ncd -         back to the previous directory',
      detail: 'Paths can be absolute (/projects), relative (../career) or start at ~. A project id works from anywhere.',
      arg: 'dir',
      examples: ['cd projects', 'cd mmr-engine', 'cd ..', 'cd -', 'cd ~/career'],
      run: ({ args, cwd }) => {
        const arg = args[0] ?? '~';
        const target = arg === '-' ? getPrevCwd() : null;
        const node = target !== null ? lookup(target) : resolveTarget(cwd, arg);
        if (!node) return fail(`cd: ${arg}: no such directory`, 1, ['ls']);
        if (node.type !== 'dir') return fail(`cd: ${arg}: not a directory. try 'cat ${arg}'`, 1, [`cat ${arg}`]);
        setCwd(node.path);
        const isProject = node.path.split('/').length === 3 && node.path.startsWith('/projects/');
        return {
          data: arg === '-' ? lines(displayPath(node.path)) : undefined,
          next: isProject ? ['cat readme', 'ls', 'open .'] : ['ls', 'tree -L 2'],
        };
      },
    },
    {
      name: 'ls',
      topic: 'navigate',
      summary: 'list a directory',
      usage: 'ls [-l] [path]\nls /projects [--stack=X[,Y]] [--tier=T]',
      detail: [
        'In ~/projects the listing is a table: id, tier, status and title. Status is',
        'derived from the links each project actually has, so it always matches',
        'the cards. Tap a row to open its case study.',
        '',
        'Pipe it: ls /projects | grep -i redis, ls -l /projects | sort -k tradeoffs -r',
      ].join('\n'),
      arg: 'path',
      flags: [
        { name: '-l', summary: 'long format' },
        { name: '--stack', values: 'tech', summary: 'projects using this technology (comma for several)' },
        { name: '--tier', values: 'tier', summary: 'flagship, production, system or design' },
      ],
      valued: ['stack', 'tier'],
      examples: ['ls', 'ls -l /projects', 'ls /projects --stack=Redis', 'ls /projects --tier=design', 'ls /projects | grep -i python'],
      run: ({ args, flags, cwd }) => {
        const arg = args[0];
        const node = arg ? resolveTarget(cwd, arg) : lookup(cwd);
        if (!node) return fail(`ls: ${arg}: no such file or directory`, 1);
        if (node.type === 'file') return ok(lines(relativeTo(cwd, node.path) || node.name, { runs: [`cat ${relativeTo(cwd, node.path)}`] }));

        const long = flags.l === true;
        const stack = typeof flags.stack === 'string' ? flags.stack : undefined;
        const tier = typeof flags.tier === 'string' ? flags.tier : undefined;

        if (node.path === '/projects') {
          const projects = stack || tier ? filterProjects({ stack, tier }) : PROJECTS;
          if (!projects.length) {
            return fail(`no projects match${stack ? ` stack=${stack}` : ''}${tier ? ` tier=${tier}` : ''}.`, 1, ['ls /projects']);
          }
          const filterFlags = `${stack ? ` --stack=${stack}` : ''}${tier ? ` --tier=${tier}` : ''}`;
          return ok(projectsTable(projects, long), {
            next: [`cd ${projects[0].id}`, filterFlags ? `open /projects${filterFlags}` : 'ls -l /projects', 'tree -L 2 /projects'].slice(0, 3),
          });
        }
        if (stack || tier) return fail('ls: --stack and --tier filter ~/projects only', 2, ['ls /projects --stack=Redis']);

        const rel = relativeTo(cwd, node.path);
        const prefix = rel ? `${rel}/` : '';
        const run = (child: FsNode) => (child.type === 'dir' ? `cd ${prefix}${child.name}` : `cat ${prefix}${child.name}`);

        if (long) {
          return ok({
            kind: 'table',
            columns: ['type', 'size', 'name', 'about'],
            rows: node.children.map((child) => [
              child.type === 'dir' ? 'dir' : 'file',
              child.type === 'dir' ? `${child.children.length} items` : `${bodyText(child.body).length} lines`,
              `${child.name}${child.type === 'dir' ? '/' : ''}`,
              child.type === 'dir' ? child.note ?? '' : '',
            ]),
            runs: node.children.map(run),
            footer: `${node.children.length} entries`,
          });
        }

        const width = Math.max(...node.children.map((c) => c.name.length)) + 3;
        return ok(
          lines(
            node.children.map((child) =>
              child.type === 'dir' && child.note ? `${`${child.name}/`.padEnd(width)}${child.note}` : `${child.name}${child.type === 'dir' ? '/' : ''}`
            ),
            { runs: node.children.map(run) }
          ),
          { next: node.path === '/' ? ['cd projects', 'cat contact', 'tree -L 2'] : node.children.slice(0, 2).map(run) }
        );
      },
    },
    {
      name: 'tree',
      topic: 'navigate',
      summary: 'draw a directory as a tree',
      usage: 'tree [-L depth] [path]',
      arg: 'dir',
      flags: [{ name: '-L', summary: 'how many levels deep to draw' }],
      valued: ['L'],
      examples: ['tree -L 2', 'tree /projects/mmr-engine', 'tree /career'],
      run: ({ args, flags, cwd }) => {
        const node = args[0] ? resolveTarget(cwd, args[0]) : lookup(cwd);
        if (!node) return fail(`tree: ${args[0]}: no such directory`);
        if (node.type !== 'dir') return fail(`tree: ${args[0]}: not a directory`);
        const depth = flags.L === undefined ? Infinity : Number(flags.L);
        if (!Number.isInteger(depth) && depth !== Infinity) return fail('usage: tree [-L depth] [path]', 2);
        const drawn = tree(node, depth);
        const runs = drawn.paths.map((path, i) => {
          if (i === 0) return undefined;
          const target = lookup(path);
          return target?.type === 'dir' ? `cd ${displayPath(path)}` : `cat ${displayPath(path)}`;
        });
        return ok(
          lines([...drawn.lines, '', `${drawn.dirs} directories, ${drawn.files} files`], { runs: [...runs, undefined, undefined] }),
          { next: ['find -name "*.py"', 'find --grep=idempotent'] }
        );
      },
    },
    {
      name: 'open',
      topic: 'navigate',
      summary: 'open a project, file or section on the page',
      usage: 'open <id|path>\nopen .                where you are\nopen /projects --stack=X   the Work index, filtered',
      detail: 'A project opens its case study; a file opens the case study at that section; a role opens it in the career list.',
      arg: 'target',
      flags: [
        { name: '--stack', values: 'tech', summary: 'with /projects: filter the Work index' },
        { name: '--tier', values: 'tier', summary: 'with /projects: filter the Work index' },
      ],
      valued: ['stack', 'tier'],
      examples: ['open mmr-engine', 'open .', 'open /projects/mmr-engine/tradeoffs', 'open /projects --stack=Redis'],
      run: ({ args, flags, cwd }) => {
        const arg = args[0];
        if (!arg) return fail("usage: open <id|path>. run 'ls' to see what is here.", 2);
        const node = resolveTarget(cwd, arg);
        if (!node) return fail(`open: ${arg}: nothing to open. run 'ls' for ids.`, 1, ['ls /projects']);

        const stack = typeof flags.stack === 'string' ? flags.stack.split(',').map((s) => s.trim()) : undefined;
        const tier = typeof flags.tier === 'string' ? flags.tier.toLowerCase() : undefined;
        if (node.path === '/projects' && (stack || tier)) {
          return {
            data: lines(`opening the Work index${stack ? `, stack ${stack.join(' + ')}` : ''}${tier ? `, tier ${tier}` : ''}...`),
            sideEffect: () => {
              onNavigate?.();
              void runAction(
                { kind: 'show-work', label: '', stack, tier: tier as 'flagship' | 'production' | 'system' | 'design' | undefined },
                navigate
              );
            },
          };
        }

        const project = node.path.startsWith('/projects/') ? PROJECTS.find((p) => p.id === node.path.split('/')[2]) : undefined;
        const label = project ? project.title : displayPath(node.path);
        return { data: lines(`opening ${label}...`), sideEffect: () => go(node.open) };
      },
    },
    navTo('about'),
    navTo('projects'),
    navTo('experience'),
    navTo('contact'),

    /* ── search ───────────────────────────────────────────────────────── */
    {
      name: 'find',
      topic: 'search',
      summary: 'find files by name or by what they say',
      usage: 'find [path] [-name <glob>] [--grep=<text>] [-type f|d]',
      detail: 'Searches below a directory (default: here). -name matches the file name with * and ?; --grep matches the contents, ignoring case.',
      arg: 'dir',
      flags: [
        { name: '-name', summary: 'file name glob, e.g. "*.py"' },
        { name: '--grep', summary: 'text the file contains' },
        { name: '-type', values: ['f', 'd'], summary: 'f for files, d for directories' },
      ],
      valued: ['name', 'grep', 'type'],
      examples: ['find / -name "*.py"', 'find /projects --grep=idempotent', 'find ~/career -name stack'],
      run: ({ words, cwd }) => {
        // `find` takes single-dash long options (-name), which getopt would
        // read as letters, so they are read here by hand.
        let start: string | undefined;
        const options: { name?: string; grep?: string; type?: 'f' | 'd' } = {};
        for (let i = 0; i < words.length; i++) {
          const w = words[i].value;
          const take = () => words[++i]?.value;
          if (w === '-name' || w === '--name') options.name = take();
          else if (w.startsWith('--name=')) options.name = w.slice(7);
          else if (w === '-grep' || w === '--grep') options.grep = take();
          else if (w.startsWith('--grep=')) options.grep = w.slice(7);
          else if (w === '-type' || w === '--type') options.type = take() === 'd' ? 'd' : 'f';
          else if (start === undefined) start = w;
          else return fail(`find: unexpected '${w}'. usage: find [path] [-name glob] [--grep=text]`, 2);
        }
        const root = start ? resolveTarget(cwd, start) : lookup(cwd);
        if (!root) return fail(`find: ${start}: no such directory`);
        const hits = find(root, options);
        if (!hits.length) return fail('find: nothing matched.', 1, options.grep ? ['find / --grep=' + options.grep] : ['tree -L 2']);
        return ok(
          lines(
            hits.map((n) => `${displayPath(n.path)}${n.type === 'dir' ? '/' : ''}`),
            { runs: hits.map((n) => (n.type === 'dir' ? `cd ${displayPath(n.path)}` : `cat ${displayPath(n.path)}`)) }
          ),
          { next: hits[0].type === 'file' ? [`cat ${displayPath(hits[0].path)}`] : [] }
        );
      },
    },
    filter(
      'grep',
      'keep lines that match',
      'grep [-i] [-v] [-c] <pattern> [file]',
      'Reads piped input, or a file. The pattern is a regular expression; one that does not compile is matched as plain text. A table keeps its header. Exits 1 when nothing matches, which stops an && chain.',
      ['ls /projects | grep -i redis', 'cat /about/principles | grep -i test', 'history | grep -c ls'],
      ['e']
    ),
    filter('head', 'the first lines (10 by default)', 'head [-n N] [file]', 'Reads piped input, or a file.', ['ls /projects | head -n 3', 'head -5 /projects/mmr-engine/code/matching.py'], ['n']),
    filter('tail', 'the last lines (10 by default)', 'tail [-n N] [file]', 'Reads piped input, or a file.', ['history | tail -n 5'], ['n']),
    filter(
      'sort',
      'sort lines, or a table by a column',
      'sort [-r] [-n] [-k column] [file]',
      'A table sorts by a column, named or numbered from 1 (default: the first); numbers sort as numbers. Lines sort as text, or as numbers with -n.',
      ['ls /projects | sort -k status', 'ls -l /projects | sort -k tradeoffs -r', 'cat /projects/mmr-engine/stack | sort'],
      ['k', 'by']
    ),
    filter('uniq', 'drop repeated adjacent lines', 'uniq [-c] [file]', 'Like uniq, only repeats directly above are dropped, so sort first.', ['history | sort | uniq -c']),
    filter('wc', 'count lines, words and characters', 'wc [-l] [-w] [-c] [file]', 'With no flag prints all three, as wc does.', ['ls /projects | wc -l', 'wc -w /projects/mmr-engine/approach']),

    /* ── ask ──────────────────────────────────────────────────────────── */
    {
      name: 'ai',
      topic: 'ask',
      summary: 'ask questions in plain english',
      usage: 'ai [question]   (esc to leave)',
      detail: [
        'Switches the prompt into a grounded question-answering mode.',
        '',
        'The model does not answer from memory. It looks the facts up on this site:',
        'every count, metric and status comes from the same data this page renders,',
        'and each answer can show the evidence it was built from.',
        '',
        'This is the billed, rate-limited tier. For counts and filters, `queries`',
        'answers a prepared set instantly, and always works.',
      ].join('\n'),
      examples: ['ai', 'ai what has he shipped?'],
      run: ({ arg }) => ({
        data: lines('now talking to the assistant. press esc to go back.'),
        sideEffect: () => enterAi(arg || undefined),
      }),
    },
    {
      name: 'queries',
      topic: 'ask',
      summary: 'answer a prepared question about this work',
      usage: 'queries        list the questions\nqueries <n>    answer one',
      detail: [
        'Prepared queries against the tables the site renders from. Each answer',
        'shows the SQL that produced it, so the number is visibly derived.',
        '',
        'For a question that is not on this list, `ai` answers in plain english.',
      ].join('\n'),
      examples: ['queries', 'queries 1'],
      run: ({ args, emit, piped }) => {
        if (!args[0]) {
          return ok(
            lines(
              [
                `${CURATED_QUESTIONS.length} questions. pick one, or run 'queries <n>'.`,
                ...CURATED_QUESTIONS.map((entry, i) => `${String(i + 1).padStart(2)}  ${entry.question}`),
                '→ or run `ai` to ask in your own words',
              ],
              { runs: [undefined, ...CURATED_QUESTIONS.map((_, i) => `queries ${i + 1}`), 'ai'] }
            )
          );
        }
        const entry = CURATED_QUESTIONS[Number.parseInt(args[0], 10) - 1];
        if (!entry) return fail(`no question ${args[0]}. run 'queries' for the list.`, 2, ['queries']);
        const result = runQuery(entry.sql);
        // A broken prepared query is a bug in this list, not visitor error.
        if (isQueryError(result)) return fail(`prepared query failed: ${result.error}`);
        if (!piped) {
          emit(lines(entry.question));
          emit(lines(entry.sql, { lang: 'sql', style: 'muted' }));
        }
        return ok({ kind: 'table', columns: result.columns, rows: result.rows, footer: `→ ${entry.answer(result.rowCount)}` });
      },
    },
    {
      name: 'fit',
      topic: 'ask',
      summary: 'check a job description against the work',
      detail: 'Opens Role fit in the assistant: paste a job description and each requirement is checked against evidence quoted from this site.',
      run: dockMode('fit', 'role fit'),
    },
    {
      name: 'brief',
      topic: 'ask',
      summary: 'turn a project idea into a brief',
      detail: 'Opens Project in the assistant: describe what you need, and it drafts a brief you can send.',
      run: dockMode('brief', 'the project brief'),
    },
    {
      name: 'tour',
      topic: 'ask',
      summary: 'a guided tour of the work',
      detail: 'Opens the guided tour in the assistant. It moves the page one step at a time, only when you say so.',
      run: dockMode('tour', 'the guided tour'),
    },

    /* ── site ─────────────────────────────────────────────────────────── */
    {
      name: 'ping',
      topic: 'site',
      summary: 'measure latency to this origin',
      usage: 'ping  (Ctrl+C to stop)',
      streaming: true,
      detail: 'Issues four real same-origin requests for a small static asset and reports each round trip.',
      run: async ({ emit, signal }) => {
        const host = window.location.host;
        emit(lines(`PING ${host}: 4 × GET /favicon.svg`));

        const times: number[] = [];
        for (let seq = 1; seq <= 4 && !signal.aborted; seq++) {
          const start = performance.now();
          try {
            // Cache-busted and no-store, or every reply after the first
            // would report the cache's latency rather than the network's.
            await fetch(`/favicon.svg?ping=${Date.now()}-${seq}`, { cache: 'no-store', signal });
            const ms = performance.now() - start;
            times.push(ms);
            emit(lines(`reply from ${host}: seq=${seq} time=${ms.toFixed(1)}ms`));
          } catch {
            if (signal.aborted) break;
            emit(lines(`seq=${seq}: no reply`));
          }
          await delay(280, signal);
        }

        if (!times.length) return { status: 1 };
        const min = Math.min(...times);
        const max = Math.max(...times);
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        return ok(lines(`${times.length} received. min/avg/max = ${min.toFixed(1)}/${avg.toFixed(1)}/${max.toFixed(1)} ms`));
      },
    },
    {
      name: 'watch',
      topic: 'site',
      summary: 'stream live telemetry',
      usage: 'watch  (Ctrl+C to stop)',
      streaming: true,
      detail: 'Samples the render loop once a second and prints it as it happens. Runs until cancelled.',
      run: async ({ emit, signal }) => {
        emit(lines('sampling once per second. press Ctrl+C to stop.'));
        let samples = 0;
        while (!signal.aborted) {
          const fps = await measureFps(1000, signal);
          if (signal.aborted) break;
          samples++;
          const heap = readHeapMB();
          emit(
            lines(
              `${clockNow()}   fps ${String(fps).padStart(3)}   heap ${heap === null ? '   n/a' : `${heap.toFixed(1).padStart(5)}mb`}   nodes ${readDomNodes()}`
            )
          );
        }
        return ok(lines(`watch stopped after ${samples} sample${samples === 1 ? '' : 's'}.`));
      },
    },
    {
      name: 'email',
      topic: 'site',
      summary: 'copy the contact address',
      run: ({ emit }) => ({
        data: lines(CONTACT_EMAIL),
        sideEffect: () => {
          // Only claim success once the write actually resolves.
          navigator.clipboard
            ?.writeText(CONTACT_EMAIL)
            .then(() => emit(lines('copied to clipboard.', { style: 'muted' })))
            .catch(() => emit(lines('could not copy. select the address above to copy it.', { style: 'muted' })));
        },
      }),
    },
    {
      name: 'resume',
      topic: 'site',
      summary: 'download the CV',
      usage: 'resume  (alias: cv)',
      run: () => ({ data: lines(`downloading ${CV_FILE_NAME}...`), sideEffect: downloadCV }),
    },
    {
      name: 'share',
      topic: 'site',
      summary: 'copy a link that types a command for someone',
      usage: 'share            the last command\nshare <command>  that command',
      detail: 'The link opens this site with the command typed at the prompt and a Run button. Nothing runs until the person who opens it says so.',
      examples: ['share', 'share ls /projects --stack=Redis'],
      run: ({ arg, emit }) => {
        const line = arg || getLastLine();
        if (!line) return fail('share: nothing to share yet. run a command first, or share <command>.', 2);
        const link = buildRunLink(window.location.origin, line);
        return {
          data: lines(link),
          sideEffect: () => {
            navigator.clipboard
              ?.writeText(link)
              .then(() => emit(lines('link copied. it types the command; it never runs it.', { style: 'muted' })))
              .catch(() => emit(lines('could not copy. select the link above to copy it.', { style: 'muted' })));
          },
        };
      },
    },
    {
      name: 'theme',
      topic: 'site',
      summary: 'switch accent colour',
      usage: `theme <${themeNames.join('|')}>`,
      detail: 'A third accent exists. It stays out of this list until you have clearance.',
      arg: 'theme',
      run: ({ args }) => {
        const name = (args[0] ?? '').toLowerCase();
        if ((themeNames as string[]).includes(name)) {
          return { data: lines(`theme → ${name}`), sideEffect: () => setTheme(name as ColorTheme) };
        }
        if (name === 'phosphor') return fail('theme locked: insufficient clearance.');
        return fail(`usage: theme <${themeNames.join('|')}>`, 2);
      },
    },
    {
      name: 'clear',
      topic: 'site',
      summary: "clear this session's output",
      usage: 'clear  (Ctrl+L)',
      run: () => ({ sideEffect: clearSession }),
    },

    /* ── query (clearance) ────────────────────────────────────────────── */
    {
      name: 'schema',
      topic: 'query',
      summary: 'describe the queryable tables',
      requiresClearance: true,
      detail: 'Columns, types and what each holds. Every table is built from the live site data.',
      run: () => ok(lines(describeSchema()), { next: ['\\d projects', `sql ${QUERY_EXAMPLES[1]}`] }),
    },
    {
      name: '\\d',
      topic: 'query',
      summary: 'list tables, or describe one',
      usage: '\\d            list the tables\n\\d <table>    describe one',
      requiresClearance: true,
      arg: 'table',
      examples: ['\\d', '\\d projects', '\\d tradeoffs'],
      run: ({ args }) => {
        if (!args[0]) return ok(lines(listTables()), { next: ['\\d projects'] });
        const described = describeTable(args[0]);
        return described ? ok(lines(described)) : fail(`\\d: no table '${args[0]}'. run \\d for the list.`);
      },
    },
    {
      name: 'sql',
      topic: 'query',
      summary: 'query this site with SELECT',
      usage: 'sql [--csv] SELECT <cols|*> FROM <table> [WHERE ...] [GROUP BY col] [ORDER BY ...] [LIMIT n] [OFFSET n]',
      requiresClearance: true,
      arg: 'sql',
      flags: [{ name: '--csv', summary: 'print the result as CSV' }],
      detail: [
        'Runs against the same arrays that render the page, so a result can never',
        'disagree with what you see. The `sql` prefix is optional.',
        '',
        'Operators: =  !=  <>  >  <  >=  <=  LIKE  NOT LIKE  IN  NOT IN',
        'Conditions combine with AND and OR (AND binds tighter), grouped with ( ).',
        'COUNT(*) and COUNT(col), GROUP BY one column, DISTINCT, ORDER BY several',
        'columns, LIMIT and OFFSET. No JOIN, HAVING or subqueries.',
        '',
        'Results are tables, so they pipe: ... | sort -k n -r | head -n 3',
      ].join('\n'),
      examples: QUERY_EXAMPLES.map((q) => `sql ${q}`),
      run: ({ arg, words }) => {
        const csv = words.some((w) => !w.quoted && w.value === '--csv');
        const query = csv ? arg.replace(/(^|\s)--csv(?=\s|$)/, ' ').trim() : arg;
        if (!query) {
          return ok(lines(['usage: sql <SELECT query>', '', 'try:', ...QUERY_EXAMPLES.map((q) => `  ${q}`)], {
            runs: [undefined, undefined, undefined, ...QUERY_EXAMPLES.map((q) => `sql ${q}`)],
          }));
        }
        const result = runQuery(query);
        if (isQueryError(result)) return fail(`error: ${result.error}`, 1, ['schema']);
        if (csv) return ok(lines(toCsv(result.columns, result.rows)));
        return ok({ kind: 'table', columns: result.columns, rows: result.rows });
      },
    },
    {
      name: 'lock',
      topic: 'query',
      summary: 'revoke your own clearance',
      requiresClearance: true,
      detail: 'Clears stored clearance and resets the accent if you were using the hidden one.',
      run: () => ({ data: lines('clearance revoked.'), sideEffect: relock }),
    },

    /* ── hidden ───────────────────────────────────────────────────────── */
    {
      name: 'konami',
      topic: 'site',
      summary: 'you already know',
      hidden: true,
      run: () =>
        unlocked
          ? ok(lines("already unlocked. try 'schema' or 'sql'."))
          : {
              data: lines(UNLOCK_BANNER),
              sideEffect: () => {
                markAnnounced();
                unlock({ silent: true });
              },
            },
    },
    {
      name: 'sudo',
      topic: 'site',
      summary: 'nice try',
      hidden: true,
      run: () => fail('permission denied: this incident will be reported.'),
    },
    {
      name: 'exit',
      topic: 'site',
      summary: 'there is no exit',
      hidden: true,
      run: () => ok(lines("this terminal has no exit. try 'clear'.")),
    }
  );

  return specs;
}

export function useConsoleCommands(deps: CommandDeps): CommandSpec[] {
  const {
    navigate,
    setTheme,
    unlocked,
    unlock,
    relock,
    clearSession,
    getHistory,
    markAnnounced,
    setCwd,
    getPrevCwd,
    getLastStatus,
    getLastLine,
    openAsk,
    enterAi,
    onNavigate,
  } = deps;

  return useMemo(
    () =>
      buildCommands({
        navigate,
        setTheme,
        unlocked,
        unlock,
        relock,
        clearSession,
        getHistory,
        markAnnounced,
        setCwd,
        getPrevCwd,
        getLastStatus,
        getLastLine,
        openAsk,
        enterAi,
        onNavigate,
      }),
    [clearSession, enterAi, getHistory, getLastLine, getLastStatus, getPrevCwd, markAnnounced, navigate, onNavigate, openAsk, relock, setCwd, setTheme, unlock, unlocked]
  );
}
