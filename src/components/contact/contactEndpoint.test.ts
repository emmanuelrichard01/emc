import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import handler from '../../../api/contact';
import {
  CONTACT_LIMIT_PER_HOUR,
  buildConfirmation,
  buildNotification,
  escapeHtml,
  resetContactLimits,
  validateContact,
} from '../../../api/_lib/email';
import type { ContactSubmission } from './contactSchema';

/* ==========================================================================
   /api/contact, with Resend faked at the fetch boundary. No real email is
   ever sent from a test.
   ========================================================================== */

const known = (id: string) => id === 'mmr-engine' || id === 'vega-canva';

const valid = {
  topic: 'role',
  name: 'Ada Obi',
  email: 'ada@acme.com',
  message: 'We are hiring a data engineer.',
  elapsedMs: 9000,
};

describe('validateContact', () => {
  it('accepts a plain message and keeps only real details', () => {
    const r = validateContact(
      {
        ...valid,
        details: { company: ' Acme ', setup: 'Remote', budget: '$50k+', postUrl: 'acme.com/jobs/1', salary: '' },
        mentions: ['mmr-engine', 'made-up', 'mmr-engine'],
      },
      known,
    );
    expect(r.ok && !r.bot && r.submission).toMatchObject({
      topic: 'role',
      details: { company: 'Acme', setup: 'Remote', postUrl: 'https://acme.com/jobs/1' },
      mentions: ['mmr-engine'],
    });
    // A project field on a role message is dropped, not trusted.
    expect(r.ok && !r.bot && r.submission.details.budget).toBeUndefined();
  });

  it('drops a choice that is not one of the options', () => {
    const r = validateContact({ ...valid, details: { setup: 'On the moon' } }, known);
    expect(r.ok && !r.bot && r.submission.details.setup).toBeUndefined();
  });

  it('says what is wrong, field by field', () => {
    expect(validateContact({ ...valid, name: '  ' }, known)).toMatchObject({ ok: false, field: 'name' });
    expect(validateContact({ ...valid, email: 'ada@' }, known)).toMatchObject({ ok: false, field: 'email' });
    expect(validateContact({ ...valid, message: 'x'.repeat(3001) }, known)).toMatchObject({ ok: false, field: 'message' });
    expect(validateContact({ ...valid, topic: 'spam' }, known)).toMatchObject({ ok: false, field: 'topic' });
    expect(validateContact('nope', known)).toMatchObject({ ok: false });
  });

  it('answers a bot as if it had succeeded', () => {
    expect(validateContact({ ...valid, company_website: 'http://spam' }, known)).toEqual({ ok: true, bot: true });
    expect(validateContact({ ...valid, elapsedMs: 200 }, known)).toEqual({ ok: true, bot: true });
  });

  it('keeps a newline out of the name, so it cannot reach a header', () => {
    const r = validateContact({ ...valid, name: 'Ada\r\nBcc: x@y.z' }, known);
    expect(r.ok && !r.bot && r.submission.name).toBe('Ada Bcc: x@y.z');
  });

  it('names an attachment only with a known label', () => {
    const r = validateContact({ ...valid, attachment: { label: '<b>Urgent</b>', text: 'Summary' } }, known);
    expect(r.ok && !r.bot && r.submission.attachment).toEqual({ label: 'From the assistant', text: 'Summary' });
  });
});

