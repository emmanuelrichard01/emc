import { describe, expect, it } from 'vitest';

import { PROJECTS } from '../data/projects';
import { MAX_QUESTION_CHARS } from './aiHistory';
import { AI_SUGGESTIONS } from './aiSuggestions';
import {
  audiencePrompt,
  isAudience,
  passageQuestion,
  permalinkFor,
  projectStarters,
  questionFromSearch,
  startersFor,
} from './aiStarters';

describe('audience', () => {
  it('accepts only the three lenses', () => {
    expect(isAudience('hiring')).toBe(true);
    expect(isAudience('engineer')).toBe(true);
    expect(isAudience('general')).toBe(true);
    expect(isAudience('admin')).toBe(false);
    expect(isAudience(undefined)).toBe(false);
  });

  it('adds nothing to the prompt for the general lens', () => {
    expect(audiencePrompt('general')).toBeNull();
    expect(audiencePrompt('hiring')).toMatch(/^AUDIENCE:/);
    expect(audiencePrompt('engineer')).toMatch(/^AUDIENCE:/);
  });
});

describe('starters', () => {
  it('uses the general set by default', () => {
    expect(startersFor({ audience: 'general' }, AI_SUGGESTIONS)).toEqual([...AI_SUGGESTIONS]);
  });

  it('prefers the page over the lens on a case study', () => {
    const vega = PROJECTS.find((p) => p.id === 'vega-canva')!;
    expect(startersFor({ project: vega, audience: 'hiring' }, AI_SUGGESTIONS)).toEqual(projectStarters(vega));
  });

  it('offers a field-notes question only where there are field notes', () => {
    for (const project of PROJECTS) {
      const offers = projectStarters(project).some((q) => q.includes('went wrong'));
      expect(offers, project.id).toBe(Boolean(project.caseStudy?.fieldNotes?.length));
    }
  });

  it('keeps every starter under the question cap', () => {
    for (const audience of ['general', 'hiring', 'engineer'] as const) {
      for (const q of startersFor({ audience }, AI_SUGGESTIONS)) expect(q.length).toBeLessThan(MAX_QUESTION_CHARS);
    }
  });
});

describe('passageQuestion', () => {
  it('quotes a selection inside the question', () => {
    expect(passageQuestion('  the threshold is 0.80  ')).toBe('explain this, and where it comes from: "the threshold is 0.80"');
  });

  it('trims a long selection so the question stays under the cap', () => {
    const q = passageQuestion('word '.repeat(400));
    expect(q).not.toBeNull();
    expect(q!.length).toBeLessThanOrEqual(MAX_QUESTION_CHARS);
    expect(q).toContain('…"');
  });

  it('ignores a selection too short to be a passage', () => {
    expect(passageQuestion(' a ')).toBeNull();
  });
});

describe('permalinks', () => {
  it('round-trips a question through the URL', () => {
    const url = permalinkFor('https://www.builtbyem.dev', '/projects/mmr-engine', 'how does it work?');
    expect(url).toBe('https://www.builtbyem.dev/projects/mmr-engine?ask=how+does+it+work%3F');
    expect(questionFromSearch(new URL(url).search)).toBe('how does it work?');
  });

  it('refuses a question the endpoint would refuse', () => {
    expect(questionFromSearch(`?ask=${'x'.repeat(MAX_QUESTION_CHARS + 1)}`)).toBeNull();
    expect(questionFromSearch('?ask=%20%20')).toBeNull();
    expect(questionFromSearch('?other=1')).toBeNull();
  });
});
