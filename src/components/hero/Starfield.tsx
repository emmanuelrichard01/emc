import { useEffect, useRef } from 'react';
import type { MotionValue } from 'framer-motion';

/* ==========================================================================
   STARFIELD

   The sky the black hole sits in. The shader already draws stars, but only
   where the hole is (its own lensed sky, masked to the corner); the rest of
   the first screen was a flat black. This is the distant field behind it:
   quiet enough that it reads as depth rather than decoration.

   What it does
     · Stars at three depths, most of them faint and tiny, a few brighter.
       Colour is starlight, not accent: near-white, a few faintly warm, a few
       faintly blue, the way a long exposure shows them.
     · Each one twinkles on its own slow cycle, and every couple of seconds a
       single star scintillates: a brief, uneven brightening, as atmosphere
       does to a real one.
     · Rarely (every 15 to 35 seconds) a faint meteor crosses a corner of the
       sky. Never two at once, never over the prompt.
     · The pointer moves the layers a few pixels apart (parallax by depth).
     · During the dive, stars are pulled toward the hole and fade, nearer
       layers first, so falling in reads as falling in.
     · Thinned behind the prompt and around the hole, so it never sits under
       text and never competes with the shader's own lensed stars.

   Cost: one 2D canvas, a few hundred rects per frame at ≤30fps, nothing in
   React state. Paused off screen and in background tabs. Under reduced
   motion it draws one still frame and stops.
   ========================================================================== */

interface Star {
  x: number; // 0..1 of the canvas
  y: number;
  r: number; // CSS px
  a: number; // base alpha
  depth: number; // 0.35 (far) .. 1 (near)
  freq: number; // twinkle, radians per second
  phase: number;
  tint: 0 | 1 | 2; // neutral, warm, cool
}

interface Flicker {
  star: number;
  start: number;
}

interface Meteor {
  x: number;
  y: number;
  dx: number;
  dy: number;
  start: number;
  life: number;
}

interface StarfieldProps {
  /** Where the hole is, as fractions of the canvas, so stars thin around it and fall toward it. */
  hole: { x: number; y: number };
  /** Dive progress, 0 at rest. Read in the frame loop, never re-rendering. */
  dive?: MotionValue<number>;
  className?: string;
}

const TINTS = ['232, 230, 225', '247, 214, 170', '196, 214, 255'] as const;
const FRAME_MS = 1000 / 30;

