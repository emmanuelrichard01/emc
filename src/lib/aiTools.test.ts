import { describe, expect, it } from 'vitest';

import { executeToolCall, searchSite } from './aiTools';

const call = (name: string, args: Record<string, unknown>) => executeToolCall({ id: 't', name, args });

describe('search_site', () => {
  it('finds a passage that only exists in prose', () => {
    const [top] = searchSite('coordinate bug');
    expect(top.passage).toMatchObject({ id: 'vega-canva', where: 'field note' });
  });

  it('folds a plural onto the singular the site uses', () => {
    expect(searchSite('websockets').length).toBeGreaterThan(0);
  });

  it('matches at word starts only, so a term cannot hide inside another word', () => {
    // "rust" appears nowhere on the site, but "trust" does.
    expect(searchSite('rust')).toEqual([]);
  });

  it('says so plainly when nothing matches', () => {
    expect(call('search_site', { query: 'kubernetes operator in haskell' }).content).toMatch(/does not mention it|\[/);
    expect(call('search_site', { query: 'zzzqqq' }).content).toContain('does not mention it');
  });

  it('labels every hit with where it came from and the id to fetch', () => {
    const result = call('search_site', { query: 'offline editing' });
    expect(result.content).toMatch(/^\[project:vega-canva · Vega Studio · /);
    expect(result.table?.columns).toEqual(['source', 'where', 'passage']);
  });
});

describe('compare_projects', () => {
  it('lines up the same facts for each project', () => {
    const result = call('compare_projects', { ids: ['vega-canva', 'logistics-watchtower'] });
    expect(result.table?.rows.map((r) => r[0])).toEqual(['Vega Studio', 'Logistics Watchtower']);
    expect(result.table?.columns).toContain('trade-offs');
  });

  it('refuses a single project, and names the ids it does not know', () => {
    expect(call('compare_projects', { ids: ['vega-canva'] }).content).toMatch(/^error: give at least two/);
    expect(call('compare_projects', { ids: ['vega-canva', 'nope'] }).content).toMatch(/^error: no project "nope"/);
  });
});

describe('get_project', () => {
  it('carries field notes, so "what went wrong building it?" has a source', () => {
    expect(call('get_project', { id: 'vega-canva' }).content).toContain('field notes (debugging stories):');
  });
});
