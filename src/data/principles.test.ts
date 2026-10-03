import { describe, expect, it } from 'vitest';

import { PROJECTS } from './projects';
import { PRINCIPLES } from './principles';

/* The About section gives an example from a case study for each principle.
   These tests keep an example from outliving the fact it rests on. */
describe('principles', () => {
  it.each(PRINCIPLES.map((p) => [p.id, p] as const))('%s rests on a fact its project still states', (_id, principle) => {
    const project = PROJECTS.find((p) => p.id === principle.projectId);
    expect(project, `unknown project ${principle.projectId}`).toBeDefined();
    expect(JSON.stringify(project)).toContain(JSON.stringify(principle.anchor).slice(1, -1));
    // The anchor is the fact the example states, so the example must say it.
    expect(principle.example).toContain(principle.anchor);
  });

  it.each(PRINCIPLES.map((p) => [p.id, p] as const))('%s is written without em-dashes', (_id, principle) => {
    expect(`${principle.title} ${principle.gist} ${principle.example}`).not.toContain('—');
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
