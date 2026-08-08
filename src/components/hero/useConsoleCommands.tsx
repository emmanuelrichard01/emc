import React, { useMemo } from 'react';

import { PROJECTS } from '@/data/projects';
import { STATUS_CLASS, STATUS_LABEL, projectStatus } from '@/lib/project';
import { describeSchema, isQueryError, runQuery, type QueryResult } from '@/lib/portfolioQuery';
import { CURATED_QUESTIONS } from '@/lib/portfolioQuestions';
import type { ColorTheme } from '@/components/ThemeProvider';
import { CV_FILE_NAME, downloadCV } from '@/lib/cv';
import { scrollToSection } from '@/lib/scrollToSection';
import { measureFps, readDomNodes, readHeapMB } from './useSystemTelemetry';

/* ==========================================================================
   COMMAND REGISTRY

   One array is the source of truth for dispatch, `help`, `man`, tab
   completion and alias resolution. Adding a command here makes it runnable,
   documented and completable at once — the four cannot drift apart, which is
   exactly what happens when they are four separate lists.

   Commands may be synchronous, asynchronous, or streaming. A streaming
   command receives an `emit` callback and an AbortSignal, so it can write
   output over time and stop cleanly when the operator hits Ctrl+C.
   ========================================================================== */

export interface CommandContext {
  /** Raw argument text, original case preserved. */
  arg: string;
  /** Write a line to the session as it happens, before the command finishes. */
  emit: (node: React.ReactNode) => void;
  /** Aborted when the operator cancels. Long loops must check it. */
  signal: AbortSignal;
}

export interface CommandResult {
  /** Final block to print. Omit to print nothing. */
  output?: React.ReactNode;
  sideEffect?: () => void;
}

/* `undefined` rather than `void` for the empty case: TypeScript does not let
   you read a property off a `void` union even with optional chaining, so the
   caller could not ask "did this produce output?" without a cast. */
export type CommandRun = (
  ctx: CommandContext
) => CommandResult | undefined | Promise<CommandResult | undefined>;

export interface CommandSpec {
  name: string;
  summary: string;
  usage?: string;
  detail?: string;
  /** Runnable, but absent from help and completion. */
  hidden?: boolean;
  requiresClearance?: boolean;
  /** Long-running: the console shows a cancel affordance while it runs. */
  streaming?: boolean;
  run: CommandRun;
}

export const ALIASES: Record<string, string> = {
  '?': 'help',
  ll: 'ls',
  cv: 'resume',
  clr: 'clear',
  cls: 'clear',
  man: 'man',
  // The projects section is labelled "Work" in the nav and the hero chips, so
  // the word a visitor actually sees has to resolve to something.
  work: 'projects',
  projects: 'projects',
};

/** Commands whose argument is a project id, for completion purposes. */
export const ID_COMMANDS = new Set(['open', 'cat']);

const EMAIL = 'emma.moghalu@gmail.com';

const TECH_STACK_SHORT = ['Python', 'TypeScript', 'React', 'PostgreSQL', 'Redpanda', 'dbt', 'Docker', 'Redis'];

export const QUERY_EXAMPLES = [
  "SELECT title, stack FROM projects WHERE stack NOT LIKE '%Docker%'",
  "SELECT title, tier FROM projects WHERE stack LIKE '%Redis%'",
  'SELECT id, tradeoffs FROM projects WHERE case_study = true ORDER BY tradeoffs DESC',
  "SELECT company, role, period FROM experience WHERE type = 'Contract'",
  'SELECT tier, status FROM projects WHERE tier IN (design, system)',
];

export const UNLOCK_BANNER = [
  'ACCESS GRANTED — QUERY LAYER ONLINE',
  '',
  'This site keeps its projects and roles in two tables. You can now read them',
  'directly, with SQL, against the same arrays that render the page.',
  '',
  '  schema                describe the tables',
  '  sql <query>           run a SELECT',
  '  theme phosphor        the accent that is not in the toggle',
  '',
  `  e.g.  sql ${QUERY_EXAMPLES[0]}`,
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
].join('\n');

/* ── Layout helpers ─────────────────────────────────────────────────────── */

/**
 * Preformatted block that scrolls sideways rather than wrapping.
 *
 * Column-aligned output (ls, sql, schema) is padded with spaces, so allowing
 * it to soft-wrap in a narrow console destroys the alignment it depends on.
 */
const Pre = ({ children }: { children: React.ReactNode }) => (
  <div className="whitespace-pre overflow-x-auto max-w-full">{children}</div>
);

