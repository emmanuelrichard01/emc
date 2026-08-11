import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { LOGO_PATHS } from '@/components/ui/LogoMark';

/* ==========================================================================
   BOOT OVERLAY — the cold open.

   A CRT coming up: a scanline sweeps the dark, the mark strokes itself on,
   phosphor blooms, and the panel lifts to hand over to a live shell.

   Three rules keep it from becoming an obstacle, because a full-screen
   animation between a visitor and the content is exactly the kind of thing
   that reads as delightful once and as an obstruction every time after:

     1. Once per *session*, not per page view. Navigating to a case study and
        back must not replay it.
     2. Skippable by any key, click or scroll — and the skip is instant.
     3. Never shown under prefers-reduced-motion, where it is replaced by
        nothing at all rather than by a faster version of itself.

   The mark is drawn rather than faded because LOGO_PATHS are real vector
   outlines: stroking them with an animated pathLength makes the machine look
   like it is *rendering* the identity, which is the whole conceit.

   ── Why this owns the whole cold start ──────────────────────────────────

   This used to be rendered by <Hero>, which lives inside the lazily-loaded
   route chunk. The overlay meant to cover the cold start therefore could not
   mount until the thing it was covering had already arrived. Measured on a
   local production preview — so with no network latency at all — a first
   load showed three screens in a row:

     t≈360ms  navbar and footer, with an empty <main> between them, so the
              footer's colophon sat at y=287 in the middle of the viewport
     t≈650ms  the route-chunk loader takes over
     t≈945ms  this overlay finally mounts and blacks everything out
     t≈2600ms the overlay lifts and reveals the hero

   That is the "shows the site, hides it, then loads it" the sequence was
   supposed to prevent. The fix is ownership: the overlay is now mounted by
   the entry bundle on the very first commit, before any route code exists,
   and it does not lift until the route is actually ready to be seen.

   So the lift now waits on two conditions, not one:

     · the animation has had its run (or was skipped), and
     · the first route chunk has committed, reported by <RouteReadyBeacon>.

   The second is what folds the old chunk-loader screen into this one. If the
   chunk is slower than the animation, the progress bar becomes indeterminate
   and the visitor keeps looking at the same screen rather than being handed
   between two of them.
   ========================================================================== */

const SESSION_KEY = 'emc-booted';

/** Total run time. Kept under ~1.6s: past that it stops being an entrance. */
const DURATION_MS = 1600;

/* Ceiling on the wait for the route chunk.

   Without it, a chunk that never arrives — an offline tab, a failed deploy —
   leaves the overlay up forever, which turns a decorative sequence into the
   whole site being broken. Past this the panel lifts regardless and hands
   over to Suspense and the error boundary, which are the parts of the app
   that actually know how to report a failed load. */
const ROUTE_WAIT_CEILING_MS = 6000;

function hasBootedThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    // Storage blocked (private mode, embedded webview). Treat as booted so a
    // visitor who cannot persist the flag doesn't replay the sequence on
    // every single navigation.
    return true;
  }
}

function markBooted(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // Nothing to do; the in-memory state still suppresses a replay.
  }
}

/* ── Context ──────────────────────────────────────────────────────────────
   `booted` has to reach <Hero>, which is several lazy layers down, and the
   ready signal has to travel back up from inside the Suspense boundary. Two
   separate contexts rather than one object, so a component that only reads
   the flag does not re-render when the callback identity would change. */

const BootedContext = createContext(true);
const RouteReadyContext = createContext<() => void>(() => {});

/** True once the cold open is gone — or was never shown. */
export const useBooted = (): boolean => useContext(BootedContext);

/**
 * Reports that the first route chunk has committed.
 *
 * Rendered as a sibling of <Routes> *inside* the Suspense boundary. Anything
 * inside a suspended boundary is withheld from the commit, so this component
 * mounting is precisely the event "the route resolved" — no polling, and no
 * guessing at a duration that depends on the visitor's connection.
 */
export function RouteReadyBeacon(): null {
  const signal = useContext(RouteReadyContext);
  useEffect(() => {
    signal();
  }, [signal]);
  return null;
}

/* ── Provider ───────────────────────────────────────────────────────────── */

