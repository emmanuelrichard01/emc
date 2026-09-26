import { describe, expect, it } from 'vitest';

import { PROJECTS } from '@/data/projects';
import {
  DEFAULT_STATE,
  applyWork,
  depthOf,
  latestYear,
  rankStack,
  searchFromState,
  searchProject,
  snippetAround,
  stateFromSearch,
  yearLabel,
} from './workModel';

const ids = (state: Partial<typeof DEFAULT_STATE>) =>
  applyWork(PROJECTS, { ...DEFAULT_STATE, ...state }).map((r) => r.project.id);

describe('search', () => {
  it('finds a project by a word only its case study uses, and says where', () => {
    const hit = searchProject(PROJECTS.find((p) => p.id === 'ultra-news')!, 'public suffix');
    expect(hit).not.toBeNull();
    expect(hit!.snippet?.toLowerCase()).toContain('public suffix');
  });

  it('gives no snippet when the title itself matched', () => {
    const hit = searchProject(PROJECTS.find((p) => p.id === 'mmr-engine')!, 'mmr');
    expect(hit?.field).toBe('title');
    expect(hit?.snippet).toBeUndefined();
  });

  it('requires every word to match somewhere', () => {
    expect(searchProject(PROJECTS[0], 'canvas zzzqqq')).toBeNull();
  });

  it('ranks a title match above a passing mention', () => {
    const results = ids({ query: 'rate limiter' });
    expect(results[0]).toBe('global-rate-limiter');
  });

  it('ignores a one-character query rather than matching everything', () => {
    expect(ids({ query: 'a' })).toHaveLength(PROJECTS.length);
  });
});

describe('snippetAround', () => {
  it('marks truncation on both sides and never starts mid-word', () => {
    const text = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa quebec romeo sierra tango uniform victor whiskey';
    const at = text.indexOf('mike');
    const s = snippetAround(text, at, 4);
    expect(s).toContain('mike');
    expect(s.startsWith('…')).toBe(true);
    expect(s.endsWith('…')).toBe(true);
    expect(s.slice(1, 2)).toMatch(/[a-z]/);
  });
});

describe('filters and sorting', () => {
  it('keeps authored tier order by default', () => {
    const tiers = applyWork(PROJECTS, DEFAULT_STATE).map((r) => r.project.tier);
    const order = ['flagship', 'production', 'system', 'design'];
    expect([...tiers].sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(tiers);
  });

  it('treats several technologies as any-of', () => {
    const result = ids({ stack: ['Django', 'NestJS'] });
    expect(result).toContain('ultra-news');
    expect(result).toContain('medvax');
  });

  it('sorts by documentation depth when asked', () => {
    const [first] = applyWork(PROJECTS, { ...DEFAULT_STATE, sort: 'depth' });
    const max = Math.max(...PROJECTS.map((p) => depthOf(p).score));
    expect(depthOf(first.project).score).toBe(max);
  });

  it('reads "Present" as the current year', () => {
    const ultra = PROJECTS.find((p) => p.id === 'ultra-news')!;
    expect(latestYear(ultra, 2031)).toBe(2031);
  });

  it('ranks technologies by how many projects use them', () => {
    const ranked = rankStack(PROJECTS);
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1].count).toBeGreaterThanOrEqual(ranked[i].count);
  });
});

describe('yearLabel', () => {
  it.each([
    ['2026', '2026'],
    ['Jan — Feb 2026', '2026'],
    ['2025 — Present', '2025→'],
    ['2024 — 2026', '2024–2026'],
  ])('%s → %s', (timeline, expected) => {
    expect(yearLabel(timeline)).toBe(expected);
  });
});

describe('url state', () => {
  const stack = rankStack(PROJECTS).map((t) => t.name);

  it('round-trips a filtered view', () => {
    const state = { ...DEFAULT_STATE, query: 'redis', tier: 'system' as const, stack: ['Python', 'Redis'], sort: 'newest' as const, view: 'matrix' as const };
    expect(stateFromSearch(searchFromState(state, ''), stack)).toEqual(state);
  });

  it('writes nothing for the default view', () => {
    expect(searchFromState(DEFAULT_STATE, '')).toBe('');
  });

  it('leaves other parameters alone', () => {
    expect(searchFromState({ ...DEFAULT_STATE, tier: 'design' }, '?ask=hi')).toBe('?ask=hi&tier=design');
  });

  it('drops values it does not recognise instead of trusting them', () => {
    const state = stateFromSearch('?tier=secret&sort=evil&view=x&stack=python,nonsense', stack);
    expect(state.tier).toBeNull();
    expect(state.sort).toBe('tier');
    expect(state.view).toBe('index');
    expect(state.stack).toEqual(['Python']);
  });
});
