import { useCallback, useRef, useState } from 'react';

import { trimHistory, type WireMessage } from '@/lib/aiHistory';
import { executeToolCall, extractiveAnswer, type ToolCall, type ToolResult } from '@/lib/aiTools';

/* ==========================================================================
   AI SESSION

   The agent loop, client-side.

     ask → endpoint → tool calls → run them here → endpoint → answer

   Bounded at MAX_ROUNDS. A model that keeps requesting tools instead of
   answering is a bug or a loop, and on an endpoint that spends money per
   call the failure mode has to be "gives up and says so", never "keeps
   going". Two rounds is enough for the real pattern here — query, then
   answer — with one spare for a self-correction after a bad query.
   ========================================================================== */

const ENDPOINT = '/api/ask';

/* Rounds of tool use before the answer is forced.
   Four, not three: a smaller model routinely spends one round on a query
   that errors and one correcting it, which left nothing for the answer. The
   last round is sent with `finalize`, which strips the tools server-side so
   the model has to reply with prose. */
const MAX_ROUNDS = 4;

export interface AiTurn {
  id: number;
  role: 'user' | 'assistant' | 'system';
  text: string;
  /** Tool calls resolved while producing this turn, shown as provenance. */
  evidence?: ToolResult[];
  provider?: string;
  /** True for locally produced text (errors, keyless fallback). */
  local?: boolean;
  /**
   * Set on a failure that asking again could plausibly clear — a timeout, a
   * 502, a provider having a bad minute. Deliberately *not* set on a refusal
   * we issued ourselves: a question that is 600 characters long is still 600
   * characters long the second time, and offering to retry it would be
   * offering to fail again.
   */
  retryable?: boolean;
}

/* Kept under the endpoint's own MAX_MESSAGES (16) with room for the rounds
   this question will add, so a long session drops its oldest exchanges
   instead of hitting "conversation too long" and refusing to continue. */
const MAX_HISTORY = 10;

/** What /api/ask replies with, on any of its paths. */
interface WireResponse {
  type?: 'answer' | 'tool_calls' | 'error' | 'unconfigured';
  text?: string;
  error?: string;
  provider?: string;
  calls?: ToolCall[];
}

export interface AiSession {
  turns: AiTurn[];
  busy: boolean;
  /** Set once the endpoint reports no key is configured. */
  unconfigured: boolean;
  send: (question: string) => Promise<void>;
  /** Refuse a question locally, without spending a request to be told why. */
  reject: (reason: string) => void;
  reset: () => void;
  cancel: () => void;
  /** Ask the last question again. No-op when there isn't one, or while busy. */
  retry: () => void;
  /** True when the last thing that happened was a failure worth retrying. */
  canRetry: boolean;
}

