import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { toClaudeMessages } from '../../api/_lib/claude';
import type { Msg } from '../../api/_lib/providers';
import { commandNames, quoteIsVerbatim, validateAction, validateBrief, validateCommand, validateFit } from '../../api/_lib/validate';
import { blend } from '../../api/_lib/hybrid';
import { constantTimeEqual, recordGap, sanitiseQuestion } from '../../api/_lib/insights';
import insights from '../../api/insights';
import fit from '../../api/fit';
import brief from '../../api/brief';
import command from '../../api/command';
import { __resetForTests } from '../../api/ask';
import { auditNames } from './aiLexicon';
import { PASSAGES, searchSite } from './aiTools';
import { readEvents, type AiEvent } from './aiStream';
import { EXPERIENCE } from '@/data/experience';

/* ==========================================================================
   The server's checks, one at a time: the Claude history mapping, the name
   audit, every validator, the hybrid ranker's fallback, the insights store
   and its door, and the fit, brief and command endpoints end to end with
   the provider faked at the fetch boundary.
   ========================================================================== */

const medvax = EXPERIENCE.find((e) => e.id === 'medvax')!;
const MMR_QUOTE = 'A payment can be matched at most once, even when two matching runs race';
const ROLE_QUOTE = medvax.highlights[0].split(',')[0];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sent = { url: string; body: any };

function script(replies: Array<() => Response>) {
  const sent: Sent[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      sent.push({ url: String(url), body: init.body ? JSON.parse(String(init.body)) : null });
      const next = replies.shift();
      if (!next) throw new Error(`unexpected call to ${url}`);
      return next();
    })
  );
  return sent;
}

const sse = (payloads: unknown[]) =>
  new Response(payloads.map((p) => `data: ${JSON.stringify(p)}\n\n`).join(''), { headers: { 'Content-Type': 'text/event-stream' } });
const geminiCall = (name: string, args: Record<string, unknown>) =>
  sse([{ candidates: [{ content: { parts: [{ functionCall: { name, args } }] } }] }]);
const geminiText = (text: string) => sse([{ candidates: [{ content: { parts: [{ text }] } }] }]);

const lastOf = <T,>(list: T[]): T => list[list.length - 1];

async function events(response: Response): Promise<AiEvent[]> {
  const out: AiEvent[] = [];
  await readEvents(response.body!, (event) => out.push(event));
  return out;
}

