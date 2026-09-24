import { describe, expect, it } from 'vitest';

import { collectSources, suggestFollowUps } from './aiSources';

const call = (name: string, args: Record<string, unknown>) => ({ id: name, name, args });

describe('collectSources', () => {
  it('cites what the answer names, in the order it names them', () => {
    const sources = collectSources([], 'Logistics Watchtower streams alerts; MMR Engine reconciles payments.');
    expect(sources.map((s) => s.id)).toEqual(['logistics-watchtower', 'mmr-engine']);
  });

  it('keeps a page the model fetched even when the answer paraphrases it', () => {
    const sources = collectSources([call('get_project', { id: 'mmr-engine' })], 'it matches in two tiers.');
    expect(sources.map((s) => s.id)).toEqual(['mmr-engine']);
  });

  it('does not cite every row a broad query touched', () => {
    const sources = collectSources([call('run_sql', { query: 'SELECT title FROM projects' })], 'he has shipped several.');
    expect(sources).toEqual([]);
  });

  it('links a role to the experience ledger', () => {
    const [source] = collectSources([call('get_experience', { id: 'medvax' })], 'a contract role.');
    expect(source).toMatchObject({ kind: 'role', href: '/#experience' });
  });

  it('does not cite a role for a project that shares its short name', () => {
    const sources = collectSources([], 'MedVax is live.');
    expect(sources.map((s) => `${s.kind}:${s.id}`)).toEqual(['project:medvax']);
  });

  it('does not match a name inside another word', () => {
    expect(collectSources([], 'the evantyish thing')).toEqual([]);
  });
});

describe('suggestFollowUps', () => {
  const starters = ['what has he actually shipped?', 'where has he worked?'];

  it('offers the cited project first', () => {
    const [first] = suggestFollowUps(
      [{ kind: 'project', id: 'mmr-engine', title: 'MMR Engine', href: '/projects/mmr-engine' }],
      [],
      starters
    );
    expect(first).toBe('what did mmr engine trade off, and why?');
  });

  it('never repeats a question already asked', () => {
    const out = suggestFollowUps([], ['What has he actually shipped?'], starters);
    expect(out).toEqual(['where has he worked?']);
  });
});
