import fs from 'fs';
import path from 'path';

import { captureAll, screenshotTargets } from './screenshots.mjs';

/* Refresh of the committed screenshots in public/images/.

   Run with: npm run update-screenshots  (needs SCREENSHOT_API_KEY)
             node --env-file=.env scripts/fetch-screenshots.mjs

   This is now the primary path. .github/workflows/screenshots.yml runs it on
   a schedule and opens a pull request when an image changed, so a new
   screenshot is reviewed before it ships and lands in the repo — where local
   dev, the build and the fallback all see it. The build-time capture in
   vite.config.ts is kept only as a production fallback.

   Exit codes: 1 when any capture failed, so a local run does not report
   success having kept a stale image. In CI (SCREENSHOTS_ALLOW_PARTIAL=1) only
   a run where *every* capture failed exits non-zero — one site being down
   should not stop the others' fresh images reaching the pull request. */

if (!process.env.SCREENSHOT_API_KEY) {
  console.error(
    'Missing SCREENSHOT_API_KEY. Set it in .env (see .env.example) and run with --env-file=.env.'
  );
  // exitCode rather than exit(): exiting while fetch's handles are still
  // closing trips a libuv assertion on Windows.
  process.exitCode = 1;
} else {
  await run();
}

async function run() {
const outDir = path.join(process.cwd(), 'public', 'images');
const targets = screenshotTargets();

console.log(`Capturing ${targets.length} project screenshots into public/images/...`);
for (const target of targets) console.log(`  · ${target.id} → ${target.url}`);

const lines = [];
const { ok, failed } = await captureAll(outDir, {
  log: {
    info: (message) => {
      console.log(message);
      lines.push(message);
    },
    warn: (message) => {
      console.warn(message);
      lines.push(message);
    },
  },
});

console.log(`\nDone — ${ok} captured, ${failed} failed.`);

// The run's own page on GitHub says what happened, without opening the log.
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [`### Screenshots: ${ok} captured, ${failed} failed`, '', '```', ...lines.map((l) => l.trim()), '```', ''].join('\n')
  );
}

const allowPartial = process.env.SCREENSHOTS_ALLOW_PARTIAL === '1';
process.exitCode = failed === 0 || (allowPartial && ok > 0) ? 0 : 1;
}
