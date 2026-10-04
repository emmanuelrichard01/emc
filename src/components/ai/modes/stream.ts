import { readEvents } from '@/lib/aiStream';
import type { StreamEvent } from '@/lib/aiProtocol';

/* ==========================================================================
   MODE STREAMS

   POSTs to one of the answering endpoints (/api/fit, /api/brief) and feeds
   each NDJSON event to `onEvent`. Same rule as the Ask session: refusals
   that happen before any work (bad input, rate limit, budget, no key) are
   plain JSON, so the content type tells them apart from a stream.

   Resolves with null on success, or with what went wrong in words a visitor
   can act on, and whether trying again could help.
   ========================================================================== */

export interface StreamFailure {
  error: string;
  retryable: boolean;
}

export async function postStream(
  url: string,
  body: unknown,
  onEvent: (event: StreamEvent) => void,
  signal: AbortSignal
): Promise<StreamFailure | null> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal.aborted) return null;
    return { error: 'Could not reach the assistant. Check your connection and try again.', retryable: true };
  }

  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('ndjson') || !response.body) {
    const raw = await response.text().catch(() => '');
    let message: string | undefined;
    try {
      const data = JSON.parse(raw) as { error?: string; type?: string };
      message = data.type === 'unconfigured' ? 'The assistant is not set up on this copy of the site.' : data.error;
    } catch {
      /* not JSON */
    }
    if (response.status === 404) message ??= 'This feature is not running here yet. If this is a local copy, restart the dev server.';
    return {
      error: message ? capitalise(message) : `Something went wrong (status ${response.status}). Please try again.`,
      // A rate limit or a bad request will say the same thing again.
      retryable: response.status !== 429 && response.status !== 400 && response.status !== 413,
    };
  }

  let failure: StreamFailure | null = null;
  try {
    await readEvents(response.body, (event) => {
      if (event.type === 'error') failure = { error: capitalise(event.error), retryable: event.retryable ?? true };
      else onEvent(event);
    });
  } catch {
    if (signal.aborted) return null;
    failure = { error: 'The connection dropped before the answer finished. Please try again.', retryable: true };
  }
  return failure;
}

function capitalise(text: string): string {
  const t = text.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}
