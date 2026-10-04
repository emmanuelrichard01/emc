// Relative imports only: the edge bundle cannot resolve the '@' alias.
import {
  DETAIL_FIELDS,
  MAX_ATTACHMENT_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_MENTIONS,
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
  MIN_FILL_TIME_MS,
  TOPICS,
  composePlainText,
  detailRows,
  normaliseUrl,
  subjectLine,
  topicLabel,
  type ContactDetails,
  type ContactSubmission,
  type Topic,
} from '../../src/components/contact/contactSchema.js';
import { digest, pipeline } from './store.js';

/* ==========================================================================
   CONTACT EMAIL

   Everything api/contact.ts does that is a decision rather than plumbing,
   kept here so it is tested (src/components/contact/contactEndpoint.test.ts):

     validateContact   the request body, checked field by field; a bot (a
                       filled honeypot, an instant submit) is recognised and
                       answered as if it had succeeded
     buildNotification the email Emmanuel receives: the visitor's words, the
                       details they chose to add, what they read on the site,
                       and anything the assistant drafted, under its own
                       heading. Reply-To is the visitor.
     buildConfirmation the short note the visitor receives. It does NOT echo
                       their message: anyone can type someone else's address
                       into a form, and an echo would make this site a relay
                       for whatever text they chose.
     admitContact      five messages an hour per address, shared across edge
                       instances when a store is configured

   Every visitor-supplied string that reaches HTML goes through escapeHtml.
   ========================================================================== */

export const RESEND_URL = 'https://api.resend.com/emails';
export const DEFAULT_TO = 'emma.moghalu@gmail.com';
export const CONTACT_LIMIT_PER_HOUR = 5;
/** The whole request body, before parsing. A full message and attachment fit in a third of this. */
export const MAX_BODY_BYTES = 20_000;

const ATTACHMENT_LABELS = ['Role fit summary', 'Project brief', 'Conversation with the assistant', 'From the assistant'];

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Validation ─────────────────────────────────────────────────────────── */

export type Validated =
  | { ok: true; bot: false; submission: ContactSubmission; requestId: string | null }
  | { ok: true; bot: true }
  | { ok: false; error: string; field?: string };

const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;
/* Control characters other than tab and newline have no place in a message,
   and a newline has no place in a name (it would end up in a subject line). */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

function str(value: unknown, max: number, { multiline = false } = {}): string | null {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return null;
  let text = value.replace(/\r\n?/g, '\n').replace(CONTROL, '');
  if (!multiline) text = text.replace(/\s+/g, ' ');
  text = text.trim();
  return text.length > max ? null : text;
}

/**
 * The request body, as a submission, or the first thing wrong with it.
 * `isKnownProject` keeps mentions to real case-study ids.
 */
export function validateContact(body: unknown, isKnownProject: (id: string) => boolean): Validated {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'The request was not a message.' };
  const b = body as Record<string, unknown>;

  // Bots first, and answered as a success: a bot told why learns how.
  const honeypot = typeof b.company_website === 'string' ? b.company_website.trim() : '';
  const elapsed = typeof b.elapsedMs === 'number' ? b.elapsedMs : 0;
  if (honeypot || elapsed < MIN_FILL_TIME_MS) return { ok: true, bot: true };

  const topic = TOPICS.find((t) => t.id === b.topic)?.id as Topic | undefined;
  if (!topic) return { ok: false, error: 'Choose what the message is about.', field: 'topic' };

  const name = str(b.name, MAX_NAME_LENGTH);
  if (!name) return { ok: false, error: 'Please add your name.', field: 'name' };

  const email = str(b.email, MAX_EMAIL_LENGTH);
  if (!email || !EMAIL_RE.test(email)) return { ok: false, error: 'That email address does not look right.', field: 'email' };

  const message = str(b.message, MAX_MESSAGE_LENGTH, { multiline: true });
  if (!message) return { ok: false, error: message === null ? 'The message is too long.' : 'Please write a line or two.', field: 'message' };

  const details: ContactDetails = {};
  const rawDetails = b.details && typeof b.details === 'object' ? (b.details as Record<string, unknown>) : {};
  for (const field of DETAIL_FIELDS[topic]) {
    const value = str(rawDetails[field.key], field.max);
    if (value === null) return { ok: false, error: `${field.label} is too long.`, field: field.key };
    if (!value) continue;
    if (field.kind === 'choice' && !field.options?.includes(value)) continue;
    if (field.kind === 'url') {
      const url = normaliseUrl(value);
      if (url) details[field.key] = url;
      continue;
    }
    details[field.key] = value;
  }

  let attachment: ContactSubmission['attachment'];
  if (b.attachment && typeof b.attachment === 'object') {
    const a = b.attachment as Record<string, unknown>;
    const text = str(a.text, MAX_ATTACHMENT_LENGTH, { multiline: true });
    if (text === null) return { ok: false, error: 'The attached draft is too long.', field: 'attachment' };
    const label = typeof a.label === 'string' && ATTACHMENT_LABELS.includes(a.label) ? a.label : 'From the assistant';
    if (text) attachment = { label, text };
  }

  const mentions = Array.isArray(b.mentions)
    ? [...new Set(b.mentions.filter((m): m is string => typeof m === 'string' && isKnownProject(m)))].slice(0, MAX_MENTIONS)
    : [];

  const requestId = typeof b.requestId === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(b.requestId) ? b.requestId : null;

  return { ok: true, bot: false, requestId, submission: { topic, name, email, message, details, attachment, mentions } };
}

/* ── The emails ─────────────────────────────────────────────────────────── */

export interface Email {
  subject: string;
  html: string;
  text: string;
}

