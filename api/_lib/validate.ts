import { PROJECTS } from '../../src/data/projects.js';
import { EXPERIENCE } from '../../src/data/experience.js';
import { executeToolCall, PASSAGES } from '../../src/lib/aiTools.js';
import { sectionsFor } from '../../src/lib/aiKnown.js';
import type {
  AiAction,
  BriefResult,
  CaseSectionId,
  FitEvidence,
  FitRequirement,
  FitResult,
  FitVerdict,
  SiteSection,
} from '../../src/lib/aiProtocol.js';
import { plainDashes } from './chain.js';

/* ==========================================================================
   VALIDATE: nothing a model proposes reaches the visitor unchecked.

   A model can name a project that does not exist, a stack the site never
   used, or "quote" a sentence it wrote itself. Each structured thing it
   produces (a button, a role-fit verdict, a brief) passes through here
   against the same data the page renders. What fails is dropped or
   downgraded, never passed on with a warning.
   ========================================================================== */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const str = (value: unknown, max: number): string =>
  typeof value === 'string' ? plainDashes(value.replace(/\s+/g, ' ').trim()).slice(0, max) : '';

const strList = (value: unknown, maxItems: number, maxChars: number): string[] =>
  Array.isArray(value) ? value.map((v) => str(v, maxChars)).filter(Boolean).slice(0, maxItems) : [];

/* ── Quotes ──────────────────────────────────────────────────────────────
   A quote is verbatim when, with whitespace collapsed and case ignored, it
   is a substring of what the site says about that project or role. The
   corpus is everything a tool could have shown the model: the full
   get_project / get_experience text and every search passage. */

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const corpusCache = new Map<string, string>();

export function corpusFor(kind: 'project' | 'role', id: string): string | null {
  const key = `${kind}:${id}`;
  const cached = corpusCache.get(key);
  if (cached !== undefined) return cached;
  const exists = kind === 'project' ? PROJECTS.some((p) => p.id === id) : EXPERIENCE.some((e) => e.id === id);
  if (!exists) return null;
  const detail = executeToolCall({ id: 'corpus', name: kind === 'project' ? 'get_project' : 'get_experience', args: { id } }).content;
  const passages = PASSAGES.filter((p) => p.kind === kind && p.id === id).map((p) => p.text);
  const corpus = normalise([detail, ...passages].join('\n'));
  corpusCache.set(key, corpus);
  return corpus;
}

