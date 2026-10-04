import CONTEXT from '../_context.js';
import { PROJECTS } from '../../src/data/projects.js';
import { EXPERIENCE } from '../../src/data/experience.js';
import type { ToolCall } from '../../src/lib/aiTools.js';
import type { ToolSpec } from './providers.js';

/* ==========================================================================
   ASK TOOLS: the tool definitions the model sees, the site index, and the
   status line each tool call shows the visitor. Shared by /api/ask and
   /api/fit (which uses the read-only subset), so a tool is described once.
   ========================================================================== */

/* The index the prompts embed, without `generatedAt`: the one field that
   changes on every build without the data changing, and which would make
   every deploy (and every prompt cache entry) look new. */
const { generatedAt, ...index } = CONTEXT;

/** Changes when the build runs; keys the answer cache, never enters a prompt. */
export const DATA_VERSION = generatedAt;

/** The site index as the prompts embed it: same bytes for every request. */
export const INDEX_JSON = JSON.stringify(index);

/* ── Tool schema ────────────────────────────────────────────────────────── */

export const TOOLS: ToolSpec[] = [
  {
    name: 'run_sql',
    description: [
      "Run a read-only SELECT against the site's own data.",
      'projects(id, title, tier, category, year, status, stack, decisions, tradeoffs, case_study)',
      'experience(id, company, role, type, period, stack, highlights)',
      'tier: flagship | production | system | design. status: LIVE | SOURCE OPEN | PRIVATE BUILD | DESIGN STAGE.',
      'stack is a comma-joined string: match it with LIKE.',
      '',
      'IMPORTANT: this is a small bounded engine, not a real database:',
      '- NO functions. LOWER(), UPPER(), COUNT(), SUM() and DISTINCT are all unsupported and will error.',
      "- LIKE is ALREADY case-insensitive, so write stack LIKE '%python%' directly.",
      '- To count rows, select them and count the rows returned.',
      '- No JOIN, GROUP BY, OR, or subqueries. Conditions combine with AND only.',
      '- Text literals need single quotes; double quotes are rejected.',
      'Supported: WHERE/AND, ORDER BY, LIMIT, and = != <> > < >= <= LIKE, NOT LIKE, IN, NOT IN.',
    ].join('\n'),
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: "e.g. SELECT title, tier FROM projects WHERE stack LIKE '%python%'" },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_site',
    description:
      'Ranked search over everything the site says: project summaries, problem/approach/outcome write-ups, highlights, trade-offs, field notes (debugging stories), scope notices and roles. Matches by keyword and by meaning. Returns labelled snippets with the id to fetch for more. Use for anything described in prose rather than stored as a field, e.g. "websockets", "offline", "coordinate bug", "PII".',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'a few keywords, e.g. "offline editing"' } },
      required: ['query'],
    },
  },
  {
    name: 'get_project',
    description:
      'Full detail for one project: problem, approach, outcome, highlights, trade-offs with the rejected alternative, field notes (debugging stories), and any scope caveat. Use when a question is about how or why something was built, or what went wrong building it.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string', description: 'project id, e.g. mmr-engine' } },
      required: ['id'],
    },
  },
  {
    name: 'compare_projects',
    description:
      'The same facts for 2 to 5 projects side by side: tier, status, year, stack, metrics, and how many trade-offs and field notes each documents. Use when a question compares projects.',
    parameters: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' }, description: 'project ids, e.g. ["mmr-engine", "vega-canva"]' },
      },
      required: ['ids'],
    },
  },
  {
    name: 'get_experience',
    description: 'Full detail for one role: summary, highlights and stack.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string', description: 'role id, e.g. medvax' } },
      required: ['id'],
    },
  },
  {
    name: 'get_tradeoffs',
    description:
      'All architectural trade-offs across projects: the decision, the chosen technology or approach, the rejected alternative, and the engineering rationale. Use when asked about trade-offs, architecture choices, or what technologies were rejected.',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Optional project ID to filter by. Omit to retrieve all trade-offs across all projects.',
        },
      },
    },
  },
  {
    name: 'offer_action',
    description:
      'Offer the visitor a button that shows something on the site. The visitor presses it; nothing moves until they do. At most 2 per answer, only when they asked to see, find or show something or a jump genuinely helps.',
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['show-work', 'open-case', 'go-to', 'open-role'] },
        label: { type: 'string', description: 'Button text, 2 to 5 words, sentence case, e.g. "Show me where"' },
        stack: {
          type: 'array',
          items: { type: 'string' },
          description: 'show-work: stack names exactly as the projects list them, e.g. ["Redpanda"]',
        },
        tier: { type: 'string', enum: ['flagship', 'production', 'system', 'design'], description: 'show-work: one tier' },
        query: { type: 'string', description: 'show-work: words to filter the work index by' },
        id: { type: 'string', description: 'open-case: a project id. open-role: a role id.' },
        section: {
          type: 'string',
          description:
            'open-case: problem, approach, outcome, tradeoffs, decisions, field-notes or overview. go-to: about, projects, experience or contact.',
        },
        quote: { type: 'string', description: 'open-case: a short passage copied exactly from the case study, to highlight' },
      },
      required: ['kind', 'label'],
    },
  },
  {
    name: 'note_gap',
    description:
      "Record that the site does not cover what the visitor asked, so Emmanuel can add it. Call once, then tell the visitor plainly that the site doesn't cover it.",
    parameters: {
      type: 'object',
      properties: { topic: { type: 'string', description: 'what was asked about, in a few words' } },
      required: ['topic'],
    },
  },
];

/* Tools that change nothing the model needs to read. A turn that answers
   AND calls only these is finished: there is no result to wait for. */
export const SIDE_TOOLS = new Set(['offer_action', 'note_gap']);

/* ── Status lines ───────────────────────────────────────────────────────── */

const projectTitle = (id: unknown) => PROJECTS.find((p) => p.id === String(id ?? '').trim().toLowerCase())?.title;

/** What a tool call is doing, in words a visitor reads while they wait. Null for calls with nothing to say. */
export function statusFor(call: ToolCall): string | null {
  const args = call.args;
  switch (call.name) {
    case 'run_sql':
      return 'Querying the project data';
    case 'search_site': {
      const query = String(args.query ?? '').trim().slice(0, 40);
      return query ? `Searching the write-ups for ‘${query}’` : 'Searching the write-ups';
    }
    case 'get_project': {
      const title = projectTitle(args.id);
      return title ? `Reading ${title}` : 'Reading a project';
    }
    case 'get_tradeoffs': {
      const title = projectTitle(args.projectId);
      return title ? `Reading ${title}'s trade-offs` : 'Reading the trade-offs across projects';
    }
    case 'compare_projects': {
      const count = Array.isArray(args.ids) ? new Set(args.ids).size : 0;
      return count >= 2 ? `Comparing ${count} projects` : 'Comparing projects';
    }
    case 'get_experience': {
      const role = EXPERIENCE.find((e) => e.id === String(args.id ?? '').trim().toLowerCase());
      return role ? `Reading the ${role.company} role` : 'Reading a role';
    }
    default:
      return null;
  }
}

