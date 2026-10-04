import { PROJECTS } from '../../src/data/projects.js';
import { EXPERIENCE } from '../../src/data/experience.js';
import { executeToolCall } from '../../src/lib/aiTools.js';
import type { AiAction, BriefResult, FitResult, StreamEvent } from '../../src/lib/aiProtocol.js';
import type { CommandSuggestion } from '../../src/lib/shell/manual.js';
import { sleep, type Emit } from './chain.js';

/* ==========================================================================
   DEV MOCK: canned answers, for building the interface without a key.

   AI_MOCK=1 (and never on a production deployment) makes ask, fit, brief
   and command answer from here instead of a model. Each response uses
   every event and every piece of markup the real one can, with realistic
   pacing, so the dock, the fit and brief modes and the shell can be built
   and checked offline: status lines, a tool step, streamed text with
   citations, bullets, bold and a block, an action button, and checks with
   one figure and one name the evidence does not contain.

   The ids and quotes are read from the real data, so every citation,
   button and piece of evidence here is one the validators would pass.
   ========================================================================== */

const send = (emit: Emit, event: StreamEvent) => emit(event as unknown as Record<string, unknown>);

async function stream(emit: Emit, text: string) {
  for (const piece of text.match(/[\s\S]{1,14}/g) ?? []) {
    send(emit, { type: 'delta', text: piece });
    await sleep(18);
  }
}

const mmr = PROJECTS.find((p) => p.id === 'mmr-engine') ?? PROJECTS[0];
const second = PROJECTS.find((p) => p.id === 'vega-canva') ?? PROJECTS[1];
const role = EXPERIENCE.find((e) => e.id === 'medvax') ?? EXPERIENCE[0];
const firstSentence = (text: string | undefined) => (text ?? '').split(/(?<=\.)\s/)[0].replace(/\.$/, '');

export async function mockAsk(emit: Emit): Promise<void> {
  send(emit, { type: 'status', text: `Reading ${mmr.title}'s trade-offs` });
  await sleep(250);
  const step = executeToolCall({ id: 'mock-1', name: 'get_tradeoffs', args: { projectId: mmr.id } });
  send(emit, { type: 'step', result: { ...step, content: step.content.slice(0, 600) } });
  send(emit, { type: 'status', text: 'Comparing 2 projects' });
  await sleep(250);

  const metric = mmr.metrics[0];
  const quote = firstSentence(mmr.caseStudy?.highlights?.[0]);
  const action: AiAction = { kind: 'open-case', label: 'Show me where', id: mmr.id, section: 'tradeoffs', ...(quote ? { quote } : {}) };
  send(emit, { type: 'action', action });

  const text = [
    `${mmr.title} is built so that a payment is matched **at most once**, even when the same event arrives twice [^project:${mmr.id}#tradeoffs].`,
    '',
    `- It accepts repeats and makes them harmless, instead of trusting a queue's exactly-once promise [^project:${mmr.id}#tradeoffs].`,
    `- ${metric ? `${metric.value} ${metric.label.toLowerCase()}` : 'Its tests'} back that up [^project:${mmr.id}#outcome].`,
    `- He also reports 99.97% uptime on a Cassandra cluster, which the site never says (this line is here to show the checks).`,
    '',
    `{{compare:${mmr.id},${second.id}}}`,
    '',
    `The same care shows up in his work at ${role.company} [^role:${role.id}].`,
  ].join('\n');
  await stream(emit, text);

  send(emit, {
    type: 'done',
    provider: 'mock',
    sources: [
      { kind: 'project', id: mmr.id, title: mmr.title, href: `/projects/${mmr.id}` },
      { kind: 'role', id: role.id, title: role.company, href: '/#experience' },
    ],
    unverified: ['99.97'],
    checks: { figures: metric ? 1 : 0, names: 4, unverified: ['99.97'], unverifiedNames: ['Cassandra'], droppedRefs: 0 },
    cached: false,
  });
}

export async function mockFit(emit: Emit): Promise<void> {
  for (const text of ['Reading the job description', `Searching the write-ups for ‘idempotency’`, `Reading ${mmr.title}`, 'Checking every quote against the site']) {
    send(emit, { type: 'status', text });
    await sleep(300);
  }
  const strongQuote = firstSentence(mmr.caseStudy?.highlights?.[1]) || firstSentence(mmr.caseStudy?.problem);
  const partialQuote = firstSentence(role.highlights[0]);
  const result: FitResult = {
    role: 'Senior Data Engineer',
    summary: `A strong match on reliable data pipelines and payments work, a partial match on leading a team, and nothing on the site about Spark at scale.`,
    requirements: [
      {
        requirement: 'Build reliable, idempotent data pipelines',
        verdict: 'strong',
        note: `${mmr.title} is designed around events that may arrive twice.`,
        evidence: [{ kind: 'project', id: mmr.id, section: 'outcome', quote: strongQuote }],
      },
      {
        requirement: 'Own backend services end to end',
        verdict: 'partial',
        note: `He built a backend at ${role.company}, but the site does not say how large the team was.`,
        evidence: [{ kind: 'role', id: role.id, quote: partialQuote }],
      },
      {
        requirement: 'Five years of Spark in production',
        verdict: 'not-shown',
        note: 'Nothing on the site shows this directly.',
        evidence: [],
      },
    ],
    rejectedEvidence: 1,
  };
  send(emit, { type: 'fit', result });
}

export async function mockBrief(questionsAsked: number, emit: Emit): Promise<void> {
  if (questionsAsked < 1) {
    send(emit, { type: 'status', text: 'Reading what you need' });
    await sleep(250);
    await stream(emit, 'Thanks, that helps. What does the system you have today look like, and what is the one thing it gets wrong most often?');
    send(emit, { type: 'done', provider: 'mock', sources: [], unverified: [], cached: false });
    return;
  }
  send(emit, { type: 'status', text: 'Writing up the brief' });
  await sleep(300);
  await stream(emit, "Here is the brief. Edit anything that is not quite right before you send it.");
  const brief: BriefResult = {
    title: 'Payment reconciliation for a growing marketplace',
    goal: 'Match every incoming payment to an order automatically, and show finance the few that need a person.',
    currentState: 'Payments from two providers are matched by hand in spreadsheets at the end of each week.',
    outcomes: ['Most payments matched without a person', 'A daily list of exceptions with the reason each one failed'],
    constraints: ['Must keep the current payment providers', 'Customer data stays in Nigeria'],
    timeline: 'A first version in about two months',
    relevantWork: [{ id: mmr.id, why: `${mmr.title} matches payments across providers and keeps every decision explainable.` }],
    openQuestions: ['How many payments a day, at peak?', 'Who reviews the exceptions today?'],
  };
  send(emit, { type: 'brief', brief });
  send(emit, { type: 'done', provider: 'mock', sources: [], unverified: [], cached: false });
}

export function mockCommand(): CommandSuggestion {
  return { command: 'ls /projects --stack=Redpanda', why: 'Lists the projects built with Redpanda.' };
}