/** A small deterministic generator, so the sky is the same on every visit. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeStars(width: number, height: number): Star[] {
  const rand = rng(20261003);
  // About one star per 5,000 square pixels: ~260 on a laptop, ~80 on a phone.
  const count = Math.round(Math.min(420, Math.max(70, (width * height) / 5000)));
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const layer = rand();
    const depth = layer < 0.6 ? 0.35 : layer < 0.9 ? 0.65 : 1;
    // Skewed toward faint: most of a real sky is barely there.
    const bright = Math.pow(rand(), 2.4);
    const tintRoll = rand();
    stars.push({
      x: rand(),
      y: rand(),
      r: 0.35 + bright * 0.85 + (depth === 1 ? 0.25 : 0),
      a: 0.1 + bright * 0.5,
      depth,
      freq: 0.4 + rand() * 1.6,
      phase: rand() * Math.PI * 2,
      tint: tintRoll < 0.12 ? 1 : tintRoll < 0.24 ? 2 : 0,
    });
  }
  return stars;
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

export default function Starfield({ hole, dive, className = '' }: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holeRef = useRef(hole);
  useEffect(() => {
    holeRef.current = hole;
  }, [hole]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let raf = 0;
    let last = 0;
    let visible = true;
    let flicker: Flicker | null = null;
    let nextFlicker = performance.now() + 1500;
    let meteor: Meteor | null = null;
    let nextMeteor = performance.now() + 9000 + Math.random() * 12000;
    // Pointer parallax, eased toward its target.
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = makeStars(width, height);
      if (reduced) draw(performance.now());
    };

    /* How much of a star survives where it is: thinned in an ellipse behind
       the prompt (the middle of the screen) and around the hole, whose own
       lensed sky the shader draws. */
    const visibility = (x: number, y: number) => {
      const cx = (x - 0.5) / 0.3;
      const cy = (y - 0.5) / 0.26;
      const behindText = smooth(0.55, 1.15, Math.sqrt(cx * cx + cy * cy));
      const h = holeRef.current;
      const aspect = width / Math.max(1, height);
      const hx = (x - h.x) * aspect;
      const hy = y - h.y;
      const nearHole = smooth(0.32, 0.62, Math.sqrt(hx * hx + hy * hy));
      return 0.18 + 0.82 * behindText * nearHole;
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      const t = now / 1000;
      const d = dive ? Math.min(1, Math.max(0, dive.get() / 0.7)) : 0;
      const fall = d * d;
      const h = holeRef.current;
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;

      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        // Pulled toward the hole as the camera falls, nearer layers first.
        const pull = fall * (0.25 + 0.6 * s.depth);
        const bx = s.x + (h.x - s.x) * pull;
        const by = s.y + (h.y - s.y) * pull;
        const px = bx * width + pointer.x * s.depth * 7;
        const py = by * height + pointer.y * s.depth * 5;

        let alpha = s.a * visibility(s.x, s.y);
        if (!reduced) alpha *= 0.72 + 0.28 * Math.sin(t * s.freq + s.phase);
        if (flicker && flicker.star === i) {
          const k = (now - flicker.start) / 420;
          if (k < 1) alpha = Math.min(0.95, alpha + (0.55 * (1 - k)) * (0.6 + 0.4 * Math.sin(k * 40)));
        }
        alpha *= 1 - smooth(0.35, 0.9, d);
        if (alpha < 0.02) continue;

        ctx.fillStyle = `rgba(${TINTS[s.tint]}, ${alpha.toFixed(3)})`;
        if (s.r < 0.8) {
          ctx.fillRect(px, py, s.r * 1.4, s.r * 1.4);
        } else {
          ctx.beginPath();
          ctx.arc(px, py, s.r, 0, Math.PI * 2);
          ctx.fill();
          // The brightest few carry a faint halo, as a lens gives them.
          if (s.a > 0.42) {
            ctx.fillStyle = `rgba(${TINTS[s.tint]}, ${(alpha * 0.12).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(px, py, s.r * 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      if (meteor) {
        const k = (now - meteor.start) / meteor.life;
        if (k >= 1 || d > 0.05) {
          meteor = null;
        } else {
          // Eased across its path, brightest in the middle of its life.
          const e = 1 - Math.pow(1 - k, 2);
          const hx = meteor.x + meteor.dx * e;
          const hy = meteor.y + meteor.dy * e;
          const len = 90;
          const norm = Math.hypot(meteor.dx, meteor.dy);
          const tx = hx - (meteor.dx / norm) * len;
          const ty = hy - (meteor.dy / norm) * len;
          const a = 0.32 * Math.sin(Math.PI * k);
          const grad = ctx.createLinearGradient(tx, ty, hx, hy);
          grad.addColorStop(0, 'rgba(232, 230, 225, 0)');
          grad.addColorStop(1, `rgba(232, 230, 225, ${a.toFixed(3)})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(hx, hy);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden || now - last < FRAME_MS) return;
      last = now;

      if (!flicker || now - flicker.start > 420) {
        if (now > nextFlicker && stars.length) {
          flicker = { star: Math.floor(Math.random() * stars.length), start: now };
          nextFlicker = now + 1600 + Math.random() * 2600;
        }
      }
      if (!meteor && now > nextMeteor && width > 0) {
        // Start high in the left half, away from the prompt and the hole,
        // and run down and to the right a short way.
        const fromLeft = Math.random() < 0.7;
        meteor = {
          x: width * (fromLeft ? 0.05 + Math.random() * 0.25 : 0.55 + Math.random() * 0.2),
          y: height * (0.04 + Math.random() * 0.2),
          dx: width * (0.12 + Math.random() * 0.08),
          dy: height * (0.06 + Math.random() * 0.06),
          start: now,
          life: 900 + Math.random() * 500,
        };
        nextMeteor = now + 15000 + Math.random() * 20000;
      }
      draw(now);
    };

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);

    if (!reduced) {
      window.addEventListener('pointermove', onPointer, { passive: true });
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onPointer);
    };
  }, [dive]);

  return <canvas ref={canvasRef} className={`block ${className}`} aria-hidden="true" />;
}
