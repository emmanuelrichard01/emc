import type { BriefResult } from './aiProtocol';
import { titleFor } from './aiConversation';

/* ==========================================================================
   PROJECT BRIEF — as text

   The brief the visitor and the assistant drafted together, as plain text:
   for Copy, and as the message Emmanuel receives when they send it. One
   builder for both, so what they reviewed is what arrives.
   ========================================================================== */

const DRAFT_MAX = 2000;

function section(title: string, body: string | string[]): string {
  const lines = Array.isArray(body) ? body.filter((s) => s.trim()).map((s) => `- ${s.trim()}`) : [body.trim()];
  return lines.length && lines.some(Boolean) ? `${title}\n${lines.join('\n')}` : '';
}

export function briefText(brief: BriefResult): string {
  const parts = [
    `Project brief: ${brief.title.trim()}`,
    section('Goal', brief.goal),
    section('Where it stands today', brief.currentState),
    section('What success looks like', brief.outcomes),
    section('Constraints', brief.constraints),
    brief.timeline?.trim() ? section('Timeline', brief.timeline) : '',
    section(
      'Relevant past work on the site',
      brief.relevantWork.map((w) => `${titleFor({ kind: 'project', id: w.id })}: ${w.why}`)
    ),
    section('Open questions', brief.openQuestions),
  ];
  return parts.filter(Boolean).join('\n\n');
}

/** The brief, cut to fit the contact message; the most important parts come first. */
export function briefDraft(brief: BriefResult): string {
  const text = briefText(brief);
  if (text.length <= DRAFT_MAX) return text;
  return `${text.slice(0, DRAFT_MAX - 30).replace(/\s+\S*$/, '')}\n\n(cut to fit)`;
}
