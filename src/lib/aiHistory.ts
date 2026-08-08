import type { ToolCall } from './aiTools';

/* ==========================================================================
   AI HISTORY

   Conversation state sent to /api/ask, and the rule for keeping it bounded.

   The endpoint rejects anything over MAX_MESSAGES (16) with "conversation too
   long — run `ai` again to reset". A single question costs between two and
   six messages once tool rounds are counted — the question, an assistant turn
   per tool call, a result per call, then the answer — so an ordinary session
   hit that wall on the third or fourth question and simply stopped working
   until the user knew to reset it. Silently dropping the oldest exchanges is
   what a chat session should do; erroring out is not.
   ========================================================================== */

/**
 * Longest question the endpoint will accept.
 *
 * Mirrors MAX_QUESTION_CHARS in api/ask.ts, which cannot be imported here —
 * it is an Edge Function outside the app's tsconfig, and pulling this module
 * into it would drag the client tool layer along. aiHistory.test.ts reads the
 * server file and asserts the two agree, so the copy cannot drift unnoticed.
 */
export const MAX_QUESTION_CHARS = 500;

export interface WireMessage {
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

/**
 * Drops whole exchanges from the front until the history fits.
 *
 * Trimming has to respect exchange boundaries. An assistant turn carrying
 * tool calls and the tool results answering it are a unit: slice between them
 * and the next request contains either results nothing asked for or a call
 * nothing answered, which both providers reject outright. So the cut is only
 * ever made immediately before a user turn.
 *
 * If even the newest exchange is over budget it is kept whole and returned
 * oversized — the server's own cap is the backstop, and sending a coherent
 * request that might be refused beats sending an incoherent one that
 * certainly will be.
 */
export function trimHistory(messages: WireMessage[], max: number): WireMessage[] {
  if (messages.length <= max) return messages;

  const starts: number[] = [];
  messages.forEach((message, i) => {
    if (message.role === 'user') starts.push(i);
  });
  if (!starts.length) return messages.slice(-max);

  for (const start of starts) {
    const kept = messages.slice(start);
    if (kept.length <= max) return kept;
  }

  return messages.slice(starts[starts.length - 1]);
}
