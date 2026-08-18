import { PROJECTS } from '@/data/projects';
import { EXPERIENCE } from '@/data/experience';
import { STATUS_LABEL, projectStatus } from '@/lib/project';
import { isQueryError, runQuery } from '@/lib/portfolioQuery';

/* ==========================================================================
   AI TOOLS

   The model asks; this answers. Every tool reads the same arrays the page
   renders from, in the browser, so a figure in an AI answer and a figure on
   a card are the same value from the same source — not two recollections of
   it.

   Running tools client-side rather than in the endpoint is what makes that
   true. Duplicating the corpus server-side would have created a second copy
   to drift, and shipping the query engine into an edge function would have
   meant maintaining it twice. The endpoint stays a thin proxy that holds a
   key; the data never leaves the place it already lives.
   ========================================================================== */

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
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

const HANDLERS: Record<string, (call: ToolCall) => ToolResult> = {
  run_sql: toolRunSql,
  get_project: toolGetProject,
  get_experience: toolGetExperience,
  get_tradeoffs: toolGetTradeoffs,
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
