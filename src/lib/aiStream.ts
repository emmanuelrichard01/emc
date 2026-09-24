import type { ToolResult } from './aiTools';
import type { AiSource } from './aiSources';

/* ==========================================================================
   AI STREAM

   The wire format /api/ask streams, and the reader for it. One JSON object
   per line — see the header of api/ask.ts for what each event means.
   ========================================================================== */

export type AiEvent =
  | { type: 'step'; result: ToolResult }
  | { type: 'delta'; text: string }
  | { type: 'reset' }
  | { type: 'done'; provider?: string; sources?: AiSource[]; unverified?: string[]; cached?: boolean; degraded?: boolean }
  | { type: 'error'; error: string; retryable?: boolean };

/**
 * Calls `onEvent` for every complete line in `body`, in order.
 *
 * A network chunk ends wherever the network likes — mid-line, mid-character
 * — so decoding is streamed and only whole lines are parsed. A line that is
 * not JSON is skipped rather than fatal: one malformed event should cost one
 * event, not the answer around it.
 */
export async function readEvents(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: AiEvent) => void
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const flush = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      onEvent(JSON.parse(trimmed) as AiEvent);
    } catch {
      /* skipped — see above */
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      flush(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
    }
  }
  flush(buffer + decoder.decode());
}
