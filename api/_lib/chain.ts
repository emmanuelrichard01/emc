import { DEFAULT_CLAUDE_MODEL, streamClaude } from './claude.js';
import { ProviderHttpError, streamGemini, streamGroq, type RoundRequest, type RoundResult } from './providers.js';
import { spendCall } from './limits.js';
import { byHealth, markStruggling } from './health.js';

/* ==========================================================================
   CHAIN: which models answer, in what order, and what happens when one fails.

   Shared by every endpoint that asks a model (ask, fit, brief, command), so
   they agree on the order, the retry, the budget and the health tracking.

   Order: Claude when its key is set, then two Gemini models, then Groq. A
   model that just failed goes to the back of the line for a minute
   (health.ts). One quick retry on a 503 ("high demand" is the provider's own
   word for a spike), never on a 429 (a quota does not refill in a second),
   and never once text has reached the visitor.
   ========================================================================== */

export interface Provider {
  /** Stable per model, for health tracking: "claude:claude-opus-5-5". */
  id: string;
  /** Shown to the visitor as who answered. */
  label: string;
  run: (req: RoundRequest) => Promise<RoundResult>;
}

export function hasAnyKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY);
}

export function buildProviders(): Provider[] {
  const providers: Provider[] = [];
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (claudeKey) {
    const model = process.env.CLAUDE_MODEL || DEFAULT_CLAUDE_MODEL;
    providers.push({ id: `claude:${model}`, label: 'claude', run: (req) => streamClaude(claudeKey, model, req) });
  }
  if (geminiKey) {
    /* Two Gemini models, because the failure seen in practice is per model,
       not per provider: the `-latest` aliases answered 503 "high demand"
       for minutes at a time while a pinned model on the same key answered
       at once. Set GEMINI_FALLBACK_MODEL equal to GEMINI_MODEL to disable. */
    const models = [
      process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
      process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash',
    ];
    for (const model of new Set(models)) {
      providers.push({ id: `gemini:${model}`, label: 'gemini', run: (req) => streamGemini(geminiKey, model, req) });
    }
  }
  if (groqKey) {
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    providers.push({ id: `groq:${model}`, label: 'groq', run: (req) => streamGroq(groqKey, model, req) });
  }
  return providers;
}

/** Why no model answered, in terms a visitor can act on. */
export type Outage = 'quota' | 'busy' | 'down';

export class NoProviderError extends Error {
  constructor(readonly outage: Outage) {
    super('no provider answered');
  }
}

export class BudgetError extends Error {}

export const BUDGET_MESSAGE = "Today's question budget is used up. Try again tomorrow.";

const RETRY_DELAY_MS = 700;

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Aborts on the visitor leaving *or* the provider running out of time, whichever is first. */
export function providerSignal(visitor: AbortSignal, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  const any = (AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any;
  return any ? any([visitor, timeout]) : timeout;
}

/* Failures that will not clear in the next second: the model is overloaded,
   out of quota or credit, refusing the key, broken, or not answering. A 400
   is our request's fault and says nothing about the model's health. */
function isStruggling(error: unknown): boolean {
  if (error instanceof ProviderHttpError) return [401, 402, 403, 429, 500, 502, 503, 504].includes(error.status);
  return true; // timeouts and network failures
}

export type RoundBase = Omit<RoundRequest, 'onText' | 'signal'>;

export interface RoundOptions {
  /** Called with each chunk of streamed text. Omit to keep text off the wire (a structured task). */
  onText?: (chunk: string) => void;
  /** Called when streamed text must be taken back (the provider died mid-answer). */
  onReset?: () => void;
  visitor: AbortSignal;
  timeoutMs: number;
  /** For the log line. */
  label: string;
}

/** One round against the provider chain. */
export async function runRound(
  providers: Provider[],
  base: RoundBase,
  options: RoundOptions
): Promise<RoundResult & { provider: string; streamed: boolean }> {
  const failures: string[] = [];
  const statuses: number[] = [];

  for (const provider of byHealth(providers)) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!(await spendCall())) throw new BudgetError(BUDGET_MESSAGE);

      let streamed = false;
      try {
        const result = await provider.run({
          ...base,
          onText: (chunk) => {
            streamed = true;
            options.onText?.(chunk);
          },
          signal: providerSignal(options.visitor, options.timeoutMs),
        });
        if (result.calls.length || result.text || result.refused) return { ...result, provider: provider.label, streamed };
        failures.push(`${provider.id}: empty response`);
      } catch (error) {
        if (options.visitor.aborted) throw error;
        failures.push(error instanceof Error ? error.message : String(error));
        statuses.push(error instanceof ProviderHttpError ? error.status : 0);
        if (attempt === 0 && !streamed && error instanceof ProviderHttpError && error.status === 503) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        if (isStruggling(error)) markStruggling(provider.id);
      }
      // A provider that died halfway through an answer leaves half an answer
      // on the visitor's screen. Take it back before the next one starts.
      if (streamed) options.onReset?.();
      break;
    }
  }

  // Provider error bodies stay in the function log; the visitor gets a
  // sentence, not an upstream stack of JSON.
  console.error(`${options.label}: no provider answered:`, failures.join(' | '));
  const outage: Outage =
    statuses.length && statuses.every((s) => s === 429)
      ? 'quota'
      : // A timeout beside a 503 is the same overload, seen from the other side.
        statuses.some((s) => s === 429 || s === 503) && statuses.every((s) => s === 0 || s === 429 || s === 503)
        ? 'busy'
        : 'down';
  throw new NoProviderError(outage);
}

/* ── Wire helpers ───────────────────────────────────────────────────────── */

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/** Reads a JSON body held to `maxBytes`, declared or not. A Response when it is refused. */
export async function readJson<T>(request: Request, maxBytes: number): Promise<T | Response> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > maxBytes) return json({ type: 'error', error: 'Request too large.' }, 413);
  try {
    const raw = await request.text();
    if (raw.length > maxBytes) return json({ type: 'error', error: 'Request too large.' }, 413);
    return JSON.parse(raw) as T;
  } catch {
    return json({ type: 'error', error: 'Invalid JSON.' }, 400);
  }
}

export type Emit = (event: Record<string, unknown>) => void;

/** An NDJSON response whose body is written by `work`, one event per line. */
export function ndjson(work: (emit: Emit) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit: Emit = (event) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // The visitor has gone; the abort stops the work.
        }
      };
      try {
        await work(emit);
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed by a disconnect.
        }
      }
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      // Without this some proxies buffer the whole body, which turns a
      // stream back into a wait.
      'X-Accel-Buffering': 'no',
    },
  });
}

/** True when the dev mock should answer instead of a model (never in production). */
export function mockEnabled(): boolean {
  return process.env.AI_MOCK === '1' && process.env.VERCEL_ENV !== 'production';
}

/** Em-dashes out of anything a visitor will read, whatever the model wrote. */
export function plainDashes(text: string): string {
  return text.replace(/\s*—\s*/g, ', ').replace(/\s*–\s*(?=\D)/g, ', ');
}
