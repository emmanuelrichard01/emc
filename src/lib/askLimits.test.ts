import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DAILY_CALL_BUDGET, QUESTIONS_PER_MIN, admitQuestion, resetLimits, spendCall } from '../../api/_lib/limits';

/* A few lines of Redis, enough for the commands the limiter sends, behind
   the same REST pipeline shape Upstash exposes. */
function fakeRedis() {
  const data = new Map<string, string>();
  const run = (cmd: (string | number)[]) => {
    const [op, key, value] = cmd as [string, string, string | number];
    if (op === 'INCR') {
      const next = Number(data.get(key) ?? 0) + 1;
      data.set(key, String(next));
      return next;
    }
    if (op === 'GET') return data.get(key) ?? null;
    if (op === 'SET') return data.set(key, String(value)) && 'OK';
    return 1; // EXPIRE
  };
  return vi.fn(async (_url: string, init: RequestInit) => {
    const commands = JSON.parse(String(init.body)) as (string | number)[][];
    return new Response(JSON.stringify(commands.map((c) => ({ result: run(c) }))), { status: 200 });
  });
}

beforeEach(() => {
  resetLimits();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('with a shared store', () => {
  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://kv.example');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 't');
  });

  it('counts a visitor across instances, not per instance', async () => {
    vi.stubGlobal('fetch', fakeRedis());
    for (let i = 0; i < QUESTIONS_PER_MIN; i++) expect(await admitQuestion('1.2.3.4')).toBeNull();
    // A fresh instance has no memory of its own — the store still refuses.
    resetLimits();
    expect(await admitQuestion('1.2.3.4')).toMatch(/too many questions/);
    expect(await admitQuestion('5.6.7.8')).toBeNull();
  });

  it('never sends the raw address to the store', async () => {
    const fetchMock = fakeRedis();
    vi.stubGlobal('fetch', fetchMock);
    await admitQuestion('203.0.113.9');
    expect(String(fetchMock.mock.calls[0][1].body)).not.toContain('203.0.113.9');
  });

  it('spends the daily budget per provider call', async () => {
    vi.stubGlobal('fetch', fakeRedis());
    for (let i = 0; i < DAILY_CALL_BUDGET; i++) expect(await spendCall()).toBe(true);
    expect(await spendCall()).toBe(false);
    expect(await admitQuestion('9.9.9.9')).toMatch(/daily question budget/);
  });

  it('falls back to memory when the store is down, rather than failing the question', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('store unreachable'); }));
    expect(await admitQuestion('1.2.3.4')).toBeNull();
    expect(await spendCall()).toBe(true);
  });
});

describe('without a store', () => {
  it('limits per instance', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('KV_REST_API_URL', '');
    for (let i = 0; i < QUESTIONS_PER_MIN; i++) expect(await admitQuestion('1.2.3.4')).toBeNull();
    expect(await admitQuestion('1.2.3.4')).toMatch(/too many questions/);
  });
});
