import VECTORS from '../_vectors.js';
import { PASSAGES, passageSnippet, searchSite, searchTerms, type SearchHit } from '../../src/lib/aiTools.js';
import { passagesDigest, type Passage } from '../../src/lib/aiPassages.js';

/* ==========================================================================
   HYBRID SEARCH: keyword ranking, with meaning blended in when it can be.

   The build embeds every passage (scripts/build-ai-context.mjs →
   api/_vectors.ts, int8 with a scale per vector). At question time the
   query is embedded with the same model and each passage scored by cosine
   similarity, then blended with the keyword score. "How does he handle
   things going wrong?" then finds the retry and dead-letter passages even
   when no word matches.

   Every step is optional and fails silently to keyword search: no vectors
   (built without a key), vectors that no longer match the passages (data
   edited since), no key at runtime, an embedding call slower than 1.5s or
   failing. Keyword search is the floor, never the fallback of last resort.
   ========================================================================== */

const EMBED_TIMEOUT_MS = 1_500;
const MAX_CACHED_QUERIES = 200;

/** Weight of the keyword score against meaning, both scaled 0..1. */
const LEXICAL_WEIGHT = 0.6;
/* A passage found by meaning alone must be close to the best match and
   similar in absolute terms, or every question would return something. */
const SEMANTIC_ONLY_MARGIN = 0.06;
const SEMANTIC_FLOOR = 0.5;

export interface StoredVectors {
  model: string;
  dims: number;
  count: number;
  digest: string;
  scales: number[];
  /** base64 of count × dims signed bytes. */
  data: string;
}

let decoded: Float32Array[] | null | undefined;

/** The stored vectors, decoded once, or null when there are none that fit these passages. */
export function passageVectors(stored: StoredVectors | null = VECTORS as StoredVectors | null): Float32Array[] | null {
  if (stored === (VECTORS as StoredVectors | null) && decoded !== undefined) return decoded;
  let result: Float32Array[] | null = null;
  if (stored && stored.count === PASSAGES.length && stored.digest === passagesDigest(PASSAGES)) {
    const binary = atob(stored.data);
    const bytes = new Int8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = (binary.charCodeAt(i) << 24) >> 24;
    result = [];
    for (let v = 0; v < stored.count; v++) {
      const vector = new Float32Array(stored.dims);
      let norm = 0;
      for (let d = 0; d < stored.dims; d++) {
        vector[d] = bytes[v * stored.dims + d] * stored.scales[v];
        norm += vector[d] * vector[d];
      }
      norm = Math.sqrt(norm) || 1;
      for (let d = 0; d < stored.dims; d++) vector[d] /= norm;
      result.push(vector);
    }
  }
  if (stored === (VECTORS as StoredVectors | null)) decoded = result;
  return result;
}

const queryCache = new Map<string, Float32Array>();

/** Embeds a search query with the model the passages were embedded with. Null on any failure. */
export async function embedQuery(query: string): Promise<Float32Array | null> {
  const stored = VECTORS as StoredVectors | null;
  const key = process.env.GEMINI_API_KEY;
  if (!stored || !key || process.env.AI_SEARCH_EMBED === 'off') return null;

  const normalised = query.toLowerCase().replace(/\s+/g, ' ').trim();
  const cached = queryCache.get(normalised);
  if (cached) return cached;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${stored.model}:embedContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': key },
      body: JSON.stringify({
        content: { parts: [{ text: `task: search result | query: ${normalised}` }] },
        output_dimensionality: stored.dims,
      }),
      signal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { embedding?: { values?: number[] }; embeddings?: { values?: number[] }[] };
    const values = body.embedding?.values ?? body.embeddings?.[0]?.values;
    if (!Array.isArray(values) || values.length !== stored.dims) return null;
    const vector = Float32Array.from(values);
    const norm = Math.hypot(...vector) || 1;
    for (let d = 0; d < vector.length; d++) vector[d] /= norm;
    if (queryCache.size >= MAX_CACHED_QUERIES) queryCache.delete(queryCache.keys().next().value!);
    queryCache.set(normalised, vector);
    return vector;
  } catch {
    return null;
  }
}

const dot = (a: Float32Array, b: Float32Array) => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
};

/**
 * Blends keyword hits with semantic similarity. Pure: given no vectors or no
 * query vector it returns the keyword ranking unchanged.
 */
export function blend(
  query: string,
  lexical: SearchHit[],
  vectors: Float32Array[] | null,
  queryVector: Float32Array | null,
  limit = 6
): SearchHit[] {
  if (!vectors || !queryVector || vectors.length !== PASSAGES.length) return lexical.slice(0, limit);

  const position = new Map<Passage, number>(PASSAGES.map((p, i) => [p, i]));
  const similarity = vectors.map((v) => dot(v, queryVector));
  const best = Math.max(...similarity);
  const floor = Math.min(best - 0.2, SEMANTIC_FLOOR);
  const semantic = (s: number) => Math.max(0, Math.min(1, (s - floor) / Math.max(1e-6, best - floor)));
  const lexMax = Math.max(1e-6, ...lexical.map((h) => h.score));

  const scored = new Map<number, { score: number; hit?: SearchHit }>();
  for (const hit of lexical) {
    const i = position.get(hit.passage);
    if (i === undefined) continue;
    scored.set(i, { score: LEXICAL_WEIGHT * (hit.score / lexMax) + (1 - LEXICAL_WEIGHT) * semantic(similarity[i]), hit });
  }
  similarity.forEach((s, i) => {
    if (scored.has(i) || s < SEMANTIC_FLOOR || s < best - SEMANTIC_ONLY_MARGIN) return;
    scored.set(i, { score: (1 - LEXICAL_WEIGHT) * semantic(s) });
  });

  const words = searchTerms(query).map((w) => w.term);
  return [...scored.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit)
    .map(([i, { score, hit }]) => hit ? { ...hit, score } : { passage: PASSAGES[i], score, snippet: passageSnippet(PASSAGES[i].text, words) });
}

/** search_site as the endpoint runs it: keyword ranking, blended with meaning when available. */
export async function hybridSearch(query: string, limit = 6): Promise<SearchHit[]> {
  const lexical = searchSite(query, 20);
  const vectors = passageVectors();
  if (!vectors) return lexical.slice(0, limit);
  return blend(query, lexical, vectors, await embedQuery(query), limit);
}

export function resetHybridForTests() {
  queryCache.clear();
}
