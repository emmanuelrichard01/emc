import { useSyncExternalStore } from 'react';

/* ==========================================================================
   MODE STORES

   A tiny external store per mode, so the work in a mode belongs to the
   session rather than to a mounted component: switching dock tabs, or
   closing the dock, does not lose a half-pasted job description, and a fit
   check that is still running keeps running and is there when the visitor
   comes back. Session only, in memory; nothing here touches storage.
   ========================================================================== */

export interface Store<T> {
  get: () => T;
  set: (patch: Partial<T> | ((state: T) => Partial<T>)) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (patch) => {
      const next = typeof patch === 'function' ? patch(state) : patch;
      state = { ...state, ...next };
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
