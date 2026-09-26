import type { Project } from '@/types';

/* ==========================================================================
   WORK MODEL

   Everything the Work section decides, as pure functions: what matches a
   search and where, what a filter keeps, how a list sorts, and how that
   state round-trips through the URL. Kept apart from the components so it
   can be tested against the real data, and so the index, the cards and the
   matrix cannot disagree about what "matches" means.
   ========================================================================== */

export type Tier = Project['tier'];
export type SortKey = 'tier' | 'newest' | 'depth';
export type WorkView = 'index' | 'cards' | 'matrix';

export const TIERS: readonly Tier[] = ['flagship', 'production', 'system', 'design'];
export const SORTS: readonly { key: SortKey; label: string; hint: string }[] = [
  { key: 'tier', label: 'tier', hint: 'flagships first, as authored' },
  { key: 'newest', label: 'newest', hint: 'most recent work first' },
  { key: 'depth', label: 'depth', hint: 'most thoroughly documented first' },
];
/** Side by side stays readable up to three columns. */
export const COMPARE_MAX = 3;

export const VIEWS: readonly WorkView[] = ['index', 'cards', 'matrix'];

export interface WorkState {
  query: string;
  tier: Tier | null;
  stack: string[];
  sort: SortKey;
  view: WorkView;
}

export const DEFAULT_STATE: WorkState = { query: '', tier: null, stack: [], sort: 'tier', view: 'index' };

/* ── Depth ───────────────────────────────────────────────────────────────
   How much a case study actually documents. Not a quality score — a count
   of things a reader can go and check: trade-offs with a rejected option,
   debugging stories, verifiable highlights. Field notes weigh most because
   they are the rarest thing a portfolio shows. */

export interface Depth {
  tradeoffs: number;
  fieldNotes: number;
  highlights: number;
  score: number;
}

export function depthOf(project: Project): Depth {
  const study = project.caseStudy;
  const tradeoffs = study?.tradeoffs?.length ?? 0;
  const fieldNotes = study?.fieldNotes?.length ?? 0;
  const highlights = study?.highlights?.length ?? 0;
  return { tradeoffs, fieldNotes, highlights, score: tradeoffs * 2 + fieldNotes * 3 + highlights };
}

/** The latest year a project's timeline mentions; "Present" counts as now. */
export function latestYear(project: Project, now = new Date().getFullYear()): number {
  if (/present/i.test(project.timeline)) return now;
  const years = (project.timeline.match(/\d{4}/g) ?? []).map(Number);
  return years.length ? Math.max(...years) : 0;
}

/** "2026", "2025–2026", "2025→" (ongoing) — for a narrow year column. */
export function yearLabel(timeline: string): string {
  const years = [...new Set((timeline.match(/\d{4}/g) ?? []))];
  if (/present/i.test(timeline)) return `${years[0] ?? ''}→`;
  if (years.length > 1) return `${years[0]}–${years[years.length - 1]}`;
  return years[0] ?? '—';
}

/* ── Search ──────────────────────────────────────────────────────────────
   Across everything the site says about a project, not just its name —
   "idempotent", "CRDT" or "PII" should find the system whose case study
   discusses it. A match outside the title reports *where* it was found and
   a snippet around it, so a row can say "matched in trade-offs: …" rather
   than leaving the reader to guess why it is in the list. */

export interface SearchHit {
  score: number;
  /** Human name of the field that matched best. */
  field: string;
  /** Text around the match; absent when the title or subtitle matched. */
  snippet?: string;
}

interface Field {
  name: string;
  text: string;
  weight: number;
  snippet: boolean;
}

function fieldsOf(project: Project): Field[] {
  const study = project.caseStudy;
  const fields: Field[] = [
    { name: 'title', text: project.title, weight: 10, snippet: false },
    { name: 'subtitle', text: project.subtitle, weight: 6, snippet: false },
    { name: 'category', text: project.category, weight: 5, snippet: false },
    { name: 'stack', text: project.stack.join(' · '), weight: 5, snippet: true },
    { name: 'summary', text: project.description, weight: 3, snippet: true },
    ...project.decisions.map((d) => ({ name: 'decisions', text: `${d.title}: ${d.detail}`, weight: 2, snippet: true })),
  ];
  if (study) {
    fields.push(
      { name: 'problem', text: study.problem, weight: 2, snippet: true },
      { name: 'approach', text: study.approach, weight: 2, snippet: true },
      { name: 'outcome', text: study.outcome, weight: 2, snippet: true },
      ...(study.highlights ?? []).map((h) => ({ name: 'highlights', text: h, weight: 2, snippet: true })),
      ...(study.tradeoffs ?? []).map((t) => ({
        name: 'trade-offs',
        text: `${t.decision}: chose ${t.chose} over ${t.rejected}. ${t.why}`,
        weight: 2,
        snippet: true,
      })),
      ...(study.fieldNotes ?? []).map((n) => ({
        name: 'field notes',
        text: `${n.title}. ${n.symptom} ${n.rootCause} ${n.fix}`,
        weight: 2,
        snippet: true,
      }))
    );
  }
  return fields;
}

const SNIPPET_RADIUS = 56;

