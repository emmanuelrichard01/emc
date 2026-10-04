// Relative, not `@/`, and with `.js` extensions: api/ask.ts imports this
// module. The Edge Function bundler does not know the app's path alias, and
// Vercel type-checks the function as Node ESM, which wants explicit
// extensions. Everything reachable from here must follow both rules — type
// imports included, since the type check resolves them too.
import { PROJECTS } from '../data/projects.js';
import { EXPERIENCE } from '../data/experience.js';
import { STATUS_LABEL, projectStatus } from './project.js';
import { isQueryError, runQuery } from './portfolioQuery.js';
import { buildPassages, type Passage } from './aiPassages.js';

/* ==========================================================================
   AI TOOLS

   The model asks; this answers. Every tool reads the same arrays the page
   renders from, so a figure in an AI answer and a figure on a card are the
   same value from the same source — not two recollections of it.

   The tools run inside the endpoint, importing this very module. That is
   still one copy of the data: the Edge Function bundles the same
   PROJECTS/EXPERIENCE modules the page does. What moved is only *where* the
   loop runs — see the header of api/ask.ts for why it left the browser.
   ========================================================================== */

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  /** Gemini's opaque reasoning signature, echoed back on the next round. */
  thoughtSignature?: string;
}

export interface ToolResult {
  callId: string;
  name: string;
  /** Plain text handed back to the model. */
  content: string;
  /** SQL actually executed, surfaced in the UI as provenance. */
  sql?: string;
  /** Rendered table for the transcript, when the tool produced rows. */
  table?: { columns: string[]; rows: string[][] };
}

const str = (value: unknown): string => (typeof value === 'string' ? value : '');

function renderRows(columns: string[], rows: string[][]): string {
  if (!rows.length) return '0 rows';
  const header = columns.join(' | ');
  const body = rows.map((row) => row.join(' | ')).join('\n');
  return `${header}\n${body}\n(${rows.length} row${rows.length === 1 ? '' : 's'})`;
}

function toolRunSql(call: ToolCall): ToolResult {
  const query = str(call.args.query).trim();
  if (!query) {
    return { callId: call.id, name: call.name, content: 'error: no query supplied' };
  }

  const result = runQuery(query);
  if (isQueryError(result)) {
    // Handed back verbatim so the model can correct itself and retry rather
    // than narrating a failure to the visitor.
    return { callId: call.id, name: call.name, content: `error: ${result.error}`, sql: query };
  }

  const rows = result.rows.map((row) => row.map(String));
  return {
    callId: call.id,
    name: call.name,
    content: renderRows(result.columns, rows),
    sql: query,
    table: { columns: result.columns, rows },
  };
}

function toolGetProject(call: ToolCall): ToolResult {
  const id = str(call.args.id).trim().toLowerCase();
  const project = PROJECTS.find((p) => p.id === id);

  if (!project) {
    return {
      callId: call.id,
      name: call.name,
      content: `error: no project "${id}". available ids: ${PROJECTS.map((p) => p.id).join(', ')}`,
    };
  }

  const study = project.caseStudy;
  const lines = [
    `id: ${project.id}`,
    `title: ${project.title}: ${project.subtitle}`,
    `tier: ${project.tier}`,
    `status: ${STATUS_LABEL[projectStatus(project)]}`,
    `category: ${project.category}`,
    `timeline: ${project.timeline}`,
    `stack: ${project.stack.join(', ') || '(none committed)'}`,
    project.metrics.length ? `metrics: ${project.metrics.map((m) => `${m.label}=${m.value}`).join('; ')}` : null,
    project.github ? `repo: ${project.github}` : null,
    project.liveUrl ? `live: ${project.liveUrl}` : null,
    '',
    study ? `problem: ${study.problem}` : `description: ${project.description}`,
    study ? `approach: ${study.approach}` : null,
    study ? `outcome: ${study.outcome}` : null,
    study?.highlights?.length ? `highlights:\n- ${study.highlights.join('\n- ')}` : null,
    study?.tradeoffs?.length
      ? `tradeoffs:\n${study.tradeoffs
          .map((t) => `- ${t.decision}: chose ${t.chose} over ${t.rejected}. ${t.why}`)
          .join('\n')}`
      : null,
    // The caveat travels with the project on purpose: an answer that quotes a
    // demo figure without the scope note attached is the exact overstatement
    // the notice field exists to prevent.
    study?.notice ? `scope notice: ${study.notice}` : null,
    // Debugging stories carry the most specific engineering detail on the
    // site; "what went wrong building it?" has no other source.
    study?.fieldNotes?.length
      ? `field notes (debugging stories):\n${study.fieldNotes
          .map((n) => `- ${n.title}. symptom: ${n.symptom} actually: ${n.rootCause} fix: ${n.fix}${n.guard ? ` guarded by: ${n.guard}` : ''}`)
          .join('\n')}`
      : null,
    project.decisions.length
      ? `decisions:\n${project.decisions.map((d) => `- ${d.title}: ${d.detail}`).join('\n')}`
      : null,
  ].filter((line): line is string => line !== null);

  return { callId: call.id, name: call.name, content: lines.join('\n') };
}