let ip = 0;
const post = (path: string, body: unknown) =>
  new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `10.1.0.${++ip}` },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  __resetForTests();
  vi.stubEnv('ANTHROPIC_API_KEY', '');
  vi.stubEnv('GROQ_API_KEY', '');
  vi.stubEnv('GEMINI_API_KEY', 'k');
  vi.stubEnv('GEMINI_MODEL', 'primary');
  vi.stubEnv('GEMINI_FALLBACK_MODEL', 'primary');
  vi.stubEnv('AI_SEARCH_EMBED', 'off');
  vi.stubEnv('AI_MOCK', '');
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  vi.stubEnv('KV_REST_API_URL', '');
  vi.stubEnv('KV_REST_API_TOKEN', '');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('history to Claude messages', () => {
  it('groups every tool result of a round into one user message', () => {
    const history: Msg[] = [
      { role: 'user', content: 'q' },
      { role: 'assistant', content: '', toolCalls: [{ id: 'gem-0-0', name: 'get_project', args: { id: 'a' } }, { id: 'c.2', name: 'run_sql', args: {} }] },
      { role: 'tool', content: 'r1', toolName: 'get_project', toolCallId: 'gem-0-0' },
      { role: 'tool', content: 'r2', toolName: 'run_sql', toolCallId: 'c.2' },
    ];
    const out = toClaudeMessages(history);
    expect(out.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    expect(out[1].content).toEqual([
      { type: 'tool_use', id: 'gem-0-0', name: 'get_project', input: { id: 'a' } },
      // Ids from another provider are made safe for Claude.
      { type: 'tool_use', id: 'c_2', name: 'run_sql', input: {} },
    ]);
    expect(out[2].content).toEqual([
      { type: 'tool_result', tool_use_id: 'gem-0-0', content: 'r1' },
      { type: 'tool_result', tool_use_id: 'c_2', content: 'r2' },
    ]);
  });

  it("replays Claude's own blocks unchanged, and only Claude's", () => {
    const blocks = [{ type: 'thinking', thinking: 't', signature: 's' }, { type: 'tool_use', id: 'toolu_1', name: 'x', input: {} }];
    const out = toClaudeMessages([
      { role: 'user', content: 'q' },
      { role: 'assistant', content: '', toolCalls: [{ id: 'toolu_1', name: 'x', args: {} }], raw: { provider: 'claude', content: blocks } },
      { role: 'tool', content: 'r', toolName: 'x', toolCallId: 'toolu_1' },
    ]);
    expect(out[1].content).toBe(blocks);
    const foreign = toClaudeMessages([
      { role: 'user', content: 'q' },
      { role: 'assistant', content: 'hi', raw: { provider: 'other', content: [{ type: 'mystery' }] } },
    ]);
    expect(foreign[1].content).toBe('hi');
  });

  it('merges two questions in a row into one turn', () => {
    const out = toClaudeMessages([
      { role: 'user', content: 'a' },
      { role: 'user', content: 'b' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].content).toEqual([
      { type: 'text', text: 'a' },
      { type: 'text', text: 'b' },
    ]);
  });
});

describe('name audit', () => {
  it('passes names in the evidence, flags the rest, and folds spellings', () => {
    const audit = auditNames('Built with Postgres, Kafka and Next.js on AWS.', ['stack: PostgreSQL, Next.js, Redpanda']);
    expect(audit.verified).toEqual(expect.arrayContaining(['PostgreSQL', 'Next.js']));
    expect(audit.unverified).toEqual(expect.arrayContaining(['Apache Kafka', 'AWS']));
  });

  it('does not read a name inside another word or an ordinary word as a name', () => {
    expect(auditNames('He will go to Google next.', []).unverified).toEqual(['Google']);
    expect(auditNames('JavaScript and trust', ['JavaScript']).unverified).toEqual([]);
    expect(auditNames('the render step and an express route', []).unverified).toEqual([]);
  });

  it('does not flag a name the answer only denies, but flags it once claimed', () => {
    expect(auditNames('The site does not mention Rust. He has no Rust work.', []).unverified).toEqual([]);
    expect(auditNames("Rust isn't on the site. But he shipped Rust in 2021.", []).unverified).toEqual(['Rust']);
    expect(auditNames('He has not only Kafka but more.', []).unverified).toEqual(['Apache Kafka']);
  });

  it('counts one long name once ("Google Cloud" is not also "Google")', () => {
    expect(auditNames('Deployed on Google Cloud.', []).unverified).toEqual(['GCP']);
  });
});

describe('quotes and actions', () => {
  it('accepts a quote copied from the data, whitespace and case aside, and nothing else', () => {
    expect(quoteIsVerbatim('project', 'mmr-engine', MMR_QUOTE.toUpperCase().replace(/ /g, '  '))).toBe(true);
    expect(quoteIsVerbatim('project', 'mmr-engine', 'A payment is matched by an AI model')).toBe(false);
    expect(quoteIsVerbatim('project', 'vega-canva', MMR_QUOTE)).toBe(false);
    expect(quoteIsVerbatim('role', 'medvax', ROLE_QUOTE)).toBe(true);
  });

  it('checks every kind of action against the data', () => {
    expect(validateAction({ kind: 'go-to', label: 'Contact', section: 'contact' })).toEqual({
      action: { kind: 'go-to', label: 'Contact', section: 'contact' },
    });
    expect(validateAction({ kind: 'go-to', label: 'x', section: 'pricing' })).toHaveProperty('error');
    expect(validateAction({ kind: 'open-role', label: 'MedVax', id: 'medvax' })).toHaveProperty('action');
    expect(validateAction({ kind: 'open-role', label: 'x', id: 'google' })).toHaveProperty('error');
    expect(validateAction({ kind: 'show-work', label: 'x', stack: ['COBOL'] })).toHaveProperty('error');
    expect(validateAction({ kind: 'show-work', label: 'x', tier: 'legendary' })).toHaveProperty('error');
    expect(validateAction({ kind: 'show-work', label: 'x' })).toHaveProperty('error');
    const open = validateAction({ kind: 'open-case', label: 'See it', id: 'mmr-engine', section: 'field-notes', quote: MMR_QUOTE });
    expect(open).toEqual({ action: { kind: 'open-case', label: 'See it', id: 'mmr-engine', section: 'field-notes', quote: MMR_QUOTE } });
    // A section the project does not have is dropped, the jump kept.
    const evanty = validateAction({ kind: 'open-case', label: 'x', id: 'evanty', section: 'field-notes' });
    expect(evanty).toEqual({ action: { kind: 'open-case', label: 'x', id: 'evanty' } });
  });
});

describe('role fit validation', () => {
  it('keeps verbatim evidence, rejects the rest, and downgrades a claim left with none', () => {
    const result = validateFit({
      role: 'Data Engineer',
      summary: 'Good match — mostly.',
      requirements: [
        {
          requirement: 'Idempotent pipelines',
          verdict: 'strong',
          note: 'Shown.',
          evidence: [
            { kind: 'project', id: 'mmr-engine', section: 'outcome', quote: MMR_QUOTE },
            { kind: 'project', id: 'mmr-engine', quote: 'Processed a billion events a day' },
          ],
        },
        { requirement: 'Spark at scale', verdict: 'strong', note: 'Yes.', evidence: [{ kind: 'project', id: 'mmr-engine', quote: 'Spark cluster with 400 nodes' }] },
        { requirement: 'Kubernetes', verdict: 'not-shown', note: 'Not shown.', evidence: [] },
      ],
    });
    expect(result?.rejectedEvidence).toBe(2);
    expect(result?.requirements[0]).toMatchObject({ verdict: 'strong', evidence: [{ id: 'mmr-engine', section: 'outcome' }] });
    expect(result?.requirements[1].verdict).toBe('not-shown');
    expect(result?.summary).not.toContain('—');
  });

  it('caps the list at ten and refuses an empty result', () => {
    const many = Array.from({ length: 14 }, (_, i) => ({ requirement: `r${i}`, verdict: 'not-shown', note: '', evidence: [] }));
    expect(validateFit({ summary: 's', requirements: many })?.requirements).toHaveLength(10);
    expect(validateFit({ summary: 's', requirements: [] })).toBeNull();
    expect(validateFit('nonsense')).toBeNull();
  });
});

describe('brief validation', () => {
  it('keeps only real projects as relevant work, and tidies the rest', () => {
    const result = validateBrief({
      title: 'Reconciliation',
      goal: 'Match payments.',
      currentState: 'Spreadsheets.',
      outcomes: ['fewer errors', 3, ''],
      constraints: [],
      relevantWork: [
        { id: 'mmr-engine', why: 'It matches payments.' },
        { id: 'mmr-engine', why: 'again' },
        { id: 'stripe-clone', why: 'invented' },
      ],
      openQuestions: ['Volume?'],
    });
    expect(result?.relevantWork).toEqual([{ id: 'mmr-engine', why: 'It matches payments.' }]);
    expect(result?.outcomes).toEqual(['fewer errors']);
    expect(validateBrief({ title: '', goal: 'x' })).toBeNull();
  });
});

describe('command suggestions', () => {
  const reference = ['ls [path] [--stack=<name>]   list projects', 'cat <id>   print a project', '  open <id>', 'The filesystem has /projects and /roles.', 'use ls to look around'].join('\n');

  it('reads command names from the reference, not prose', () => {
    expect([...commandNames(reference)].sort()).toEqual(['cat', 'ls', 'open']);
  });

  it('accepts a line that starts with a real command, one line only', () => {
    const names = commandNames(reference);
    expect(validateCommand({ command: 'ls /projects --stack=Redpanda', why: 'Lists them — all.' }, names)).toEqual({
      command: 'ls /projects --stack=Redpanda',
      why: 'Lists them, all.',
    });
    expect(validateCommand({ command: 'rm -rf /', why: 'x' }, names)).toBeNull();
    expect(validateCommand({ command: '', why: 'x' }, names)).toBeNull();
    expect(validateCommand({ command: 'cat a\nrm b', why: 'x' }, names)?.command).toBe('cat a rm b');
  });

  it('answers from the mock in development', async () => {
    vi.stubEnv('AI_MOCK', '1');
    vi.stubEnv('VERCEL_ENV', 'development');
    const response = await command(post('/api/command', { text: 'show me kafka things', cwd: '/' }));
    expect(await response.json()).toEqual({ command: 'ls /projects --stack=Redpanda', why: 'Lists the projects built with Redpanda.' });
  });

  it('refuses text that is too long', async () => {
    const response = await command(post('/api/command', { text: 'x'.repeat(301), cwd: '/' }));
    expect(response.status).toBe(400);
  });
});

describe('search', () => {
  it('widens a query with synonyms: "failure" finds retries and idempotency', () => {
    const hits = searchSite('how does he handle failure', 6);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => /retr|idempot|dead|rollback|fallback/i.test(h.passage.text))).toBe(true);
  });

  it('matches word starts only: "rust" does not find "trust"', () => {
    expect(searchSite('rust').every((h) => /(^|[^a-z0-9])rust/i.test(h.passage.text))).toBe(true);
  });

  it('falls back to keyword ranking when there are no vectors or no query vector', () => {
    const lexical = searchSite('offline editing', 10);
    expect(blend('offline editing', lexical, null, null, 4)).toEqual(lexical.slice(0, 4));
  });

  it('blends meaning in when vectors exist, and can find a passage no word matches', () => {
    const dims = 4;
    const vectors = PASSAGES.map(() => new Float32Array(dims));
    const target = PASSAGES.findIndex((p) => p.id === 'mmr-engine' && p.where === 'problem');
    vectors.forEach((v, i) => (v[i === target ? 0 : 1] = 1));
    const query = Float32Array.from([1, 0, 0, 0]);
    const hits = blend('zzzz', [], vectors, query, 3);
    expect(hits[0].passage).toBe(PASSAGES[target]);
  });
});

