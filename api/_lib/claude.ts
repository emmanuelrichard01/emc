import Anthropic from '@anthropic-ai/sdk';

import type { ToolCall } from '../../src/lib/aiTools.js';
import { ProviderHttpError, type Msg, type RoundRequest, type RoundResult } from './providers.js';

/* ==========================================================================
   CLAUDE: the primary model, through the official SDK.

   Same contract as the Gemini and Groq clients beside it (providers.ts):
   take the provider-neutral history, stream text through `onText`, collect
   tool calls without running them. What is particular to Claude:

     · Prompt caching. The tools and the first system block (the rules and
       the site index) are identical for every visitor, so they sit before a
       cache breakpoint and are read from cache at a fraction of the price.
       The page and lens come after it, in a second block with its own
       breakpoint, so a visitor asking twice on the same page reuses that too.
       Nothing in the cached prefix changes between requests: no timestamps,
       no per-visitor text, and the index is serialised in a fixed order.
     · Thinking stays on (the model decides how much; `effort` steers it) and
       each assistant turn is handed back exactly as it came, thinking blocks
       included, through Msg.raw. Within one question the system prompt and
       tools are byte-identical on every round, so the replayed thinking is
       still valid; on the final round the "answer now" instruction is a
       system message appended at the end, not an edit to the prefix. The
       drop_block binding is the safety net if that ever stops holding.
     · Tool inputs stream eagerly and are still checked here: anything that
       is not a JSON object becomes {}, and the tool reports a usage error.
     · Server-side fallbacks: if the model refuses on safety grounds, the API
       itself retries on a fallback model (`fallbacks: "default"`). Rate
       limits and overloads do not fall back there; they come back as errors
       and the provider chain in ask.ts moves on to Gemini, then Groq.
   ========================================================================== */

type MessageParam = Anthropic.Beta.BetaMessageParam;
type ContentBlockParam = Anthropic.Beta.BetaContentBlockParam;
type ToolResultBlockParam = Anthropic.Beta.BetaToolResultBlockParam;

export const DEFAULT_CLAUDE_MODEL = 'claude-opus-5-5';

export const CLAUDE_BETAS: Anthropic.Beta.AnthropicBeta[] = ['server-side-fallback-2026-07-01', 'thinking-binding-controls-2026-08-01'];

/* Tool-use ids from another provider ("gem-0-1", "call_abc") reach Claude
   when it takes over mid-question; its ids must match [A-Za-z0-9_-]+. */
const safeId = (id: string) => id.replace(/[^A-Za-z0-9_-]/g, '_') || 'call';

function asBlocks(content: MessageParam['content']): ContentBlockParam[] {
  return typeof content === 'string' ? [{ type: 'text', text: content }] : content;
}

/**
 * The neutral history as Claude messages. Every tool result of a round goes
 * back in ONE user message (one block per call, in order), which is what
 * Claude expects after an assistant turn that made several calls. An
 * assistant turn Claude produced is replayed from its raw blocks.
 */