export function BootProvider({ children }: { children: React.ReactNode }) {
  const prefersReduced = useReducedMotion();

  /* Read once, synchronously, during the first render — not in an effect.
     An effect would let the page paint in its pre-boot state for a frame
     before the overlay covered it, which is a visible flash of the thing the
     overlay exists to reveal. */
  const [fresh] = useState(() => !hasBootedThisSession());
  const running = fresh && !prefersReduced;

  // Everything starts satisfied when there is no sequence to run, so the
  // no-boot path costs three booleans and renders nothing.
  const [elapsed, setElapsed] = useState(!running);
  const [routeReady, setRouteReady] = useState(!running);
  const [expired, setExpired] = useState(false);

  const signalRouteReady = useCallback(() => setRouteReady(true), []);

  /* Derived, not stored.

     Holding `booted` as its own state meant an effect watching the other
     three and calling setState to keep it in step — the cascading-render
     pattern React's rules flag, and for no gain: this is a pure function of
     values the component already has. */
  const booted = !running || expired || (elapsed && routeReady);

  // The run itself, plus the skip. Any intent to proceed ends the animation:
  // pointer, key and wheel all count, because someone who starts scrolling
  // has already decided they want the page.
  useEffect(() => {
    if (!running || booted) return;

    const timer = setTimeout(() => setElapsed(true), DURATION_MS);
    const ceiling = setTimeout(() => setExpired(true), ROUTE_WAIT_CEILING_MS);

    const skip = () => setElapsed(true);
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    window.addEventListener('wheel', skip, { passive: true });

    return () => {
      clearTimeout(timer);
      clearTimeout(ceiling);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('wheel', skip);
    };
  }, [running, booted, expired]);

  // Persisting the flag is a write to an external system, which is what an
  // effect is actually for. Idempotent, so it needs no guard of its own.
  useEffect(() => {
    if (booted) markBooted();
  }, [booted]);

  /* The overlay is fixed and covers the document, so the page behind it must
     not scroll while it is up — otherwise a stray wheel event lands the
     visitor mid-page when it lifts. */
  useEffect(() => {
    if (booted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [booted]);

  return (
    <RouteReadyContext.Provider value={signalRouteReady}>
      <BootedContext.Provider value={booted}>
        {children}
        <AnimatePresence>
          {!booted && running && <BootPanel waiting={elapsed && !routeReady} />}
        </AnimatePresence>
      </BootedContext.Provider>
    </RouteReadyContext.Provider>
  );
}

/* ── Panel ──────────────────────────────────────────────────────────────── */

/** True once the animation has run out but the route has not arrived. */
interface BootPanelProps {
  waiting: boolean;
}

function BootPanel({ waiting }: BootPanelProps) {
  return (
    <motion.div
      // Lifts rather than merely fading: the panel pulls up and away, so
      // the hero underneath reads as having been there all along.
      exit={{ opacity: 0, y: -24, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050505] overflow-hidden"
      role="status"
      aria-label="Starting up"
    >
      {/* Scanline sweep. One pass, top to bottom, ahead of the mark. */}
      <motion.div
        initial={{ y: '-100%' }}
        animate={{ y: '100%' }}
        transition={{ duration: 0.75, delay: 0.1, ease: 'linear' }}
        className="absolute inset-x-0 h-[40vh] pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, transparent, hsl(var(--primary) / 0.06) 45%, hsl(var(--primary) / 0.14) 50%, hsl(var(--primary) / 0.06) 55%, transparent)',
        }}
      />

      {/* Faint CRT raster, so the black is a screen rather than a void. */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, hsl(var(--foreground) / 0.035) 0px, hsl(var(--foreground) / 0.035) 1px, transparent 1px, transparent 3px)',
        }}
      />

      <div className="relative flex flex-col items-center gap-6">
        <motion.svg
          viewBox="0 0 200 120"
          className="w-24 h-14 md:w-32 md:h-20 text-primary"
          aria-hidden="true"
          initial={{ filter: 'drop-shadow(0 0 0px hsl(var(--primary) / 0))' }}
          animate={{
            filter: [
              'drop-shadow(0 0 0px hsl(var(--primary) / 0))',
              'drop-shadow(0 0 18px hsl(var(--primary) / 0.55))',
              'drop-shadow(0 0 8px hsl(var(--primary) / 0.3))',
            ],
          }}
          transition={{ duration: 0.9, delay: 0.5, times: [0, 0.6, 1] }}
        >
          {LOGO_PATHS.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              fill="currentColor"
              stroke="currentColor"
              strokeWidth={1.5}
              initial={{ pathLength: 0, fillOpacity: 0 }}
              animate={{ pathLength: 1, fillOpacity: 1 }}
              transition={{
                pathLength: { duration: 0.55, delay: 0.35 + i * 0.12, ease: 'easeInOut' },
                fillOpacity: { duration: 0.35, delay: 0.7 + i * 0.12 },
              }}
            />
          ))}
        </motion.svg>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 1.05 }}
          className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted-foreground"
        >
          builtbyem
        </motion.div>

        {/* Two bars in one slot, and which one shows is the honest answer to
            "what is this waiting on".

            While the sequence runs, the fill is real elapsed time against a
            duration this component owns. Once that runs out and the route
            chunk still has not landed, there is no longer a known duration —
            a dynamic import emits no progress events — so it becomes an
            indeterminate sweep rather than a full bar sitting there implying
            the wait is over. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="w-32 h-px bg-border relative overflow-hidden"
        >
          {waiting ? (
            <motion.div
              className="absolute inset-y-0 w-1/3 bg-primary"
              animate={{ x: ['-120%', '320%'] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            />
          ) : (
            <motion.div
              className="absolute inset-y-0 left-0 bg-primary"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: DURATION_MS / 1000, ease: 'linear' }}
            />
          )}
        </motion.div>
      </div>

      {/* Hidden once skipping stops meaning anything — past this point the
          wait is on the network, and offering a skip that cannot skip is
          worse than offering nothing. */}
      {!waiting && (
        <span className="absolute bottom-8 font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground/40">
          press any key to skip
        </span>
      )}
    </motion.div>
  );
}
