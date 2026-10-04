import { composePlainText, subjectLine, topicLabel, type ContactSubmission } from './contactSchema';

/* ==========================================================================
   CONTACT SEND

   How a message leaves the page, in order of preference:

     1. /api/contact     our endpoint: Resend, Reply-To the visitor, and a
                         confirmation email to them
     2. Formspree        when the endpoint says it cannot send (not set up,
                         or Resend refused), or is not there at all
     3. the outbox       when the visitor is offline: kept on this device and
                         sent once, when the browser says it is back online
     4. their mail app   when everything else failed: the form offers it

   Pure apart from fetch and storage, both injectable, so it is tested
   (contactSend.test.ts).
   ========================================================================== */

export const CONTACT_API = '/api/contact';
export const FORMSPREE_ENDPOINT: string = import.meta.env.VITE_FORMSPREE_ENDPOINT ?? 'https://formspree.io/f/xwvwpaaz';
const OUTBOX_KEY = 'emc-contact-outbox';

export interface Outgoing {
  submission: ContactSubmission;
  /** The mentioned case studies' titles, for the Formspree text and the receipt. */
  mentionTitles: string[];
  /** One id per message, so a retry can never send it twice. */
  requestId: string;
  /** How long the form was open before sending: a bot submits instantly. */
  elapsedMs: number;
  honeypot: string;
}

export type FailReason = 'rate' | 'invalid' | 'server' | 'network';

export type SendResult =
  | { kind: 'sent'; via: 'resend' | 'formspree'; confirmation: boolean }
  | { kind: 'offline' }
  | { kind: 'failed'; reason: FailReason; error?: string; field?: string };

interface SendOptions {
  fetchImpl?: typeof fetch;
  online?: () => boolean;
  formspree?: string;
}

const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);

export function newRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await res.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function sendContact(out: Outgoing, options: SendOptions = {}): Promise<SendResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const online = options.online ?? isOnline;
  if (!online()) return { kind: 'offline' };

  const { submission: sub } = out;
  try {
    const res = await fetchImpl(CONTACT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        ...sub,
        requestId: out.requestId,
        elapsedMs: out.elapsedMs,
        company_website: out.honeypot,
      }),
    });
    const body = await readJson(res);
    if (res.ok && body?.ok === true) return { kind: 'sent', via: 'resend', confirmation: body.confirmation === true };
    if (res.status === 429) return { kind: 'failed', reason: 'rate', error: typeof body?.error === 'string' ? body.error : undefined };
    if (res.status === 400 || res.status === 413) {
      return {
        kind: 'failed',
        reason: 'invalid',
        error: typeof body?.error === 'string' ? body.error : undefined,
        field: typeof body?.field === 'string' ? body.field : undefined,
      };
    }
    // 502 or 503 (asked to fall back), 404 (no endpoint, e.g. a static host),
    // or a 200 that is not ours: Formspree carries it instead.
  } catch {
    if (!online()) return { kind: 'offline' };
  }

  try {
    const res = await fetchImpl(options.formspree ?? FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: sub.name,
        email: sub.email,
        _replyto: sub.email,
        intent: topicLabel(sub.topic),
        message: composePlainText(sub, out.mentionTitles),
        _subject: subjectLine(sub.topic, sub.name, sub.details.company),
        _gotcha: out.honeypot,
      }),
    });
    return res.ok ? { kind: 'sent', via: 'formspree', confirmation: false } : { kind: 'failed', reason: 'server' };
  } catch {
    return online() ? { kind: 'failed', reason: 'network' } : { kind: 'offline' };
  }
}

/* ── The outbox: one message, waiting for a connection ──────────────────── */

export function saveOutbox(out: Outgoing): void {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify({ ...out, savedAt: Date.now() }));
  } catch {
    // Storage unavailable: the form keeps the message on screen instead.
  }
}

export function readOutbox(): Outgoing | null {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return null;
    const out = JSON.parse(raw) as Outgoing & { savedAt?: number };
    // A week-old message sent without warning would surprise its writer.
    if (!out?.submission?.email || Date.now() - (out.savedAt ?? 0) > 7 * 24 * 60 * 60 * 1000) return null;
    return out;
  } catch {
    return null;
  }
}

export function clearOutbox(): void {
  try {
    localStorage.removeItem(OUTBOX_KEY);
  } catch {
    // Nothing was saved.
  }
}