function toolGetExperience(call: ToolCall): ToolResult {
  const id = str(call.args.id).trim().toLowerCase();
  const role = EXPERIENCE.find((e) => e.id === id);

  if (!role) {
    return {
      callId: call.id,
      name: call.name,
      content: `error: no role "${id}". available ids: ${EXPERIENCE.map((e) => e.id).join(', ')}`,
    };
  }

  const lines = [
    `id: ${role.id}`,
    `company: ${role.company}`,
    `role: ${role.role} (${role.type})`,
    `period: ${role.period}`,
    role.note ? `note: ${role.note}` : null,
    `stack: ${role.stack.join(', ')}`,
    '',
    `summary: ${role.summary}`,
    role.highlights.length ? `highlights:\n- ${role.highlights.join('\n- ')}` : null,
  ].filter((line): line is string => line !== null);

  return { callId: call.id, name: call.name, content: lines.join('\n') };
}

function toolGetTradeoffs(call: ToolCall): ToolResult {
  const projectId = str(call.args.projectId).trim().toLowerCase();
  const projectsWithTradeoffs = projectId
    ? PROJECTS.filter((p) => p.id === projectId && p.caseStudy?.tradeoffs?.length)
    : PROJECTS.filter((p) => p.caseStudy?.tradeoffs?.length);

  if (projectId && !projectsWithTradeoffs.length) {
    const project = PROJECTS.find((p) => p.id === projectId);
    if (!project) {
      return {
        callId: call.id,
        name: call.name,
        content: `error: no project "${projectId}".`,
      };
    }
    return {
      callId: call.id,
      name: call.name,
      content: `project "${project.title}" has no documented rejected trade-offs.`,
    };
  }

  const allTradeoffs = projectsWithTradeoffs.flatMap((p) =>
    (p.caseStudy?.tradeoffs ?? []).map((t) => ({
      project: p.title,
      id: p.id,
      decision: t.decision,
      chose: t.chose,
      rejected: t.rejected,
      why: t.why,
    }))
  );

  const lines = allTradeoffs.map(
    (t) => `- [${t.project}] ${t.decision}: chose "${t.chose}" over "${t.rejected}". Rationale: ${t.why}`
  );

  return {
    callId: call.id,
    name: call.name,
    content: lines.join('\n'),
  };
}

/* ── search_site ──────────────────────────────────────────────────────────
   Ranked full-text search over every sentence the site says.

   The SQL tool answers questions about *fields*: tier, status, stack. It
   cannot answer "has he worked with websockets?" when the word only appears
   inside an approach paragraph, or "any bugs about coordinates?" when the
   answer is a field note. This indexes the prose (aiPassages.ts). Each hit
   comes back as a snippet around the match, labelled with where it came
   from and the id to fetch for more, so the model can cite a passage rather
   than paraphrase a memory of one.

   Ranking is BM25 over word-start matches, so a rare word ("idempotency")
   outweighs a common one ("pipeline") and a long passage does not win by
   being long. A small synonym map widens a query the way a person would:
   "failure" also finds retries, outages and dead-letter queues, at half the
   weight of the word that was actually asked for. The endpoint may blend in
   semantic similarity on top (api/_lib/hybrid.ts); this is the part that
   always works, with no key and no network. */