function renderQueryTable(result: QueryResult): string {
  if (result.rowCount === 0) return '0 rows';

  const cells = result.rows.map((row) => row.map(String));
  const widths = result.columns.map((column, i) =>
    Math.max(column.length, ...cells.map((row) => row[i].length))
  );
  const line = (values: string[]) => values.map((v, i) => v.padEnd(widths[i])).join('  ').trimEnd();

  return [
    line(result.columns.map((c) => c.toUpperCase())),
    widths.map((w) => '─'.repeat(w)).join('  '),
    ...cells.map(line),
    '',
    `${result.rowCount} row${result.rowCount === 1 ? '' : 's'}`,
  ].join('\n');
}

/** `ls` output — every id is a control, not just text. */
const ProjectListing = ({ onOpen }: { onOpen: (id: string) => void }) => {
  const idWidth = Math.max(...PROJECTS.map((p) => p.id.length)) + 2;
  const tierWidth = Math.max(...PROJECTS.map((p) => p.tier.length)) + 2;
  const statusWidth = Math.max(...Object.values(STATUS_LABEL).map((s) => s.length)) + 2;

  return (
    <Pre>
      <div className="text-muted-foreground/40">
        {'ID'.padEnd(idWidth)}
        {'TIER'.padEnd(tierWidth)}
        {'STATUS'.padEnd(statusWidth)}
        TITLE
      </div>

      {PROJECTS.map((project) => {
        const status = projectStatus(project);
        return (
          <button
            key={project.id}
            type="button"
            onClick={() => onOpen(project.id)}
            className="block text-left w-full hover:bg-primary/5 focus-visible:bg-primary/5 group"
          >
            <span className="text-foreground/80 group-hover:text-primary transition-colors">
              {project.id.padEnd(idWidth)}
            </span>
            <span className="text-muted-foreground">{project.tier.padEnd(tierWidth)}</span>
            <span className={STATUS_CLASS[status]}>{STATUS_LABEL[status].padEnd(statusWidth)}</span>
            <span className="text-muted-foreground">{project.title}</span>
          </button>
        );
      })}

      <div className="text-muted-foreground/40 mt-1">
        {PROJECTS.length} systems — select an id to open its case study
      </div>
    </Pre>
  );
};

/* ── Async helpers ──────────────────────────────────────────────────────── */

/** Resolves after `ms`, or immediately when aborted. */
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
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

/* ── Registry ───────────────────────────────────────────────────────────── */

export interface CommandDeps {
  /** Lets rendered output run another command — used by tappable questions. */
  runCommand: (input: string) => void;
  navigate: (path: string) => void;
  setTheme: (theme: ColorTheme) => void;
  unlocked: boolean;
  unlock: (opts?: { silent?: boolean }) => void;
  relock: () => void;
  clearSession: () => void;
  history: string[];
  /** Suppresses the duplicate unlock banner when `konami` prints it inline. */
  markAnnounced: () => void;
}

