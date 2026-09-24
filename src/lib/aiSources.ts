// Relative imports only: api/ask.ts bundles this module (see aiTools.ts).
import { PROJECTS } from '../data/projects';
import { EXPERIENCE } from '../data/experience';
import type { ToolCall } from './aiTools';

/* ==========================================================================
   AI SOURCES

   Turns "the model said so" into "here is the page that says so".

   An answer on this site is only as good as the reader's ability to check
   it. The evidence drawer already shows the raw SQL and rows; this is the
   other half — the pages an answer leans on, as links, so a recruiter who
   reads "the reconciliation engine matches in two tiers" is one click from
   the case study that says it.

   A source has to earn its place twice: the answer must actually name it,
   or a tool must have fetched it by id. Every row a broad query touched is
   *not* a source — "which systems use python?" returns six titles, and
   listing all six under a two-sentence answer that discusses one of them
   would be citation as decoration.
   ========================================================================== */

export interface AiSource {
  kind: 'project' | 'role';
  id: string;
  title: string;
  href: string;
}

const MAX_SOURCES = 4;

const PROJECT_SOURCES: AiSource[] = PROJECTS.map((p) => ({
  kind: 'project',
  id: p.id,
  title: p.title,
  href: `/projects/${p.id}`,
}));

const ROLE_SOURCES: AiSource[] = EXPERIENCE.map((e) => ({
  kind: 'role',
  id: e.id,
  title: e.company,
  href: '/#experience',
}));

const ALL = [...PROJECT_SOURCES, ...ROLE_SOURCES];

const str = (value: unknown): string => (typeof value === 'string' ? value.trim().toLowerCase() : '');

/** Where `needle` first appears in the answer, as a whole phrase; -1 if not at all. */
function mentionAt(haystack: string, needle: string): number {
  if (needle.length < 3) return -1;
  const escaped = needle.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).exec(haystack);
  return match ? match.index : -1;
}

/**
 * The pages an answer relies on, in the order the answer mentions them.
 *
 * Fetched-by-id sources (get_project / get_experience) are kept even when the
 * answer paraphrases rather than naming them — the model read that page to
 * write the answer, so it is the page to check it against.
 */
export function collectSources(calls: ToolCall[], answer: string): AiSource[] {
  const text = answer.toLowerCase();

  const fetched = new Set<string>();
  for (const call of calls) {
    if (call.name === 'get_project') fetched.add(`project:${str(call.args.id)}`);
    if (call.name === 'get_experience') fetched.add(`role:${str(call.args.id)}`);
    if (call.name === 'get_tradeoffs' && str(call.args.projectId)) {
      fetched.add(`project:${str(call.args.projectId)}`);
    }
  }

  const ranked = ALL.map((source) => {
    // Ids are matched for projects only: a project id is a slug nobody
    // writes by accident, but a role id is often the company's short name —
    // `medvax` — and would cite the MedVax role for a sentence about the
    // MedVax project.
    const names = source.kind === 'project' ? [source.title, source.id] : [source.title];
    const at = Math.min(...names.map((name) => mentionAt(text, name)).map((i) => (i < 0 ? Infinity : i)));
    const wasFetched = fetched.has(`${source.kind}:${source.id}`);
    return { source, at: at === Infinity ? (wasFetched ? Number.MAX_SAFE_INTEGER : -1) : at };
  })
    .filter((entry) => entry.at >= 0)
    .sort((a, b) => a.at - b.at);

  return ranked.slice(0, MAX_SOURCES).map((entry) => entry.source);
}

/**
 * What to ask next, without asking a model.
 *
 * Built from what the last answer cited, so the obvious next question is one
 * tap away: an answer about a project offers its trade-offs and its build,
 * and anything already asked is never offered again. Topped up from the
 * starter list so there is always somewhere to go. Free, instant, and it
 * cannot suggest a question the site has no answer to.
 */
export function suggestFollowUps(
  sources: AiSource[],
  asked: string[],
  starters: readonly string[],
  limit = 3
): string[] {
  const seen = new Set(asked.map((q) => q.trim().toLowerCase()));
  const out: string[] = [];
  const offer = (question: string) => {
    const key = question.toLowerCase();
    if (out.length < limit && !seen.has(key) && !out.some((q) => q.toLowerCase() === key)) out.push(question);
  };

  for (const source of sources) {
    const name = source.title.toLowerCase();
    if (source.kind === 'project') {
      const project = PROJECTS.find((p) => p.id === source.id);
      if (project?.caseStudy?.tradeoffs?.length) offer(`what did ${name} trade off, and why?`);
      offer(`how does ${name} work?`);
    } else {
      offer(`what did he do at ${name}?`);
    }
  }

  for (const starter of starters) offer(starter);
  return out;
}