/** True when `quote` is, give or take whitespace and case, in the site's data for that project or role. */
export function quoteIsVerbatim(kind: 'project' | 'role', id: string, quote: string): boolean {
  const corpus = corpusFor(kind, id);
  const needle = normalise(quote).replace(/^["'…\s]+|["'…\s.]+$/g, '');
  return Boolean(corpus && needle.length >= 8 && corpus.includes(needle));
}

/** A project's case-study text only: the part of the page a highlight can land on. */
function caseText(id: string): string | null {
  const project = PROJECTS.find((p) => p.id === id);
  const study = project?.caseStudy;
  if (!project) return null;
  return normalise(
    [
      study?.problem,
      study?.approach,
      study?.outcome,
      ...(study?.highlights ?? []),
      ...(study?.tradeoffs ?? []).flatMap((t) => [t.decision, t.chose, t.rejected, t.why]),
      ...(study?.fieldNotes ?? []).flatMap((n) => [n.title, n.symptom, n.rootCause, n.fix, n.guard ?? '', ...(n.wrongTurns ?? [])]),
      study?.notice,
      project.description,
      ...project.decisions.flatMap((d) => [d.title, d.detail]),
    ]
      .filter(Boolean)
      .join('\n')
  );
}

/* ── offer_action ─────────────────────────────────────────────────────── */

const SITE_SECTIONS: readonly SiteSection[] = ['about', 'projects', 'experience', 'contact'];
const TIERS = ['flagship', 'production', 'system', 'design'] as const;

/** Every stack name the projects use, by lower-case spelling → the site's spelling. */
const STACKS = new Map(PROJECTS.flatMap((p) => p.stack).map((s) => [s.toLowerCase(), s]));

export const MAX_ACTIONS = 2;

/** A checked action, or the reason it was refused (handed back to the model). */
export function validateAction(input: unknown): { action: AiAction } | { error: string } {
  if (!isRecord(input)) return { error: 'expected an object' };
  const kind = input.kind;
  const label = str(input.label, 40);

  switch (kind) {
    case 'show-work': {
      const requested = Array.isArray(input.stack) ? input.stack.map((s) => str(s, 40)).filter(Boolean) : [];
      const stack = requested.map((s) => STACKS.get(s.toLowerCase())).filter((s): s is string => Boolean(s));
      if (requested.length && stack.length < requested.length) {
        const unknown = requested.filter((s) => !STACKS.has(s.toLowerCase()));
        return { error: `no project lists ${unknown.join(', ')} in its stack` };
      }
      const tier = TIERS.find((t) => t === input.tier);
      if (input.tier !== undefined && input.tier !== null && input.tier !== '' && !tier) return { error: `unknown tier "${String(input.tier)}"` };
      const query = str(input.query, 60);
      if (!stack.length && !tier && !query) return { error: 'give a stack, a tier or a query to show' };
      return {
        action: {
          kind: 'show-work',
          label: label || 'Show matching work',
          ...(stack.length ? { stack: [...new Set(stack)].slice(0, 4) } : {}),
          ...(tier ? { tier } : {}),
          ...(query ? { query } : {}),
        },
      };
    }
    case 'open-case': {
      const id = str(input.id, 60).toLowerCase();
      const project = PROJECTS.find((p) => p.id === id);
      if (!project) return { error: `no project "${id}"` };
      const sections = sectionsFor(project);
      const section = typeof input.section === 'string' && sections.has(input.section as CaseSectionId) ? (input.section as CaseSectionId) : undefined;
      // A quote that is not on the page would highlight nothing; it is
      // dropped and the jump still offered.
      const rawQuote = str(input.quote, 300);
      const text = caseText(id);
      const needle = normalise(rawQuote).replace(/^["'…\s]+|["'…\s.]+$/g, '');
      const quote = rawQuote && text && needle.length >= 8 && text.includes(needle) ? rawQuote.replace(/^["'…\s]+|["'…\s]+$/g, '') : undefined;
      return {
        action: {
          kind: 'open-case',
          label: label || `Open ${project.title}`,
          id,
          ...(section ? { section } : {}),
          ...(quote ? { quote } : {}),
        },
      };
    }
    case 'go-to': {
      const section = SITE_SECTIONS.find((s) => s === input.section);
      if (!section) return { error: `section must be one of ${SITE_SECTIONS.join(', ')}` };
      return { action: { kind: 'go-to', label: label || `Go to ${section}`, section } };
    }
    case 'open-role': {
      const id = str(input.id, 60).toLowerCase();
      const role = EXPERIENCE.find((e) => e.id === id);
      if (!role) return { error: `no role "${id}"` };
      return { action: { kind: 'open-role', label: label || `Open ${role.company}`, id } };
    }
    default:
      return { error: 'kind must be show-work, open-case, go-to or open-role' };
  }
}

export const actionKey = (action: AiAction) => JSON.stringify({ ...action, label: '' });

/* ── Role fit ─────────────────────────────────────────────────────────── */

const VERDICTS: readonly FitVerdict[] = ['strong', 'partial', 'not-shown'];
export const MAX_REQUIREMENTS = 10;

export function validateFit(input: unknown): FitResult | null {
  if (!isRecord(input) || !Array.isArray(input.requirements)) return null;
  let rejectedEvidence = 0;

  const requirements: FitRequirement[] = input.requirements.slice(0, MAX_REQUIREMENTS).flatMap((raw): FitRequirement[] => {
    if (!isRecord(raw)) return [];
    const requirement = str(raw.requirement, 160);
    if (!requirement) return [];
    let verdict: FitVerdict = VERDICTS.find((v) => v === raw.verdict) ?? 'not-shown';
    let note = str(raw.note, 280);

    const evidence: FitEvidence[] = (Array.isArray(raw.evidence) ? raw.evidence : []).slice(0, 4).flatMap((e): FitEvidence[] => {
      if (!isRecord(e)) return [];
      const kind = e.kind === 'role' ? 'role' : e.kind === 'project' ? 'project' : null;
      const id = str(e.id, 60).toLowerCase();
      const quote = typeof e.quote === 'string' ? e.quote.replace(/\s+/g, ' ').trim().slice(0, 400) : '';
      if (!kind || !id || !quote || !quoteIsVerbatim(kind, id, quote)) {
        rejectedEvidence++;
        return [];
      }
      const project = kind === 'project' ? PROJECTS.find((p) => p.id === id) : undefined;
      const section =
        project && typeof e.section === 'string' && sectionsFor(project).has(e.section as CaseSectionId)
          ? (e.section as CaseSectionId)
          : undefined;
      return [{ kind, id, ...(section ? { section } : {}), quote }];
    });

    // A claim of strength with nothing on the site behind it is not shown.
    if (!evidence.length && verdict !== 'not-shown') {
      verdict = 'not-shown';
      note = 'Nothing on the site shows this directly.';
    }
    return [{ requirement, verdict, note: note || (verdict === 'not-shown' ? 'Nothing on the site shows this directly.' : ''), evidence }];
  });

  if (!requirements.length) return null;
  const role = str(input.role, 120);
  return {
    ...(role ? { role } : {}),
    summary: str(input.summary, 600) || 'A comparison of the job description with the work on this site.',
    requirements,
    rejectedEvidence,
  };
}

/* ── Brief ────────────────────────────────────────────────────────────── */

export function validateBrief(input: unknown): BriefResult | null {
  if (!isRecord(input)) return null;
  const title = str(input.title, 100);
  const goal = str(input.goal, 600);
  if (!title || !goal) return null;
  const timeline = str(input.timeline, 160);
  const seen = new Set<string>();
  const relevantWork = (Array.isArray(input.relevantWork) ? input.relevantWork : []).flatMap((w): { id: string; why: string }[] => {
    if (!isRecord(w)) return [];
    const id = str(w.id, 60).toLowerCase();
    if (!PROJECTS.some((p) => p.id === id) || seen.has(id)) return [];
    seen.add(id);
    return [{ id, why: str(w.why, 240) }];
  });
  return {
    title,
    goal,
    currentState: str(input.currentState, 600),
    outcomes: strList(input.outcomes, 6, 200),
    constraints: strList(input.constraints, 6, 200),
    ...(timeline ? { timeline } : {}),
    relevantWork: relevantWork.slice(0, 3),
    openQuestions: strList(input.openQuestions, 6, 200),
  };
}

/* ── Command suggestion ───────────────────────────────────────────────── */

const NOT_COMMANDS = new Set(
  'a an and or the to of in on for with by is are be it its this that these those all any each every use usage example examples e.g eg note notes flags flag paths path commands command options option see also files file run runs then if when'.split(' ')
);

/**
 * The command names a reference lists: the first word of each line that
 * starts with a lower-case name (indented by at most a few spaces). Prose
 * words that could start a line are excluded; the client re-checks every
 * proposal with the real parser anyway.
 */
export function commandNames(reference: string): Set<string> {
  const names = new Set<string>();
  for (const match of reference.matchAll(/^[ \t]{0,4}([a-z][a-z0-9_-]{0,23})(?=[ \t]|$)/gm)) {
    if (!NOT_COMMANDS.has(match[1])) names.add(match[1]);
  }
  return names;
}

export function validateCommand(input: unknown, names: ReadonlySet<string>): { command: string; why: string } | null {
  if (!isRecord(input)) return null;
  const command = typeof input.command === 'string' ? input.command.replace(/[\r\n]+/g, ' ').trim().slice(0, 200) : '';
  const first = command.split(/\s+/)[0] ?? '';
  if (!command || !names.has(first)) return null;
  const why = str(input.why, 200);
  return { command, why: why || 'Runs the closest command to what you asked.' };
}
