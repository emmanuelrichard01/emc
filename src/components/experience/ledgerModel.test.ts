import { describe, expect, it } from 'vitest';

import { EXPERIENCE } from '@/data/experience';
import { careerWindow, parsePeriod } from '@/lib/tenure';
import type { ExperienceItem } from '@/types';
import { concurrentMonths, markFigures, overlapRuns, stackTenure, unionMonths } from './ledgerModel';

const span = (period: string) => parsePeriod(period)!;

describe('union and overlap', () => {
  it('counts overlapping months once', () => {
    // Jan–Jun and Apr–Sep 2020: nine months of calendar, twelve of "sum".
    const spans = [span('Jan — Jun 2020'), span('Apr — Sep 2020')];
    expect(unionMonths(spans)).toBe(9);
    expect(concurrentMonths(spans)).toBe(3);
    const runs = overlapRuns(spans);
    expect(runs).toHaveLength(1);
    expect(runs[0].start.month).toBe(3); // April
    expect(runs[0].months).toBe(3);
  });

  it('separates overlaps that do not touch', () => {
    const spans = [span('Jan 2020 — Dec 2021'), span('Mar — Apr 2020'), span('Jun — Jul 2021')];
    expect(overlapRuns(spans).map((r) => r.months)).toEqual([2, 2]);
  });

  it('ignores unparseable periods', () => {
    expect(unionMonths([null, span('Jan — Mar 2020'), null])).toBe(3);
  });
});

describe('the real ledger', () => {
  const spans = EXPERIENCE.map((r) => parsePeriod(r.period));
  const window = careerWindow(spans)!;

  it('never claims more working time than the calendar holds', () => {
    const union = unionMonths(spans);
    const sum = spans.reduce((n, s) => n + (s?.months ?? 0), 0);
    expect(union).toBeLessThan(sum); // the roles overlap
    expect(union).toBeLessThanOrEqual(window.to - window.from + 1);
  });

  it('gives every technology no more tenure than the career', () => {
    const union = unionMonths(spans);
    for (const t of stackTenure(EXPERIENCE, spans)) {
      expect(t.months).toBeGreaterThan(0);
      expect(t.months).toBeLessThanOrEqual(union);
    }
  });

  it('ranks the technology used everywhere first', () => {
    const [top] = stackTenure(EXPERIENCE, spans);
    // Python appears in every role.
    expect(top.name).toBe('Python');
    expect(top.roles).toHaveLength(EXPERIENCE.length);
  });
});

describe('stackTenure', () => {
  const role = (id: string, period: string, stack: string[]): ExperienceItem => ({
    id, company: id, role: '', type: '', period, summary: '', highlights: [], stack,
  });

  it('unions a technology across concurrent roles', () => {
    const roles = [role('a', 'Jan — Dec 2020', ['SQL']), role('b', 'Jul 2020 — Jun 2021', ['SQL', 'Go'])];
    const tenure = stackTenure(roles, roles.map((r) => parsePeriod(r.period)));
    expect(tenure.find((t) => t.name === 'SQL')).toMatchObject({ months: 18, roles: ['a', 'b'] });
    expect(tenure.find((t) => t.name === 'Go')).toMatchObject({ months: 12, roles: ['b'] });
  });
});

describe('markFigures', () => {
  const figures = (text: string) => markFigures(text).filter((p) => p.figure).map((p) => p.text);

  it('finds the measured outcomes in the real copy', () => {
    expect(figures('reducing reporting effort by ~40% and standardizing')).toEqual(['~40%']);
    expect(figures('web applications serving 50,000+ users')).toEqual(['50,000+']);
    expect(figures('reducing response latency by ~45% through')).toEqual(['~45%']);
  });

  it('leaves years and ordinary numbers alone', () => {
    expect(figures('Completed in 2024 alongside the final year')).toEqual([]);
    expect(figures('two to 3 people')).toEqual([]);
  });

  it('round-trips the text exactly', () => {
    const text = 'Cut ~45% of latency for 50,000+ users, 3.5% errors, 10+ services.';
    expect(markFigures(text).map((p) => p.text).join('')).toBe(text);
    expect(figures(text)).toEqual(['~45%', '50,000+', '3.5%', '10+']);
  });
});
