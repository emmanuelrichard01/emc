/* ==========================================================================
   CASE-STUDY VISITS

   Which case studies this visitor opened in this tab, so the contact form
   can offer "Mention what you read" as chips. Ids only, newest first, no
   repeats, at most six. Kept in sessionStorage: it ends with the tab, never
   leaves the device, and is only sent if the visitor ticks a chip.
   ========================================================================== */

const KEY = 'emc-case-visits';
export const MAX_VISITS = 6;

/** The list after a visit: the id moves to the front, the oldest falls off. */
export function withVisit(list: readonly string[], id: string): string[] {
  return [id, ...list.filter((v) => v !== id)].slice(0, MAX_VISITS);
}

function storage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function readCaseVisits(): string[] {
  try {
    const raw = storage()?.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string').slice(0, MAX_VISITS) : [];
  } catch {
    return [];
  }
}

export function recordCaseVisit(id: string): void {
  if (!id) return;
  try {
    storage()?.setItem(KEY, JSON.stringify(withVisit(readCaseVisits(), id)));
  } catch {
    // Storage unavailable: the chips simply do not appear.
  }
}