export type { Passage } from './aiPassages.js';

export const PASSAGES: readonly Passage[] = buildPassages(PROJECTS, EXPERIENCE);

const STOPWORDS = new Set(
  // Question words, and the verbs every portfolio passage contains: "built",
  // "used", "work" match almost everything and so rank nothing.
  [
    'a an and any are as at be by did does do for from has have he his how in is it its of on or that the this to was what when where which who why with',
    'about all also anything been build built can could ever him into me much many some something than them then there they use used using will work worked would you your',
  ]
    .join(' ')
    .split(' ')
);

/* Plurals folded to their stem, because matching is word-*start*: "websocket"
   finds "websockets" but not the other way round, and the site says
   "WebSocket". Crude on purpose: "ss" words are left alone ("process"). */
const stem = (term: string) => (term.length > 4 && term.endsWith('s') && !term.endsWith('ss') ? term.slice(0, -1) : term);

const tokenize = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ''))
    .filter(Boolean);

function terms(query: string): string[] {
  return [...new Set(tokenize(query).filter((t) => t.length > 1 && !STOPWORDS.has(t)).map(stem))];
}

/* Stems on the left, extra words to look for on the right. Small and
   hand-made: each line is a way a visitor phrases something the site says
   in other words. */
const SYNONYMS: Record<string, string[]> = {
  failure: ['retry', 'outage', 'idempotency', 'idempotent', 'dead-letter', 'dlq', 'rollback', 'fallback', 'recover'],
  fail: ['retry', 'outage', 'idempotency', 'dead-letter', 'rollback', 'fallback'],
  error: ['exception', 'retry', 'fail', 'bug'],
  bug: ['symptom', 'root', 'fix', 'regression'],
  resilience: ['retry', 'idempotency', 'fallback', 'circuit', 'backoff'],
  reliable: ['retry', 'idempotency', 'idempotent', 'replay'],
  realtime: ['websocket', 'stream', 'live', 'sse'],
  offline: ['local', 'indexeddb', 'crdt', 'sync'],
  sync: ['crdt', 'yjs', 'replication'],
  fast: ['latency', 'throughput', 'p95', 'cache'],
  performance: ['latency', 'throughput', 'p95', 'cache', 'benchmark'],
  speed: ['latency', 'throughput'],
  scale: ['throughput', 'partition', 'concurrency', 'shard'],
  scaling: ['throughput', 'partition', 'concurrency', 'shard'],
  security: ['auth', 'pii', 'encryption', 'compliance', 'rbac'],
  privacy: ['pii', 'ndpr', 'gdpr', 'redact'],
  payment: ['psp', 'reconciliation', 'ledger', 'settlement'],
  money: ['payment', 'ledger', 'reconciliation'],
  test: ['testing', 'coverage', 'vitest', 'pytest', 'property'],
  queue: ['kafka', 'redpanda', 'rabbitmq', 'sqs', 'broker'],
  messaging: ['kafka', 'redpanda', 'broker', 'event'],
  database: ['postgres', 'postgresql', 'sql', 'mysql', 'mongodb', 'redis', 'duckdb'],
  db: ['postgres', 'postgresql', 'sql', 'mongodb', 'redis'],
  warehouse: ['dbt', 'bigquery', 'snowflake', 'duckdb'],
  deploy: ['docker', 'kubernetes', 'ci', 'vercel'],
  ai: ['llm', 'model', 'embedding', 'gemini', 'openai'],
  ml: ['model', 'classifier', 'training', 'embedding'],
  frontend: ['react', 'ui', 'typescript', 'css'],
  backend: ['api', 'server', 'fastapi', 'node', 'database'],
};

interface Indexed {
  passage: Passage;
  tokens: string[];
}

/* What a kind of passage IS, indexed with its words: a field note is a bug
   story even when it never says "bug", a trade-off is a decision. */
const KIND_TERMS: Record<string, string> = {
  'field note': 'bug debugging fix',
  'trade-off': 'trade-off decision alternative',
  'scope notice': 'scope caveat limitation',
  decision: 'decision',
};

