import { describe, expect, it } from 'vitest';

import { lagosClock, relativeZone } from './lagosClock';

describe('lagosClock', () => {
  // Wednesday 1 July 2026, 12:30 UTC → 13:30 in Abuja.
  const midweek = new Date(Date.UTC(2026, 6, 1, 12, 30));

  it('reads the time in Abuja, whatever the visitor’s zone', () => {
    expect(lagosClock(midweek, 0).time).toBe('13:30');
    expect(lagosClock(midweek, -300).time).toBe('13:30');
  });

  it('knows a working hour from an evening and a weekend', () => {
    expect(lagosClock(midweek, 0)).toMatchObject({ working: true, weekend: false });
    expect(lagosClock(new Date(Date.UTC(2026, 6, 1, 18, 0)), 0).working).toBe(false); // 19:00
    expect(lagosClock(new Date(Date.UTC(2026, 6, 4, 10, 0)), 0)).toMatchObject({ working: false, weekend: true }); // Saturday
  });

  it('crosses midnight into the next day correctly', () => {
    // Friday 23:30 UTC is Saturday 00:30 in Abuja.
    expect(lagosClock(new Date(Date.UTC(2026, 6, 3, 23, 30)), 0)).toMatchObject({ time: '00:30', weekend: true });
  });

  it('says how far ahead or behind the visitor it is', () => {
    expect(lagosClock(midweek, -300).ahead).toBe(6); // New York in summer, UTC-5
    expect(lagosClock(midweek, 60).ahead).toBe(0);
    expect(lagosClock(midweek, 330).ahead).toBe(-4.5); // India
  });
});

describe('relativeZone', () => {
  it('reads naturally', () => {
    expect(relativeZone(0)).toBe('your time too');
    expect(relativeZone(1)).toBe('1 hour ahead of you');
    expect(relativeZone(6)).toBe('6 hours ahead of you');
    expect(relativeZone(-4.5)).toBe('4h 30m behind you');
    expect(relativeZone(0.5)).toBe('30 minutes ahead of you');
  });
});