const STYLE = {
  body: 'margin:0;padding:24px;background:#ffffff;color:#16161a;font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;',
  label: 'margin:28px 0 8px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6b6b76;',
  quote: 'margin:0;padding:12px 16px;border-left:2px solid #d8d8de;background:#f7f7f9;white-space:pre-wrap;',
  cell: 'padding:6px 16px 6px 0;vertical-align:top;',
};

/** Visitor text as HTML: escaped, and line breaks kept. */
function para(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function linkOrText(value: string): string {
  const url = normaliseUrl(value);
  return url && /^https?:\/\//.test(value) ? `<a href="${escapeHtml(url)}">${escapeHtml(value)}</a>` : escapeHtml(value);
}

export function buildNotification(sub: ContactSubmission, mentionTitles: string[]): Email {
  const rows = detailRows(sub.topic, sub.details);
  const html = [
    `<div style='${STYLE.body}'>`,
    `<p style="margin:0 0 4px;color:#6b6b76;font-size:13px;">${escapeHtml(topicLabel(sub.topic))} · from the portfolio</p>`,
    `<p style="margin:0;font-size:18px;"><strong>${escapeHtml(sub.name)}</strong> &lt;${escapeHtml(sub.email)}&gt;</p>`,
    `<p style="${STYLE.label}">Message</p>`,
    `<div style="white-space:pre-wrap;">${para(sub.message)}</div>`,
    rows.length
      ? `<p style="${STYLE.label}">Details</p><table style="border-collapse:collapse;">${rows
          .map((r) => `<tr><td style="${STYLE.cell}color:#6b6b76;">${escapeHtml(r.label)}</td><td style="${STYLE.cell}">${linkOrText(r.value)}</td></tr>`)
          .join('')}</table>`
      : '',
    mentionTitles.length
      ? `<p style="${STYLE.label}">Read on the site</p><p style="margin:0;">${mentionTitles.map(escapeHtml).join(', ')}</p>`
      : '',
    sub.attachment
      ? `<p style="${STYLE.label}">${escapeHtml(sub.attachment.label)}</p><div style="${STYLE.quote}">${para(sub.attachment.text)}</div>`
      : '',
    `<p style="margin:32px 0 0;color:#6b6b76;font-size:13px;">Reply to this email to answer ${escapeHtml(sub.name.split(' ')[0])} directly.</p>`,
    '</div>',
  ].join('');
  return {
    subject: subjectLine(sub.topic, sub.name, sub.details.company),
    html,
    text: composePlainText(sub, mentionTitles),
  };
}

/** A first name fit to greet someone with, or nothing. Never a link or a sentence. */
function greetingName(name: string): string | null {
  const first = name.split(' ')[0] ?? '';
  return /^[\p{L}\p{M}'-]{1,40}$/u.test(first) ? first : null;
}

export function buildConfirmation(sub: ContactSubmission): Email {
  const first = greetingName(sub.name);
  const next =
    sub.topic === 'role'
      ? 'If it is a fit, the next step is a 20-minute call at a time that suits you, then your interview process.'
      : sub.topic === 'project'
        ? 'If it is a fit, the next step is a 20-minute call at a time that suits you, then a short written proposal.'
        : 'If a call would help, I will suggest a time that suits you.';
  const lines = [
    `${first ? `Hi ${first},` : 'Hello,'}`,
    `Thanks for writing. Your message about ${topicLabel(sub.topic).toLowerCase()} reached me, and I reply within 1 working day.`,
    next,
    'You do not need to do anything else. If you think of something to add, reply to this email.',
    'Emmanuel Moghalu',
  ];
  const html = `<div style='${STYLE.body}'>${lines.map((l) => `<p style="margin:0 0 14px;">${escapeHtml(l)}</p>`).join('')}</div>`;
  return { subject: 'Your message reached Emmanuel', html, text: lines.join('\n\n') };
}

/* ── Sending ────────────────────────────────────────────────────────────── */

export interface EmailConfig {
  apiKey: string;
  from: string;
  to: string;
}

export function emailConfig(env: Record<string, string | undefined>): EmailConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.RESEND_FROM?.trim();
  if (!apiKey || !from) return null;
  return { apiKey, from, to: env.CONTACT_TO?.trim() || DEFAULT_TO };
}

export interface SendRequest {
  to: string;
  replyTo?: string;
  email: Email;
  idempotencyKey?: string;
}

/** One email through Resend. True when Resend accepted it. */
export async function sendEmail(config: EmailConfig, req: SendRequest, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    const response = await fetchImpl(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        ...(req.idempotencyKey ? { 'Idempotency-Key': req.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: config.from,
        to: [req.to],
        subject: req.email.subject,
        html: req.email.html,
        text: req.email.text,
        ...(req.replyTo ? { reply_to: req.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/* ── Rate limit ─────────────────────────────────────────────────────────── */

const memory = new Map<string, { hour: number; count: number }>();

/** Counts one message from `ip`; false once this hour's five are spent. */
export async function admitContact(ip: string, now = Date.now()): Promise<boolean> {
  const hour = Math.floor(now / 3_600_000);
  const key = `contact:ip:${await digest(ip)}:${hour}`;
  const shared = await pipeline([
    ['INCR', key],
    ['EXPIRE', key, 3_700],
  ]);
  if (shared && typeof shared[0] === 'number') return shared[0] <= CONTACT_LIMIT_PER_HOUR;

  const entry = memory.get(key);
  const count = entry && entry.hour === hour ? entry.count + 1 : 1;
  memory.set(key, { hour, count });
  if (memory.size > 5_000) memory.clear();
  return count <= CONTACT_LIMIT_PER_HOUR;
}

export function resetContactLimits(): void {
  memory.clear();
}
