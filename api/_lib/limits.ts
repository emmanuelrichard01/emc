import { digest, pipeline } from './store';

/* ==========================================================================
   LIMITS — questions per visitor, provider calls per day.

   Two budgets, counting two different things on purpose. The per-minute
   limit counts *questions*, because that is what a visitor does. The daily
   budget counts *provider calls*, because that is what costs money — one
   question can take four rounds, and a cached answer takes none.

   Shared across instances when a store is configured (see store.ts), per
   instance otherwise. IP addresses are hashed before they are used as keys:
   a limiter needs to recognise a visitor, not to know who they are.
   ========================================================================== */

export const QUESTIONS_PER_MIN = 6;
export const DAILY_CALL_BUDGET = 400;

const memoryHits = new Map<string, number[]>();
let memoryDay = '';
let memorySpend = 0;

const today = () => new Date().toISOString().slice(0, 10);

function rolloverMemoryDay() {
  if (memoryDay !== today()) {
    memoryDay = today();
    memorySpend = 0;
  }
}

/** Null when the question may go ahead; otherwise the sentence to show the visitor. */
export async function admitQuestion(ip: string): Promise<string | null> {
  const visitor = await digest(`ip:${ip}`);
  const minute = Math.floor(Date.now() / 60_000);

  const shared = await pipeline([
    ['INCR', `ask:q:${visitor}:${minute}`],
    ['EXPIRE', `ask:q:${visitor}:${minute}`, 90],
    ['GET', `ask:calls:${today()}`],
  ]);
  if (shared) {
    if (Number(shared[2] ?? 0) >= DAILY_CALL_BUDGET) return 'daily question budget reached — try again tomorrow.';
    if (Number(shared[0]) > QUESTIONS_PER_MIN) return 'too many questions — wait a minute.';
    return null;
  }

  rolloverMemoryDay();
  if (memorySpend >= DAILY_CALL_BUDGET) return 'daily question budget reached — try again tomorrow.';

  const now = Date.now();
  const recent = (memoryHits.get(visitor) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= QUESTIONS_PER_MIN) return 'too many questions — wait a minute.';
  recent.push(now);
  memoryHits.set(visitor, recent);

  // Unbounded growth would be a slow leak on a long-lived instance.
  if (memoryHits.size > 500) {
    for (const [key, times] of memoryHits) if (!times.some((t) => now - t < 60_000)) memoryHits.delete(key);
  }
  return null;
}

/** Records one provider call. False once today's budget is spent. */
export async function spendCall(): Promise<boolean> {
  const key = `ask:calls:${today()}`;
  const shared = await pipeline([
    ['INCR', key],
    ['EXPIRE', key, 172_800],
  ]);
  if (shared) return Number(shared[0]) <= DAILY_CALL_BUDGET;

  rolloverMemoryDay();
  memorySpend += 1;
  return memorySpend <= DAILY_CALL_BUDGET;
}

export function resetLimits() {
  memoryHits.clear();
  memoryDay = '';
  memorySpend = 0;
}