describe('content gaps', () => {
  it('strips emails, phone numbers and links from a question', () => {
    expect(sanitiseQuestion('email me at jane.doe@example.com or +234 803 123 4567, see https://x.io/a')).toBe(
      'email me at [email] or [number], see [link]'
    );
    expect(sanitiseQuestion('what did he do in 2019-2023?')).toBe('what did he do in 2019-2023?');
  });

  it('stores nothing without Redis', async () => {
    const sent = script([]);
    await recordGap('does he know rust?', 'no-hits');
    expect(sent).toHaveLength(0);
  });

  it('stores the question, reason, count and time, and nothing about the visitor', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.test');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 't');
    const sent = script([() => new Response(JSON.stringify([{ result: 1 }, { result: 1 }, { result: 1 }, { result: 1 }, { result: 1 }]))]);
    await recordGap('Does he know Rust? mail me: a@b.co', 'no-hits');
    const commands = sent[0].body as (string | number)[][];
    const hset = commands.find((c) => c[0] === 'HSET')!;
    expect(hset).toContain('Does he know Rust? mail me: [email]');
    expect(hset).toContain('no-hits');
    expect(JSON.stringify(commands)).not.toMatch(/10\.1\.0|a@b\.co/);
    expect(commands.find((c) => c[0] === 'EXPIRE')![2]).toBe(90 * 24 * 60 * 60);
  });
});

