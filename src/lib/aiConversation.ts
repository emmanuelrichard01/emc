import { PROJECTS } from '@/data/projects';
import { EXPERIENCE } from '@/data/experience';
import { answerToPlainText, parseAnswer } from './aiAnswer';

/* ==========================================================================
   A CONVERSATION, AS A MESSAGE

   "Send this conversation to Emmanuel" attaches the questions asked and the
   answers given to the contact form, as plain text he can read in an email:
   citations as [1] with the list of what they point at, blocks as a line
   naming what they showed. Newest turns are kept if it has to be cut.
   ========================================================================== */

/** The longest attachment, so the visitor's own words still have room. */
const MAX_CHARS = 2000;

export function titleFor(ref: { kind: 'project' | 'role'; id: string }): string {
  if (ref.kind === 'project') return PROJECTS.find((p) => p.id === ref.id)?.title ?? ref.id;
  const role = EXPERIENCE.find((r) => r.id === ref.id);
  return role ? `${role.company} (${role.role})` : ref.id;
}

export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
  text: string;
}

export function conversationDraft(turns: readonly ConversationTurn[]): string {
  const pairs: string[] = [];
  for (const turn of turns) {
    if (turn.role === 'user') pairs.push(`Q: ${turn.text.trim()}`);
    else if (turn.role === 'assistant' && turn.text.trim()) {
      pairs.push(`A: ${answerToPlainText(parseAnswer(turn.text), titleFor)}`);
    }
  }
  const header = 'From my conversation with the assistant on your site:';
  // Keep the newest exchanges when the whole thing does not fit.
  const kept: string[] = [];
  let length = header.length;
  for (let i = pairs.length - 1; i >= 0; i--) {
    if (length + pairs[i].length + 2 > MAX_CHARS) break;
    kept.unshift(pairs[i]);
    length += pairs[i].length + 2;
  }
  if (!kept.length) return '';
  const cut = kept.length < pairs.length ? '\n\n(earlier questions left out)' : '';
  return `${header}${cut}\n\n${kept.join('\n\n')}`;
}
