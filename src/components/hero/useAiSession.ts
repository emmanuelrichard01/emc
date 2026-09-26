import { useCallback, useEffect, useRef, useState } from 'react';

import { dropUnanswered, trimHistory, type WireMessage } from '@/lib/aiHistory';
import type { AiSource } from '@/lib/aiSources';
import type { Audience } from '@/lib/aiStarters';
import { readEvents, type AiEvent } from '@/lib/aiStream';
import type { ToolResult } from '@/lib/aiTools';

/* ==========================================================================
   AI SESSION

   One question, one request, one stream.

     ask → /api/ask ⇢ step · step · delta delta delta · done

   The endpoint runs the tool loop itself and streams what it is doing, so
   this hook no longer executes tools or shuttles results back and forth; it
   renders progress as it arrives. The first visible thing after asking is
   the SQL the answer is being built from, and the answer starts appearing
   the moment the model starts writing it, rather than after every round has
   finished.
   ========================================================================== */

const ENDPOINT = '/api/ask';

/* Messages of history kept, i.e. five exchanges. Kept under the endpoint's
   MAX_MESSAGES with room for the new question — aiHistory.test.ts asserts it. */
export const MAX_HISTORY = 10;

export interface AiTurn {
  id: number;
  role: 'user' | 'assistant' | 'system';
  text: string;
  /** Tool results behind this answer, shown as provenance. Grows live while streaming. */
  evidence?: ToolResult[];
  /** Pages the answer relies on, linked beneath it. */
  sources?: AiSource[];
  provider?: string;
  /** Figures in the answer the grounding check could not find in the site's data. */
  unverified?: string[];
  /** Replayed from the per-deploy answer cache rather than generated for this visitor. */
  cached?: boolean;
  /** No model could answer; this is the site's own search, standing in. */
  degraded?: boolean;
  /** True for locally produced text (errors, keyless fallback). */
  local?: boolean;
  /** Still being written. */
  streaming?: boolean;
  /** Cut short by the visitor. */
  stopped?: boolean;
  /**
   * Set on a failure that asking again could plausibly clear — a timeout, a
   * 502, a provider having a bad minute. Deliberately *not* set on a refusal
   * we issued ourselves: a question that is 600 characters long is still 600
   * characters long the second time.
   */
  retryable?: boolean;
}

/** What /api/ask replies with when it refuses before streaming. */
interface JsonReply {
  type?: 'error' | 'unconfigured';
  error?: string;
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

export interface AiSessionOptions {
  /** The case study being read, so "this project" means something to the model. */
  projectId?: string;
  /** Who the answer is pitched for. `general` sends nothing. */
  audience?: Audience;
  /**
   * sessionStorage key to keep the conversation under, so a reload or a
   * navigation that remounts the owner does not wipe what was asked. Omit
   * for a throwaway session.
   */
  persistKey?: string;
}

/* Kept, not everything: a long session's evidence tables add up, and a
   quota error on write must never be what breaks the assistant. */
const PERSIST_TURNS = 24;

interface Persisted {
  turns: AiTurn[];
  history: WireMessage[];
}

function loadPersisted(key: string | undefined): Persisted | null {
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as Persisted;
    if (!Array.isArray(data.turns) || !Array.isArray(data.history)) return null;
    // Anything that was mid-stream when the page went away did not finish,
    // and cannot resume: say so rather than showing a caret that never moves.
    const turns = data.turns.map((turn) => (turn.streaming ? { ...turn, streaming: false, stopped: true } : turn));
    return { turns, history: data.history };
  } catch {
    return null;
  }
}

