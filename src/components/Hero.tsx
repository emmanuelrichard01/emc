import { useEffect, useRef, type ReactNode } from 'react';
import { motion, useMotionTemplate, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';

import { useBooted } from '@/components/hero/BootOverlay';
import TerminalHero from '@/components/hero/TerminalHero';
import EventHorizon from '@/components/hero/EventHorizon';
import Starfield from '@/components/hero/Starfield';
import { HeroBaseline, HeroTopBar } from '@/components/hero/HeroChrome';

/* ==========================================================================
   HERO

   One prompt, in front of a black hole — and the way out is through it.

   The screen is three things:

     the edges   mark and shortcuts on top, socials and status underneath,
                 small and quiet (HeroChrome)
     the middle  the prompt, and nothing competing with it (TerminalHero)
     behind      the event horizon — a close-up of a black hole rising out
                 of the bottom-right corner, the disk on a cinematic
                 diagonal, tinted to the accent and faded into the page so
                 it is felt more than looked at; it reacts to what is typed
                 into the prompt (EventHorizon)

   THE TRANSITION
   Scrolling on does not slide the hero away. It is a fade out, a beat of
   black, and a fade in — nothing travels:

     dive      the hero is pinned while the visitor falls into the hole. The
               chrome fades first, the prompt softens where it stands, the
               hole zooms (in the shader, so it stays sharp) with its photon
               ring sweeping across the screen, until the shadow is the
               screen and deepens to the page's own black.
     reveal    the next section, pinned in its turn at the top of the
               screen, grows out of the centre of the dark — scale and
               opacity together, eased out — and settles just as its pin
               lets go and ordinary scrolling resumes.

   HOW NOTHING SHAKES
   Both pins are CSS `position: sticky`, held by the browser on the same
   thread that scrolls the page. An earlier version kept the next section in
   place by counter-translating it from JavaScript every frame; the browser
   scrolls and paints before script can answer, so each scroll step showed
   the section moving and then snapping back — a one-frame race that read
   as jitter, and cannot be tuned away. Now script only drives opacity and
   scale, which are compositor-friendly and not positional, and no filter
   is animated over the (very tall) section at all.

     scene   100svh + DIVE of scroll; the hero sticks inside it
     stage   the next section's own sticky box, pulled up one screen so it
             sits beneath the hero's last screen, with REVEAL of extra room
             below it — the length of its pin

   The hero is black by the end of the dive and fades to transparent over
   the page's matching black before it scrolls away, so its exit is
   invisible and the next section is revealed only by its own grow.

   Every step is tied to scroll position, not time: it plays forward and
   backward with the wheel, stops where the visitor stops, and cannot be
   "missed". Under reduced motion there are no pins and no dive — the hero
   is an ordinary first screen and the next section simply follows it.
   ========================================================================== */

/** Scroll the dive takes, as a multiple of the viewport. */
const DIVE_LENGTH = 0.7;
/** Scroll the reveal takes — how long the next section is pinned while it grows in. */
const REVEAL_LENGTH = 0.45;

/* Where the hole sits, and its size: a close-up rising out of the
   bottom-right corner, the disk on a cinematic diagonal, so the middle of
   the screen belongs to the prompt and the hole is felt more than looked
   at. Shared by the shader, the CSS mask and the starfield, so the three
   can never drift apart. */
const HOLE = { x: 0.92, y: 0.98, radius: 0.31, roll: -0.34 };

export default function Hero({ children }: { children?: ReactNode }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  /* The cold open belongs to <BootProvider> in App. What is left of it here
     is the flag that gates focus: focusing the prompt underneath a
     full-screen overlay scrolls the page to an input nobody can see. */
  const live = useBooted();

  // 0 with the hero at rest, 1 when the scene has fully scrolled through.
  const { scrollYProgress: raw } = useScroll({ target: sceneRef, offset: ['start start', 'end end'] });
  /* A lightly smoothed copy of the scroll drives everything visual, so a
     wheel's discrete steps glide rather than step. Nothing positional reads
     it — both pins are CSS — so the smoothing can never make anything lag
     behind where it is. */
  const p = useSpring(raw, { stiffness: 140, damping: 30, mass: 0.6, restDelta: 0.0005 });

  // The prompt fades where it stands — nothing on the hero moves.
  const contentOpacity = useTransform(p, [0, 0.36], [1, 0]);
  const contentBlur = useTransform(p, [0, 0.38], [0, 6]);
  // `none` at rest, not blur(0px): a zero blur is still a filter, and it
  // kept the whole prompt on a filter layer, re-rasterised on every keystroke.
  const contentFilter = useTransform(contentBlur, (b) => (b < 0.05 ? 'none' : `blur(${b}px)`));
  // Faded is not gone: an invisible prompt must not still take clicks.
  const contentPointer = useTransform(p, (v) => (v > 0.32 ? 'none' : 'auto'));

  // The edges go first, so the dive is never framed by UI.
  const chromeOpacity = useTransform(p, [0, 0.24], [1, 0]);

  // The dive. Eased in — slow at first, then accelerating, as falling does —
  // so the first stretch of scroll reads as a lean rather than a lurch.
  const zoom = useTransform(p, (v) => {
    const t = Math.min(1, Math.max(0, (v - 0.03) / 0.72));
    return 1 + 12 * t * t * t;
  });
  // Up from its resting 72% as the hole takes over the screen.
  const holeOpacity = useTransform(p, [0, 0.6], [0.72, 1]);
  // The mask opens with the zoom, or it would clip the ring on its way past.
  const maskW = useTransform(p, [0, 0.72], [78, 320]);
  const maskH = useTransform(p, [0, 0.72], [95, 320]);
  const mask = useMotionTemplate`radial-gradient(ellipse ${maskW}% ${maskH}% at ${HOLE.x * 100}% ${HOLE.y * 100}%, #000 38%, transparent 82%)`;

  // The shadow deepens to the page's own black…
  const handoff = useTransform(p, [0.62, 0.8], [0, 1]);
  // …and once it is black, the hero goes transparent over the matching page
  // black, so when its pin releases and it scrolls away nothing is seen to
  // move. Out of the pointer's way from the moment it is dark.
  const heroOpacity = useTransform(p, [0.86, 0.98], [1, 0]);
  const heroPointer = useTransform(p, (v) => (v > 0.8 ? 'none' : 'auto'));

  /* The reveal, measured against the stage's own pin: 0 as the stage reaches
     the top of the screen (the dive's end), 1 when its pin lets go. */
  const { scrollYProgress: stageRaw } = useScroll({ target: stageRef, offset: ['start start', 'end end'] });
  const stageLength = useRef({ reveal: 1, total: 1 });
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      stageLength.current = {
        reveal: window.innerHeight * REVEAL_LENGTH,
        total: Math.max(1, stage.offsetHeight - window.innerHeight),
      };
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  /* The stage's progress runs over its whole scrollable height (the section
     is long); only its first REVEAL_LENGTH of that is the pin, so it is
     rescaled here to 0..1 across the pin alone. */
  const reveal = useSpring(
    useTransform(stageRaw, (v) => {
      const { reveal: r, total } = stageLength.current;
      return Math.min(1, Math.max(0, (v * total) / r));
    }),
    { stiffness: 160, damping: 32, mass: 0.6, restDelta: 0.0005 }
  );

  // Growing out of the centre of the dark: eased out, so it moves most at
  // the start and settles softly into place.
  const grow = useTransform(reveal, (t) => 1 - Math.pow(1 - t, 3));
  const nextOpacity = useTransform(grow, [0, 0.6], [0, 1]);
  const nextScale = useTransform(grow, [0, 1], [0.9, 1]);

  const still = Boolean(prefersReduced);

  return (
    <>
    {/* The scene is taller than the screen by the length of the dive; the
        hero is pinned inside it for that stretch. The id lives here, on the
        whole scene, so "back to top" and #home land at its start. Stacked
        above the next section, which it overlaps. */}
    <div
      ref={sceneRef}
      id="home"
      data-section="home"
      className="relative z-20"
      style={{ height: still ? '100svh' : `${100 + DIVE_LENGTH * 100}svh` }}
    >
      <motion.section
        aria-label="Introduction"
        style={still ? undefined : { opacity: heroOpacity, pointerEvents: heroPointer }}
        className="sticky top-0 h-[100svh] min-h-[560px] flex flex-col overflow-hidden px-5 md:px-10 lg:px-14 pt-5 md:pt-7 pb-4 md:pb-5"
      >
        {/* Surface: the page's own stock, so the first screen is page one of
            the same book rather than a different room. */}
        <div className="absolute inset-0 z-0 bg-[hsl(var(--hero-surface))]" aria-hidden="true" />

        {/* The distant sky the hole sits in: fades in after the hole, and
            is pulled into it during the dive. */}
        <motion.div
          className="absolute inset-0 z-0 pointer-events-none"
          initial={still ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 4, delay: 0.8, ease: 'easeOut' }}
        >
          <Starfield className="absolute inset-0 w-full h-full" hole={{ x: HOLE.x, y: HOLE.y }} dive={still ? undefined : p} />
        </motion.div>

        {/* The hole. Scroll owns this layer's opacity and mask; the slow
            fade-in on arrival lives on the inner layer, so the two never
            fight over one property. */}
        <motion.div
          className="absolute inset-0 z-0 pointer-events-none"
          style={
            still
              ? {
                  opacity: 0.72,
                  maskImage: `radial-gradient(ellipse 78% 95% at ${HOLE.x * 100}% ${HOLE.y * 100}%, #000 38%, transparent 82%)`,
                  WebkitMaskImage: `radial-gradient(ellipse 78% 95% at ${HOLE.x * 100}% ${HOLE.y * 100}%, #000 38%, transparent 82%)`,
                }
              : { opacity: holeOpacity, maskImage: mask, WebkitMaskImage: mask }
          }
        >
          <motion.div
            className="absolute inset-0"
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 3, ease: 'easeOut' }}
          >
            <EventHorizon
              className="absolute inset-0"
              center={{ x: HOLE.x, y: HOLE.y }}
              radius={HOLE.radius}
              roll={HOLE.roll}
              zoom={still ? undefined : zoom}
            />
          </motion.div>
        </motion.div>

        {/* A soft dark pool behind the prompt, so text never sits on disk
            light or a bright star, and a vignette to hold the frame. Fades
            with the prompt, so it does not sit over the dive as a smudge. */}
        <motion.div
          className="absolute inset-0 z-[1] pointer-events-none"
          aria-hidden="true"
          style={{
            opacity: still ? 1 : contentOpacity,
            background:
              'radial-gradient(ellipse 44% 32% at 50% 50%, hsl(var(--hero-surface) / 0.8), transparent 72%), radial-gradient(ellipse 110% 100% at 45% 45%, transparent 55%, hsl(0 0% 0% / 0.55) 100%)',
          }}
        />

        <motion.div style={still ? undefined : { opacity: chromeOpacity }} className="relative z-20 shrink-0">
          <HeroTopBar />
        </motion.div>

        <motion.div
          className="relative z-10 flex-1 flex flex-col min-h-0"
          style={still ? undefined : { opacity: contentOpacity, filter: contentFilter, pointerEvents: contentPointer }}
        >
          <TerminalHero live={live} />
        </motion.div>

        <motion.div style={still ? undefined : { opacity: chromeOpacity }} className="relative z-20 shrink-0">
          <HeroBaseline />
        </motion.div>

        {/* The hand-off to the page's black (bg-background, the Index backdrop). */}
        {!still && (
          <motion.div
            className="absolute inset-0 z-30 pointer-events-none bg-background"
            style={{ opacity: handoff }}
            aria-hidden="true"
          />
        )}
      </motion.section>
    </div>

    {/* The stage: the next section's own pin. Pulled up one screen so it
        sits beneath the hero's last screen; the spacer below is the length
        of the pin, during which the section — sticky at the top — grows in. */}
    {/* Rendered in both modes, and always holding the ref. useScroll above
        targets it, and framer throws if a target ref is still empty after
        mount — the exact failure that once took the home page down for
        every reduced-motion visitor. Under reduced motion it is simply a
        wrapper: no pull-up, no pin, no reveal. */}
    {children && (
      <div
        ref={stageRef}
        id={still ? undefined : 'hero-stage'}
        className="relative z-10"
        style={still ? undefined : { marginTop: '-100svh' }}
      >
        <motion.div
          className={still ? undefined : 'sticky top-0'}
          style={
            still
              ? undefined
              : {
                  opacity: nextOpacity,
                  scale: nextScale,
                  // The centre of the screen, not of the (much taller)
                  // section: pinned at the top, half a viewport down is
                  // where the eye is.
                  transformOrigin: '50% 50svh',
                  willChange: 'transform, opacity',
                }
          }
        >
          {children}
        </motion.div>
        {/* The pin's length — a real element, not padding: a sticky box can
            only travel within its parent's content box, and padding is
            outside it. */}
        {!still && <div style={{ height: `${REVEAL_LENGTH * 100}svh` }} aria-hidden="true" />}
      </div>
    )}
    </>
  );
}
