import path from 'path';

import { captureAll, screenshotTargets } from './screenshots.mjs';

/* Local refresh of the committed screenshots in public/images/.

   Run with: npm run update-screenshots  (needs SCREENSHOT_API_KEY)
             node --env-file=.env scripts/fetch-screenshots.mjs

   The deployed site does not depend on this: vite.config.ts recaptures into
   dist/ at build time when the key is present. This exists to refresh the
   fallbacks that ship in the repo, which are what get served whenever the
   screenshot service is unavailable at build time. */

if (!process.env.SCREENSHOT_API_KEY) {
  console.error(
    'Missing SCREENSHOT_API_KEY. Set it in .env (see .env.example) and run with --env-file=.env.'
  );
  process.exit(1);
}

const outDir = path.join(process.cwd(), 'public', 'images');
const targets = screenshotTargets();

console.log(`Capturing ${targets.length} project screenshots into public/images/...`);
for (const target of targets) console.log(`  · ${target.id} → ${target.url}`);

const { ok, failed } = await captureAll(outDir);

console.log(`\nDone — ${ok} captured, ${failed} failed.`);
// Non-zero on failure so a scripted refresh does not report success having
// silently kept every stale image.
process.exit(failed > 0 ? 1 : 0);
