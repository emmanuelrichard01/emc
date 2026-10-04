import { PROJECTS } from '../src/data/projects.js';
import {
  MAX_BODY_BYTES,
  admitContact,
  buildConfirmation,
  buildNotification,
  emailConfig,
  sendEmail,
  validateContact,
} from './_lib/email.js';

/* ==========================================================================
   CONTACT — POST /api/contact

   The contact form's own endpoint: one email to Emmanuel (Reply-To the
   visitor) and one short confirmation to the visitor, through Resend.

   Answers the form can act on:
     200 { ok: true, confirmation }   sent (or a bot, answered the same way)
     400 { error, field }             something to fix in the form
     429 { error }                    five an hour from one address
     503 { fallback: true }           not configured: the form uses Formspree
     502 { fallback: true }           Resend refused or timed out: the same

   RESEND_API_KEY, RESEND_FROM and CONTACT_TO are read at runtime here and
   nowhere else; none is ever prefixed VITE_.
   ========================================================================== */

export const config = { runtime: 'edge' };

const KNOWN = new Set(PROJECTS.map((p) => p.id));
const titleFor = (id: string) => PROJECTS.find((p) => p.id === id)?.title ?? id;

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}

function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { Allow: 'POST' });

  const raw = await request.text().catch(() => '');
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'That message is too long to send.' }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'The request was not a message.' }, 400);
  }

  const result = validateContact(body, (id) => KNOWN.has(id));
  if (!result.ok) return json({ error: result.error, field: result.field }, 400);
  if (result.bot) return json({ ok: true, confirmation: false });

  const settings = emailConfig(process.env);
  if (!settings) return json({ fallback: true, error: 'Email is not configured here.' }, 503);

  if (!(await admitContact(clientIp(request)))) {
    return json({ error: 'That is a lot of messages in one hour. Please try again later, or email me directly.' }, 429, { 'Retry-After': '3600' });
  }

  const { submission, requestId } = result;
  const sent = await sendEmail(settings, {
    to: settings.to,
    replyTo: submission.email,
    email: buildNotification(submission, submission.mentions.map(titleFor)),
    idempotencyKey: requestId ? `contact-${requestId}` : undefined,
  });
  if (!sent) return json({ fallback: true, error: 'The message could not be handed to the mail service.' }, 502);

  // The confirmation is a courtesy: if it fails, the message still arrived.
  const confirmation = await sendEmail(settings, {
    to: submission.email,
    replyTo: settings.to,
    email: buildConfirmation(submission),
    idempotencyKey: requestId ? `contact-confirm-${requestId}` : undefined,
  });

  return json({ ok: true, confirmation });
}
