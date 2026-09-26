import { describe, expect, it } from 'vitest';

import { PROJECTS } from './projects';
import { PRINCIPLES } from './principles';

/* The About section quotes case studies as evidence. These tests are what
   keep a quote from outliving the text it quotes. */
describe('principles', () => {
  it.each(PRINCIPLES.map((p) => [p.id, p] as const))('%s quotes its project verbatim', (_id, principle) => {
    const project = PROJECTS.find((p) => p.id === principle.projectId);
    expect(project, `unknown project ${principle.projectId}`).toBeDefined();
    expect(JSON.stringify(project)).toContain(JSON.stringify(principle.evidence).slice(1, -1));
  });

  it.each(PRINCIPLES.map((p) => [p.id, p] as const))('%s links to a section its case study renders', (_id, principle) => {
    const study = PROJECTS.find((p) => p.id === principle.projectId)?.caseStudy;
    expect(study).toBeDefined();
    if (principle.section === 'tradeoffs') expect(study!.tradeoffs?.length).toBeGreaterThan(0);
    if (principle.section === 'field-notes') expect(study!.fieldNotes?.length).toBeGreaterThan(0);
  });

  it('has unique ids', () => {
    expect(new Set(PRINCIPLES.map((p) => p.id)).size).toBe(PRINCIPLES.length);
  });
});
