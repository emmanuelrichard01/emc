import { json } from './_lib/chain.js';
import { constantTimeEqual, listGaps } from './_lib/insights.js';

export const config = { runtime: 'edge' };

/* ==========================================================================
   INSIGHTS: the questions the site could not answer, for its owner.

   GET with `Authorization: Bearer <INSIGHTS_TOKEN>` →
     { items: [{ question, reason, count, lastAt }], total }
   most-asked first. Anything else is a 401, including when INSIGHTS_TOKEN
   is not set: an unset token never means "open". The token is compared in
   constant time. What is stored, and what is not, is in _lib/insights.ts.
   ========================================================================== */

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'GET only' }, 405);

  const token = process.env.INSIGHTS_TOKEN ?? '';
  const header = request.headers.get('authorization') ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  // Both checks always run, so a missing token costs the same as a wrong one.
  const valid = constantTimeEqual(presented, token) && token.length >= 16;
  if (!valid) return json({ error: 'unauthorized' }, 401);

  return json(await listGaps());
}
