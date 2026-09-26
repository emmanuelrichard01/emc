/* ==========================================================================
   FUZZY MATCH — for the command palette

   Substring matching was enough while the palette held twelve fixed
   entries. With every case study in it, "mmr", "recon" and "rate lim" all
   need to land, and the best match needs to be first rather than wherever
   its category happens to sit.

   Scores, highest first:
     100  exact
      80  prefix of the whole string
      65  prefix of a word
      50  anywhere inside
     <30  the letters in order with gaps ("rtlmt" → "rate limiter"), fewer
          gaps scoring higher
   A multi-word query matches when every word matches something, so the
   order the visitor types words in does not matter.
   ========================================================================== */

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (!q || !t) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (new RegExp(`(^|[^a-z0-9])${escape(q)}`).test(t)) return 65;
  if (t.includes(q)) return 50;
  if (q.length < 3) return 0;

  // In-order subsequence. Anchored so the first letter must start a word —
  // otherwise short queries match nearly everything by accident.
  let from = 0;
  let last = -1;
  let gaps = 0;
  for (const ch of q) {
    if (ch === ' ') continue;
    const at = t.indexOf(ch, from);
    if (at < 0) return 0;
    if (last < 0 && at > 0 && /[a-z0-9]/.test(t[at - 1])) return 0;
    if (last >= 0) gaps += at - last - 1;
    last = at;
    from = at + 1;
  }
  return Math.max(1, 30 - gaps);
}

/**
 * Best score for a query against a title and any number of secondary fields
 * (subtitle, keywords). Secondary fields count for less: a title match is
 * what the visitor usually means.
 */
export function rankItem(query: string, title: string, secondary: readonly string[]): number {
  const one = (q: string) =>
    Math.max(fuzzyScore(q, title), ...secondary.map((field) => fuzzyScore(q, field) * 0.75), 0);

  const whole = one(query);
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return whole;

  const each = words.map(one);
  if (each.some((score) => score === 0)) return whole;
  const byWords = (each.reduce((a, b) => a + b, 0) / each.length) * 0.9;
  return Math.max(whole, byWords);
}

/**
 * Whether what was typed reads as a question rather than a destination —
 * which decides whether the palette leads with "ask" or with its matches.
 */
export function looksLikeQuestion(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.endsWith('?')) return true;
  if (q.split(/\s+/).length < 3) return false;
  return /^(what|how|why|who|where|when|which|does|did|is|are|can|has|have|tell|explain|show|compare)\b/.test(q);
}
