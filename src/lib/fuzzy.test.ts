import { describe, expect, it } from 'vitest';

import { fuzzyScore, looksLikeQuestion, rankItem } from './fuzzy';

describe('fuzzyScore', () => {
  it('orders exact, prefix, word-prefix and substring', () => {
    const exact = fuzzyScore('mmr engine', 'MMR Engine');
    const prefix = fuzzyScore('mmr', 'MMR Engine');
    const word = fuzzyScore('engine', 'MMR Engine');
    const inside = fuzzyScore('ngin', 'MMR Engine');
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(word);
    expect(word).toBeGreaterThan(inside);
    expect(inside).toBeGreaterThan(0);
  });

  it('matches letters in order when they start at a word', () => {
    expect(fuzzyScore('rtlmt', 'rate limiter')).toBeGreaterThan(0);
    expect(fuzzyScore('rtlmt', 'rate limiter')).toBeLessThan(30);
  });

  it('does not match a subsequence that starts mid-word', () => {
    expect(fuzzyScore('ate', 'rate')).toBe(50); // a substring is fine
    expect(fuzzyScore('tlm', 'rate limiter')).toBe(0);
  });

  it('refuses short subsequences, which would match nearly anything', () => {
    expect(fuzzyScore('xz', 'exhaustive zones')).toBe(0);
  });
});

describe('rankItem', () => {
  it('prefers a title match to a keyword match', () => {
    expect(rankItem('redis', 'Redis Cache', [])).toBeGreaterThan(rankItem('redis', 'Rate Limiter', ['redis']));
  });

  it('matches words in any order', () => {
    expect(rankItem('limiter rate', 'Global Rate Limiter', [])).toBeGreaterThan(0);
  });

  it('fails a multi-word query when one word matches nothing', () => {
    expect(rankItem('rate zebra', 'Global Rate Limiter', [])).toBe(0);
  });
});

describe('looksLikeQuestion', () => {
  it.each([
    ['what has he shipped', true],
    ['how does mmr work', true],
    ['redis?', true],
    ['mmr engine', false],
    ['work', false],
    ['vega studio canvas', false],
  ])('%s → %s', (query, expected) => {
    expect(looksLikeQuestion(query)).toBe(expected);
  });
});
