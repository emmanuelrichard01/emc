/* ==========================================================================
   BUILD INFO

   The deployed commit and when it shipped, inlined at build time by
   vite.config.ts. Shared by the footer and the hero's message-of-the-day so
   the two cannot report different builds.
   ========================================================================== */

export const COMMIT_SHA = __COMMIT_SHA__;
export const BUILD_TIME = __BUILD_TIME__;

/** True when this is a local build rather than a Vercel deployment. */
export const IS_DEV_BUILD = COMMIT_SHA === 'dev';

/**
 * "2 hours ago", "3 days ago" — relative to now, in whole units.
 *
 * Returns null rather than a guess when the timestamp is unparseable, so a
 * caller can omit the line instead of printing "Invalid Date ago".
 */
export function formatRelativeBuildTime(iso: string = BUILD_TIME): string | null {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diffMin = Math.round((then - Date.now()) / 60000);

  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour');
  return rtf.format(Math.round(diffHr / 24), 'day');
}
