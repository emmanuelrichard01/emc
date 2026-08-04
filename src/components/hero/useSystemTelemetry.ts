import { useEffect, useRef, useState } from 'react';

/* ==========================================================================
   SYSTEM TELEMETRY

   Every value here is measured from the live page. Nothing is simulated.

   That constraint is the whole point: a console that claims "143K evt/s"
   from a Kafka cluster that does not exist is set-dressing, and a reader who
   notices reads it as a claim that isn't true. Reporting this page's own
   real render loop is both honest and a better demonstration — the numbers
   move because the browser is actually doing the work.
   ========================================================================== */

export const FPS_SAMPLES = 24;

export interface SystemTelemetry {
  /** Frames painted in the last window; null until the first real sample. */
  fps: number | null;
  /** Rolling FPS window, oldest first — drives the sparkline. Starts empty. */
  fpsHistory: number[];
  /** Seconds since this document started loading. */
  uptimeSeconds: number;
  /** Used JS heap in MB. Chromium-only; null elsewhere. */
  heapMB: number | null;
  /** Live element count for this document. */
  domNodes: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: { usedJSHeapSize: number };
}

export function readHeapMB(): number | null {
  const mem = (performance as PerformanceWithMemory).memory;
  if (!mem || typeof mem.usedJSHeapSize !== 'number') return null;
  return mem.usedJSHeapSize / 1048576;
}

export function readDomNodes(): number {
  return typeof document === 'undefined' ? 0 : document.getElementsByTagName('*').length;
}

/**
 * Measures painted frames over a window and returns the rate.
 *
 * Exported for one-shot sampling by terminal commands, which need a reading
 * without subscribing to the hook — a streaming command that re-rendered the
 * whole console once a second to read a number would be paying for the
 * measurement many times over.
 *
 * Resolves early when aborted, so a cancelled `watch` doesn't leave a
 * pending timer running for the rest of the window.
 */
export function measureFps(windowMs: number, signal?: AbortSignal): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();

    const tick = () => {
      const elapsed = performance.now() - start;
      if (signal?.aborted || elapsed >= windowMs) {
        resolve(elapsed > 0 ? Math.round((frames * 1000) / elapsed) : 0);
        return;
      }
      frames++;
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
}

export function useSystemTelemetry(enabled = true): SystemTelemetry {
  const [telemetry, setTelemetry] = useState<SystemTelemetry>(() => ({
    // Deliberately null / empty rather than a plausible-looking 60. Seeding
    // the display with a number nobody measured is the exact thing this hook
    // exists to avoid — and in a background tab, where rAF never runs, that
    // seed would be the only value ever shown.
    fps: null,
    fpsHistory: [],
    uptimeSeconds: 0,
    heapMB: readHeapMB(),
    domNodes: typeof document === 'undefined' ? 0 : document.getElementsByTagName('*').length,
  }));

  const frames = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let rafId = 0;
    let windowStart = performance.now();

    // Counting frames is the measurement — the callback deliberately does
    // nothing else, so the probe itself stays off the critical path.
    const count = () => {
      frames.current++;
      rafId = requestAnimationFrame(count);
    };
    rafId = requestAnimationFrame(count);

    const sample = () => {
      // A hidden tab has rAF throttled to roughly nothing, so sampling it
      // would report ~0fps — technically true of the throttled tab, but read
      // as "this page is broken" the moment someone switches back. Hold the
      // last known good reading instead and resume measuring when visible.
      if (document.hidden) return;

      const now = performance.now();
      const elapsed = now - windowStart;
      windowStart = now;

      // Guard against a zero-length window.
      const fps = elapsed > 0 ? Math.min(240, Math.round((frames.current * 1000) / elapsed)) : 0;
      frames.current = 0;

      setTelemetry((prev) => ({
        fps,
        fpsHistory: [...prev.fpsHistory, fps].slice(-FPS_SAMPLES),
        // timeOrigin is document start, so this survives remounts and
        // reports true page uptime rather than component uptime.
        uptimeSeconds: Math.floor((Date.now() - performance.timeOrigin) / 1000),
        heapMB: readHeapMB(),
        domNodes: document.getElementsByTagName('*').length,
      }));
    };

    const intervalId = setInterval(sample, 1000);

    // A hidden tab throttles rAF to near zero, which would otherwise be
    // recorded as a genuine framerate collapse and poison the sparkline.
    const onVisibility = () => {
      frames.current = 0;
      windowStart = performance.now();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);

  return telemetry;
}

/** Formats a second count as `H:MM:SS` / `MM:SS`. */
export function formatUptime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
