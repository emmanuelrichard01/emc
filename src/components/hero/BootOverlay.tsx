import React, { useCallback, useEffect, useRef, useState } from 'react';
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
   ========================================================================== */

const SESSION_KEY = 'emc-booted';

/** Total run time. Kept under ~1.6s: past that it stops being an entrance. */
const DURATION_MS = 1600;

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

/**
 * Decides whether the sequence should run at all.
 *
 * Read once, synchronously, during the first render — not in an effect.
 * An effect would let the hero paint in its pre-boot state for a frame
 * before the overlay covered it, which is a visible flash of the thing the
 * overlay exists to reveal.
 */
export function useShouldBoot(): boolean {
  const prefersReduced = useReducedMotion();
  const [should] = useState(() => !hasBootedThisSession());
  return should && !prefersReduced;
}

interface BootOverlayProps {
  onDone: () => void;
}

export default function BootOverlay({ onDone }: BootOverlayProps) {
  const [visible, setVisible] = useState(true);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    markBooted();
    setVisible(false);
    onDone();
  }, [onDone]);

  useEffect(() => {
    const timer = setTimeout(finish, DURATION_MS);

    // Any intent to proceed skips the rest. Pointer, key and wheel all count:
    // someone who starts scrolling has already decided they want the page.
    const skip = () => finish();
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    window.addEventListener('wheel', skip, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('wheel', skip);
    };
  }, [finish]);

  return (
    <AnimatePresence>
      {visible && (
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

            {/* Progress is a real elapsed-time bar, not a fake percentage:
                the duration is known because this component owns it. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="w-32 h-px bg-border relative overflow-hidden"
            >
              <motion.div
                className="absolute inset-y-0 left-0 bg-primary"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: DURATION_MS / 1000, ease: 'linear' }}
              />
            </motion.div>
          </div>

          <span className="absolute bottom-8 font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground/40">
            press any key to skip
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
