/* ==========================================================================
   STORE — an optional shared key-value store.

   Edge instances share no memory, so anything kept in a Map — rate limits,
   the daily budget, cached answers — is per instance and therefore
   best-effort. With a Redis REST endpoint configured (Upstash directly, or
   Vercel KV, which is Upstash underneath) the same state is shared by every
   instance. Without one, callers fall back to memory; the site works either
   way, it is only the guarantee that changes.

   Deliberately fail-soft: a store that is slow or down returns null and the
   caller uses its in-memory path. A rate limiter that takes the feature down
   when its own database blips has made the problem it exists to prevent.
   ========================================================================== */

const STORE_TIMEOUT_MS = 1_500;

function credentials(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

export function storeConfigured(): boolean {
  return credentials() !== null;
}

/** Runs Redis commands in one round trip. Null when unconfigured or failing. */
export async function pipeline(commands: (string | number)[][]): Promise<unknown[] | null> {
  const creds = credentials();
  if (!creds) return null;
  try {
    const response = await fetch(`${creds.url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creds.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(STORE_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const results = (await response.json()) as { result?: unknown; error?: string }[];
    if (!Array.isArray(results) || results.some((r) => r.error)) return null;
    return results.map((r) => r.result);
  } catch {
    return null;
  }
}

/**
 * A short, stable, non-reversible key for something that should not be
 * stored as-is — a visitor's IP address, a question's text.
 */
export async function digest(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
