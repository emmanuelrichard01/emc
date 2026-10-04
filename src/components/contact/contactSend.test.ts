import { describe, expect, it, vi } from 'vitest';

import { CONTACT_API, sendContact, type Outgoing } from './contactSend';

const out: Outgoing = {
  submission: { topic: 'role', name: 'Ada Obi', email: 'ada@acme.com', message: 'Hello', details: { company: 'Acme' }, mentions: [] },
  mentionTitles: [],
  requestId: 'req-12345678',
  elapsedMs: 9000,
  honeypot: '',
};

const FORMSPREE = 'https://formspree.test/f/x';

function fake(responses: Record<string, () => Response | Promise<Response>>) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) });
    const respond = responses[url];
    if (!respond) throw new TypeError('Failed to fetch');
    return respond();
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('sendContact', () => {
  it('sends through our endpoint first', async () => {
    const { calls, fetchImpl } = fake({ [CONTACT_API]: () => json({ ok: true, confirmation: true }) });
    expect(await sendContact(out, { fetchImpl, formspree: FORMSPREE })).toEqual({ kind: 'sent', via: 'resend', confirmation: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toMatchObject({ topic: 'role', requestId: 'req-12345678', elapsedMs: 9000 });
  });

  it.each([503, 502, 404])('falls back to Formspree on %i', async (status) => {
    const { calls, fetchImpl } = fake({ [CONTACT_API]: () => json({ fallback: true }, status), [FORMSPREE]: () => json({ ok: true }) });
    expect(await sendContact(out, { fetchImpl, formspree: FORMSPREE })).toEqual({ kind: 'sent', via: 'formspree', confirmation: false });
    expect(calls[1].body).toMatchObject({ _subject: 'Portfolio · A role · Ada Obi at Acme', _replyto: 'ada@acme.com' });
    expect(String(calls[1].body.message)).toContain('Company: Acme');
  });

  it('falls back when the endpoint answers with something that is not ours', async () => {
    const { fetchImpl } = fake({ [CONTACT_API]: () => new Response('<!doctype html>'), [FORMSPREE]: () => json({ ok: true }) });
    expect(await sendContact(out, { fetchImpl, formspree: FORMSPREE })).toMatchObject({ kind: 'sent', via: 'formspree' });
  });

  it('does not fall back on a rate limit or a validation error', async () => {
    const rate = fake({ [CONTACT_API]: () => json({ error: 'Slow down' }, 429) });
    expect(await sendContact(out, { fetchImpl: rate.fetchImpl, formspree: FORMSPREE })).toEqual({ kind: 'failed', reason: 'rate', error: 'Slow down' });
    const invalid = fake({ [CONTACT_API]: () => json({ error: 'Bad email', field: 'email' }, 400) });
    expect(await sendContact(out, { fetchImpl: invalid.fetchImpl, formspree: FORMSPREE })).toEqual({
      kind: 'failed',
      reason: 'invalid',
      error: 'Bad email',
      field: 'email',
    });
    expect(rate.calls).toHaveLength(1);
  });

  it('reports a failure when both routes fail', async () => {
    const { fetchImpl } = fake({ [CONTACT_API]: () => json({}, 502), [FORMSPREE]: () => json({}, 500) });
    expect(await sendContact(out, { fetchImpl, formspree: FORMSPREE })).toEqual({ kind: 'failed', reason: 'server' });
  });

  it('holds the message when offline', async () => {
    const { calls, fetchImpl } = fake({});
    expect(await sendContact(out, { fetchImpl, online: () => false })).toEqual({ kind: 'offline' });
    expect(calls).toHaveLength(0);
    let online = true;
    const dropping = vi.fn(async () => {
      online = false;
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    expect(await sendContact(out, { fetchImpl: dropping, online: () => online })).toEqual({ kind: 'offline' });
  });
});
