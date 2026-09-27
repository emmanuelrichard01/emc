import { useEffect, useRef, useState } from 'react';
import type { MotionValue } from 'framer-motion';

import { onCircuitSignal } from '@/lib/circuitBus';
import { HotSpots, MAX_SPOTS, cameraDistance, cameraInclination, jitter, lensFactor } from '@/components/hero/eventHorizon/physics';
import { createRenderer, type Renderer } from '@/components/hero/eventHorizon/renderer';

/* ==========================================================================
   EVENT HORIZON

   The hero's background: a black hole, ray-traced, seen through an
   instrument.

   Why a shader rather than the video it was modelled on. The reference was a
   10-second 4K loop — 9 MB, a visible seam every ten seconds, and deaf to
   everything on the page. This is a few kilobytes of GLSL that never loops
   and listens.

   WHAT IS COMPUTED, NOT DRAWN (eventHorizon/shaders.ts)
   Every pixel fires a ray from the camera and follows it through curved
   spacetime around a Schwarzschild black hole — the Cartesian null
   geodesic, integrated with velocity Verlet. The accretion disk is what it
   really is: a flat, thin ring in the equatorial plane from the innermost
   stable orbit (3 Rs) outward, and a ray collects its light wherever it
   crosses that plane inside the ring. So the famous look falls out of the
   physics:

     lensed halo    light from the far side of the flat disk, bent up and
                    over the hole — and a second image of it bent underneath
     shadow         rays that fall through the horizon: nothing comes back
     beaming        the gas orbits at up to ~0.6c; the approaching side is
                    Doppler-boosted (∝ g³) and whiter, the receding side
                    dimmer and warmer, all of it gravitationally redshifted
                    from the gas's radius to the camera's
     turbulence     streaks that orbit at the Keplerian rate (ω ∝ r^−1.5),
                    in the same sense the gas's velocity is beamed
     photon ring    at the critical impact parameter, lit by the gas it
                    last crossed and beamed by the tilt of its orbit — so it
                    is lopsided, turbulent and carries the hot spots, as the
                    stacked disk images it stands for would be
     stars          looked up along each ray's final direction, so the sky
                    is lensed exactly as the disk is
     aberration     the camera is a static observer; its view is mapped
                    into the tracer through the √(1 − Rs/r) squeeze of its
                    own frame, which matters once it falls in

   THE DIVE IS A FALL (eventHorizon/physics.ts)
   Scrolling into the hole moves the camera from 30 Rs to ~5 Rs while the
   lens widens to hold the shadow exactly where Hero.tsx's mask expects it
   — a dolly zoom. The shadow grows on the same schedule as before; what
   changes is the perspective around it: the camera rises over the disk,
   the sky crowds into the ring, and the light it sees is blueshifted by
   its own depth in the well.

   WHAT IT LISTENS TO (lib/circuitBus — no React state in the loop)
     burst   keystrokes gather a clump of hot gas in the outer disk; running
             the command drops it in — it spirals to the inner edge,
             flashing each time it swings toward the camera, and plunges.
             The inner disk flares as well.
     load    a command or an answer in progress: the disk spins up
     recede  output on screen: the hole dims and falls back, so text wins
   and the pointer, which moves the camera by a fraction of a degree.

   HOW IT IS FINISHED (eventHorizon/renderer.ts)
   With WebGL2 the trace is linear HDR: each frame samples a different
   point in every pixel and is accumulated over time (reprojected through
   the dive, clamped against ghosts), so the hairline ring and the stars
   are supersampled; the brightest light blooms; then it is tone-mapped
   onto the current accent — dark → accent → warm white — so it follows
   the theme toggle, and grained. Without float
   targets it is the single tone-mapped pass, pixelated, as it always was.

   COST
   ≤ 96 integration steps per pixel at half resolution — unchanged — plus
   about a dozen texture reads per traced pixel for the rest. Capped at
   30 fps outside the dive. The loop measures its own frame time and
   coarsens the trace on a slow GPU rather than dropping frames. Paused
   off-screen and in background tabs; under reduced motion it traces
   sixteen jittered frames to converge one still and stops; a CSS gradient
   without WebGL. Survives a lost GPU context.
   ========================================================================== */

/** Display pixels per traced pixel, to start with. 2 is the hybrid: sharp
    enough for the ring, a quarter of the cost. Raised on a slow GPU. */
const PIXEL = 2;
/** The coarsest the renderer will go before it stops trying. */
const PIXEL_MAX = 4;
const FRAME_MS = 1000 / 30;
/* The page's own frame budget. If the browser is delivering frames slower
   than this on average — which, with the tracer the heaviest thing on the
   page, means the GPU is behind — the resolution steps down. */
