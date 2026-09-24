import type { ToolCall } from '../../src/lib/aiTools';

/* ==========================================================================
   PROVIDERS — streaming clients for Gemini and Groq.

   Each takes the provider-neutral history the loop keeps, translates it into
   that provider's wire format, and streams text back through `onText` as it
   arrives. Tool calls are collected, never executed, here. Nothing in this
   file knows what the prompt says or what the tools do; ask.ts passes both
   in, so a provider cannot drift out of step with the other.
   ========================================================================== */

/**
 * The history the loop builds. Tool calls and results only ever enter it
 * server-side, from tools the endpoint actually ran.
 */
export type Msg =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: ToolCall[] }
  | { role: 'tool'; content: string; toolName: string; toolCallId: string };

export interface RoundResult {
  calls: ToolCall[];
  text: string;
}

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface RoundRequest {
  messages: Msg[];
  system: string;
  tools: ToolSpec[];
  /** Final round: tools are withheld so the model has to answer. */
  finalize: boolean;
  onText: (chunk: string) => void;
  signal: AbortSignal;
  round: number;
}

/** A provider's non-2xx answer, with the status kept for retry and health decisions. */
export class ProviderHttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/* Answer length, and the larger ceiling for models whose hidden thinking is
   billed against the same cap (see the two clients below). */
const MAX_OUTPUT_TOKENS = 600;
const THINKING_OUTPUT_TOKENS = 1_500;

/** The `data:` payloads of a server-sent-events body, one at a time. */
async function* sseData(response: Response): AsyncGenerator<string> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).replace(/\r$/, '');
      buffer = buffer.slice(newline + 1);
      if (line.startsWith('data:')) yield line.slice(5).trimStart();
    }
  }
  if (buffer.startsWith('data:')) yield buffer.slice(5).trimStart();
}

/* ── Gemini ──────────────────────────────────────────────────────────────
   Gemini 3.x thinks before it answers, and those thought tokens are billed
   against maxOutputTokens — so the 600-token answer cap could be spent on
   thinking and truncate the reply. A versioned 3.x id gets a larger ceiling
   and `thinkingLevel: low` (verified against the live API: the field lives
   under `thinkingConfig`; the flat form is a 400). A portfolio lookup needs a
   tool call, not a proof. Only ids that say they are 3.x get it: a `-latest`
   alias could resolve to a model that rejects the field, and a 400 there
   would cost the provider rather than a little speed. */

export async function streamGemini(key: string, model: string, req: RoundRequest): Promise<RoundResult> {
  const thinks = /^gemini-3/.test(model);

  const contents = req.messages.map((m) => {
    if (m.role === 'tool') {
      return { role: 'user', parts: [{ functionResponse: { name: m.toolName, response: { result: m.content } } }] };
    }
    if (m.role === 'assistant' && m.toolCalls?.length) {
      return {
        role: 'model',
        parts: m.toolCalls.map((call) => ({
          functionCall: { name: call.name, args: call.args },
          // Gemini 3 returns an opaque reasoning signature with a function
          // call and wants it back on the follow-up; without it the model
          // tends to re-issue the same call. Provider state, carried untouched.
          ...(call.thoughtSignature ? { thoughtSignature: call.thoughtSignature } : {}),
        })),
      };
    }
    return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] };
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
    {
      method: 'POST',
      // Header auth rather than ?key= — the query-string form logs the key
      // into any intermediary that records URLs.
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents,
        tools: [{ functionDeclarations: req.tools }],
        ...(req.finalize ? { toolConfig: { functionCallingConfig: { mode: 'NONE' } } } : {}),
        generationConfig: {
          temperature: 0.3,
          ...(thinks
            ? { maxOutputTokens: THINKING_OUTPUT_TOKENS, thinkingConfig: { thinkingLevel: 'low' } }
            : { maxOutputTokens: MAX_OUTPUT_TOKENS }),
        },
      }),
      signal: req.signal,
    }
  );

  if (!response.ok) {
    throw new ProviderHttpError(`gemini ${model} ${response.status}: ${(await response.text()).slice(0, 200)}`, response.status);
  }

  const calls: ToolCall[] = [];
  let text = '';

  for await (const data of sseData(response)) {
    const chunk = JSON.parse(data);
    if (chunk?.error) throw new Error(`gemini stream: ${chunk.error.message ?? 'error'}`);

    const parts: Array<{
      text?: string;
      thought?: boolean;
      thoughtSignature?: string;
      functionCall?: { id?: string; name: string; args?: Record<string, unknown> };
    }> = chunk?.candidates?.[0]?.content?.parts ?? [];

    for (const part of parts) {
      if (part.functionCall) {
        calls.push({
          id: part.functionCall.id ?? `gem-${req.round}-${calls.length}`,
          name: part.functionCall.name,
          args: part.functionCall.args ?? {},
          ...(part.thoughtSignature ? { thoughtSignature: part.thoughtSignature } : {}),
        });
      } else if (part.text && !part.thought) {
        // Empty text parts ride alongside function calls and signatures;
        // forwarding them would announce an answer that is not coming.
        text += part.text;
        req.onText(part.text);
      }
    }
  }

  return { calls, text: text.trim() };
}

