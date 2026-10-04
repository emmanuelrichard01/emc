/* ==========================================================================
   ?run= LINKS

   `share` copies a link that opens the site with a command already typed at
   the prompt. Opening one never runs anything: the line is placed in the
   prompt with a Run button, and the visitor decides. A link is someone
   else's text, so it is treated the way pasted text is.
   ========================================================================== */

export const RUN_PARAM = 'run';
export const MAX_RUN_CHARS = 300;

/** The command a `?run=` query string carries, or null if there is none worth showing. */
export function parseRunParam(search: string): string | null {
  let value: string | null;
  try {
    value = new URLSearchParams(search).get(RUN_PARAM);
  } catch {
    return null;
  }
  if (value === null) return null;
  // Control characters (newlines included) have no place on one prompt line.
  // eslint-disable-next-line no-control-regex
  const line = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  if (!line || line.length > MAX_RUN_CHARS) return null;
  return line;
}

export function buildRunLink(origin: string, line: string): string {
  return `${origin.replace(/\/$/, '')}/?${RUN_PARAM}=${encodeURIComponent(line.trim())}`;
}

/** The search string with `run` removed, so a reload does not offer it again. */
export function withoutRunParam(search: string): string {
  const params = new URLSearchParams(search);
  params.delete(RUN_PARAM);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}