export function toClaudeMessages(messages: readonly Msg[]): MessageParam[] {
  const out: MessageParam[] = [];
  let results: ToolResultBlockParam[] = [];

  const push = (message: MessageParam) => {
    const last = out[out.length - 1];
    // Two turns from the same side in a row are merged rather than sent as
    // a pair (a client history can contain two questions back to back).
    if (last && last.role === message.role && message.role !== 'system') {
      last.content = [...asBlocks(last.content), ...asBlocks(message.content)];
      return;
    }
    out.push(message);
  };
  const flush = () => {
    if (!results.length) return;
    push({ role: 'user', content: results });
    results = [];
  };

  for (const m of messages) {
    if (m.role === 'tool') {
      results.push({ type: 'tool_result', tool_use_id: safeId(m.toolCallId), content: m.content || '(empty)' });
      continue;
    }
    flush();
    if (m.role === 'user') {
      push({ role: 'user', content: m.content });
      continue;
    }
    if (m.raw?.provider === 'claude' && Array.isArray(m.raw.content)) {
      push({ role: 'assistant', content: m.raw.content as ContentBlockParam[] });
      continue;
    }
    const blocks: ContentBlockParam[] = [];
    if (m.content.trim()) blocks.push({ type: 'text', text: m.content });
    for (const call of m.toolCalls ?? []) {
      blocks.push({ type: 'tool_use', id: safeId(call.id), name: call.name, input: call.args });
    }
    if (blocks.length) push({ role: 'assistant', content: blocks.length === 1 && !m.toolCalls?.length ? m.content : blocks });
  }
  flush();
  return out;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/* An overload reported inside the stream arrives without an HTTP status.
   An account out of credit answers 400, the same as a malformed request;
   it is reported as 402 so the chain rests Claude instead of asking it
   first on every question. */
function statusOf(error: InstanceType<typeof Anthropic.APIError>): number {
  if (error.status === 529) return 503;
  if (error.status === 400 && /credit balance/i.test(error.message)) return 402;
  if (typeof error.status === 'number') return error.status;
  const type = (error.error as { error?: { type?: string } } | undefined)?.error?.type;
  if (type === 'overloaded_error') return 503;
  if (type === 'rate_limit_error') return 429;
  if (type === 'api_error') return 500;
  return 0;
}

export async function streamClaude(key: string, model: string, req: RoundRequest): Promise<RoundResult> {
  const client = new Anthropic({
    apiKey: key,
    // The chain retries and falls back; a hidden SDK retry would double the
    // wait before Gemini is tried and spend budget the counter cannot see.
    maxRetries: 0,
    // Looked up at call time, so a test (or a runtime) that swaps the global
    // fetch is honoured.
    fetch: (input, init) => globalThis.fetch(input, init),
  });

  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: 'text', text: req.system.stable, cache_control: { type: 'ephemeral' } },
  ];
  if (req.system.variable.trim()) {
    system.push({ type: 'text', text: req.system.variable, cache_control: { type: 'ephemeral' } });
  }

  const messages = toClaudeMessages(req.messages);
  if (req.finalize && req.finalNote) messages.push({ role: 'system', content: req.finalNote });

  const tools: Anthropic.Beta.BetaTool[] = req.tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters as Anthropic.Beta.BetaTool.InputSchema,
    eager_input_streaming: true,
  }));

  let text = '';
  try {
    const stream = client.beta.messages.stream(
      {
        model,
        max_tokens: req.maxTokens ?? 4_000,
        system,
        messages,
        tools,
        // Forcing a tool is not available with thinking on, so the final
        // round of a structured task (onlyTool) asks for it in the appended
        // system message and leaves the choice on auto.
        tool_choice: req.finalize && !req.onlyTool ? { type: 'none' } : { type: 'auto' },
        thinking: { type: 'adaptive', block_binding: { prefix_mismatch_behavior: 'drop_block' } },
        output_config: { effort: req.effort ?? 'low' },
        fallbacks: 'default',
        betas: CLAUDE_BETAS,
      },
      { signal: req.signal }
    );
    stream.on('text', (delta) => {
      text += delta;
      req.onText(delta);
    });
    const message = await stream.finalMessage();

    if (process.env.NODE_ENV === 'development') {
      const u = message.usage;
      console.info(
        `claude ${model} round ${req.round}: input ${u.input_tokens}, cache read ${u.cache_read_input_tokens ?? 0}, cache write ${u.cache_creation_input_tokens ?? 0}, output ${u.output_tokens}`
      );
    }

    if (message.stop_reason === 'refusal') return { calls: [], text: '', refused: true };

    // A call cut off by the token ceiling has half its arguments; running
    // it would be guessing. The text, if any, is kept.
    const calls: ToolCall[] =
      message.stop_reason === 'max_tokens'
        ? []
        : message.content.flatMap((block) =>
            block.type === 'tool_use' ? [{ id: block.id, name: block.name, args: isRecord(block.input) ? block.input : {} }] : []
          );

    return { calls, text: text.trim(), raw: { provider: 'claude', content: message.content } };
  } catch (error) {
    if (error instanceof Anthropic.APIUserAbortError) throw new Error(`claude ${model}: aborted or timed out`);
    // Connection errors first: they are APIErrors too, with no status.
    if (error instanceof Anthropic.APIConnectionError) throw new Error(`claude ${model}: ${error.message}`);
    if (error instanceof Anthropic.APIError) {
      throw new ProviderHttpError(`claude ${model} ${error.status ?? 'stream'}: ${error.message.slice(0, 200)}`, statusOf(error));
    }
    throw error;
  }
}
