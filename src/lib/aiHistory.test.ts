import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { MAX_QUESTION_CHARS, trimHistory, type WireMessage } from './aiHistory';

const user = (content: string): WireMessage => ({ role: 'user', content });
const assistant = (content: string): WireMessage => ({ role: 'assistant', content });
const withCall = (id: string): WireMessage => ({
  role: 'assistant',
  content: '',
  toolCalls: [{ id, name: 'run_sql', args: {} }],
});
const result = (id: string): WireMessage => ({
  role: 'tool',
  content: 'rows',
  toolName: 'run_sql',
  toolCallId: id,
});

/** One question, one tool round, one answer — five messages. */
const exchange = (n: number): WireMessage[] => [
  user(`question ${n}`),
  withCall(`call-${n}`),
  result(`call-${n}`),
  assistant(`answer ${n}`),
];

describe('trimHistory', () => {
  it('leaves a history that already fits untouched', () => {
    const history = exchange(1);
    expect(trimHistory(history, 16)).toBe(history);
  });

  it('drops the oldest exchange when over budget', () => {
    const history = [...exchange(1), ...exchange(2), ...exchange(3)];
    const trimmed = trimHistory(history, 10);
    expect(trimmed.length).toBeLessThanOrEqual(10);
    expect(trimmed[0]).toMatchObject({ role: 'user', content: 'question 2' });
  });

  it('always starts on a user turn, never mid-exchange', () => {
    for (let max = 1; max <= 20; max++) {
      const trimmed = trimHistory([...exchange(1), ...exchange(2), ...exchange(3)], max);
      expect(trimmed[0].role).toBe('user');
    }
  });

  // The invariant that matters: providers reject a tool result whose call is
  // missing, and a call whose result is missing.
  it('never orphans a tool result from its call', () => {
    for (let max = 1; max <= 20; max++) {
      const trimmed = trimHistory([...exchange(1), ...exchange(2), ...exchange(3)], max);
      const callIds = new Set(
        trimmed.flatMap((m) => m.toolCalls?.map((c) => c.id) ?? []),
      );
      const resultIds = trimmed.filter((m) => m.role === 'tool').map((m) => m.toolCallId);
      for (const id of resultIds) expect(callIds.has(id!)).toBe(true);
      expect(callIds.size).toBe(resultIds.length);
    }
  });

  it('keeps the newest exchange whole even when it alone exceeds the budget', () => {
    const trimmed = trimHistory([...exchange(1), ...exchange(2)], 2);
    expect(trimmed[0]).toMatchObject({ content: 'question 2' });
    expect(trimmed).toHaveLength(4);
  });

  it('preserves the most recent question rather than the oldest', () => {
    const history = [...exchange(1), ...exchange(2), ...exchange(3), ...exchange(4)];
    const trimmed = trimHistory(history, 8);
    expect(trimmed[trimmed.length - 1]).toMatchObject({ content: 'answer 4' });
  });

  it('falls back to a plain tail when nothing is a user turn', () => {
    const history = [assistant('a'), assistant('b'), assistant('c')];
    expect(trimHistory(history, 2)).toHaveLength(2);
  });
});

describe('server limits', () => {
  const source = readFileSync(new URL('../../api/ask.ts', import.meta.url), 'utf8');

  // The client mirrors this number to reject an over-long question without a
  // round trip. If the server's cap moves and the mirror does not, users get
  // a 400 the UI promised could not happen.
  it('MAX_QUESTION_CHARS matches api/ask.ts', () => {
    const match = source.match(/const MAX_QUESTION_CHARS = (\d+)/);
    expect(match, 'MAX_QUESTION_CHARS not found in api/ask.ts').not.toBeNull();
    expect(Number(match![1])).toBe(MAX_QUESTION_CHARS);
  });

  // The regression this whole file exists for: capping assistant turns at the
  // question length made every follow-up question fail once the model had
  // given one normal-length answer.
  it('caps only user turns at the question length', () => {
    expect(source).toMatch(/message\.role === 'user' \? MAX_QUESTION_CHARS/);
  });

  it('leaves room under the server cap for a full exchange', () => {
    const match = source.match(/const MAX_MESSAGES = (\d+)/);
    expect(match).not.toBeNull();
    // Ten kept + one question + up to four round messages stays under 16.
    expect(10 + 1 + 4).toBeLessThanOrEqual(Number(match![1]));
  });
});