export function useAiSession(): AiSession {
  const [turns, setTurns] = useState<AiTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [unconfigured, setUnconfigured] = useState(false);

  const idRef = useRef(0);
  const historyRef = useRef<WireMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  /** The last thing a human asked, kept so a failure can be re-thrown at it. */
  const lastQuestionRef = useRef<string | null>(null);

  const nextId = () => ++idRef.current;

  const push = useCallback((turn: Omit<AiTurn, 'id'>) => {
    setTurns((prev) => [...prev, { ...turn, id: ++idRef.current }]);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    historyRef.current = [];
    lastQuestionRef.current = null;
    setTurns([]);
    setBusy(false);
  }, []);

  const reject = useCallback(
    (reason: string) => {
      push({ role: 'system', text: reason, local: true });
    },
    [push]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
  }, []);

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || busy) return;

      push({ role: 'user', text: trimmed });
      lastQuestionRef.current = trimmed;
      // Trimmed before the new question is appended, so the exchange about to
      // start always has the full round budget available to it.
      historyRef.current = [
        ...trimHistory(historyRef.current, MAX_HISTORY),
        { role: 'user', content: trimmed },
      ];
      setBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        let evidence: ToolResult[] = [];

        for (let round = 0; round < MAX_ROUNDS; round++) {
          const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: historyRef.current,
              // Last round: ask the server to withhold tools so the model
              // must answer rather than requesting more data it cannot use.
              finalize: round === MAX_ROUNDS - 1,
            }),
            signal: controller.signal,
          });

          /* A non-JSON body is a transport failure, not a model failure, and
             collapsing it to "bad response" cost real debugging time: the
             endpoint was 404ing with an empty body under `vite dev` — where
             the Edge Function does not exist — and the message said nothing
             about status, body, or which of the two it was. Report the status
             and a slice of whatever did come back instead. */
          const raw = await response.text();
          let data: WireResponse;
          try {
            data = JSON.parse(raw);
          } catch {
            data = {
              type: 'error',
              error:
                response.status === 404
                  ? 'no /api/ask endpoint — the answering function is not running. locally, `npm run dev` now serves it; check the dev server restarted.'
                  : `endpoint returned ${response.status} with a non-JSON body${
                      raw.trim() ? `: ${raw.slice(0, 120)}` : ' (empty)'
                    }`,
            };
          }

          if (data.type === 'unconfigured') {
            setUnconfigured(true);
            push({ role: 'assistant', text: extractiveAnswer(trimmed), local: true });
            return;
          }

          if (data.type === 'error' || !response.ok) {
            push({
              role: 'system',
              text: data.error ?? `request failed (${response.status})`,
              local: true,
              /* 429 excluded on purpose. A rate limit is the one failure
                 where asking again immediately is exactly the wrong move —
                 it is the endpoint saying "not yet", and a retry button next
                 to it would be inviting the visitor to make it worse. */
              retryable: response.status !== 429,
            });
            return;
          }

          if (data.type === 'tool_calls' && Array.isArray(data.calls) && data.calls.length) {
            const results = (data.calls as ToolCall[]).map(executeToolCall);
            evidence = [...evidence, ...results];

            // The assistant's own turn has to be recorded before its tool
            // results, or the next request reads as results with nothing that
            // asked for them.
            historyRef.current = [
              ...historyRef.current,
              { role: 'assistant', content: '', toolCalls: data.calls as ToolCall[] },
              ...results.map((result) => ({
                role: 'tool' as const,
                content: result.content.slice(0, 3_800),
                toolName: result.name,
                toolCallId: result.callId,
              })),
            ];
            continue;
          }

          if (data.type === 'answer' && typeof data.text === 'string') {
            historyRef.current = [...historyRef.current, { role: 'assistant', content: data.text }];
            push({
              role: 'assistant',
              text: data.text,
              evidence: evidence.length ? evidence : undefined,
              provider: data.provider,
            });
            return;
          }

          push({ role: 'system', text: 'no answer returned.', local: true });
          return;
        }

        push({
          role: 'system',
          text: 'gave up after too many tool calls without an answer. try rephrasing.',
          local: true,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        push({
          role: 'system',
          text: `could not reach the answering endpoint: ${
            error instanceof Error ? error.message : String(error)
          }`,
          local: true,
          retryable: true,
        });
      } finally {
        abortRef.current = null;
        setBusy(false);
      }
    },
    [busy, push]
  );

  /* Ask the same thing again, from a clean slate for that exchange.

     The rollback is the part that matters. A failed round leaves the question
     sitting at the end of `historyRef` with nothing after it — no answer, and
     possibly a half-finished set of tool calls. Sending again on top of that
     would hand the provider the same question twice in a row and whatever
     debris the failure left between them, which is a worse prompt than the
     one that just failed. Trimming back to before the last user message means
     the retry is the original request, not a follow-up to a broken one. */
  const retry = useCallback(() => {
    const question = lastQuestionRef.current;
    if (!question || busy) return;

    const lastUserIndex = historyRef.current.map((m) => m.role).lastIndexOf('user');
    if (lastUserIndex !== -1) historyRef.current = historyRef.current.slice(0, lastUserIndex);

    void send(question);
  }, [busy, send]);

  /* Offered only on the newest turn.

     Scrolling up to a failure from four questions ago and retrying it would
     re-ask it with all the intervening conversation still in history, which
     is not the request the button appears to be offering. */
  const lastTurn = turns[turns.length - 1];
  const canRetry = !busy && Boolean(lastTurn?.retryable) && lastQuestionRef.current !== null;

  return { turns, busy, unconfigured, send, reject, reset, cancel, retry, canRetry };
}