/* ── Groq (OpenAI-compatible) ────────────────────────────────────────────
   Default model is openai/gpt-oss-120b. llama-3.3-70b-versatile, the previous
   default, reached end of life on 2026-08-16 and Groq names gpt-oss-120b as
   its replacement.

   gpt-oss is a reasoning model, which changes three things:
     · Its hidden reasoning is billed as completion tokens, so a 500-token cap
       that was generous for Llama can be spent entirely on thinking and
       return an empty answer. It gets the larger ceiling.
     · `reasoning_effort: low` — a portfolio lookup needs a tool call, not a
       proof. Higher effort only adds latency before the first token.
     · `include_reasoning: false` keeps the chain of thought out of the
       stream, where it would otherwise be shown to the visitor as the answer.
   Those parameters are sent only to gpt-oss; another GROQ_MODEL gets the
   plain OpenAI-compatible request. */

export async function streamGroq(key: string, model: string, req: RoundRequest): Promise<RoundResult> {
  const reasoning = model.startsWith('openai/gpt-oss');

  const body = {
    model,
    stream: true,
    ...(reasoning
      ? { reasoning_effort: 'low', include_reasoning: false, max_completion_tokens: THINKING_OUTPUT_TOKENS }
      : { temperature: 0.3, max_completion_tokens: MAX_OUTPUT_TOKENS }),
    messages: [
      { role: 'system', content: req.system },
      ...req.messages.map((m) => {
        if (m.role === 'tool') return { role: 'tool' as const, content: m.content, tool_call_id: m.toolCallId };
        if (m.role === 'assistant' && m.toolCalls?.length) {
          return {
            role: 'assistant' as const,
            content: null,
            tool_calls: m.toolCalls.map((call) => ({
              id: call.id,
              type: 'function' as const,
              function: { name: call.name, arguments: JSON.stringify(call.args) },
            })),
          };
        }
        return { role: m.role, content: m.content };
      }),
    ],
    tools: req.tools.map((t) => ({ type: 'function', function: t })),
    tool_choice: req.finalize ? 'none' : 'auto',
  };

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal: req.signal,
  });

  if (!response.ok) {
    throw new ProviderHttpError(`groq ${model} ${response.status}: ${(await response.text()).slice(0, 200)}`, response.status);
  }

  // Streamed tool calls arrive in fragments keyed by index: the id and name
  // once, the JSON arguments a few characters at a time.
  const pending = new Map<number, { id: string; name: string; args: string }>();
  let text = '';

  for await (const data of sseData(response)) {
    if (data === '[DONE]') break;
    const chunk = JSON.parse(data);
    if (chunk?.error) throw new Error(`groq stream: ${chunk.error.message ?? 'error'}`);

    const delta = chunk?.choices?.[0]?.delta ?? {};
    if (typeof delta.content === 'string' && delta.content) {
      text += delta.content;
      req.onText(delta.content);
    }
    for (const fragment of delta.tool_calls ?? []) {
      const entry = pending.get(fragment.index) ?? { id: '', name: '', args: '' };
      if (fragment.id) entry.id = fragment.id;
      if (fragment.function?.name) entry.name = fragment.function.name;
      if (fragment.function?.arguments) entry.args += fragment.function.arguments;
      pending.set(fragment.index, entry);
    }
  }

  const calls: ToolCall[] = [...pending.values()].map((entry, i) => {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(entry.args || '{}');
    } catch {
      // A malformed argument blob is the model's error, not the visitor's;
      // an empty object lets the tool report a usage error it can recover from.
    }
    return { id: entry.id || `groq-${req.round}-${i}`, name: entry.name, args };
  });

  return { calls, text: text.trim() };
}
