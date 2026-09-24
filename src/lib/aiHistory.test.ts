import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { MAX_QUESTION_CHARS, dropUnanswered, trimHistory, type WireMessage } from './aiHistory';

const user = (content: string): WireMessage => ({ role: 'user', content });
const assistant = (content: string): WireMessage => ({ role: 'assistant', content });

/** One question, one answer. */
const exchange = (n: number): WireMessage[] => [user(`question ${n}`), assistant(`answer ${n}`)];

describe('trimHistory', () => {
  it('leaves a history that already fits untouched', () => {
    const history = exchange(1);
    expect(trimHistory(history, 16)).toBe(history);
  });

  it('drops the oldest exchange when over budget', () => {
    const history = [...exchange(1), ...exchange(2), ...exchange(3)];
    const trimmed = trimHistory(history, 4);
    expect(trimmed).toHaveLength(4);
    expect(trimmed[0]).toMatchObject({ role: 'user', content: 'question 2' });
  });

  it('always starts on a user turn, never mid-exchange', () => {
    for (let max = 1; max <= 10; max++) {
      const trimmed = trimHistory([...exchange(1), ...exchange(2), ...exchange(3)], max);
      expect(trimmed[0].role).toBe('user');
    }
  });

  it('keeps the newest exchange whole even when it alone exceeds the budget', () => {
    const trimmed = trimHistory([...exchange(1), ...exchange(2)], 1);
    expect(trimmed).toEqual(exchange(2));
  });

  it('falls back to a plain tail when nothing is a user turn', () => {
    const history = [assistant('a'), assistant('b'), assistant('c')];
    expect(trimHistory(history, 2)).toHaveLength(2);
  });
});

describe('dropUnanswered', () => {
  it('removes a trailing question with no answer', () => {
    expect(dropUnanswered([...exchange(1), user('cancelled')])).toEqual(exchange(1));
  });

  it('leaves an answered history alone', () => {
    const history = exchange(1);
    expect(dropUnanswered(history)).toBe(history);
  });
});

describe('server contract', () => {
  const source = readFileSync(new URL('../../api/ask.ts', import.meta.url), 'utf8');

  // The client mirrors this number to reject an over-long question without a
  // round trip. If the server's cap moves and the mirror does not, users get
  // a 400 the UI promised could not happen.
  it('MAX_QUESTION_CHARS matches api/ask.ts', () => {
    const match = source.match(/const MAX_QUESTION_CHARS = (\d+)/);
    expect(match, 'MAX_QUESTION_CHARS not found in api/ask.ts').not.toBeNull();
    expect(Number(match![1])).toBe(MAX_QUESTION_CHARS);
  });

  // Capping assistant turns at the question length made every follow-up
  // question fail once the model had given one normal-length answer.
  it('caps only user turns at the question length', () => {
    expect(source).toMatch(/message\.role === 'user' \? MAX_QUESTION_CHARS/);
  });

  // The loop runs server-side so that tool results cannot be supplied by the
  // client. That guarantee is exactly one condition in the validator.
  it('refuses any role other than user and assistant', () => {
    expect(source).toMatch(/message\?\.role !== 'user' && message\?\.role !== 'assistant'/);
  });

  it('leaves room under the server cap for the history the client keeps', async () => {
    const match = source.match(/const MAX_MESSAGES = (\d+)/);
    expect(match).not.toBeNull();
    const { MAX_HISTORY } = await import('../components/hero/useAiSession');
    // Kept history plus the new question.
    expect(MAX_HISTORY + 1).toBeLessThanOrEqual(Number(match![1]));
  });
});
