/* ==========================================================================
   CIRCUIT BUS

   A one-way channel from the page into the hero's circuit animation.

   Deliberately a plain module rather than React context or state. The canvas
   consumes these signals inside its requestAnimationFrame loop, which lives
   entirely outside React's render cycle — routing them through context would
   re-render the console (and everything under it) purely to hand a number to
   an animation frame. A Set of callbacks costs nothing and re-renders
   nobody.

   The contract is intentionally narrow: the page describes *what happened*,
   and the canvas alone decides how to depict it.
   ========================================================================== */

export type CircuitSignal =
  /** Something discrete happened — a command ran, an action fired. */
  | { type: 'burst'; strength?: number }
  /** Sustained work is or isn't in progress. 0 idle, 1 saturated. */
  | { type: 'load'; value: number };

type Listener = (signal: CircuitSignal) => void;

const listeners = new Set<Listener>();

export function onCircuitSignal(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitCircuitSignal(signal: CircuitSignal): void {
  // Iterating a copy would allocate on every emit; a listener that
  // unsubscribes itself mid-iteration is safe with Set semantics anyway.
  for (const listener of listeners) listener(signal);
}
