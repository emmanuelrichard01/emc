import { describe, expect, it } from 'vitest';

import { PROJECTS } from '@/data/projects';
import { EXPERIENCE } from '@/data/experience';
import type { Project } from '@/types';
import { buildFigures, formatCount, readFigure, roundDown, sentenceWith, testParts } from './figures';

const figures = buildFigures(PROJECTS, EXPERIENCE);
const get = (id: string) => figures.find((f) => f.id === id)!;

describe('roundDown', () => {
  it('never shows more than the true figure', () => {
    for (const n of [1, 36, 99, 100, 276, 999, 1000, 4589, 4599, 10_001, 123_456]) {
      const { value, plus } = roundDown(n);
      expect(value).toBeLessThanOrEqual(n);
      expect(plus).toBe(value < n);
    }
  });

  it('keeps two significant figures', () => {
    expect(roundDown(4589)).toEqual({ value: 4500, plus: true });
    expect(roundDown(4500)).toEqual({ value: 4500, plus: false });
    expect(roundDown(276)).toEqual({ value: 270, plus: true });
    expect(roundDown(36)).toEqual({ value: 36, plus: false });
  });
});

describe('test count', () => {
  it('is the sum of its parts, each project counted once', () => {
    const parts = testParts(PROJECTS);
    const ids = PROJECTS.filter((p) => p.testCount && p.tier !== 'design').map((p) => p.id);
    expect(parts).toHaveLength(ids.length);
    expect(new Set(parts.map((p) => p.label)).size).toBe(parts.length);
    const sum = parts.reduce((n, p) => n + p.count, 0);
    const tests = get('tests');
    expect(tests.exact).toBe(formatCount(sum));
    expect(tests.value).toBeLessThanOrEqual(sum);
    expect(tests.receipts.map((r) => r.value)).toEqual(parts.map((p) => formatCount(p.count)));
  });

  it("only counts a figure the project's own text states", () => {
    for (const p of PROJECTS.filter((x) => x.testCount)) {
      const { testCount, ...rest } = p;
      const text = JSON.stringify(rest);
      expect(text, `${p.id} never states ${testCount!.value}`).toContain(formatCount(testCount!.value));
    }
  });

  it('does not count a design study', () => {
    const design = { ...PROJECTS[0], id: 'blueprint', tier: 'design', testCount: { value: 9999, source: 'x' } } as Project;
    expect(testParts([...PROJECTS, design]).some((p) => p.label === design.title && p.count === 9999)).toBe(false);
  });

  it('reads 4,500+ from 4,589 today', () => {
    expect(get('tests').exact).toBe('4,589');
    expect(`${formatCount(get('tests').value)}${get('tests').suffix}`).toBe('4,500+');
  });
});

describe('records and users', () => {
  it('take their figures from the data, with the sentence that states them', () => {
    const records = get('records');
    expect(`${records.value}${records.suffix}`).toBe('1.5M+');
    expect(records.receipts[0].note).toContain('1.5M+');
    expect(records.receipts[0].href).toBe('/projects/modern-warehouse');

    const users = get('users');
    expect(`${users.value}${users.suffix}`).toBe('50K+');
    expect(users.receipts[0].note).toContain('50,000+');
    expect(users.source).toBe('At TAC Africa');
  });

  it('drops a figure whose source stops stating it', () => {
    const quiet = (t: string) => t.replace(/50,000\+ people/, 'many people');
    const roles = EXPERIENCE.map((r) => ({ ...r, summary: quiet(r.summary), highlights: r.highlights.map(quiet) }));
    expect(buildFigures(PROJECTS, roles).some((f) => f.id === 'users')).toBe(false);
  });
});

describe('helpers', () => {
  it('reads figures as written', () => {
    expect(readFigure('1.5M+')).toEqual({ value: 1.5, suffix: 'M+' });
    expect(readFigure('50,000+')).toEqual({ value: 50, suffix: 'K+' });
    expect(readFigure('276')).toEqual({ value: 276, suffix: '' });
  });

  it('keeps decimals inside a sentence', () => {
    expect(sentenceWith('First one. It moved 1.5M+ rows in 5.7ms. Last.', '1.5M+')).toBe('It moved 1.5M+ rows in 5.7ms.');
  });
});
