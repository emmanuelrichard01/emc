/* ==========================================================================
   HEALTH — which models to try first.

   Measured in this session, not imagined: the `-latest` Gemini aliases
   answered 503 "high demand" for minutes at a time, and every question during
   that window paid for the same failure — a round trip, a retry, a 700ms
   wait — before reaching a model that could answer. The chain was correct
   and slow.

   So a model that just failed for a reason that will not clear in seconds
   (overloaded, rate limited, timed out, unreachable) is moved to the back of
   the line for a cool-down. It is still tried, last, so a brief blip costs
   nothing permanent and a recovered model is used again as soon as its
   cool-down lapses. Per instance, which is the right scope: an instance that
   saw the failure is the one that should route around it.
   ========================================================================== */

const COOL_DOWN_MS = 60_000;
const coolingUntil = new Map<string, number>();

export function markStruggling(id: string, now = Date.now()) {
  coolingUntil.set(id, now + COOL_DOWN_MS);
}

export function isCooling(id: string, now = Date.now()): boolean {
  return (coolingUntil.get(id) ?? 0) > now;
}

/** Healthy first, in their configured order; cooling ones after, in theirs. */
export function byHealth<T extends { id: string }>(items: T[], now = Date.now()): T[] {
  return [...items.filter((i) => !isCooling(i.id, now)), ...items.filter((i) => isCooling(i.id, now))];
}

export function resetHealth() {
  coolingUntil.clear();
}
