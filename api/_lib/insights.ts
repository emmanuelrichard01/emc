import { normaliseQuestion } from './answerCache.js';
import { digest, pipeline, storeConfigured } from './store.js';

/* ==========================================================================
   CONTENT GAPS: the questions the site could not answer.

   When the assistant has nothing to say (the site does not cover it, a
   search found nothing, or no model could answer), the question is worth
   knowing about: it is the next paragraph the portfolio is missing.

   What is kept, and only that: the question text, cleaned of anything that
   identifies a person (emails, phone numbers, links), why it went
   unanswered, how many times it was asked and when last. No IP address, no
   visitor id, no conversation. Entries expire after 90 days. With no Redis
   configured nothing is kept at all; there is no in-memory fallback, because
   a gap list that forgets on every cold start is noise. AI_GAP_LOG=off turns
   it off with Redis configured.

   Read back with GET /api/insights and the INSIGHTS_TOKEN (api/insights.ts).
   ========================================================================== */

export type GapReason = 'not-covered' | 'no-hits' | 'degraded';

export interface GapItem {
  question: string;
  reason: GapReason;
  count: number;
  lastAt: string;
}

const TTL_SECONDS = 90 * 24 * 60 * 60;
const INDEX_KEY = 'ai:gaps';
const MAX_QUESTION_CHARS = 200;

/** The question with anything personal taken out. Empty when nothing is left worth keeping. */
export function sanitiseQuestion(question: string): string {
  return question
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email]')
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[link]')
    .replace(/\b[a-z0-9-]+\.(?:com|net|org|io|dev|ai|co|ng|uk|app)\b\S*/gi, '[link]')
    // Nine or more digits, however they are punctuated, is a phone number or
    // an account number, not a year or a version.
    .replace(/\+?\d[\d\s().-]{7,}\d/g, (m) => (m.replace(/\D/g, '').length >= 9 ? '[number]' : m))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_QUESTION_CHARS);
}

export function gapLogEnabled(): boolean {
  return storeConfigured() && process.env.AI_GAP_LOG !== 'off';
}

export async function recordGap(question: string, reason: GapReason): Promise<void> {
  if (!gapLogEnabled()) return;
  const clean = sanitiseQuestion(question);
  if (clean.replace(/\[(?:email|link|number)\]/g, '').trim().length < 3) return;
  const key = `ai:gap:${await digest(normaliseQuestion(clean))}`;
  await pipeline([
    ['HSET', key, 'question', clean, 'reason', reason, 'lastAt', new Date().toISOString()],
    ['HINCRBY', key, 'count', 1],
    ['EXPIRE', key, TTL_SECONDS],
    ['ZINCRBY', INDEX_KEY, 1, key],
    ['EXPIRE', INDEX_KEY, TTL_SECONDS],
  ]);
}

/** The most-asked gaps first. Expired entries are pruned from the index as they are found. */
export async function listGaps(limit = 100): Promise<{ items: GapItem[]; total: number; stored?: false }> {
  if (!storeConfigured()) return { items: [], total: 0, stored: false };
  const index = await pipeline([
    ['ZREVRANGE', INDEX_KEY, 0, limit - 1],
    ['ZCARD', INDEX_KEY],
  ]);
  const keys = Array.isArray(index?.[0]) ? (index[0] as string[]) : [];
  if (!keys.length) return { items: [], total: 0 };

  const hashes = (await pipeline(keys.map((key) => ['HGETALL', key]))) ?? [];
  const items: GapItem[] = [];
  const expired: string[] = [];
  keys.forEach((key, i) => {
    const flat = hashes[i];
    // Upstash returns HGETALL as a flat [field, value, …] list.
    const fields: Record<string, string> = {};
    if (Array.isArray(flat)) for (let j = 0; j + 1 < flat.length; j += 2) fields[String(flat[j])] = String(flat[j + 1]);
    else if (flat && typeof flat === 'object') Object.assign(fields, flat);
    if (!fields.question) {
      expired.push(key);
      return;
    }
    items.push({
      question: fields.question,
      reason: (['not-covered', 'no-hits', 'degraded'].includes(fields.reason) ? fields.reason : 'not-covered') as GapReason,
      count: Number(fields.count) || 1,
      lastAt: fields.lastAt ?? '',
    });
  });
  if (expired.length) await pipeline([['ZREM', INDEX_KEY, ...expired]]);

  items.sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt));
  return { items, total: Math.max(0, Number(index?.[1] ?? items.length) - expired.length) };
}

/** Compares two secrets in time that does not depend on where they differ. */
export function constantTimeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let i = 0; i < length; i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}
