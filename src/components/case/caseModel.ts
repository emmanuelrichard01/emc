import type { Project } from '@/types';

/* ==========================================================================
   CASE MODEL

   What a case-study page derives from its project, as pure functions: the
   sections it will actually render, how long it takes to read, the one-line
   version of each part, and which other projects it is related to. The page
   renders; this decides — and is tested against the real data.
   ========================================================================== */

export interface CaseSection {
  id: string;
  num: string;
  label: string;
}

/**
 * The sections this page will render, in order. Derived from the data, not
 * a fixed list, so the contents can never link to a heading that is absent.
 */
export function sectionsFor(project: Project): CaseSection[] {
  const study = project.caseStudy;
  if (!study) {
    return [
      { id: 'overview', num: '01', label: 'Overview' },
      ...(project.decisions.length ? [{ id: 'decisions', num: '02', label: 'Architecture Decisions' }] : []),
      { id: 'ask', num: '→', label: 'Ask About It' },
    ];
  }
  const out: CaseSection[] = [
    { id: 'problem', num: '01', label: 'The Problem' },
    { id: 'approach', num: '02', label: 'The Approach' },
    { id: 'outcome', num: '03', label: 'The Outcome' },
  ];
  if (study.tradeoffs?.length) out.push({ id: 'tradeoffs', num: '04', label: 'Trade-offs' });
  else if (project.decisions.length) out.push({ id: 'decisions', num: '04', label: 'Architecture Decisions' });
  if (study.fieldNotes?.length) out.push({ id: 'field-notes', num: String(out.length + 1).padStart(2, '0'), label: 'Field Notes' });
  out.push({ id: 'ask', num: '→', label: 'Ask About It' });
  return out;
}

/* ── Reading time ────────────────────────────────────────────────────────
   Counted over the prose the page renders, at 230 words a minute — a
   technical-reading pace rather than the 265 blogs use, because this is
   text people read to check, not to skim. */

const WPM = 230;

export function wordsIn(project: Project): number {
  const study = project.caseStudy;
  const parts: string[] = [project.description];
  if (study) {
    parts.push(study.problem, study.approach, study.outcome, study.notice ?? '');
    parts.push(...(study.highlights ?? []));
    for (const t of study.tradeoffs ?? []) parts.push(t.decision, t.chose, t.rejected, t.why);
    for (const n of study.fieldNotes ?? []) parts.push(n.title, n.symptom, ...(n.wrongTurns ?? []), n.rootCause, n.fix, n.guard ?? '');
  } else {
    for (const d of project.decisions) parts.push(d.title, d.detail);
  }
  return parts.join(' ').split(/\s+/).filter(Boolean).length;
}

export function readingMinutes(project: Project): number {
  return Math.max(1, Math.round(wordsIn(project) / WPM));
}

/* ── The short version ───────────────────────────────────────────────────
   The first sentence of each part. Every case study is written to lead
   with its point, so the first sentence *is* the summary — extracted, not
   rewritten, so the short version can never claim something the long one
   does not. */

/* A sentence ends at . ! or ? followed by whitespace and a capital, a digit
   or an opening quote (or the end of the text) — so "0.80" and "e.g. this"
   do not end one early, and "…are primary. 41 RSS feeds…" does. */
const SENTENCE = /^(.+?[.!?])(?=\s+[A-Z0-9"“(]|\s*$)/;

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:—–-]+$/, '')}…`;
}

export function firstSentence(text: string, max = 220): string {
  const match = SENTENCE.exec(text.trim());
  return clip((match ? match[1] : text).trim(), max);
}

/**
 * The lead of a passage: its first sentence, or its first two when the first
 * is too short to stand alone ("When something happens, fifty outlets
 * publish about it." sets a scene; it does not summarise).
 */
export function leadOf(text: string, max = 240): string {
  const trimmed = text.trim();
  const first = SENTENCE.exec(trimmed);
  if (!first) return clip(trimmed, max);
  const one = first[1].trim();
  if (one.length >= 90) return clip(one, max);
  const rest = trimmed.slice(first[1].length).trim();
  const second = SENTENCE.exec(rest);
  const two = second ? `${one} ${second[1].trim()}` : one;
  return two.length <= max ? two : clip(one, max);
}

/* ── Related ─────────────────────────────────────────────────────────────
   By shared stack, weighted by how rare the shared technology is: sharing
   Redpanda says more than sharing Docker. Design studies relate only to
   each other and to nothing built — a blueprint is not a sibling of a
   running system. */

export function relatedProjects(project: Project, all: Project[], limit = 3): { project: Project; shared: string[] }[] {
  const usage = new Map<string, number>();
  for (const p of all) for (const t of p.stack) usage.set(t, (usage.get(t) ?? 0) + 1);

  return all
    .filter((p) => p.id !== project.id && (p.tier === 'design') === (project.tier === 'design'))
    .map((p) => {
      const shared = p.stack.filter((t) => project.stack.includes(t));
      const score = shared.reduce((s, t) => s + 1 / (usage.get(t) ?? 1), 0) + (p.category === project.category ? 0.5 : 0);
      return { project: p, shared, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.project.title.localeCompare(b.project.title))
    .slice(0, limit)
    .map(({ project: p, shared }) => ({ project: p, shared }));
}