const INDEX: Indexed[] = PASSAGES.map((passage) => ({
  passage,
  tokens: tokenize(`${KIND_TERMS[passage.where] ?? ''} ${passage.text}`),
}));
const AVG_LENGTH = INDEX.reduce((sum, d) => sum + d.tokens.length, 0) / Math.max(1, INDEX.length);
const K1 = 1.2;
const B = 0.75;

/** How often `term` starts a word in a passage. "rust" must not hit "trust"; "websocket" hits "websockets". */
const frequency = (doc: Indexed, term: string) => doc.tokens.reduce((n, t) => n + (t.startsWith(term) ? 1 : 0), 0);

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A window of text around the first matching term, so the hit reads in context. */
export function passageSnippet(text: string, words: string[], width = 240): string {
  const lower = text.toLowerCase();
  const positions = words
    .map((w) => lower.search(new RegExp(`(^|[^a-z0-9])${escapeRegExp(w)}`)))
    .filter((i) => i >= 0);
  if (text.length <= width) return text;
  const start = positions.length ? Math.max(0, Math.min(...positions) - 60) : 0;
  return `${start > 0 ? '…' : ''}${text.slice(start, start + width).trim()}${start + width < text.length ? '…' : ''}`;
}

export interface SearchHit {
  passage: Passage;
  score: number;
  snippet: string;
}

/** The words, synonyms included, that a query is matched on. */
export function searchTerms(query: string): { term: string; weight: number; source: string }[] {
  const words = terms(query);
  // Each asked-for word, then its synonyms at half weight, remembering which
  // asked-for word a synonym stands in for (coverage counts that word).
  const weighted: { term: string; weight: number; source: string }[] = [];
  for (const word of words) {
    if (!weighted.some((w) => w.term === word)) weighted.push({ term: word, weight: 1, source: word });
    for (const alt of SYNONYMS[word] ?? []) {
      for (const part of terms(alt)) {
        if (!weighted.some((w) => w.term === part)) weighted.push({ term: part, weight: 0.5, source: word });
      }
    }
  }
  return weighted;
}

/** Keyword search (BM25 with synonyms). Synchronous and always available. */
export function searchSite(query: string, limit = 6): SearchHit[] {
  const words = terms(query);
  if (!words.length) return [];
  const weighted = searchTerms(query);

  const n = INDEX.length;
  const idf = new Map(
    weighted.map(({ term }) => {
      const df = INDEX.reduce((count, doc) => count + (frequency(doc, term) ? 1 : 0), 0);
      return [term, Math.log(1 + (n - df + 0.5) / (df + 0.5))];
    })
  );

  const hits: SearchHit[] = [];
  for (const doc of INDEX) {
    let score = 0;
    const covered = new Set<string>();
    for (const { term, weight, source } of weighted) {
      const tf = frequency(doc, term);
      if (!tf) continue;
      covered.add(source);
      const norm = (tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * doc.tokens.length) / AVG_LENGTH));
      score += weight * idf.get(term)! * norm;
    }
    if (!score) continue;
    // Every asked-for word present beats one word repeated.
    hits.push({ passage: doc.passage, score: score * (0.5 + covered.size / words.length), snippet: '' });
  }

  const matchWords = weighted.map((w) => w.term);
  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((hit) => ({ ...hit, snippet: passageSnippet(hit.passage.text, matchWords) }));
}

/** A search_site result, from hits however they were ranked. */
export function searchResult(call: ToolCall, query: string, hits: SearchHit[]): ToolResult {
  if (!hits.length) {
    return { callId: call.id, name: call.name, content: `no passages match "${query}". the site does not mention it.` };
  }
  return {
    callId: call.id,
    name: call.name,
    content: hits
      .map((h) => `[${h.passage.kind}:${h.passage.id} · ${h.passage.title} · ${h.passage.where}] ${h.snippet}`)
      .join('\n'),
    table: {
      columns: ['source', 'where', 'passage'],
      rows: hits.map((h) => [h.passage.title, h.passage.where, h.snippet]),
    },
  };
}