const SLOW_FRAME_MS = 1000 / 24;
const SAMPLES = 45;
/** Weight of each new frame in the accumulated image: ~10 frames to settle. */
const BLEND = 0.12;
/** Frames traced to converge the single still frame under reduced motion. */
const STILL_FRAMES = 16;

/* ── Colour ─────────────────────────────────────────────────────────── */

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

/** Reads an `H S% L%` custom property into linear-ish RGB 0..1. */
function readHsl(name: string, fallback: [number, number, number]): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = /^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/.exec(raw);
  return m ? hslToRgb(Number(m[1]), Number(m[2]), Number(m[3])) : fallback;
}

/* ── Component ──────────────────────────────────────────────────────── */

interface EventHorizonProps {
  /** Where the hole sits, as a fraction of the canvas (0..1, from top-left). May be near or past an edge. */
  center?: { x: number; y: number };
  /** Shadow radius as a fraction of the canvas's short side. Large is close-up. */
  radius?: number;
  /** Disk roll in radians. */
  roll?: number;
  /**
   * Scroll-driven zoom (1 = at rest). Read inside the frame loop rather than
   * passed as a number, so scrolling re-renders nothing: the shader picks the
   * value up on its next frame.
   */
  zoom?: MotionValue<number>;
  className?: string;
}

