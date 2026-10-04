import { afterEach, describe, expect, it, vi } from 'vitest';

import { MAX_VISITS, readCaseVisits, recordCaseVisit, withVisit } from './visits';

describe('withVisit', () => {
  it('puts the newest first and never repeats', () => {
    expect(withVisit(['a', 'b'], 'b')).toEqual(['b', 'a']);
    expect(withVisit([], 'a')).toEqual(['a']);
  });

  it('keeps at most six', () => {
    const list = ['1', '2', '3', '4', '5', '6'];
    expect(withVisit(list, '7')).toEqual(['7', '1', '2', '3', '4', '5']);
    expect(withVisit(list, '7')).toHaveLength(MAX_VISITS);
  });
});

describe('session storage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('records and reads back ids', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    });
    recordCaseVisit('mmr-engine');
    recordCaseVisit('vega-canva');
    recordCaseVisit('mmr-engine');
    expect(readCaseVisits()).toEqual(['mmr-engine', 'vega-canva']);
  });

  it('survives storage that is missing or holds junk', () => {
    expect(readCaseVisits()).toEqual([]);
    vi.stubGlobal('sessionStorage', { getItem: () => '{"not":"a list"}', setItem: () => undefined });
    expect(readCaseVisits()).toEqual([]);
    vi.stubGlobal('sessionStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
    expect(readCaseVisits()).toEqual([]);
    expect(() => recordCaseVisit('x')).not.toThrow();
  });
});
