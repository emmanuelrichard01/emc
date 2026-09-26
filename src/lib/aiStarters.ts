// Relative imports only: api/ask.ts bundles this module (see aiTools.ts).
import type { Project } from '../types';
import { MAX_QUESTION_CHARS } from './aiHistory';

/* ==========================================================================
   AI STARTERS, LENSES AND LINKS

   The parts of the assistant that decide *what to offer* rather than what to
   answer — kept pure so the dock, the terminal, the case-study panel and the
   endpoint all agree on them, and so they can be tested without a model.
   ========================================================================== */

/* ── Audience ────────────────────────────────────────────────────────────
   The same question deserves a different answer from a recruiter and from
   an engineer. "How does the reconciliation engine work?" is, for one of
   them, a question about outcomes and scope; for the other, about matching
   tiers and failure modes. Asking the visitor once — and letting them change
   their mind — is cheaper and more honest than guessing from behaviour.

   `general` is the default and sends nothing, so the endpoint's prompt is
   byte-for-byte what it was before lenses existed. */

export type Audience = 'general' | 'hiring' | 'engineer';

export const AUDIENCES: readonly { id: Audience; label: string; hint: string }[] = [
  { id: 'general', label: 'general', hint: 'balanced answers' },
  { id: 'hiring', label: 'hiring', hint: 'outcomes and scope, plain language' },
  { id: 'engineer', label: 'engineer', hint: 'mechanisms, failure modes, rejected options' },
];

export function isAudience(value: unknown): value is Audience {
  return value === 'general' || value === 'hiring' || value === 'engineer';
}

/**
 * The line appended to the system prompt for a lens, or null for none.
 *
 * Register only. A lens changes how an answer is pitched, never what it may
 * claim — the grounding rules above it are untouched, and the grounding
 * check runs on every lens alike.
 */
export function audiencePrompt(audience: Audience): string | null {
  switch (audience) {
    case 'hiring':
      return 'AUDIENCE: the visitor is hiring or recruiting. Lead with what was built, for whom, and what it achieved, in plain language. Name technologies but say what each one did; explain any term a non-engineer would not know. Where a case study covers it, name it so they can open it.';
    case 'engineer':
      return 'AUDIENCE: the visitor is an engineer. Be technically precise: name the mechanism, the data structure, the failure mode and the alternative that was rejected. Jargon is fine; vagueness is not. Up to 6 sentences when the mechanism needs them.';
    default:
      return null;
  }
}

/* ── Starters ────────────────────────────────────────────────────────────
   Every starter must be answerable from the site's own data (a starter that
   leads to "I don't have that" teaches a visitor the feature is broken on
   first use). See AI_SUGGESTIONS in AiTranscript for the reasoning behind
   the general set, which is the one this falls back to. */

const HIRING_STARTERS = [
  'what has he actually shipped?',
  'what would he bring to a data platform team?',
  'where has he worked, and for how long?',
  'which project best shows how he works?',
] as const;

const ENGINEER_STARTERS = [
  'how does the reconciliation engine work?',
  'how does the collaborative canvas stay in sync offline?',
  'what trade-offs did he make, and what did he reject?',
  'what went wrong while building something, and how was it found?',
] as const;

/** Opening questions for one case study — about *this* project, not everything. */
export function projectStarters(project: Pick<Project, 'caseStudy'>): string[] {
  const study = project.caseStudy;
  return [
    'how does it work, end to end?',
    ...(study?.tradeoffs?.length ? ['what did he trade off, and what did he reject?'] : []),
    ...(study?.fieldNotes?.length ? ['what went wrong while building it?'] : []),
    'what does this project show about how he works?',
  ];
}

export function startersFor(
  { project, audience }: { project?: Pick<Project, 'caseStudy'> | null; audience: Audience },
  general: readonly string[]
): string[] {
  if (project) return projectStarters(project);
  if (audience === 'hiring') return [...HIRING_STARTERS];
  if (audience === 'engineer') return [...ENGINEER_STARTERS];
  return [...general];
}

/* ── Asking about a passage ──────────────────────────────────────────────
   Selecting a sentence on the page and asking about it. The quote travels
   inside the question — the endpoint accepts nothing else, by design — so it
   is trimmed to leave the question comfortably under the cap. */

const QUOTE_MAX = 240;

export function passageQuestion(selection: string): string | null {
  const text = selection.replace(/\s+/g, ' ').trim();
  if (text.length < 3) return null;
  const quote = text.length > QUOTE_MAX ? `${text.slice(0, QUOTE_MAX - 1).trimEnd()}…` : text;
  const question = `explain this, and where it comes from: "${quote}"`;
  return question.length <= MAX_QUESTION_CHARS ? question : null;
}

/* ── Permalinks ──────────────────────────────────────────────────────────
   `/?ask=…` opens the assistant and asks. A recruiter can send a colleague
   the question rather than a screenshot of its answer — and the answer they
   get is generated (or replayed from the per-deploy cache) against the data
   as it stands, not frozen at the moment of sharing. */

export const ASK_PARAM = 'ask';

export function permalinkFor(origin: string, pathname: string, question: string): string {
  const url = new URL(pathname || '/', origin);
  url.searchParams.set(ASK_PARAM, question.trim());
  return url.toString();
}

/** The question a URL carries, if it carries a usable one. */
export function questionFromSearch(search: string): string | null {
  const value = new URLSearchParams(search).get(ASK_PARAM);
  if (!value) return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed || trimmed.length > MAX_QUESTION_CHARS) return null;
  return trimmed;
}