export function snippetAround(text: string, at: number, length: number): string {
  const start = Math.max(0, at - SNIPPET_RADIUS);
  const end = Math.min(text.length, at + length + SNIPPET_RADIUS);
  // Start and end on word boundaries so the snippet never opens mid-word.
  const from = start === 0 ? 0 : text.indexOf(' ', start) + 1 || start;
  const lastSpace = text.lastIndexOf(' ', end);
  const to = end === text.length ? end : lastSpace > at + length ? lastSpace : end;
  return `${from > 0 ? '…' : ''}${text.slice(from, to).trim()}${to < text.length ? '…' : ''}`;
}

/**
 * Score one project against a query. Every word must appear somewhere; the
 * score favours matches in heavier fields and at word starts.
 */
export function searchProject(project: Project, query: string): SearchHit | null {
  const words = query.toLowerCase().trim().split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return null;

  const fields = fieldsOf(project);
  let score = 0;
  let best: { field: Field; at: number; word: string; weight: number } | null = null;

  for (const word of words) {
    let wordBest = 0;
    for (const field of fields) {
      const lower = field.text.toLowerCase();
      const at = lower.indexOf(word);
      if (at < 0) continue;
      const wordStart = at === 0 || !/[a-z0-9]/.test(lower[at - 1]);
      const weight = field.weight * (wordStart ? 1.5 : 1);
      if (weight > wordBest) wordBest = weight;
      if (!best || weight > best.weight) best = { field, at, word, weight };
    }
    if (wordBest === 0) return null; // every word has to land somewhere
    score += wordBest;
  }

  if (!best) return null;
  return {
    score,
    field: best.field.name,
    snippet: best.field.snippet ? snippetAround(best.field.text, best.at, best.word.length) : undefined,
  };
}

/* ── Filter and sort ─────────────────────────────────────────────────── */

export interface Result {
  project: Project;
  hit: SearchHit | null;
}

const TIER_ORDER: Record<Tier, number> = { flagship: 0, production: 1, system: 2, design: 3 };

export function applyWork(projects: Project[], state: Pick<WorkState, 'query' | 'tier' | 'stack' | 'sort'>): Result[] {
  const searching = state.query.trim().length > 1;
  const results: Result[] = [];

  projects.forEach((project) => {
    if (state.tier && project.tier !== state.tier) return;
    // Any of the chosen technologies — "Python or Redis", which is what a
    // reader scanning for either one means.
    if (state.stack.length && !project.stack.some((t) => state.stack.includes(t))) return;
    const hit = searching ? searchProject(project, state.query) : null;
    if (searching && !hit) return;
    results.push({ project, hit });
  });

  const authored = new Map(projects.map((p, i) => [p.id, i]));
  const byTier = (a: Result, b: Result) =>
    TIER_ORDER[a.project.tier] - TIER_ORDER[b.project.tier] ||
    authored.get(a.project.id)! - authored.get(b.project.id)!;

  results.sort((a, b) => {
    // A search ranks by relevance first; the chosen sort breaks ties.
    if (searching && a.hit && b.hit && a.hit.score !== b.hit.score) return b.hit.score - a.hit.score;
    if (state.sort === 'newest') return latestYear(b.project) - latestYear(a.project) || byTier(a, b);
    if (state.sort === 'depth') return depthOf(b.project).score - depthOf(a.project).score || byTier(a, b);
    return byTier(a, b);
  });
  return results;
}

/** Technologies ranked by how many projects use them. */
export function rankStack(projects: Project[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of projects) for (const t of p.stack) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/* ── URL ─────────────────────────────────────────────────────────────────
   A filtered view is worth sending to someone: "here are his Python
   systems, newest first". Only non-default values are written, so the
   plain page keeps its plain URL. */

export function stateFromSearch(search: string, knownStack: readonly string[]): WorkState {
  const params = new URLSearchParams(search);
  const tier = params.get('tier');
  const sort = params.get('sort');
  const view = params.get('view');
  const stackLower = new Map(knownStack.map((t) => [t.toLowerCase(), t]));
  return {
    query: (params.get('q') ?? '').slice(0, 80),
    tier: (TIERS as readonly string[]).includes(tier ?? '') ? (tier as Tier) : null,
    stack: (params.get('stack') ?? '')
      .split(',')
      .map((t) => stackLower.get(t.trim().toLowerCase()))
      .filter((t): t is string => Boolean(t)),
    sort: SORTS.some((s) => s.key === sort) ? (sort as SortKey) : 'tier',
    view: (VIEWS as readonly string[]).includes(view ?? '') ? (view as WorkView) : 'index',
  };
}

/** Rewrites only this section's parameters, leaving any others (e.g. ?ask) alone. */
export function searchFromState(state: WorkState, current: string): string {
  const params = new URLSearchParams(current);
  const set = (key: string, value: string | null) => (value ? params.set(key, value) : params.delete(key));
  set('q', state.query.trim() || null);
  set('tier', state.tier);
  set('stack', state.stack.length ? state.stack.join(',') : null);
  set('sort', state.sort === 'tier' ? null : state.sort);
  set('view', state.view === 'index' ? null : state.view);
  const out = params.toString();
  return out ? `?${out}` : '';
}

export function isFiltered(state: WorkState): boolean {
  return Boolean(state.query.trim() || state.tier || state.stack.length);
}
