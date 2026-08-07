import fs from 'fs';
import path from 'path';

import { PROJECTS } from '../src/data/projects.ts';

/* ==========================================================================
   PROJECT SCREENSHOTS

   Shared by the build (vite.config.ts) and the local refresh script, so the
   two cannot capture different sets.

   Targets are derived from PROJECTS rather than listed here. The previous
   version kept its own hardcoded array of four ids and urls, which is the
   same drift the sitemap plugin exists to prevent — add a project with a live
   url and a screenshot, and the list silently does not learn about it.
   ========================================================================== */

const ENDPOINT = 'https://screenshotapi.to/api/v1/screenshot';
const TIMEOUT_MS = 45_000;

/** Projects that have both a live site to capture and a slot to put it in. */
export function screenshotTargets() {
  return PROJECTS.filter((project) => project.image && project.liveUrl).map((project) => ({
    id: project.id,
    url: project.liveUrl,
    // `image` is a site-absolute path like /images/ultra-news.png; the file
    // name is what we write, so a renamed asset follows automatically.
    fileName: path.basename(project.image),
  }));
}

async function capture(target, apiKey) {
  const query = new URLSearchParams({
    url: target.url,
    width: '1280',
    height: '720',
    type: 'png',
    colorScheme: 'light',
    devicePixelRatio: '2',
  });

  // A hung third-party request must not hold a deploy open indefinitely.
  const response = await fetch(`${ENDPOINT}?${query}`, {
    headers: { 'x-api-key': apiKey },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${await response.text().catch(() => '')}`.trim());
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  // A truncated or error-page response would otherwise be written over a good
  // committed image, replacing a working screenshot with a broken one.
  if (buffer.length < 1024 || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error(`response was not a PNG (${buffer.length} bytes)`);
  }

  return buffer;
}

/**
 * Captures every target into `outDir`.
 *
 * Never throws. A failed capture leaves the committed image in place and
 * reports it — a screenshot service having a bad afternoon is not a reason to
 * fail a deployment, and the fallback in public/images/ is always present.
 *
 * @returns {Promise<{ ok: number, failed: number, skipped: boolean }>}
 */
export async function captureAll(outDir, { apiKey = process.env.SCREENSHOT_API_KEY, log = console } = {}) {
  if (!apiKey) {
    return { ok: 0, failed: 0, skipped: true };
  }

  const targets = screenshotTargets();
  fs.mkdirSync(outDir, { recursive: true });

  const results = await Promise.all(
    targets.map(async (target) => {
      try {
        const buffer = await capture(target, apiKey);
        fs.writeFileSync(path.join(outDir, target.fileName), buffer);
        log.info?.(`  ✓ ${target.fileName} (${(buffer.length / 1024).toFixed(0)} KB)`);
        return true;
      } catch (error) {
        log.warn?.(`  ✗ ${target.fileName} — ${error.message}; keeping committed image`);
        return false;
      }
    })
  );

  return {
    ok: results.filter(Boolean).length,
    failed: results.filter((r) => !r).length,
    skipped: false,
  };
}
