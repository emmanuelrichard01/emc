import { describe, expect, it } from 'vitest';

import { EXPERIENCE } from '@/data/experience';
import { careerWindow, formatDuration, parsePeriod, spanBar, yearTicks } from './tenure';

describe('parsePeriod', () => {
  it('reads the explicit two-year form', () => {
    const span = parsePeriod('Oct 2020 — Mar 2024');
    expect(span).not.toBeNull();
    expect(span!.start).toMatchObject({ year: 2020, month: 9 });
    expect(span!.end).toMatchObject({ year: 2024, month: 2 });
  });

  it('carries the trailing year back to an elided start', () => {
    const span = parsePeriod('Mar — Oct 2024');
    expect(span!.start).toMatchObject({ year: 2024, month: 2 });
    expect(span!.end).toMatchObject({ year: 2024, month: 9 });
  });

  it('counts inclusively — Mar to Oct is eight months worked', () => {
    expect(parsePeriod('Mar — Oct 2024')!.months).toBe(8);
    expect(parsePeriod('Jan — Feb 2026')!.months).toBe(2);
    expect(parsePeriod('Oct 2018 — Oct 2020')!.months).toBe(25);
  });

  it('resolves an open end against the supplied clock', () => {
    const span = parsePeriod('Jan 2026 — Present', new Date(2026, 5, 15));
    expect(span!.end).toMatchObject({ year: 2026, month: 5 });
    expect(span!.months).toBe(6);
  });

  it('accepts en dash and hyphen as well as em dash', () => {
    for (const sep of ['—', '–', '-']) {
      expect(parsePeriod(`Aug 2019 ${sep} Aug 2020`)!.months).toBe(13);
    }
  });

  it('returns null rather than guessing at unusable input', () => {
    expect(parsePeriod('sometime last year')).toBeNull();
    expect(parsePeriod('Smarch 2020 — Jun 2021')).toBeNull();
    expect(parsePeriod('')).toBeNull();
  });

  it('rejects an end that precedes its start', () => {
    expect(parsePeriod('Oct 2024 — Mar 2024')).toBeNull();
  });
});

describe('formatDuration', () => {
  it('stays in months below a year, singular at one', () => {
    expect(formatDuration(1)).toBe('1 mo');
    expect(formatDuration(8)).toBe('8 mos');
    expect(formatDuration(11)).toBe('11 mos');
  });

  it('drops a zero remainder', () => {
    expect(formatDuration(12)).toBe('1 yr');
    expect(formatDuration(24)).toBe('2 yr');
  });

  it('carries a remainder', () => {
    expect(formatDuration(13)).toBe('1 yr 1 mo');
    expect(formatDuration(42)).toBe('3 yr 6 mo');
  });
});

describe('spanBar', () => {
  const window = { from: 0, to: 99 };

  it('places a span proportionally within the window', () => {
    const bar = spanBar({ start: { index: 50, year: 0, month: 0 }, end: { index: 59, year: 0, month: 0 }, months: 10 }, window);
    expect(bar.left).toBeCloseTo(50, 5);
    expect(bar.width).toBeCloseTo(10, 5);
  });

  it('floors width so a one-month role stays visible', () => {
    const bar = spanBar({ start: { index: 0, year: 0, month: 0 }, end: { index: 0, year: 0, month: 0 }, months: 1 }, window);
    expect(bar.width).toBe(2);
  });

  it('keeps a floored bar inside the track', () => {
    const bar = spanBar({ start: { index: 99, year: 0, month: 0 }, end: { index: 99, year: 0, month: 0 }, months: 1 }, window);
    expect(bar.left + bar.width).toBeLessThanOrEqual(100);
  });
});

describe('yearTicks', () => {
  it('marks each January inside the window', () => {
    // Oct 2018 → Feb 2026: Januaries 2019 through 2026 fall inside.
    const ticks = yearTicks({ from: 2018 * 12 + 9, to: 2026 * 12 + 1 });
    expect(ticks).toHaveLength(8);
  });

  it('drops boundaries that would sit under the track edges', () => {
    // A window opening exactly on a January must not tick at 0%.
    const ticks = yearTicks({ from: 2020 * 12, to: 2022 * 12 });
    expect(ticks.every((t) => t > 0 && t < 100)).toBe(true);
  });

  it('returns ascending offsets', () => {
    const ticks = yearTicks({ from: 2018 * 12 + 9, to: 2026 * 12 + 1 });
    expect([...ticks].sort((a, b) => a - b)).toEqual(ticks);
  });

  it('is empty when the window spans less than a year boundary', () => {
    expect(yearTicks({ from: 2021 * 12 + 2, to: 2021 * 12 + 8 })).toEqual([]);
  });
});

describe('EXPERIENCE data', () => {
  const spans = EXPERIENCE.map((role) => parsePeriod(role.period));

  it('every authored period parses', () => {
    EXPERIENCE.forEach((role, i) => {
      expect(spans[i], `${role.company} — "${role.period}"`).not.toBeNull();
    });
  });

  it('spans a window wide enough to be worth drawing', () => {
    const window = careerWindow(spans)!;
    expect(window.to - window.from).toBeGreaterThan(12);
  });

  // The notes claim concurrency; this asserts the dates actually back that up,
  // so the prose and the bars cannot drift apart.
  it('contains genuinely overlapping roles', () => {
    const overlapping = spans.some((a, i) =>
      spans.some((b, j) => i !== j && a && b && a.start.index <= b.end.index && b.start.index <= a.end.index),
    );
    expect(overlapping).toBe(true);
  });
});
