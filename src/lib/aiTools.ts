// Relative, not `@/`: api/ask.ts imports this module, and the Edge Function
// bundler does not know the app's path alias. Everything reachable from here
// must stay alias-free (type-only `@/types` imports are erased, so they are fine).
import { PROJECTS } from '../data/projects';
import { EXPERIENCE } from '../data/experience';
import { STATUS_LABEL, projectStatus } from './project';
import { isQueryError, runQuery } from './portfolioQuery';

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
    `title: ${project.title} — ${project.subtitle}`,
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

   The SQL tool answers questions about *fields* — tier, status, stack. It
   cannot answer "has he worked with websockets?" when the word only appears
   inside an approach paragraph, or "any bugs about coordinates?" when the
   answer is a field note. This indexes the prose: summaries, case studies,
   highlights, trade-offs, field notes, roles. Each hit comes back as a
   snippet around the match, labelled with where it came from and the id to
   fetch for more, so the model can cite a passage rather than paraphrase a
   memory of one. */

export interface Passage {
  kind: 'project' | 'role';
  id: string;
  title: string;
  where: string;
  text: string;
}

const PASSAGES: Passage[] = [
  ...PROJECTS.flatMap((p): Passage[] => {
    const at = (where: string, text: string): Passage => ({ kind: 'project', id: p.id, title: p.title, where, text });
    const study = p.caseStudy;
    return [
      at('summary', `${p.title}. ${p.subtitle}. ${p.category}. ${p.description}`),
      at('stack', p.stack.join(', ')),
      ...(study
        ? [
            at('problem', study.problem),
            at('approach', study.approach),
            at('outcome', study.outcome),
            ...(study.highlights ?? []).map((h) => at('highlight', h)),
            ...(study.tradeoffs ?? []).map((t) => at('trade-off', `${t.decision}: chose ${t.chose} over ${t.rejected}. ${t.why}`)),
            ...(study.fieldNotes ?? []).map((n) =>
              at('field note', `${n.title}. ${n.symptom} ${n.rootCause} ${n.fix} ${n.guard ?? ''}`)
            ),
            ...(study.notice ? [at('scope notice', study.notice)] : []),
          ]
        : []),
      ...p.decisions.map((d) => at('decision', `${d.title}: ${d.detail}`)),
    ];
  }),
  ...EXPERIENCE.flatMap((e): Passage[] => {
    const at = (where: string, text: string): Passage => ({ kind: 'role', id: e.id, title: e.company, where, text });
    return [
      at('role', `${e.company} — ${e.role} (${e.type}, ${e.period}). ${e.summary}`),
      ...e.highlights.map((h) => at('role highlight', h)),
      at('stack', e.stack.join(', ')),
    ];
  }),
];

const STOPWORDS = new Set(
  // Question words, and the verbs every portfolio passage contains — "built",
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
   "WebSocket". Crude on purpose — "ss" words are left alone ("process"). */
const stem = (term: string) => (term.length > 4 && term.endsWith('s') && !term.endsWith('ss') ? term.slice(0, -1) : term);

function terms(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/)
        .filter((t) => t.length > 1 && !STOPWORDS.has(t))
        .map(stem)
    ),
  ];
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A window of text around the first matching term, so the hit reads in context. */
function snippet(text: string, words: string[], width = 240): string {
  const lower = text.toLowerCase();
  const positions = words.map((w) => lower.indexOf(w)).filter((i) => i >= 0);
  if (!positions.length || text.length <= width) return text.slice(0, width);
  const start = Math.max(0, Math.min(...positions) - 60);
  return `${start > 0 ? '…' : ''}${text.slice(start, start + width).trim()}${start + width < text.length ? '…' : ''}`;
}

export function searchSite(query: string, limit = 6): { passage: Passage; score: number; snippet: string }[] {
  const words = terms(query);
  if (!words.length) return [];
  const patterns = words.map((word) => new RegExp(`(^|[^a-z0-9])${escapeRegExp(word)}`, 'g'));

  return PASSAGES.map((passage) => {
    const lower = passage.text.toLowerCase();
    let score = 0;
    let matched = 0;
    for (const pattern of patterns) {
      // Word-start matches only: "rust" must not hit "trust".
      const hits = lower.match(pattern)?.length ?? 0;
      if (hits) matched += 1;
      score += Math.min(hits, 3);
    }
    // Every term present beats one term repeated, and a hit in a short
    // passage says more than the same hit in a long one.
    const coverage = matched / words.length;
    return { passage, score: score * (0.5 + coverage) * (1 + 60 / (passage.text.length + 60)), snippet: '' };
  })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((hit) => ({ ...hit, snippet: snippet(hit.passage.text, words) }));
}

function toolSearchSite(call: ToolCall): ToolResult {
  const query = str(call.args.query).trim();
  if (!query) return { callId: call.id, name: call.name, content: 'error: no query supplied' };

  const hits = searchSite(query);
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
    p!.stack.join(', ') || '—',
    p!.metrics.map((m) => `${m.label}: ${m.value}`).join('; ') || '—',
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

  if (!terms.length) return "ask about a project, a technology, or his experience — e.g. 'what uses redis?'";

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
    .map(({ project }) => `- ${project.id} — ${project.title}: ${project.subtitle} [${project.stack.slice(0, 4).join(', ')}]`)
    .join('\n');

  return [
    'no model configured, so this is a keyword match over the site rather than an answer:',
    '',
    body,
    '',
    "run `cat <id>` for the summary, or `open <id>` for the full case study.",
  ].join('\n');
}
