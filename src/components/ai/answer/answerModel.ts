import { PROJECTS } from '@/data/projects';
import { EXPERIENCE } from '@/data/experience';
import { buildKnownRefs } from '@/lib/aiKnown';
import { parseAnswer, validateAnswer, type AnswerDoc, type CiteRef, type KnownRefs } from '@/lib/aiAnswer';
import type { AnswerChecks, CaseSectionId } from '@/lib/aiProtocol';
import type { Project } from '@/types';

/* ==========================================================================
   ANSWER MODEL

   The pure part of rendering an answer: what a citation is called, what it
   shows on hover, how the checks are said, and the parse + validate step
   every surface runs before drawing anything. Kept free of React so it can
   be tested without a browser.
   ========================================================================== */

let known: KnownRefs | null = null;
/** What an answer may point at, built once from the site's own data. */
export function knownRefs(): KnownRefs {
  if (!known) known = buildKnownRefs(PROJECTS, EXPERIENCE);
  return known;
}

/**
 * Brings stray Markdown a model may still write into the answer markup:
 * a heading becomes a bold line of its own, "*", "+" and "1." bullets
 * become "- ", and a list that starts straight under a sentence is split
 * from it. Answers written to the house markup pass through unchanged.
 */
export function tidyMarkdown(text: string): string {
  const out: string[] = [];
  let prevBullet = false;
  let prevText = false;
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const heading = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/.exec(raw);
    if (heading) {
      out.push('', `**${heading[1].replace(/\*\*/g, '')}**`, '');
      prevBullet = prevText = false;
      continue;
    }
    const line = raw.replace(/^(\s*)(?:[*+]|\d{1,2}[.)])\s+/, '$1- ');
    const bullet = /^\s*[-•]\s+/.test(line);
    if (bullet && prevText && !prevBullet) out.push('');
    out.push(line);
    if (line.trim()) {
      prevBullet = bullet;
      prevText = true;
    } else prevBullet = prevText = false;
  }
  return out.join('\n');
}

/** Parses and validates answer text. A reference to something that does not exist is dropped. */
export function readAnswer(text: string, streaming = false): AnswerDoc {
  return validateAnswer(parseAnswer(tidyMarkdown(text), { streaming }), knownRefs()).doc;
}

export const SECTION_NAMES: Record<CaseSectionId, string> = {
  problem: 'the problem',
  approach: 'how it works',
  outcome: 'the result',
  tradeoffs: 'choices and trade-offs',
  decisions: 'key decisions',
  'field-notes': 'lessons from debugging',
  overview: 'overview',
};

export function projectById(id: string): Project | undefined {
  return PROJECTS.find((p) => p.id === id);
}

/** "MMR Engine, choices and trade-offs" / "MedVax Health, Software & Data Engineer". */
export function citationTitle(ref: CiteRef): string {
  if (ref.kind === 'role') {
    const role = EXPERIENCE.find((r) => r.id === ref.id);
    return role ? `${role.company}, ${role.role}` : ref.id;
  }
  const project = projectById(ref.id);
  const title = project?.title ?? ref.id;
  return ref.section ? `${title}, ${SECTION_NAMES[ref.section]}` : title;
}

/** The accessible name of a citation chip: "Source 1: MMR Engine, choices and trade-offs". */
export function citationLabel(ref: CiteRef, n: number): string {
  return `Source ${n}: ${citationTitle(ref)}`;
}

/** The first sentence of a passage, shortened to a line. */
export function firstSentence(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const end = clean.search(/[.!?](\s|$)/);
  const sentence = end > 20 ? clean.slice(0, end + 1) : clean;
  return sentence.length > max ? `${sentence.slice(0, max - 1).trimEnd()}…` : sentence;
}

/** A one-line excerpt of what a citation points at, taken from the data. */
export function citationExcerpt(ref: CiteRef): string {
  if (ref.kind === 'role') {
    const role = EXPERIENCE.find((r) => r.id === ref.id);
    return role ? firstSentence(role.summary) : '';
  }
  const project = projectById(ref.id);
  if (!project) return '';
  const study = project.caseStudy;
  switch (ref.section) {
    case 'problem':
      return firstSentence(study?.problem ?? project.description);
    case 'approach':
      return firstSentence(study?.approach ?? project.description);
    case 'outcome':
      return firstSentence(study?.outcome ?? project.description);
    case 'tradeoffs': {
      const t = study?.tradeoffs?.[0];
      return t ? `${t.decision}: ${t.chose}, instead of ${t.rejected}.` : firstSentence(project.description);
    }
    case 'decisions': {
      const d = project.decisions[0];
      return d ? `${d.title}: ${firstSentence(d.detail, 120)}` : firstSentence(project.description);
    }
    case 'field-notes': {
      const f = study?.fieldNotes?.[0];
      return f ? `${f.title}. ${firstSentence(f.symptom, 120)}` : firstSentence(project.description);
    }
    default:
      return firstSentence(project.description);
  }
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export interface ChecksLine {
  tone: 'ok' | 'warn' | 'none';
  text: string;
}

/**
 * How the server's checks are said under an answer.
 *
 *   ok    "4 figures and 3 names checked against the site"
 *   warn  "1 figure not found in the site's data"
 *   none  nothing was checkable (no figures, no names): said only when asked
 *
 * Falls back to the legacy `unverified` list for a server that sends no checks.
 */
export function checksLine(checks: AnswerChecks | undefined, legacyUnverified?: string[]): ChecksLine {
  if (!checks) {
    if (legacyUnverified?.length) {
      return { tone: 'warn', text: `${count(legacyUnverified.length, 'figure', 'figures')} not found in the site’s data` };
    }
    return { tone: 'none', text: '' };
  }
  const missing: string[] = [];
  if (checks.unverified.length) missing.push(count(checks.unverified.length, 'figure', 'figures'));
  if (checks.unverifiedNames.length) missing.push(count(checks.unverifiedNames.length, 'name', 'names'));
  const dropped = checks.droppedRefs ? `, ${count(checks.droppedRefs, 'broken reference', 'broken references')} removed` : '';
  if (missing.length) return { tone: 'warn', text: `${missing.join(' and ')} not found in the site’s data${dropped}` };

  const found: string[] = [];
  if (checks.figures) found.push(count(checks.figures, 'figure', 'figures'));
  if (checks.names) found.push(count(checks.names, 'name', 'names'));
  if (!found.length) return { tone: 'none', text: dropped ? dropped.slice(2).replace(/^./, (c) => c.toUpperCase()) : '' };
  return { tone: 'ok', text: `${found.join(' and ')} checked against the site${dropped}` };
}

/** Everything in an answer's text that should carry a "not found" mark. */
export function unverifiedMarks(checks: AnswerChecks | undefined, legacyUnverified?: string[]): string[] {
  const figures = checks?.unverified ?? legacyUnverified ?? [];
  const names = checks?.unverifiedNames ?? [];
  return [...figures, ...names].filter(Boolean);
}
