// Type-only imports, relative with `.js`: api/ code bundles this module, and
// scripts/build-ai-context.mjs loads it with Node's own type stripping, which
// erases type imports and cannot resolve anything else through `.js`.
import type { ExperienceItem, Project } from '../types/index.js';

/* ==========================================================================
   AI PASSAGES

   Every sentence the site says, cut into labelled passages: a project's
   summary, each part of its case study, each highlight, trade-off, field
   note and decision; each role and its highlights. search_site ranks these,
   and the build embeds them for semantic search.

   One function, used by both: the endpoint (through aiTools.ts) and the
   build script that writes the vectors. A vector is only ever matched to the
   passage it was made from, and `passagesDigest` proves the two still agree.
   ========================================================================== */

export interface Passage {
  kind: 'project' | 'role';
  id: string;
  title: string;
  where: string;
  text: string;
}

export function buildPassages(projects: readonly Project[], experience: readonly ExperienceItem[]): Passage[] {
  return [
    ...projects.flatMap((p): Passage[] => {
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
                at('field note', `${n.title}. ${n.symptom} ${n.rootCause} ${n.fix} ${n.guard ?? ''}`.trim())
              ),
              ...(study.notice ? [at('scope notice', study.notice)] : []),
            ]
          : []),
        ...p.decisions.map((d) => at('decision', `${d.title}: ${d.detail}`)),
      ];
    }),
    ...experience.flatMap((e): Passage[] => {
      const at = (where: string, text: string): Passage => ({ kind: 'role', id: e.id, title: e.company, where, text });
      return [
        at('role', `${e.company}, ${e.role} (${e.type}, ${e.period}). ${e.summary}`),
        ...e.highlights.map((h) => at('role highlight', h)),
        at('stack', e.stack.join(', ')),
      ];
    }),
  ].filter((passage) => passage.text.trim().length > 0);
}

/** The text a passage is embedded as: its label and its words. */
export function passageDocument(passage: Passage): string {
  return `title: ${passage.title}, ${passage.where} | text: ${passage.text}`;
}

/**
 * A fingerprint of every passage, in order (FNV-1a, 32-bit). Synchronous and
 * dependency-free so the edge function and the build compute it identically.
 * Stored vectors are used only while it matches: edited data with stale
 * vectors falls back to keyword search rather than matching the wrong text.
 */
export function passagesDigest(passages: readonly Passage[]): string {
  let hash = 0x811c9dc5;
  for (const passage of passages) {
    const text = `${passage.kind}:${passage.id}:${passage.where}:${passage.text}\n`;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  }
  return `${passages.length}-${hash.toString(16).padStart(8, '0')}`;
}
