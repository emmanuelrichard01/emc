import { PROJECTS } from '../../src/data/projects.js';
import { EXPERIENCE } from '../../src/data/experience.js';
import { parseAnswer, stripMarkup, validateAnswer, type AnswerDoc, type Inline } from '../../src/lib/aiAnswer.js';
import { buildKnownRefs } from '../../src/lib/aiKnown.js';
import { figuresIn, unverifiedFigures } from '../../src/lib/aiGrounding.js';
import { auditNames, type LexiconEntry } from '../../src/lib/aiLexicon.js';
import type { AnswerChecks } from '../../src/lib/aiProtocol.js';
import { plainDashes } from './chain.js';

/* ==========================================================================
   FINISHING AN ANSWER

   What happens between the model's last token and the `done` event:

     1. The markup is parsed and every citation and block checked against
        what exists (aiAnswer.ts, aiKnown.ts). A reference to a project that
        is not there, or a section it does not have, is dropped; if anything
        was, the corrected text goes out in `done.text` for the client to
        render instead of what streamed.
     2. The figures are checked against the evidence (aiGrounding.ts).
     3. The names are checked against the evidence (aiLexicon.ts).

   All three are counted in AnswerChecks, so the visitor can see what was
   checked as well as what failed.
   ========================================================================== */

export const KNOWN = buildKnownRefs(PROJECTS, EXPERIENCE);

/** The site's own names: always in the evidence, counted when an answer uses them. */
const SITE_NAMES: LexiconEntry[] = [
  ...PROJECTS.map((p) => ({ name: p.title })),
  ...[...new Set(EXPERIENCE.map((e) => e.company))].map((name) => ({ name })),
];

const inlineMarkup = (inlines: Inline[]) =>
  inlines
    .map((node) => {
      if (node.type === 'cite') {
        return node.ref.kind === 'project'
          ? `[^project:${node.ref.id}${node.ref.section ? `#${node.ref.section}` : ''}]`
          : `[^role:${node.ref.id}]`;
      }
      return node.strong ? `**${node.text}**` : node.text;
    })
    .join('')
    // A dropped citation can leave "claim ." behind.
    .replace(/ +([.,;:])/g, '$1')
    .trim();

/** A parsed answer back to markup (the inverse of parseAnswer, for a corrected answer). */
export function docToMarkup(doc: AnswerDoc): string {
  return doc.nodes
    .map((node) => {
      if (node.type === 'p') return inlineMarkup(node.inlines);
      if (node.type === 'list') return node.items.map((item) => `- ${inlineMarkup(item)}`).join('\n');
      const b = node.block;
      return `{{${b.kind}:${b.kind === 'compare' ? b.ids.join(',') : b.id}}}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

export interface FinishedAnswer {
  /** The answer to keep: corrected when a reference was dropped, else as written. */
  text: string;
  /** True when `text` differs from what streamed. */
  changed: boolean;
  checks: AnswerChecks;
}

export function finishAnswer(raw: string, evidence: string[]): FinishedAnswer {
  const cleaned = plainDashes(raw);
  const { doc, dropped } = validateAnswer(parseAnswer(cleaned), KNOWN);
  const text = dropped ? docToMarkup(doc) : cleaned;

  const plain = stripMarkup(text);
  const unverified = unverifiedFigures(plain, evidence);
  const names = auditNames(plain, evidence, SITE_NAMES);

  return {
    text,
    changed: text !== raw,
    checks: {
      figures: figuresIn(plain).length - unverified.length,
      names: names.verified.length,
      unverified,
      unverifiedNames: names.unverified,
      droppedRefs: dropped,
    },
  };
}
