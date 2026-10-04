/* ==========================================================================
   CONTACT SCHEMA

   What a message can carry, defined once for the form (which renders and
   validates it) and the endpoint (api/contact.ts, which validates it again
   and turns it into an email). Pure and import-free on purpose: the edge
   function bundles this file, so nothing here may touch `window`.

   Every field past name, email and message is optional. They exist so a
   message arrives already answering the questions a first reply would ask
   ("which company?", "what stage is it at?"), not so a visitor has to fill
   in a form before saying hello.
   ========================================================================== */

export type Topic = 'role' | 'project' | 'other';

export const TOPICS: readonly { id: Topic; label: string }[] = [
  { id: 'role', label: 'A role' },
  { id: 'project', label: 'A project' },
  { id: 'other', label: 'Something else' },
];

export const MAX_NAME_LENGTH = 120;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_MESSAGE_LENGTH = 3000;
/** A role-fit summary, a project brief or a conversation, attached by the assistant. */
export const MAX_ATTACHMENT_LENGTH = 6000;
export const MAX_MENTIONS = 6;
/** A real person takes longer than this to read the form and write a line. */
export const MIN_FILL_TIME_MS = 1500;

/* ── Optional details, by topic ─────────────────────────────────────────── */

export type DetailKey =
  | 'company'
  | 'roleTitle'
  | 'postUrl'
  | 'setup'
  | 'location'
  | 'salary'
  | 'stage'
  | 'timeline'
  | 'budget'
  | 'link';

export interface DetailField {
  key: DetailKey;
  label: string;
  kind: 'text' | 'url' | 'choice';
  options?: readonly string[];
  placeholder?: string;
  max: number;
}

export const DETAIL_FIELDS: Record<Topic, readonly DetailField[]> = {
  role: [
    { key: 'company', label: 'Company', kind: 'text', placeholder: 'Acme Payments', max: 120 },
    { key: 'roleTitle', label: 'Role', kind: 'text', placeholder: 'Senior Data Engineer', max: 120 },
    { key: 'postUrl', label: 'Link to the job post', kind: 'url', placeholder: 'https://', max: 500 },
    { key: 'setup', label: 'Work setup', kind: 'choice', options: ['Remote', 'Hybrid', 'On-site'], max: 20 },
    { key: 'location', label: 'Location', kind: 'text', placeholder: 'Lagos, London, anywhere', max: 120 },
    { key: 'salary', label: 'Salary range', kind: 'text', placeholder: 'Optional', max: 120 },
  ],
  project: [
    { key: 'stage', label: 'Where it stands', kind: 'choice', options: ['Idea', 'Prototype', 'Live and growing', 'Needs rescue'], max: 40 },
    { key: 'timeline', label: 'Timeline', kind: 'choice', options: ['As soon as possible', '1 to 3 months', '3 to 6 months', 'Flexible'], max: 40 },
    { key: 'budget', label: 'Budget', kind: 'choice', options: ['Under $5k', '$5k to $15k', '$15k to $50k', '$50k+', 'Not sure yet'], max: 40 },
    { key: 'link', label: 'Link (a doc, a site, a repo)', kind: 'url', placeholder: 'https://', max: 500 },
  ],
  other: [],
};

export type ContactDetails = Partial<Record<DetailKey, string>>;

/**
 * A link as a visitor types it ("linkedin.com/jobs/123") made into a full
 * URL, or null when it is not a web address at all. Only http(s).
 */
export function normaliseUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname.includes('.') || /\s/.test(trimmed)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** The details that were filled in, as labelled rows, in the order the form shows them. */
export function detailRows(topic: Topic, details: ContactDetails): { label: string; value: string }[] {
  return DETAIL_FIELDS[topic]
    .map((field) => ({ label: field.label, value: (details[field.key] ?? '').trim() }))
    .filter((row) => row.value.length > 0);
}

/* ── The submission ─────────────────────────────────────────────────────── */

export interface ContactAttachment {
  /** "Role fit summary", "Project brief", "Conversation with the assistant". */
  label: string;
  text: string;
}

export interface ContactSubmission {
  topic: Topic;
  name: string;
  email: string;
  message: string;
  details: ContactDetails;
  attachment?: ContactAttachment;
  /** Case-study ids the visitor chose to mention. */
  mentions: string[];
}

export function topicLabel(topic: Topic): string {
  return TOPICS.find((t) => t.id === topic)?.label ?? 'Something else';
}

/** The subject a message arrives under: sortable before it is opened. */
export function subjectLine(topic: Topic, name: string, company?: string): string {
  const who = name.trim();
  const at = company?.trim() ? ` at ${company.trim()}` : '';
  return `Portfolio · ${topicLabel(topic)}${who ? ` · ${who}${at}` : ''}`;
}

/**
 * The whole message as plain text: what the Formspree fallback carries, what
 * the "send from my email app" link pre-fills, and the text part of the
 * email the endpoint sends. `mentionTitles` are the case studies' names.
 */
export function composePlainText(sub: ContactSubmission, mentionTitles: string[]): string {
  const parts: string[] = [sub.message.trim()];
  const rows = detailRows(sub.topic, sub.details);
  if (rows.length) parts.push(rows.map((r) => `${r.label}: ${r.value}`).join('\n'));
  if (mentionTitles.length) parts.push(`Read on the site: ${mentionTitles.join(', ')}`);
  if (sub.attachment?.text.trim()) parts.push(`${sub.attachment.label}\n${'-'.repeat(sub.attachment.label.length)}\n${sub.attachment.text.trim()}`);
  parts.push(`${sub.name.trim()}\n${sub.email.trim()}`);
  return parts.join('\n\n');
}
