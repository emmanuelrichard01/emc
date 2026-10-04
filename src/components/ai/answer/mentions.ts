import { PROJECTS } from '@/data/projects';
import { EXPERIENCE } from '@/data/experience';
import { rankItem } from '@/lib/fuzzy';

/* ==========================================================================
   MENTIONS

   Typing `@` in the composer offers the projects and roles by name. Picking
   a project writes "@MMR Engine" into the question and scopes that one
   question to it, whatever page is open; picking a role writes the company's
   name, which is all the server needs to find it. Pure, so it is tested
   without a browser.
   ========================================================================== */

export interface Mention {
  kind: 'project' | 'role';
  id: string;
  /** What is written into the question after the @. */
  label: string;
  /** The second line in the list. */
  detail: string;
}

let all: Mention[] | null = null;
export function mentionCandidates(): Mention[] {
  if (!all) {
    all = [
      ...PROJECTS.map((p) => ({ kind: 'project' as const, id: p.id, label: p.title, detail: p.subtitle })),
      ...EXPERIENCE.map((r) => ({ kind: 'role' as const, id: r.id, label: r.company, detail: `${r.role}, ${r.period}` })),
    ];
  }
  return all;
}

/** The `@word` being typed at the caret, if any: where it starts and what follows the @. */
export function activeMention(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const match = /(^|\s)@([^\s@]{0,32})$/.exec(before);
  if (!match) return null;
  return { start: before.length - match[2].length - 1, query: match[2] };
}

/** The best matches for what follows the @. An empty query lists the projects first. */
export function matchMentions(query: string, list: readonly Mention[] = mentionCandidates(), limit = 6): Mention[] {
  if (!query.trim()) return list.slice(0, limit);
  return list
    .map((m) => ({ m, score: rankItem(query, m.label, [m.detail, m.id]) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.m);
}

/** Replaces the `@query` at `start` with "@Label ", returning the new text and caret. */
export function insertMention(text: string, caret: number, start: number, mention: Mention): { text: string; caret: number } {
  const inserted = `@${mention.label} `;
  const after = text.slice(caret).replace(/^\S*/, '').replace(/^ /, '');
  const next = text.slice(0, start) + inserted + after;
  return { text: next, caret: start + inserted.length };
}

/** Whether the question still names the mention (deleting "@MMR Engine" drops the scope). */
export function stillMentions(text: string, mention: Mention): boolean {
  return text.includes(`@${mention.label}`);
}