describe('the emails', () => {
  const sub: ContactSubmission = {
    topic: 'project',
    name: '<script>alert(1)</script> Obi',
    email: 'ada@acme.com',
    message: 'Hello <img src=x onerror=alert(1)>\nLine two & more',
    details: { stage: 'Prototype', link: 'https://acme.com/?a=1&b="2"' },
    attachment: { label: 'Project brief', text: 'Project brief: <Ledger>' },
    mentions: ['mmr-engine'],
  };

  it('never puts visitor text into the HTML unescaped', () => {
    const { html, text, subject } = buildNotification(sub, ['MMR Engine']);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<Ledger>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Line two &amp; more');
    expect(html).toContain('href="https://acme.com/?a=1&amp;b=%222%22"');
    expect(html).toContain('Read on the site');
    expect(text).toContain('Read on the site: MMR Engine');
    expect(text).toContain('Project brief\n-------------\nProject brief: <Ledger>');
    expect(subject).toBe('Portfolio · A project · <script>alert(1)</script> Obi');
  });

  it('confirms without echoing the message or an untrustworthy name', () => {
    const c = buildConfirmation(sub);
    expect(c.text + c.html).not.toContain('Line two');
    expect(c.text).toMatch(/^Hello,/);
    expect(c.text).toContain('within 1 working day');
    expect(c.text).toContain('short written proposal');
    expect(buildConfirmation({ ...sub, topic: 'role', name: 'Ada Obi' }).text).toMatch(/^Hi Ada,[\s\S]*interview process/);
  });

  it('escapes the five characters that matter', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  });
});

describe('POST /api/contact', () => {
  let ip = 0;
  const post = (body: unknown, address = `10.1.0.${++ip}`) =>
    handler(
      new Request('http://localhost/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': address },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      }),
    );

  beforeEach(() => {
    resetContactLimits();
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('RESEND_FROM', 'Emmanuel Moghalu <hello@builtbyem.dev>');
    vi.stubEnv('CONTACT_TO', 'inbox@example.com');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('KV_REST_API_URL', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function fakeResend(status = 200) {
    const calls: { headers: Record<string, string>; body: Record<string, unknown> }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        calls.push({ headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
        return new Response(JSON.stringify({ id: 'email_1' }), { status });
      }),
    );
    return calls;
  }

  it('sends the notification with Reply-To, then the confirmation', async () => {
    const calls = fakeResend();
    const res = await post({ ...valid, requestId: 'abc12345-req', mentions: ['vega-canva'] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, confirmation: true });
    expect(calls).toHaveLength(2);
    expect(calls[0].body).toMatchObject({ to: ['inbox@example.com'], reply_to: 'ada@acme.com', from: 'Emmanuel Moghalu <hello@builtbyem.dev>' });
    expect(calls[0].body.text).toContain('Read on the site: Vega Studio');
    expect(calls[0].headers['Idempotency-Key']).toBe('contact-abc12345-req');
    expect(calls[1].body).toMatchObject({ to: ['ada@acme.com'], subject: 'Your message reached Emmanuel' });
  });

  it('asks the form to fall back when it is not configured', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const calls = fakeResend();
    const res = await post(valid);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ fallback: true });
    expect(calls).toHaveLength(0);
  });

  it('asks the form to fall back when Resend refuses', async () => {
    fakeResend(500);
    const res = await post(valid);
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ fallback: true });
  });

  it('still reports success when only the confirmation fails', async () => {
    let n = 0;
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: ++n === 1 ? 200 : 500 })));
    expect(await (await post(valid)).json()).toEqual({ ok: true, confirmation: false });
  });

  it('answers bots with a success and sends nothing', async () => {
    const calls = fakeResend();
    const res = await post({ ...valid, company_website: 'x' });
    expect(await res.json()).toEqual({ ok: true, confirmation: false });
    expect(calls).toHaveLength(0);
  });

  it('allows five an hour from one address', async () => {
    fakeResend();
    for (let i = 0; i < CONTACT_LIMIT_PER_HOUR; i++) expect((await post(valid, '10.9.9.9')).status).toBe(200);
    expect((await post(valid, '10.9.9.9')).status).toBe(429);
    expect((await post(valid, '10.9.9.8')).status).toBe(200);
  });

  it('rejects the wrong method, junk and oversized bodies', async () => {
    expect((await handler(new Request('http://localhost/api/contact'))).status).toBe(405);
    expect((await post('not json')).status).toBe(400);
    expect((await post({ ...valid, message: 'x'.repeat(25_000) })).status).toBe(413);
    expect((await post({ ...valid, email: 'nope' })).status).toBe(400);
  });
});
