import { useCallback, useRef, useState } from 'react';

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
}

interface WireMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  /* Echoed back structurally, not narrated. Both providers need to see their
     own tool call as an action they took; describing it in prose left the
     model reading its own call as something a user had typed. Gemini's
     thoughtSignature rides along untouched. */
  toolCalls?: ToolCall[];
  toolName?: string;
  toolCallId?: string;
}

export interface AiSession {
  turns: AiTurn[];
  busy: boolean;
  /** Set once the endpoint reports no key is configured. */
  unconfigured: boolean;
  send: (question: string) => Promise<void>;
  reset: () => void;
  cancel: () => void;
}

export function useAiSession(): AiSession {
  const [turns, setTurns] = useState<AiTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [unconfigured, setUnconfigured] = useState(false);

  const idRef = useRef(0);
  const historyRef = useRef<WireMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const nextId = () => ++idRef.current;

  const push = useCallback((turn: Omit<AiTurn, 'id'>) => {
    setTurns((prev) => [...prev, { ...turn, id: ++idRef.current }]);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    historyRef.current = [];
    setTurns([]);
    setBusy(false);
  }, []);

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
      historyRef.current = [...historyRef.current, { role: 'user', content: trimmed }];
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

          const data = await response.json().catch(() => ({ type: 'error', error: 'bad response' }));

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
        });
      } finally {
        abortRef.current = null;
        setBusy(false);
      }
    },
    [busy, push]
  );

  return { turns, busy, unconfigured, send, reset, cancel };
}
