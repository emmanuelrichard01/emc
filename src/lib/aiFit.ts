import type { FitEvidence, FitRequirement, FitResult, FitVerdict } from './aiProtocol';
import { titleFor } from './aiConversation';

/* ==========================================================================
   ROLE FIT — the parts that are text, not interface

   The verdict words, the tally line, the plain-text copy, and the compact
   summary that is attached to a message to Emmanuel. Pure, so the copy a
   recruiter pastes and the message he receives are the same thing the page
   showed them.
   ========================================================================== */

export const VERDICT_LABEL: Record<FitVerdict, string> = {
  strong: 'Strong',
  partial: 'Partial',
  'not-shown': 'Not shown on this site',
};

export const VERDICT_ORDER: readonly FitVerdict[] = ['strong', 'partial', 'not-shown'];

/** "6 strong, 2 partial, 2 not shown", leaving out any count of zero. */
export function fitTally(requirements: readonly FitRequirement[]): string {
  const count = (v: FitVerdict) => requirements.filter((r) => r.verdict === v).length;
  const parts = [
    count('strong') && `${count('strong')} strong`,
    count('partial') && `${count('partial')} partial`,
    count('not-shown') && `${count('not-shown')} not shown`,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'No requirements found';
}

export function evidenceLabel(evidence: FitEvidence): string {
  const title = titleFor({ kind: evidence.kind, id: evidence.id });
  return evidence.section ? `${title}, ${sectionWord(evidence.section)}` : title;
}

function sectionWord(section: string): string {
  switch (section) {
    case 'problem':
      return 'the problem';
    case 'approach':
      return 'how it works';
    case 'outcome':
      return 'the result';
    case 'tradeoffs':
      return 'trade-offs';
    case 'field-notes':
      return 'debugging stories';
    case 'decisions':
      return 'key decisions';
    default:
      return 'overview';
  }
}

/** The full result as plain text, for Copy. */
export function fitText(result: FitResult): string {
  const lines: string[] = [];
  lines.push(result.role ? `Role fit: ${result.role}` : 'Role fit');
  lines.push(result.summary.trim());
  lines.push(fitTally(result.requirements));
  for (const r of result.requirements) {
    lines.push('');
    lines.push(`${VERDICT_LABEL[r.verdict]}: ${r.requirement}`);
    if (r.note) lines.push(`  ${r.note}`);
    for (const e of r.evidence) lines.push(`  - ${evidenceLabel(e)}: "${e.quote}"`);
  }
  lines.push('');
  lines.push('Checked against builtbyem.dev. Every quote was found on the site.');
  return lines.join('\n');
}

const DRAFT_MAX = 1500;

/**
 * A compact summary for the contact form: the role, the tally, and each
 * requirement with its verdict and the first piece of evidence, cut to fit.
 */
export function fitDraft(result: FitResult): string {
  const head = [
    `I checked a role against your site${result.role ? `: ${result.role}` : ''}.`,
    `Fit: ${fitTally(result.requirements)}.`,
  ];
  const rows = result.requirements.map((r) => {
    const first = r.evidence[0];
    return `- ${VERDICT_LABEL[r.verdict]}: ${r.requirement}${first ? ` (${evidenceLabel(first)})` : ''}`;
  });
  let out = head.join('\n');
  for (const row of rows) {
    if (out.length + row.length + 1 > DRAFT_MAX - 40) {
      out += '\n- (more in the full check)';
      break;
    }
    out += `\n${row}`;
  }
  return out;
}