describe('/api/insights', () => {
  const get = (token?: string) =>
    insights(new Request('http://localhost/api/insights', { headers: token ? { Authorization: `Bearer ${token}` } : {} }));

  it('is closed without the token, with a wrong one, and when none is configured', async () => {
    vi.stubEnv('INSIGHTS_TOKEN', '');
    expect((await get('')).status).toBe(401);
    expect((await get('anything-at-all-long-enough')).status).toBe(401);
    vi.stubEnv('INSIGHTS_TOKEN', 'a-very-long-secret-token');
    expect((await get()).status).toBe(401);
    expect((await get('a-very-long-secret-tokeN')).status).toBe(401);
  });

  it('lists the gaps, most asked first, for the right token', async () => {
    vi.stubEnv('INSIGHTS_TOKEN', 'a-very-long-secret-token');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.test');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 't');
    script([
      () => new Response(JSON.stringify([{ result: ['ai:gap:a', 'ai:gap:b'] }, { result: 2 }])),
      () =>
        new Response(
          JSON.stringify([
            { result: ['question', 'rust?', 'reason', 'no-hits', 'count', '2', 'lastAt', '2026-10-01T00:00:00Z'] },
            { result: ['question', 'salary?', 'reason', 'not-covered', 'count', '5', 'lastAt', '2026-10-02T00:00:00Z'] },
          ])
        ),
    ]);
    const body = await (await get('a-very-long-secret-token')).json();
    expect(body.total).toBe(2);
    expect(body.items.map((i: { question: string }) => i.question)).toEqual(['salary?', 'rust?']);
  });

  it('compares secrets without stopping at the first difference', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('/api/fit', () => {
  it('streams status, then a fit whose evidence has been checked', async () => {
    script([
      () => geminiCall('search_site', { query: 'idempotent' }),
      () =>
        geminiCall('submit_fit', {
          summary: 'Strong on pipelines.',
          requirements: [
            {
              requirement: 'Idempotent pipelines',
              verdict: 'strong',
              note: 'Shown in MMR Engine.',
              evidence: [
                { kind: 'project', id: 'mmr-engine', quote: MMR_QUOTE },
                { kind: 'project', id: 'mmr-engine', quote: 'Runs on a 40-node Spark cluster' },
              ],
            },
          ],
        }),
    ]);
    const out = await events(await fit(post('/api/fit', { jd: 'We need a data engineer who builds idempotent pipelines and payment systems.' })));
    expect(out.filter((e) => e.type === 'status').map((e) => (e.type === 'status' ? e.text : ''))).toEqual([
      'Reading the job description',
      'Searching the write-ups for ‘idempotent’',
      'Checking every quote against the site',
    ]);
    const result = lastOf(out);
    expect(result?.type).toBe('fit');
    expect(result?.type === 'fit' && result.result.rejectedEvidence).toBe(1);
    expect(result?.type === 'fit' && result.result.requirements[0].evidence).toHaveLength(1);
  });

  it('asks for the submit tool on its final round', async () => {
    const sent = script([
      ...Array.from({ length: 5 }, () => () => geminiCall('get_project', { id: 'mmr-engine' })),
      () => geminiCall('submit_fit', { summary: 's', requirements: [{ requirement: 'r', verdict: 'not-shown', note: '', evidence: [] }] }),
    ]);
    const out = await events(await fit(post('/api/fit', { jd: 'A job description that is long enough to be compared with the site.' })));
    expect(lastOf(out)?.type).toBe('fit');
    expect(sent[5].body.toolConfig).toEqual({ functionCallingConfig: { mode: 'ANY', allowedFunctionNames: ['submit_fit'] } });
  });

  it('refuses a description too short to compare', async () => {
    expect((await fit(post('/api/fit', { jd: 'hi' }))).status).toBe(400);
  });
});

describe('/api/brief', () => {
  it('streams a clarifying question, then done', async () => {
    script([() => geminiText('What does the system you have today look like?')]);
    const out = await events(await brief(post('/api/brief', { messages: [{ role: 'user', content: 'I need payment reconciliation.' }] })));
    expect(out.filter((e) => e.type === 'delta').length).toBeGreaterThan(0);
    expect(lastOf(out)?.type).toBe('done');
  });

  it('must write the brief once three questions have been asked', async () => {
    const sent = script([
      () =>
        geminiCall('submit_brief', {
          title: 'Reconciliation',
          goal: 'Match payments automatically.',
          currentState: 'Manual.',
          outcomes: ['Fewer manual matches'],
          constraints: [],
          relevantWork: [{ id: 'mmr-engine', why: 'Matches payments.' }, { id: 'made-up', why: 'no' }],
          openQuestions: [],
        }),
    ]);
    const messages = [
      { role: 'user', content: 'I need reconciliation.' },
      { role: 'assistant', content: 'What exists today?' },
      { role: 'user', content: 'Spreadsheets.' },
      { role: 'assistant', content: 'How many a day?' },
      { role: 'user', content: 'A few thousand.' },
      { role: 'assistant', content: 'Any deadline?' },
      { role: 'user', content: 'Q1.' },
    ];
    const out = await events(await brief(post('/api/brief', { messages })));
    expect(sent[0].body.systemInstruction.parts[0].text).toContain('You have asked 3 of 3');
    const done = out.find((e) => e.type === 'brief');
    expect(done?.type === 'brief' && done.brief.relevantWork).toEqual([{ id: 'mmr-engine', why: 'Matches payments.' }]);
  });
});
