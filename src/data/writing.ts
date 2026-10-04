/* ==========================================================================
   WRITING AND TALKS

   Articles written and talks given, newest first. About's Background block
   renders this list only when it has entries, so it can sit empty until
   there is something real to link to: no placeholder, no "coming soon".
   ========================================================================== */

export interface WritingItem {
  kind: 'article' | 'talk';
  title: string;
  /** Where it was published or given: a blog, a meetup, a conference. */
  venue: string;
  /** "2026-03" or "2026-03-14". */
  date: string;
  url: string;
}

export const WRITING: readonly WritingItem[] = [];
