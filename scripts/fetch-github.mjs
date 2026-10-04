import fs from 'fs';
import path from 'path';

/* ==========================================================================
   GITHUB SNAPSHOT

   Writes src/data/github.json: public repositories, and pull requests merged
   into other people's projects, counted from GitHub's public API rather than
   claimed. About's Background block renders it with the date it was taken.

   A snapshot, not a live call: the page never waits on GitHub, never hits a
   rate limit in a visitor's browser, and builds the same way offline. If the
   API cannot be reached the existing snapshot is kept and the script exits
   0, so a flaky network never breaks a deploy. GITHUB_TOKEN is optional and
   only raises the rate limit; nothing here needs more than public data.

   Run by `npm run build` via prebuild. The output is committed.
   ========================================================================== */

const USER = 'emmanuelrichard01';
const OUT = path.join(process.cwd(), 'src', 'data', 'github.json');
const API = 'https://api.github.com';

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': `${USER}-portfolio-build`,
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

async function get(url) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function snapshot() {
  const profile = await get(`${API}/users/${USER}`);

  const repos = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await get(`${API}/users/${USER}/repos?type=owner&per_page=100&page=${page}`);
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  const own = repos.filter((r) => !r.fork && !r.private);

  // Merged pull requests in repositories this account does not own.
  const q = encodeURIComponent(`is:pr is:merged author:${USER} -user:${USER}`);
  const search = await get(`${API}/search/issues?q=${q}&per_page=100`);
  const byRepo = new Map();
  for (const item of search.items ?? []) {
    const full = item.repository_url.replace(`${API}/repos/`, '');
    byRepo.set(full, (byRepo.get(full) ?? 0) + 1);
  }
  /* With a token, search also returns private repositories the token can
     see. Those are someone else's private work: never named or counted on a
     public page. Each repository is checked and only public ones are kept. */
  for (const full of [...byRepo.keys()]) {
    const repo = await get(`${API}/repos/${full}`).catch(() => null);
    if (!repo || repo.private) byRepo.delete(full);
  }
  const contributions = [...byRepo.entries()]
    .map(([name, pullRequests]) => ({ name, url: `https://github.com/${name}`, pullRequests }))
    .sort((a, b) => b.pullRequests - a.pullRequests || a.name.localeCompare(b.name));

  return {
    user: USER,
    profileUrl: profile.html_url,
    takenAt: new Date().toISOString().slice(0, 10),
    publicRepos: own.length,
    stars: own.reduce((n, r) => n + r.stargazers_count, 0),
    mergedPullRequests: contributions.reduce((n, c) => n + c.pullRequests, 0),
    contributions,
  };
}

try {
  const data = await snapshot();
  fs.writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`);
  console.log(
    `github: ${data.publicRepos} repos, ${data.mergedPullRequests} merged PRs into ${data.contributions.length} public project(s) (${data.takenAt})`
  );
} catch (err) {
  const kept = fs.existsSync(OUT) ? 'kept the existing snapshot' : 'no snapshot written; About hides the block';
  console.warn(`github: could not fetch (${err.message}); ${kept}`);
}
