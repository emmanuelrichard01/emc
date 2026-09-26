import { describe, expect, it } from 'vitest';

import { PROJECTS } from '@/data/projects';
import { firstSentence, leadOf, readingMinutes, relatedProjects, sectionsFor, wordsIn } from './caseModel';

const byId = (id: string) => PROJECTS.find((p) => p.id === id)!;

describe('sectionsFor', () => {
  it('lists field notes only where there are field notes', () => {
    for (const p of PROJECTS) {
      expect(sectionsFor(p).some((s) => s.id === 'field-notes'), p.id).toBe(Boolean(p.caseStudy?.fieldNotes?.length));
    }
  });

  it('never lists both trade-offs and decisions', () => {
    for (const p of PROJECTS) {
      const ids = sectionsFor(p).map((s) => s.id);
      expect(ids.includes('tradeoffs') && ids.includes('decisions'), p.id).toBe(false);
    }
  });

  it('always ends on the assistant', () => {
    for (const p of PROJECTS) {
      const all = sectionsFor(p);
      expect(all[all.length - 1].id).toBe('ask');
    }
  });
});

describe('reading time', () => {
  it('is at least a minute, and grows with the write-up', () => {
    for (const p of PROJECTS) expect(readingMinutes(p)).toBeGreaterThanOrEqual(1);
    expect(wordsIn(byId('ultra-news'))).toBeGreaterThan(wordsIn(byId('evanty')));
  });
});

describe('firstSentence', () => {
  it('does not end a sentence at a decimal point', () => {
    expect(firstSentence('The threshold is 0.80 by measurement. Then more.')).toBe('The threshold is 0.80 by measurement.');
  });

  it('does not end at an abbreviation followed by lowercase', () => {
    expect(firstSentence('Tools, e.g. dbt and Dagster, run hourly. Next.')).toBe('Tools, e.g. dbt and Dagster, run hourly.');
  });

  it('trims a very long sentence on a word boundary', () => {
    const s = firstSentence(`${'word '.repeat(80)}end.`, 60);
    expect(s.length).toBeLessThanOrEqual(61);
    expect(s.endsWith('…')).toBe(true);
  });

  it('produces a sentence for every case study part', () => {
    for (const p of PROJECTS.filter((x) => x.caseStudy)) {
      for (const part of [p.caseStudy!.problem, p.caseStudy!.approach, p.caseStudy!.outcome]) {
        expect(firstSentence(part).length, p.id).toBeGreaterThan(20);
      }
    }
  });
});

describe('leadOf', () => {
  it('ends a sentence before one that starts with a number', () => {
    expect(firstSentence('Stories are primary. 41 feeds are polled.')).toBe('Stories are primary.');
  });

  it('takes a second sentence when the first only sets the scene', () => {
    expect(leadOf('Something happens. Fifty outlets publish about it, and nobody says which confirmed it.')).toBe(
      'Something happens. Fifty outlets publish about it, and nobody says which confirmed it.'
    );
  });

  it('keeps one sentence when it already carries the point', () => {
    const long = 'A token bucket per client, held in Redis, with check-and-consume implemented as one atomic Lua script.';
    expect(leadOf(`${long} More detail follows.`)).toBe(long);
  });
});

describe('relatedProjects', () => {
  it('never relates a built system to a design study', () => {
    for (const p of PROJECTS) {
      for (const r of relatedProjects(p, PROJECTS)) {
        expect(r.project.tier === 'design', `${p.id} → ${r.project.id}`).toBe(p.tier === 'design');
      }
    }
  });

  it('never relates a project to itself, and says what they share', () => {
    const related = relatedProjects(byId('mmr-engine'), PROJECTS);
    expect(related.length).toBeGreaterThan(0);
    for (const r of related) {
      expect(r.project.id).not.toBe('mmr-engine');
      expect(r.shared.every((t) => byId('mmr-engine').stack.includes(t))).toBe(true);
    }
  });
});