export default function EventHorizon({ center = { x: 0.5, y: 0.34 }, radius = 0.09, roll = -0.1, zoom, className = '' }: EventHorizonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [supported, setSupported] = useState(true);
  const [pixelated, setPixelated] = useState(false);
  const shapeRef = useRef({ center, radius, roll, zoom });
  useEffect(() => {
    shapeRef.current = { center, radius, roll, zoom };
  }, [center, radius, roll, zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: Renderer | null = createRenderer(canvas);
    if (!renderer) {
      setSupported(false);
      return;
    }
    setPixelated(!renderer.hdr);

    /* Colours follow the theme. The accent lives in a class on <html>, so a
       class change is the only moment they can move. */
    const setColours = () =>
      renderer?.setColours(readHsl('--primary', [0.96, 0.62, 0.04]), readHsl('--hero-surface', [0.055, 0.058, 0.066]));
    setColours();
    const themeObserver = new MutationObserver(setColours);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    let pixel = PIXEL;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      renderer?.resize(rect.width, rect.height, pixel);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    /* ── State driven by the page ── */
    let energy = 0;
    let load = 0;
    let loadTarget = 0;
    let recede = 0;
    let recedeTarget = 0;
    let phase = 0;
    const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
    const spots = new HotSpots();
    const packed = new Float32Array(MAX_SPOTS * 4);

    const unsubscribe = onCircuitSignal((signal) => {
      if (signal.type === 'burst') {
        const strength = signal.strength ?? 0.6;
        energy = Math.min(1, energy + strength * 0.6);
        spots.feed(strength);
      }
      if (signal.type === 'load') loadTarget = signal.value;
      if (signal.type === 'recede') recedeTarget = signal.value;
    });

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tilt.tx = (e.clientX / window.innerWidth) * 2 - 1;
      tilt.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let last = performance.now();
    let lastDraw = 0;
    // Adaptive resolution: a running average of the interval between the
    // browser's frames, judged every SAMPLES frames.
    let lastTick = 0;
    let frameAvg = 0;
    let samples = 0;
    let visible = true;
    let frameIndex = 0;
    let lastLens = 0;
    let lastRecede = 0;
    const start = performance.now();

    const draw = (now: number) => {
      if (!renderer) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      // Everything eases: nothing on this canvas ever jumps.
      energy *= Math.exp(-dt * 2.2);
      load += (loadTarget - load) * Math.min(1, dt * 2.5);
      recede += (recedeTarget - recede) * Math.min(1, dt * 2.0);
      tilt.x += (tilt.tx - tilt.x) * Math.min(1, dt * 1.5);
      tilt.y += (tilt.ty - tilt.y) * Math.min(1, dt * 1.5);
      // Rotation is integrated rather than computed from time, so changing
      // speed changes the rate — it never snaps the disk to a new angle.
      const dPhase = dt * (0.07 + load * 0.28 + energy * 0.12);
      phase += dPhase;
      spots.step(dt, dPhase);

      const shape = shapeRef.current;
      const z = shape.zoom?.get() ?? 1;
      const cam = cameraDistance(z);
      const lens = lensFactor(cam, shape.radius, z);
      /* Where last frame's image of a point now lies, for the history: the
         view scales about the hole by the ratio of the lenses (and of the
         recede, which scales the view too). */
      const reproject = lastLens ? (lens * (1 + recede * 0.28)) / (lastLens * (1 + lastRecede * 0.28)) : 1;
      lastLens = lens;
      lastRecede = recede;

      renderer.render({
        time: (now - start) / 1000,
        phase,
        energy: Math.min(1, energy + load * 0.35),
        recede,
        tilt: [tilt.x, -tilt.y],
        center: [shape.center.x, 1 - shape.center.y],
        roll: shape.roll,
        zoom: z,
        cam,
        incl: cameraInclination(cam),
        lens,
        spots: spots.pack(packed),
        jitter: jitter(frameIndex++),
        reproject,
        blend: BLEND,
      });
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);

      if (lastTick) {
        // Capped, so one long frame (a tab switch, a GC) is not a verdict.
        const interval = Math.min(100, now - lastTick);
        frameAvg = samples === 0 ? interval : frameAvg * 0.9 + interval * 0.1;
        samples += 1;
        if (samples >= SAMPLES) {
          if (frameAvg > SLOW_FRAME_MS && pixel < PIXEL_MAX) {
            pixel += 1;
            resize();
          }
          samples = 0;
        }
      }
      lastTick = now;

      // Full frame rate while the visitor is scrolling into the hole — the
      // dive has to move with the scroll, not a frame behind it.
      const diving = (shapeRef.current.zoom?.get() ?? 1) > 1.01;
      if (!diving && now - lastDraw < FRAME_MS) return;
      lastDraw = now;
      draw(now);
    };

    /* Under reduced motion: a handful of jittered traces of one instant,
       accumulated into a single supersampled still, and then nothing. Time
       is frozen so every one of them traces the same moment. */
    const settle = () => {
      let n = 0;
      const step = () => {
        last = start;
        draw(start);
        if (++n < STILL_FRAMES && renderer?.hdr) raf = requestAnimationFrame(step);
        else raf = 0;
      };
      raf = requestAnimationFrame(step);
    };

    const startLoop = () => {
      if (reduced || raf || !visible || document.hidden || !renderer) return;
      last = performance.now();
      // A resume is a fresh measurement, not a continuation of the last one.
      lastTick = 0;
      samples = 0;
      raf = requestAnimationFrame(loop);
    };
    const stopLoop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    // One frame immediately, so there is never a blank background.
    draw(performance.now());
    if (reduced) settle();
    else startLoop();

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) startLoop();
      else stopLoop();
    });
    intersection.observe(canvas);
    const onVisibility = () => (document.hidden ? stopLoop() : startLoop());
    document.addEventListener('visibilitychange', onVisibility);

    /* A GPU reset (driver update, too many contexts, a laptop switching
       GPUs) takes every buffer and program with it. Asking to keep the
       context lets the browser restore it; the renderer is then rebuilt
       from scratch, and the loop resumes where it was. */
    const onLost = (e: Event) => {
      e.preventDefault();
      stopLoop();
      renderer = null;
    };
    const onRestored = () => {
      renderer = createRenderer(canvas);
      if (!renderer) {
        setSupported(false);
        return;
      }
      setPixelated(!renderer.hdr);
      lastLens = 0;
      setColours();
      resize();
      draw(performance.now());
      if (reduced) settle();
      else startLoop();
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    return () => {
      stopLoop();
      unsubscribe();
      themeObserver.disconnect();
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      /* No loseContext() here. The canvas outlives an effect re-run (React
         runs effects twice in development, and a remount can reuse the
         node), and getContext() on a canvas whose context was deliberately
         lost returns that dead context — the shader then fails to compile
         and the page silently shows the CSS fallback. The context is freed
         with the canvas. */
      renderer?.dispose();
    };
  }, []);

  if (!supported) {
    /* Without WebGL: the same composition in two gradients. Still, honest,
       and costs nothing. */
    return (
      <div
        className={className}
        aria-hidden="true"
        style={{
          background: `radial-gradient(circle at ${center.x * 100}% ${center.y * 100}%, hsl(var(--hero-surface)) 0 5.5vmin, hsl(var(--primary) / 0.5) 6vmin, hsl(var(--primary) / 0.12) 9vmin, transparent 16vmin),
            radial-gradient(ellipse 34vmin 2.4vmin at ${center.x * 100}% ${center.y * 100}%, hsl(var(--primary) / 0.28), transparent 70%)`,
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{ imageRendering: pixelated ? 'pixelated' : 'auto', width: '100%', height: '100%', display: 'block' }}
    />
  );
}
