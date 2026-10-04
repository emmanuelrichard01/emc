import github from '@/data/github.json';

/* ==========================================================================
   BACKGROUND

   What About says beyond the work on this site: open source, counted from
   GitHub's public API at build time (scripts/fetch-github.mjs), and writing
   or talks (data/writing.ts). Each part renders only when it has something
   real in it, so an empty list never becomes a "coming soon".
   ========================================================================== */

export interface GithubSnapshot {
  user: string;
  profileUrl: string;
  /** YYYY-MM-DD. */
  takenAt: string;
  publicRepos: number;
  mergedPullRequests: number;
  contributions: { name: string; url: string; pullRequests: number }[];
}

function isSnapshot(value: unknown): value is GithubSnapshot {
  const v = value as Partial<GithubSnapshot> | null;
  return Boolean(
    v &&
      typeof v.profileUrl === 'string' &&
      typeof v.takenAt === 'string' &&
      typeof v.publicRepos === 'number' &&
      typeof v.mergedPullRequests === 'number' &&
      Array.isArray(v.contributions)
  );
}

export const GITHUB: GithubSnapshot | null = isSnapshot(github) ? github : null;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "26 public repositories", "3 pull requests merged into another team's project". */
export function githubFacts(snap: GithubSnapshot): { repos: string; merged: string | null } {
  const teams = snap.contributions.length;
  return {
    repos: plural(snap.publicRepos, 'public repository', 'public repositories'),
    merged:
      snap.mergedPullRequests > 0 && teams > 0
        ? `${plural(snap.mergedPullRequests, 'pull request')} merged into ${
            teams === 1 ? 'another team’s project' : `${teams} other teams’ projects`
          }`
        : null,
  };
}

/** "4 Oct 2026". */
export function snapshotDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