export function useAiSession(options: AiSessionOptions = {}): AiSession {
  const { projectId, audience, persistKey } = options;
  // Read once, on the first render; the refs below are seeded from it.
  const [restored] = useState(() => loadPersisted(persistKey));
  const [turns, setTurns] = useState<AiTurn[]>(() => restored?.turns ?? []);
  const [busy, setBusy] = useState(false);
  const [unconfigured, setUnconfigured] = useState(false);

  const idRef = useRef(restored?.turns.reduce((max, turn) => Math.max(max, turn.id), 0) ?? 0);
  const historyRef = useRef<WireMessage[]>(restored?.history ?? []);
  const abortRef = useRef<AbortController | null>(null);
  /** The last thing a human asked, kept so a failure can be re-thrown at it. */
  const lastQuestionRef = useRef<string | null>(null);

  /* Written when the conversation settles, not per streamed token — a
     JSON.stringify of every evidence table sixty times a second is the
     sort of cost that makes typing feel heavy. */
  useEffect(() => {
    if (!persistKey || busy) return;
    try {
      if (!turns.length) sessionStorage.removeItem(persistKey);
      else
        sessionStorage.setItem(
          persistKey,
          JSON.stringify({ turns: turns.slice(-PERSIST_TURNS), history: historyRef.current } satisfies Persisted)
        );
    } catch {
      /* storage full or unavailable — the session still works, it just won't survive a reload */
    }
  }, [busy, persistKey, turns]);

  const push = useCallback((turn: Omit<AiTurn, 'id'>): number => {
    const id = ++idRef.current;
    setTurns((prev) => [...prev, { ...turn, id }]);
    return id;
  }, []);

  const patch = useCallback((id: number, update: (turn: AiTurn) => AiTurn) => {
    setTurns((prev) => prev.map((turn) => (turn.id === id ? update(turn) : turn)));
  }, []);

  /** Ends whatever turn is still streaming, keeping what it said so far. */
  const settleStreaming = useCallback((stopped: boolean) => {
    setTurns((prev) =>
      prev
        .map((turn) => (turn.streaming ? { ...turn, streaming: false, stopped } : turn))
        // A turn that was stopped before it said anything and found nothing
        // is noise; the question above it already shows it was asked.
        .filter((turn) => !(turn.stopped && !turn.text && !turn.evidence?.length))
    );
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
    settleStreaming(true);
    setBusy(false);
  }, [settleStreaming]);

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || busy) return;

      push({ role: 'user', text: trimmed });
      lastQuestionRef.current = trimmed;
      historyRef.current = [
        ...trimHistory(dropUnanswered(historyRef.current), MAX_HISTORY),
        { role: 'user', content: trimmed },
      ];
      setBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const fail = (text: string, retryable: boolean) => {
        settleStreaming(false);
        push({ role: 'system', text, local: true, retryable });
      };

      try {
        const response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: historyRef.current, ...requestContext(projectId, audience) }),
          signal: controller.signal,
        });

        const type = response.headers.get('content-type') ?? '';

        /* Refusals arrive as JSON before any work starts; answers stream. A
           body that is neither is a transport failure — under `vite dev`
           without the API middleware the SPA fallback answers 404 with HTML
           — and the status is the diagnosis, so it is reported. */
        if (!type.includes('ndjson') || !response.body) {
          const raw = await response.text();
          let data: JsonReply | null = null;
          try {
            data = JSON.parse(raw);
          } catch {
            /* not JSON — handled below */
          }

          if (data?.type === 'unconfigured') {
            setUnconfigured(true);
            /* Loaded only on this path. The extractive answerer brings the
               SQL engine and the whole dataset with it, and this hook lives
               in the app shell now — a static import put both on every
               visitor's critical path for a mode production never runs in. */
            const { extractiveAnswer } = await import('@/lib/aiTools');
            push({ role: 'assistant', text: extractiveAnswer(trimmed), local: true });
            return;
          }

          fail(
            data?.error ??
              (response.status === 404
                ? 'no /api/ask endpoint — the answering function is not running. locally, restart `npm run dev`.'
                : `endpoint returned ${response.status}${raw.trim() ? `: ${raw.slice(0, 120)}` : ''}`),
            /* 429 excluded on purpose: a rate limit is the endpoint saying
               "not yet", and a retry button beside it invites making it worse. */
            response.status !== 429 && response.status !== 400
          );
          return;
        }

        const answerId = push({ role: 'assistant', text: '', streaming: true });
        let answer = '';
        let finished = false;

        await readEvents(response.body, (event: AiEvent) => {
          switch (event.type) {
            case 'step':
              patch(answerId, (turn) => ({ ...turn, evidence: [...(turn.evidence ?? []), event.result] }));
              break;
            case 'delta':
              answer += event.text;
              patch(answerId, (turn) => ({ ...turn, text: answer }));
              break;
            case 'reset':
              answer = '';
              patch(answerId, (turn) => ({ ...turn, text: '' }));
              break;
            case 'done':
              finished = true;
              historyRef.current = [...historyRef.current, { role: 'assistant', content: answer.trim() }];
              patch(answerId, (turn) => ({
                ...turn,
                text: answer.trim(),
                streaming: false,
                provider: event.provider,
                sources: event.sources?.length ? event.sources : undefined,
                unverified: event.unverified?.length ? event.unverified : undefined,
                cached: event.cached || undefined,
                degraded: event.degraded || undefined,
                // A stand-in answer is worth asking again for once a model is back.
                retryable: event.degraded || undefined,
              }));
              break;
            case 'error':
              finished = true;
              // The half-built turn goes; the failure takes its place.
              setTurns((prev) => prev.filter((turn) => turn.id !== answerId || turn.text));
              fail(event.error, event.retryable ?? true);
              break;
          }
        });

        if (!finished && !controller.signal.aborted) {
          fail('the answer was cut off before it finished.', true);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        fail(
          `could not reach the answering endpoint: ${error instanceof Error ? error.message : String(error)}`,
          true
        );
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setBusy(false);
      }
    },
    [audience, busy, patch, projectId, push, settleStreaming]
  );

  /* Ask the same thing again. `send` drops the unanswered question from the
     history first, so the retry is the original request, not a follow-up to
     a broken one. */
  const retry = useCallback(() => {
    const question = lastQuestionRef.current;
    if (!question || busy) return;
    void send(question);
  }, [busy, send]);

  /* Offered only on the newest turn. Retrying a failure from four questions
     ago would re-ask it after the conversation that followed. */
  const lastTurn = turns[turns.length - 1];
  const canRetry = !busy && Boolean(lastTurn?.retryable) && lastQuestionRef.current !== null;

  return { turns, busy, unconfigured, send, reject, reset, cancel, retry, canRetry };
}

/** The optional `context` field: omitted entirely when there is nothing to say. */
function requestContext(projectId: string | undefined, audience: Audience | undefined) {
  const context: { projectId?: string; audience?: Audience } = {};
  if (projectId) context.projectId = projectId;
  if (audience && audience !== 'general') context.audience = audience;
  return Object.keys(context).length ? { context } : {};
}