function toolSearchSite(call: ToolCall): ToolResult {
  const query = str(call.args.query).trim();
  if (!query) return { callId: call.id, name: call.name, content: 'error: no query supplied' };
  return searchResult(call, query, searchSite(query));
}


/* ── compare_projects ─────────────────────────────────────────────────────
   The same facts for several projects, side by side. "How do the two
   streaming systems differ?" otherwise costs one get_project per system and
   a model lining the answers up from memory; this returns one table, which
   the transcript shows exactly as the model saw it. */

function toolCompareProjects(call: ToolCall): ToolResult {
  const raw = Array.isArray(call.args.ids) ? call.args.ids : [];
  const ids = [...new Set(raw.map((id) => str(id).trim().toLowerCase()).filter(Boolean))].slice(0, 5);
  const found = ids.map((id) => PROJECTS.find((p) => p.id === id));
  const missing = ids.filter((_id, i) => !found[i]);

  if (ids.length < 2 || missing.length) {
    const why = ids.length < 2 ? 'give at least two project ids' : `no project ${missing.map((m) => `"${m}"`).join(', ')}`;
    return {
      callId: call.id,
      name: call.name,
      content: `error: ${why}. available ids: ${PROJECTS.map((p) => p.id).join(', ')}`,
    };
  }

  const columns = ['project', 'tier', 'status', 'year', 'stack', 'metrics', 'trade-offs', 'field notes'];
  const rows = found.map((p) => [
    p!.title,
    p!.tier,
    STATUS_LABEL[projectStatus(p!)],
    p!.timeline,
    p!.stack.join(', ') || 'none',
    p!.metrics.map((m) => `${m.label}: ${m.value}`).join('; ') || 'none',
    String(p!.caseStudy?.tradeoffs?.length ?? 0),
    String(p!.caseStudy?.fieldNotes?.length ?? 0),
  ]);

  return { callId: call.id, name: call.name, content: renderRows(columns, rows), table: { columns, rows } };
}

const HANDLERS: Record<string, (call: ToolCall) => ToolResult> = {
  run_sql: toolRunSql,
  get_project: toolGetProject,
  get_experience: toolGetExperience,
  get_tradeoffs: toolGetTradeoffs,
  search_site: toolSearchSite,
  compare_projects: toolCompareProjects,
};

export function executeToolCall(call: ToolCall): ToolResult {
  const handler = HANDLERS[call.name];
  if (!handler) {
    return {
      callId: call.id,
      name: call.name,
      content: `error: unknown tool "${call.name}". available: ${Object.keys(HANDLERS).join(', ')}`,
    };
  }
  return handler(call);
}

/* ── Keyless fallback ───────────────────────────────────────────────────── */

/**
 * Answers without a model at all, by matching the question against project
 * and role text and reporting what it found.
 *
 * Crude on purpose — it does not pretend to be an answer, it points at the
 * material. With no key configured this is the whole feature, and saying
 * "these three projects mention Redis" is more useful, and far more honest,
 * than an error telling a visitor the thing they just clicked is broken.
 */
export function extractiveAnswer(question: string): string {
  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((word) => word.length > 2);

  if (!terms.length) return "ask about a project, a technology, or his experience, for example: what uses redis?";

  const scored = PROJECTS.map((project) => {
    const haystack = [
      project.title,
      project.subtitle,
      project.category,
      project.stack.join(' '),
      project.description,
      project.caseStudy?.problem ?? '',
      ...(project.caseStudy?.tradeoffs?.map((t) => `${t.decision} ${t.chose} ${t.rejected} ${t.why}`) ?? []),
    ]
      .join(' ')
      .toLowerCase();

    return { project, score: terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0) };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!scored.length) {
    return `nothing on the site matches that. try 'ls' for the systems, or 'queries' for prepared questions.`;
  }

  const body = scored
    .map(({ project }) => `- ${project.title} (${project.id}): ${project.subtitle} [${project.stack.slice(0, 4).join(', ')}]`)
    .join('\n');

  return [
    'no model configured, so this is a keyword match over the site rather than an answer:',
    '',
    body,
    '',
    "run `cat <id>` for the summary, or `open <id>` for the full case study.",
  ].join('\n');
}