export function useConsoleCommands(deps: CommandDeps): CommandSpec[] {
  const { runCommand, navigate, setTheme, unlocked, unlock, relock, clearSession, history, markAnnounced } =
    deps;

  return useMemo<CommandSpec[]>(() => {
    // Populated below. `help` and `man` close over this same array reference,
    // so they can describe a registry they are themselves part of.
    const specs: CommandSpec[] = [];

    const listable = () => specs.filter((s) => !s.hidden && (!s.requiresClearance || unlocked));
    const findSpec = (name: string) => {
      const canonical = ALIASES[name] ?? name;
      return specs.find((s) => s.name === canonical && (!s.requiresClearance || unlocked));
    };

    const navTo = (id: string): CommandSpec => ({
      name: id,
      summary: `jump to the ${id} section`,
      run: () => ({ output: `→ navigating to #${id}`, sideEffect: () => scrollToSection(id) }),
    });

    const themeNames: ColorTheme[] = unlocked ? ['amber', 'purple', 'phosphor'] : ['amber', 'purple'];

    specs.push(
      {
        name: 'help',
        summary: 'list available commands',
        detail: 'Everything you currently have access to. Clearance adds more.',
        run: () => {
          const available = listable();
          const width = Math.max(...available.map((s) => s.name.length)) + 4;
          return {
            output: (
              <Pre>
                {available.map((s) => `${s.name.padEnd(width)}${s.summary}`).join('\n')}
                {'\n\n'}
                {'Tab completes · ↑/↓ history · Ctrl+C cancels · Ctrl+L clears'}
              </Pre>
            ),
          };
        },
      },
      {
        name: 'man',
        summary: 'show detail for a command',
        usage: 'man <command>',
        run: ({ arg }) => {
          if (!arg) return { output: 'usage: man <command>' };
          const spec = findSpec(arg.toLowerCase());
          if (!spec) return { output: `no manual entry for ${arg}` };
          return {
            output: (
              <Pre>
                {[
                  `NAME    ${spec.name} — ${spec.summary}`,
                  `USAGE   ${spec.usage ?? spec.name}`,
                  ...(spec.detail ? ['', spec.detail] : []),
                ].join('\n')}
              </Pre>
            ),
          };
        },
      },
      {
        name: 'whoami',
        summary: 'who runs this terminal',
        run: () => ({
          output: 'emmanuel — data & backend engineer. builds systems that hold up, and the tests that prove it.',
        }),
      },
      {
        name: 'ls',
        summary: 'list deployed systems',
        detail: 'Status is derived from the links each project actually has, so it always matches the cards.',
        run: () => ({ output: <ProjectListing onOpen={(id) => navigate(`/projects/${id}`)} /> }),
      },
      {
        name: 'cat',
        summary: 'print a system summary',
        usage: 'cat <id>',
        detail: "Metrics, stack and problem statement for one project. Run 'ls' for ids.",
        run: ({ arg }) => {
          const id = arg.toLowerCase();
          if (!id) return { output: "usage: cat <id> — run 'ls' for ids" };

          const project = PROJECTS.find((p) => p.id === id);
          if (!project) return { output: `no such system: ${id}` };

          const width = Math.max(...project.metrics.map((m) => m.label.length), 8) + 2;
          const lines = [
            project.title,
            project.subtitle,
            `[${project.category} · ${project.timeline} · ${STATUS_LABEL[projectStatus(project)]}]`,
          ];
          if (project.metrics.length) {
            lines.push('', ...project.metrics.map((m) => `${m.label.padEnd(width)}${m.value}`));
          }
          if (project.stack.length) lines.push('', `stack: ${project.stack.join(', ')}`);
          lines.push('', project.caseStudy?.problem ?? project.description);

          return {
            output: (
              <div>
                <Pre>{lines.join('\n')}</Pre>
                <button
                  type="button"
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="mt-1 text-primary hover:underline"
                >
                  → open /projects/{project.id}
                </button>
              </div>
            ),
          };
        },
      },
      {
        name: 'open',
        summary: 'open a project case study',
        usage: 'open <id>',
        run: ({ arg }) => {
          const id = arg.toLowerCase();
          if (!id) return { output: "usage: open <id> — run 'ls' for ids" };
          const project = PROJECTS.find((p) => p.id === id);
          if (!project) return { output: `no such system: ${id}. run 'ls' for ids.` };
          return {
            output: `opening ${project.title}...`,
            sideEffect: () => navigate(`/projects/${project.id}`),
          };
        },
      },
      navTo('about'),
      navTo('projects'),
      navTo('experience'),
      navTo('contact'),
      {
        name: 'stack',
        summary: 'core tech stack',
        run: () => ({ output: TECH_STACK_SHORT.join(', ') }),
      },
      {
        name: 'ask',
        summary: 'answer a question about this work',
        usage: 'ask            list the questions\nask <n>        answer one',
        detail: [
          'Prepared queries against the same two tables the site renders from.',
          'Each answer shows the SQL that produced it, so the number is visibly',
          'derived rather than written down.',
          '',
          'No clearance needed. The raw query layer behind `schema` and `sql`',
          'lets you write your own.',
        ].join('\n'),
        run: ({ arg }) => {
          if (!arg) {
            return {
              output: (
                <div className="flex flex-col gap-0.5">
                  <div className="text-muted-foreground/40 mb-1">
                    {CURATED_QUESTIONS.length} questions — select one, or run `ask &lt;n&gt;`
                  </div>
                  {CURATED_QUESTIONS.map((entry, i) => (
                    <button
                      key={entry.question}
                      type="button"
                      onClick={() => runCommand(`ask ${i + 1}`)}
                      className="text-left w-full hover:bg-primary/5 group whitespace-pre-wrap"
                    >
                      <span className="text-primary">{String(i + 1).padStart(2)} </span>
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                        {entry.question}
                      </span>
                    </button>
                  ))}
                </div>
              ),
            };
          }

          const index = Number.parseInt(arg, 10) - 1;
          const entry = CURATED_QUESTIONS[index];
          if (!entry) {
            return { output: `no question ${arg}. run 'ask' for the list.` };
          }

          const result = runQuery(entry.sql);
          if (isQueryError(result)) {
            // A broken prepared query is a bug in this list, not visitor
            // error, so say so plainly rather than blaming the input.
            return { output: `prepared query failed: ${result.error}` };
          }

          return {
            output: (
              <div className="flex flex-col gap-1">
                <div className="text-foreground">{entry.question}</div>
                <Pre>
                  <span className="text-muted-foreground/40">{entry.sql}</span>
                </Pre>
                <Pre>{renderQueryTable(result)}</Pre>
                <div className="text-primary">→ {entry.answer(result.rowCount)}</div>
              </div>
            ),
          };
        },
      },
      {
        name: 'ai',
        summary: 'ask questions in plain english',
        usage: 'ai   (esc to leave)',
        detail: [
          'Switches the prompt into a grounded question-answering mode.',
          '',
          'The model does not recall facts about this work — it queries for them.',
          'Every count, metric and status in an answer comes from the same SQL',
          'engine `sql` uses, over the same arrays this page renders, and each',
          'answer can show the query and rows it was built from.',
          '',
          'That constraint is the point: a number in an answer cannot disagree',
          'with the number on the card beside it, because the model never wrote',
          'the number.',
          '',
          'Answers are labelled as generated. With no provider configured the',
          'mode still works, falling back to a keyword match over the site.',
        ].join('\n'),
        run: () => ({
          output: 'entering ai mode — esc to leave.',
          // The registry has no reference to the hero's state, so entry is
          // signalled rather than called. Keeps the command list a pure data
          // structure that `help`, `man` and completion can read.
          sideEffect: () => window.dispatchEvent(new CustomEvent('emc:enter-ai')),
        }),
      },
      {
        name: 'ping',
        summary: 'measure latency to this origin',
        usage: 'ping  (Ctrl+C to stop)',
        streaming: true,
        detail:
          'Issues four real same-origin requests for a small static asset and reports each round trip. Actual network measurement, not a simulation.',
        run: async ({ emit, signal }) => {
          const host = window.location.host;
          emit(`PING ${host} — 4 × GET /favicon.svg`);

          const times: number[] = [];
          for (let seq = 1; seq <= 4 && !signal.aborted; seq++) {
            const start = performance.now();
            try {
              // Cache-busted and no-store, or every reply after the first
              // would report the cache's latency rather than the network's.
              await fetch(`/favicon.svg?ping=${Date.now()}-${seq}`, { cache: 'no-store', signal });
              const ms = performance.now() - start;
              times.push(ms);
              emit(`reply from ${host}: seq=${seq} time=${ms.toFixed(1)}ms`);
            } catch {
              if (signal.aborted) break;
              emit(`seq=${seq} — no reply`);
            }
            await delay(280, signal);
          }

          if (!times.length) return;
          const min = Math.min(...times);
          const max = Math.max(...times);
          const avg = times.reduce((a, b) => a + b, 0) / times.length;
          return {
            output: `— ${times.length} received — min/avg/max = ${min.toFixed(1)}/${avg.toFixed(1)}/${max.toFixed(1)} ms`,
          };
        },
      },
      {
        name: 'watch',
        summary: 'stream live telemetry',
        usage: 'watch  (Ctrl+C to stop)',
        streaming: true,
        detail: 'Samples the render loop once a second and prints it as it happens. Runs until cancelled.',
        run: async ({ emit, signal }) => {
          emit('sampling once per second — Ctrl+C to stop');

          let samples = 0;
          while (!signal.aborted) {
            const fps = await measureFps(1000, signal);
            if (signal.aborted) break;

            samples++;
            const heap = readHeapMB();
            emit(
              `${clockNow()}   fps ${String(fps).padStart(3)}   heap ${
                heap === null ? '   —  ' : `${heap.toFixed(1).padStart(5)}mb`
              }   nodes ${readDomNodes()}`
            );
          }

          return { output: `watch stopped after ${samples} sample${samples === 1 ? '' : 's'}.` };
        },
      },
      {
        name: 'build',
        summary: 'show the deployed build',
        detail: 'Commit SHA and timestamp are inlined at build time, so this reports the real deployment.',
        run: () => ({
          output: (
            <Pre>
              {[
                `commit    ${__COMMIT_SHA__}`,
                `built     ${new Date(__BUILD_TIME__).toLocaleString()}`,
                `mode      ${import.meta.env.MODE}`,
                `viewport  ${window.innerWidth}×${window.innerHeight} @ ${window.devicePixelRatio}x`,
              ].join('\n')}
            </Pre>
          ),
        }),
      },
      {
        name: 'telemetry',
        summary: 'explain the status bar numbers',
        run: () => ({ output: <Pre>{TELEMETRY_EXPLAINER}</Pre> }),
      },
      {
        name: 'email',
        summary: 'copy the contact address',
        run: ({ emit }) => ({
          output: EMAIL,
          sideEffect: () => {
            // Only claim success once the write actually resolves — clipboard
            // access can be refused without throwing synchronously.
            navigator.clipboard
              ?.writeText(EMAIL)
              .then(() => emit('copied to clipboard.'))
              .catch(() => emit('clipboard unavailable — select the address above to copy.'));
          },
        }),
      },
      {
        name: 'resume',
        summary: 'download the CV',
        usage: 'resume  (alias: cv)',
        run: () => ({
          output: `downloading ${CV_FILE_NAME}...`,
          sideEffect: downloadCV,
        }),
      },
      {
        name: 'theme',
        summary: 'switch accent colour',
        usage: `theme <${themeNames.join('|')}>`,
        detail: 'A third accent exists. It stays out of this list until you have clearance.',
        run: ({ arg }) => {
          const name = arg.toLowerCase();
          if ((themeNames as string[]).includes(name)) {
            return { output: `theme → ${name}`, sideEffect: () => setTheme(name as ColorTheme) };
          }
          if (name === 'phosphor') return { output: 'theme locked: insufficient clearance.' };
          return { output: `usage: theme <${themeNames.join('|')}>` };
        },
      },
      {
        name: 'history',
        summary: 'show recent commands',
        detail: 'Persisted across visits, capped at the last 50 entries.',
        run: () =>
          history.length
            ? {
                output: (
                  <Pre>{history.map((cmd, i) => `${String(i + 1).padStart(4)}  ${cmd}`).join('\n')}</Pre>
                ),
              }
            : { output: 'no commands yet.' },
      },
      {
        name: 'clear',
        summary: "clear this session's output",
        usage: 'clear  (Ctrl+L)',
        run: () => ({ sideEffect: clearSession }),
      },
      {
        name: 'schema',
        summary: 'describe the queryable tables',
        requiresClearance: true,
        detail: 'Columns, types and what each holds. Both tables are built from the live site data.',
        run: () => ({ output: <Pre>{describeSchema()}</Pre> }),
      },
      {
        name: 'sql',
        summary: 'query this site with SELECT',
        usage: 'sql SELECT <cols|*> FROM <table> [WHERE ...] [ORDER BY ...] [LIMIT n]',
        requiresClearance: true,
        detail: [
          'Runs against the same arrays that render the page, so a result can never',
          'disagree with what you see.',
          '',
          'The `sql` prefix is optional — type SELECT straight at the prompt.',
          'Table and column names are case-insensitive.',
          '',
          'Operators: =  !=  <>  >  <  >=  <=  LIKE  NOT LIKE  IN  NOT IN',
          'Conditions combine with AND. No JOIN, GROUP BY, OR or subqueries.',
          '',
          "For prepared questions rather than raw SQL, run 'ask'.",
          '',
          'Examples:',
          ...QUERY_EXAMPLES.map((q) => `  ${q}`),
        ].join('\n'),
        run: ({ arg }) => {
          if (!arg) {
            return {
              output: (
                <Pre>
                  {['usage: sql <SELECT query>', '', 'try:', ...QUERY_EXAMPLES.map((q) => `  ${q}`)].join('\n')}
                </Pre>
              ),
            };
          }
          const result = runQuery(arg);
          return {
            output: isQueryError(result) ? (
              `error: ${result.error}`
            ) : (
              <Pre>{renderQueryTable(result)}</Pre>
            ),
          };
        },
      },
      {
        name: 'lock',
        summary: 'revoke your own clearance',
        requiresClearance: true,
        detail: 'Clears stored clearance and resets the accent if you were using the hidden one.',
        run: () => ({ output: 'clearance revoked.', sideEffect: relock }),
      },
      {
        name: 'konami',
        summary: 'you already know',
        hidden: true,
        run: () =>
          unlocked
            ? { output: "already unlocked — try 'schema' or 'sql'." }
            : {
                output: UNLOCK_BANNER,
                sideEffect: () => {
                  markAnnounced();
                  unlock({ silent: true });
                },
              },
      },
      {
        name: 'sudo',
        summary: 'nice try',
        hidden: true,
        run: () => ({ output: 'permission denied: this incident will be reported.' }),
      },
      {
        name: 'exit',
        summary: 'there is no exit',
        hidden: true,
        run: () => ({ output: "this terminal has no exit. try 'clear'." }),
      }
    );

    return specs;
  }, [clearSession, history, markAnnounced, navigate, relock, runCommand, setTheme, unlock, unlocked]);
}

