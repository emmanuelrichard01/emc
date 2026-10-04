// Relative imports only: api/ code bundles this module (see aiTools.ts).
import type { ExperienceItem, Project } from '../types/index.js';
import type { CaseSectionId } from './aiProtocol.js';
import type { KnownRefs } from './aiAnswer.js';

/* ==========================================================================
   AI KNOWN REFERENCES

   What an answer may point at: every project with the case-study sections it
   really has, every role, and which projects carry code or a diagram. Built
   from the same arrays the page renders, so a citation can only open a
   section that exists. Mirrors components/case/caseModel.ts sectionsFor().
   ========================================================================== */

export function sectionsFor(project: Project): Set<CaseSectionId> {
  const study = project.caseStudy;
  if (!study) {
    const out = new Set<CaseSectionId>(['overview']);
    if (project.decisions.length) out.add('decisions');
    return out;
  }
  const out = new Set<CaseSectionId>(['problem', 'approach', 'outcome']);
  if (study.tradeoffs?.length) out.add('tradeoffs');
  else if (project.decisions.length) out.add('decisions');
  if (study.fieldNotes?.length) out.add('field-notes');
  return out;
}

function hasBlock(project: Project, kind: 'code' | 'architecture'): boolean {
  const blocks = project.caseStudy?.blocks;
  if (!blocks) return false;
  return Object.values(blocks).some((list) => list?.some((block) => block.kind === kind));
}

export function buildKnownRefs(projects: Project[], roles: ExperienceItem[]): KnownRefs {
  return {
    projects: new Map(projects.map((p) => [p.id, sectionsFor(p)])),
    roles: new Set(roles.map((r) => r.id)),
    withCode: new Set(projects.filter((p) => hasBlock(p, 'code')).map((p) => p.id)),
    withDiagram: new Set(projects.filter((p) => hasBlock(p, 'architecture')).map((p) => p.id)),
  };
}
