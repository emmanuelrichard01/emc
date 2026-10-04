import { describe, expect, it } from 'vitest';

import { GITHUB, githubFacts, snapshotDate, type GithubSnapshot } from './background';

const snap = (over: Partial<GithubSnapshot>): GithubSnapshot => ({
  user: 'u',
  profileUrl: 'https://github.com/u',
  takenAt: '2026-10-04',
  publicRepos: 26,
  mergedPullRequests: 3,
  contributions: [{ name: 'a/b', url: 'https://github.com/a/b', pullRequests: 3 }],
  ...over,
});

describe('background', () => {
  it('reads the committed snapshot', () => {
    expect(GITHUB).not.toBeNull();
    expect(GITHUB!.mergedPullRequests).toBe(GITHUB!.contributions.reduce((n, c) => n + c.pullRequests, 0));
  });

  it('words the counts plainly', () => {
    expect(githubFacts(snap({}))).toEqual({
      repos: '26 public repositories',
      merged: '3 pull requests merged into another team’s project',
    });
    const one = snap({ mergedPullRequests: 1, contributions: [{ name: 'a/b', url: '', pullRequests: 1 }] });
    expect(githubFacts(one).merged).toBe('1 pull request merged into another team’s project');
    const two = snap({ mergedPullRequests: 2, contributions: [
      { name: 'a/b', url: '', pullRequests: 1 },
      { name: 'c/d', url: '', pullRequests: 1 },
    ] });
    expect(githubFacts(two).merged).toBe('2 pull requests merged into 2 other teams’ projects');
  });

  it('says nothing about contributions when there are none', () => {
    expect(githubFacts(snap({ mergedPullRequests: 0, contributions: [] })).merged).toBeNull();
  });

  it('dates the snapshot', () => {
    expect(snapshotDate('2026-10-04')).toBe('4 Oct 2026');
  });
});
