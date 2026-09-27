import { describe, expect, it } from 'vitest';

import { clsFromShifts, formatBytes, formatMetric, inpFromEvents, rate } from './vitals';

describe('rate', () => {
  it('uses the published thresholds, inclusive at the boundary', () => {
    expect(rate('LCP', 2500)).toBe('good');
    expect(rate('LCP', 2501)).toBe('needs-improvement');
    expect(rate('LCP', 4001)).toBe('poor');
    expect(rate('CLS', 0.1)).toBe('good');
    expect(rate('CLS', 0.26)).toBe('poor');
    expect(rate('INP', 200)).toBe('good');
    expect(rate('INP', 350)).toBe('needs-improvement');
    expect(rate('TTFB', 1900)).toBe('poor');
  });
});

describe('clsFromShifts', () => {
  const shift = (value: number, startTime: number, hadRecentInput = false) => ({ value, startTime, hadRecentInput });

  it('sums shifts less than a second apart into one window', () => {
    expect(clsFromShifts([shift(0.05, 0), shift(0.04, 500), shift(0.03, 900)])).toBeCloseTo(0.12);
  });

  it('takes the worst window, not the total', () => {
    // Two bursts two seconds apart: 0.06 and 0.08. CLS is 0.08, not 0.14.
    expect(clsFromShifts([shift(0.03, 0), shift(0.03, 400), shift(0.08, 2500)])).toBeCloseTo(0.08);
  });

  it('closes a window at five seconds even if shifts keep coming', () => {
    const steady = Array.from({ length: 12 }, (_, i) => shift(0.01, i * 900)); // 0 → 9.9 s
    expect(clsFromShifts(steady)).toBeCloseTo(0.06); // 0, .9, … 4.5 s: six shifts
  });

  it('ignores shifts the visitor caused', () => {
    expect(clsFromShifts([shift(0.5, 0, true), shift(0.02, 100)])).toBeCloseTo(0.02);
    expect(clsFromShifts([])).toBe(0);
  });
});

describe('inpFromEvents', () => {
  it('is null before anyone interacts', () => {
    expect(inpFromEvents([])).toBeNull();
    expect(inpFromEvents([{ interactionId: 0, duration: 300 }])).toBeNull();
  });

  it('treats the events of one interaction as one, as long as its longest', () => {
    expect(inpFromEvents([
      { interactionId: 1, duration: 40 },
      { interactionId: 1, duration: 120 },
      { interactionId: 2, duration: 64 },
    ])).toBe(120);
  });

  it('forgives one outlier per fifty interactions', () => {
    const events = Array.from({ length: 60 }, (_, i) => ({ interactionId: i + 1, duration: 50 }));
    events[10].duration = 900;
    expect(inpFromEvents(events)).toBe(50);
    expect(inpFromEvents(events.slice(0, 40))).toBe(900);
  });
});

describe('formatting', () => {
  it('reads the way the vitals are usually written', () => {
    expect(formatMetric('LCP', 1234)).toBe('1.23 s');
    expect(formatMetric('INP', 64.4)).toBe('64 ms');
    expect(formatMetric('CLS', 0.0213)).toBe('0.021');
    expect(formatMetric('CLS', 0)).toBe('0');
    expect(formatMetric('CLS', 0.13)).toBe('0.13');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(421_000)).toBe('411 KB');
    expect(formatBytes(2_500_000)).toBe('2.4 MB');
  });
});
