import type { ToolResult } from '../../src/lib/aiTools';
import type { AiSource } from '../../src/lib/aiSources';
import { digest, pipeline } from './store';

/* ==========================================================================
   ANSWER CACHE — the opening question, answered once per deploy.

   Most sessions start with one of six starter questions, so most first
   questions are asked word for word by many visitors. Each one cost up to
   four provider calls and a few seconds to produce an answer that, against
   unchanged data, is the same answer. Cached, it streams back instantly and
   costs nothing — and it is labelled as cached, because a visitor comparing
   two identical answers deserves to know why they are identical.

   What is cached, precisely:
     · only an opening question — a follow-up depends on the conversation
       before it, and the cache key cannot see that;
     · only a clean answer — one whose every figure passed the grounding
       check. An unverified figure is never served twice;
     · keyed on the data version, so a deploy that changes a project changes
       every key. There is no invalidation to forget.
   ========================================================================== */

const TTL_SECONDS = 6 * 60 * 60;
const MAX_MEMORY_ENTRIES = 100;

export interface CachedAnswer {
  steps: ToolResult[];
  text: string;
  provider: string;
  sources: AiSource[];
}

const memory = new Map<string, { expires: number; answer: CachedAnswer }>();

/** Folds trivial differences — case, spacing, a trailing "?" — into one key. */
export function normaliseQuestion(question: string): string {
  return question.toLowerCase().replace(/\s+/g, ' ').replace(/[?!.\s]+$/, '').trim();
}

export async function cacheKey(dataVersion: string, question: string, projectId: string | null): Promise<string> {
  return `ask:answer:${await digest(`${dataVersion}|${projectId ?? ''}|${normaliseQuestion(question)}`)}`;
}

export async function readAnswer(key: string): Promise<CachedAnswer | null> {
  const local = memory.get(key);
  if (local && local.expires > Date.now()) return local.answer;

  const shared = await pipeline([['GET', key]]);
  if (typeof shared?.[0] === 'string') {
    try {
      const answer = JSON.parse(shared[0]) as CachedAnswer;
      memory.set(key, { expires: Date.now() + TTL_SECONDS * 1000, answer });
      return answer;
    } catch {
      /* a corrupt entry is a miss */
    }
  }
  return null;
}

export async function writeAnswer(key: string, answer: CachedAnswer): Promise<void> {
  if (memory.size >= MAX_MEMORY_ENTRIES) memory.delete(memory.keys().next().value!);
  memory.set(key, { expires: Date.now() + TTL_SECONDS * 1000, answer });
  await pipeline([['SET', key, JSON.stringify(answer), 'EX', TTL_SECONDS]]);
}

export function resetAnswerCache() {
  memory.clear();
}
