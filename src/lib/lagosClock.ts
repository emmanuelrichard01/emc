/* ==========================================================================
   LAGOS CLOCK

   The time where the work happens — Abuja, on Africa/Lagos time (UTC+1,
   no daylight saving) — and what it means for someone elsewhere: whether
   it is a working hour there, and how far ahead or behind them it is.
   Pure, so it is tested; useLagosClock ticks it on the minute for the
   hero's baseline, Contact and the footer, which therefore can never show
   different times.
   ========================================================================== */

export interface Clock {
  /** "14:32", 24-hour. */
  time: string;
  /** Monday to Friday, 09:00–18:00 in Abuja. */
  working: boolean;
  weekend: boolean;
  /** Abuja's offset from the visitor, in hours: +2 is "two hours ahead of you". */
  ahead: number;
}

const LAGOS_OFFSET_MIN = 60; // Africa/Lagos: UTC+1 all year, no daylight saving.

/**
 * `visitorOffsetMin` is the visitor's offset east of UTC in minutes — the
 * negation of Date#getTimezoneOffset — passed in so the result is testable.
 */
export function lagosClock(now: Date, visitorOffsetMin: number): Clock {
  const local = new Date(now.getTime() + LAGOS_OFFSET_MIN * 60_000);
  const hour = local.getUTCHours();
  const day = local.getUTCDay();
  const weekend = day === 0 || day === 6;
  return {
    time: `${String(hour).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`,
    working: !weekend && hour >= 9 && hour < 18,
    weekend,
    ahead: (LAGOS_OFFSET_MIN - visitorOffsetMin) / 60,
  };
}

/** "2 hours ahead of you", "30 minutes behind you", "your time too". */
export function relativeZone(ahead: number): string {
  if (ahead === 0) return 'your time too';
  const minutes = Math.round(Math.abs(ahead) * 60);
  const size =
    minutes % 60 === 0
      ? `${minutes / 60} ${minutes === 60 ? 'hour' : 'hours'}`
      : minutes < 60
        ? `${minutes} minutes`
        : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${size} ${ahead > 0 ? 'ahead of' : 'behind'} you`;
}
