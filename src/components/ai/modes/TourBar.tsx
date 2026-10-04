import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { NavigateFunction } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, X } from 'lucide-react';

import { runAction } from '@/lib/aiActions';
import { TOUR_STOP_SECONDS, type TourStop } from '@/lib/aiTour';

/* ==========================================================================
   TOUR BAR

   The guided tour's only interface: a small floating sheet at the bottom of
   the screen (above the phone's nav island), saying where the visitor is,
   one sentence about it, and Back, Pause, Next and Exit.

   Each stop runs its action (a page jump, a filter, a case study opened at
   a section) and then waits about seven seconds before moving on. The wait
   holds while the pointer or focus is on the bar, and stops altogether the
   moment the visitor scrolls the page themselves: they have found something
   to read, and a tour that drags them away from it is a tour they will
   leave. Under reduced motion it never moves on by itself.

   Esc exits. It is a region, not a dialog: the page behind stays usable.
   ========================================================================== */

const DWELL_MS = TOUR_STOP_SECONDS * 1000;
/* After a jump, how long to let the page settle (the page turn, a route
   change, a case study's entrance) before the clock starts. */
const SETTLE_MS = 700;

interface TourBarProps {
  stops: TourStop[];
  audienceLabel: string;
  navigate: NavigateFunction;
  onExit: () => void;
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function TourBar({ stops, audienceLabel, navigate, onExit }: TourBarProps) {
  const [reduced] = useState(reducedMotion);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(!reduced);
  const [moving, setMoving] = useState(true);
  const [held, setHeld] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pausedByScroll, setPausedByScroll] = useState(false);
  const elapsed = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);

  const stop = stops[index];
  const last = index === stops.length - 1;

  const go = useCallback(
    (next: number) => {
      const target = Math.max(0, Math.min(stops.length - 1, next));
      setPausedByScroll(false);
      elapsed.current = 0;
      setProgress(0);
      if (target !== index) {
        setMoving(true);
        setIndex(target);
      }
    },
    [stops.length, index]
  );


  // Run the stop's action, then let the page settle before the clock starts.
  /* Resetting the clock happens where the stop changes (go), so this only
     has the page to move. */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await runAction(stop.action, navigate);
      // The page turn, if this was a long jump, has to finish first.
      for (let i = 0; i < 40 && document.querySelector('.section-veil'); i++) {
        await new Promise((r) => setTimeout(r, 50));
      }
      await new Promise((r) => setTimeout(r, SETTLE_MS));
      if (!cancelled) setMoving(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [stop, navigate]);

  // The clock: advances only while playing, settled, and not held.
  useEffect(() => {
    if (!playing || moving || held) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      elapsed.current += now - previous;
      previous = now;
      const p = Math.min(1, elapsed.current / DWELL_MS);
      setProgress(p);
      if (p >= 1) {
        if (last) setPlaying(false);
        else go(index + 1);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, moving, held, last, go, index]);

  /* The visitor scrolling the page themselves pauses the tour. Our own
     jumps are programmatic and fire no wheel, touch or key events, so they
     never trip this. */
  useEffect(() => {
    const onUser = (e: Event) => {
      if (moving) return;
      if (e.type === 'keydown') {
        const key = (e as KeyboardEvent).key;
        if (!['PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', ' ', 'Home', 'End'].includes(key)) return;
        if (barRef.current?.contains(e.target as Node)) return;
      }
      setPlaying((was) => {
        if (was) setPausedByScroll(true);
        return false;
      });
    };
    window.addEventListener('wheel', onUser, { passive: true });
    window.addEventListener('touchmove', onUser, { passive: true });
    window.addEventListener('keydown', onUser);
    return () => {
      window.removeEventListener('wheel', onUser);
      window.removeEventListener('touchmove', onUser);
      window.removeEventListener('keydown', onUser);
    };
  }, [moving]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  const togglePlay = () => {
    setPausedByScroll(false);
    if (!playing && last && progress >= 1) {
      go(0);
      setPlaying(!reduced);
      return;
    }
    setPlaying((p) => !p);
  };

  const finished = last && progress >= 1 && !playing;

  return (
    <motion.div
      ref={barRef}
      role="region"
      aria-label={`Guided tour for ${audienceLabel.toLowerCase()}`}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!barRef.current?.contains(e.relatedTarget as Node)) setHeld(false);
      }}
      /* Centred with margins, not a translate: motion owns the transform. */
      className="fixed z-[75] inset-x-0 mx-auto w-[min(36rem,calc(100vw-2rem))] bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.75rem)] md:bottom-8 bg-popover text-foreground shadow-[0_0_0_1px_hsl(var(--border)),0_24px_60px_-20px_rgba(0,0,0,0.85)]"
    >
      {/* The dwell, as a hairline along the top edge. */}
      <div className="absolute inset-x-0 top-0 h-px bg-border overflow-hidden" aria-hidden="true">
        <div className="h-full bg-primary origin-left" style={{ transform: `scaleX(${playing || progress > 0 ? progress : 0})` }} />
      </div>

      <div className="px-4 md:px-5 pt-3.5 pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[12px] text-muted-foreground tabular-nums">
            Tour · {index + 1} of {stops.length} · <span className="text-foreground">{stop.place}</span>
          </p>
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit the tour"
            className="tap -mr-1.5 -mt-1 w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-1 text-[14px] md:text-[15px] leading-[1.55] text-foreground" aria-live="polite">
          {stop.caption}
        </p>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[12px] text-muted-quiet min-h-[1rem]" aria-live="polite">
            {finished ? 'End of the tour.' : pausedByScroll ? 'Paused while you read.' : moving ? 'Going there…' : ''}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              aria-label="Previous stop"
              className="tap w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={finished ? 'Restart the tour' : playing ? 'Pause the tour' : 'Play the tour'}
              aria-pressed={!finished ? playing : undefined}
              className="tap w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {finished ? (
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
              ) : playing ? (
                <Pause className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Play className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
            {last ? (
              <button type="button" onClick={onExit} className="tap ml-1 h-9 px-4 bg-foreground text-background text-[13px] font-medium">
                Done
              </button>
            ) : (
              <button
                type="button"
                onClick={() => go(index + 1)}
                className="tap group ml-1 h-9 pl-4 pr-3 inline-flex items-center gap-1.5 bg-foreground text-background text-[13px] font-medium"
              >
                Next
                <ArrowRight className="nudge w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
