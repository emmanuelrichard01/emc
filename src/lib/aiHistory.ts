/* ==========================================================================
   AI HISTORY

   Conversation state sent to /api/ask, and the rule for keeping it bounded.

   Only what was said travels: the visitor's questions and the answers they
   got. Tool calls and their results live and die inside the endpoint, which
   runs the loop itself — a client that could send a `tool` message could
   write the site's data for it. See the header of api/ask.ts.

   The endpoint rejects anything over MAX_MESSAGES with "conversation too
   long". Silently dropping the oldest exchanges is what a chat session
   should do; erroring out is not.
   ========================================================================== */

/**
 * Longest question the endpoint will accept.
 *
 * Mirrors MAX_QUESTION_CHARS in api/ask.ts. aiHistory.test.ts reads the
 * server file and asserts the two agree, so the copy cannot drift unnoticed.
 */
export const MAX_QUESTION_CHARS = 500;

export interface WireMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Drops whole exchanges from the front until the history fits.
 *
 * The cut is only ever made immediately before a user turn, so the model
 * never reads an answer to a question it cannot see. If even the newest
 * exchange is over budget it is kept whole — the server's cap is the backstop.
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

/**
 * Removes a trailing question that never got an answer.
 *
 * A cancelled or failed question leaves a user turn with nothing after it.
 * Asking again on top of that sends two questions in a row, the first of
 * which the model will try to answer too.
 */
export function dropUnanswered(messages: WireMessage[]): WireMessage[] {
  return messages.length && messages[messages.length - 1].role === 'user' ? messages.slice(0, -1) : messages;
}
