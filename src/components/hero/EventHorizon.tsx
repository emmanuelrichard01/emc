import { useEffect, useRef, useState } from 'react';
import type { MotionValue } from 'framer-motion';

import { onCircuitSignal } from '@/lib/circuitBus';

/* ==========================================================================
   EVENT HORIZON

   The hero's background: a black hole, drawn procedurally, seen through an
   instrument.

   Why a shader rather than the video it was modelled on. The reference was a
   10-second 4K loop — 9 MB, a visible seam every ten seconds, and deaf to
   everything on the page. This is a few kilobytes of GLSL that never loops
   and listens: it renders the same Gargantua composition from first
   principles, forever, and reacts to the terminal in front of it.

   WHAT IS DRAWN (all analytic — no ray marching, no textures)
     shadow        the dark disc, radius R
     photon ring   a hairline at ~1.03R, the brightest thing on screen
     lensed arcs   the far side of the disk, bent up over the shadow and a
                   thinner secondary image under it — the look that makes it
                   read as a black hole rather than a planet with a ring
     direct disk   the near side, a thin inclined band crossing in front
     beaming       the approaching side brighter than the receding one
     turbulence    streaks — concentric in the arcs, lengthwise in the
                   band — drifting with the disk's rotation, so the gas
                   flows rather than the picture turning
     stars         sparse, and lensed: displaced away from the hole the way
                   a real deflection bends the field behind it

   HOW IT LOOKS LIKE THE SITE
   Rendered at a quarter of the display resolution and quantised to six
   tones of the current accent through a 4×4 Bayer matrix, then upscaled
   with nearest-neighbour. Physically shaped, instrument-rendered: pixels,
   not a cinematic glow — and it follows the theme toggle, including the
   hidden phosphor green.

   WHAT IT LISTENS TO (lib/circuitBus — no React state in the loop)
     burst   a keystroke or a command: the inner disk flares, then settles
     load    a command or an answer in progress: the disk spins up
     recede  output on screen: the hole dims and falls back, so text wins
   and the pointer, which tilts the camera by a degree or two.

   COST
   ~80k fragments per frame at 1440×900, a handful of noise octaves each,
   capped at 30 fps. Paused when off-screen or in a background tab. Under
   reduced motion it draws one frame and stops. Without WebGL it is a static
   CSS approximation. Never a reason for the page to feel slow.
   ========================================================================== */

const FRAG = /* glsl */ `
precision mediump float;

uniform vec2  uRes;       // low-res buffer size in pixels
uniform float uTime;
uniform float uPhase;     // accumulated disk rotation, integrated on the CPU
uniform float uEnergy;    // 0..1 — flare from keystrokes and commands
uniform float uRecede;    // 0..1 — dim and shrink while output is shown
uniform vec2  uTilt;      // pointer parallax, -1..1
uniform vec3  uAccent;
uniform vec3  uBg;
uniform vec2  uCenter;    // where the hole sits, in 0..1 of the buffer
uniform float uRadius;    // shadow radius, as a fraction of the buffer's short side
uniform float uRoll;      // disk roll, radians — the cinematic diagonal
uniform float uZoom;      // 1 at rest; grows as the visitor scrolls into the hole

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float scale = min(uRes.x, uRes.y);
  vec2 p = (frag - uCenter * uRes) / scale;
  p -= uTilt * 0.018;                    // parallax: the camera drifts, the hole stays
  p *= 1.0 + uRecede * 0.28;             // receding: smaller on screen
  // Rolled onto a diagonal — a level disk reads as a diagram, a tilted one
  // as a shot.
  float roll = uRoll + uTilt.x * 0.015;
  p = mat2(cos(roll), -sin(roll), sin(roll), cos(roll)) * p;

  float R = uRadius * uZoom;
  float r = length(p);
  float a = atan(p.y, p.x);

  // ── Behind the hole: stars, the lensed far side, the photon ring ──
  float behind = 0.0;

  // Stars, lensed: sampled from a field pushed outward around the hole.
  // One buffer pixel per star — a 2×2 block reads as debris, not distance.
  vec2 sp = p + normalize(p + 1e-4) * (R * R * 1.8) / max(r, R);
  vec2 cell = floor(sp * scale);
  float h = hash(cell);
  float star = step(0.9988, h) * (0.25 + 0.4 * hash(cell + 7.0));
  star *= 0.7 + 0.3 * sin(uTime * (0.5 + h * 2.0) + h * 40.0);
  behind += star * 0.6;

  // The far side of the disk, bent up over the shadow (thick, bright) and
  // under it (the secondary image — thinner, dimmer). Textured along the
  // angle, so it reads as streaming gas rather than a glow.
  float top = smoothstep(-0.35, 1.0, sin(a));
  float inner = R * 1.035;
  float width = mix(R * 0.5, R * 1.25, top);
  float x = (r - inner) / width;
  float arc = step(0.0, x) * exp(-x * 1.9) * smoothstep(0.0, 0.05, x);
  // Concentric: slow along the orbit, fast across it — streaks, not blots.
  float arcGas = 0.6 * fbm(vec2(a * 1.6 - uPhase * 1.4, r / R * 16.0)) + 0.4 * fbm(vec2(a * 4.0 - uPhase * 1.8, r / R * 4.0));
  behind += arc * mix(0.75, 1.7, top) * (0.45 + 1.1 * arcGas);

  // Photon ring: the hairline at the edge of the shadow.
  behind += exp(-pow((r - R * 1.02) / (R * 0.022), 2.0)) * 1.3;

  float shadow = 1.0 - smoothstep(R * 0.985, R * 1.01, r);
  behind *= 1.0 - shadow;

  // ── In front: the near side of the disk, a band across the whole hole ──
  float bandY = p.y + R * 0.3;
  float along = abs(p.x);
  float sigma = R * (0.11 + 0.035 * along / R);        // flares with distance
  float thick = exp(-pow(bandY / sigma, 2.0));
  float radial = exp(-pow((along - R * 1.2) / (R * 3.2), 2.0)) + 0.35 * exp(-pow(along / (R * 1.1), 2.0));
  radial *= 1.0 - smoothstep(R * 5.0, R * 7.5, along);
  // Streaks run along the disk and drift with its rotation; the approaching
  // side (left) is brighter — relativistic beaming, the one asymmetry that
  // makes it read as moving.
  float bandGas = fbm(vec2(p.x / R * 1.3 - uPhase * 1.2, bandY / R * 7.0));
  float beaming = clamp(1.0 - 0.28 * p.x / (R * 3.0), 0.6, 1.4);
  float band = thick * radial * beaming * (0.35 + 1.05 * bandGas);
  float cover = clamp(thick * radial * 1.4, 0.0, 1.0);  // how much it hides what is behind

  float light = behind * (1.0 - cover * 0.7) + band * 1.1;

  // Energy flares the inner disk and the arcs; receding dims everything.
  light *= 1.0 + uEnergy * 0.6 * exp(-pow((r - R * 1.35) / (R * 1.6), 2.0));
  light *= 1.0 - uRecede * 0.82;          // output on screen: text wins, decisively

  // Melt into the page: the far side of the frame from the hole fades out,
  // so it reads as something glimpsed at the edge of the screen rather than
  // a picture placed on it. The hole itself may run off the canvas.
  vec2 uv = frag / uRes;
  float reach = length((uv - uCenter) * vec2(uRes.x / uRes.y, 1.0));
  // The fade grows with the zoom, so the photon ring stays visible as it
  // sweeps across the screen on the way in.
  light *= 1.0 - smoothstep(0.45 * uZoom, 1.35 * uZoom, reach);

  // ── Tone: continuous, accent-tinted, soft-shouldered ──
  // Hybrid: the structure is rendered smooth and realistic, then mapped
  // onto the accent — dark → accent → a warm near-white at the hottest.
  float l = 1.0 - exp(-light * 1.35);
  vec3 shadowTint = mix(uBg, vec3(0.04, 0.045, 0.13), 0.55);
  vec3 base = mix(uBg, shadowTint, shadow * (1.0 - cover));
  vec3 warm = uAccent * 0.62;
  vec3 hot = mix(uAccent, vec3(1.0, 0.95, 0.87), 0.5);
  vec3 col = mix(base, warm, smoothstep(0.0, 0.5, l));
  col = mix(col, hot, smoothstep(0.5, 1.0, l));
  // Film grain, a touch — it keeps a smooth gradient from banding at this
  // resolution and gives the frame the texture of a shot, not a render.
  col += (hash(frag + fract(uTime) * 91.0) - 0.5) * 0.018;
  gl_FragColor = vec4(col, 1.0);
}
`;

const VERT = /* glsl */ `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/** Display pixels per rendered pixel. Larger is chunkier and cheaper. */
/* 2 — the hybrid: a soft grain of pixels, not a mosaic. */
const PIXEL = 2;
const FRAME_MS = 1000 / 30;

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
  const shapeRef = useRef({ center, radius, roll, zoom });
  useEffect(() => {
    shapeRef.current = { center, radius, roll, zoom };
  }, [center, radius, roll, zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false });
    if (!gl || gl.isContextLost()) {
      setSupported(false);
      return;
    }

    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('event horizon:', gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      setSupported(false);
      return;
    }
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setSupported(false);
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uRes = u('uRes'), uTime = u('uTime'), uPhase = u('uPhase'), uEnergy = u('uEnergy');
    const uRecede = u('uRecede'), uTilt = u('uTilt'), uAccent = u('uAccent'), uBg = u('uBg'), uCenter = u('uCenter');
    const uRadius = u('uRadius'), uRoll = u('uRoll'), uZoom = u('uZoom');

    /* Colours follow the theme. The accent lives in a class on <html>, so a
       class change is the only moment they can move. */
    const setColours = () => {
      gl.uniform3fv(uAccent, readHsl('--primary', [0.96, 0.62, 0.04]));
      gl.uniform3fv(uBg, readHsl('--hero-surface', [0.055, 0.058, 0.066]));
    };
    setColours();
    const themeObserver = new MutationObserver(setColours);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width / PIXEL));
      const h = Math.max(1, Math.round(rect.height / PIXEL));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, w, h);
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

    const unsubscribe = onCircuitSignal((signal) => {
      if (signal.type === 'burst') energy = Math.min(1, energy + (signal.strength ?? 0.6));
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
    let visible = true;
    const start = performance.now();

    const draw = (now: number) => {
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
      phase += dt * (0.07 + load * 0.28 + energy * 0.12);

      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform1f(uPhase, phase);
      gl.uniform1f(uEnergy, Math.min(1, energy + load * 0.35));
      gl.uniform1f(uRecede, recede);
      gl.uniform2f(uTilt, tilt.x, -tilt.y);
      const shape = shapeRef.current;
      gl.uniform2f(uCenter, shape.center.x, 1 - shape.center.y);
      gl.uniform1f(uRadius, shape.radius);
      gl.uniform1f(uRoll, shape.roll);
      gl.uniform1f(uZoom, shape.zoom?.get() ?? 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      // Full frame rate while the visitor is scrolling into the hole — the
      // dive has to move with the scroll, not a frame behind it.
      const diving = (shapeRef.current.zoom?.get() ?? 1) > 1.01;
      if (!diving && now - lastDraw < FRAME_MS) return;
      lastDraw = now;
      draw(now);
    };

    const startLoop = () => {
      if (reduced || raf || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stopLoop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    // One frame immediately, so there is never a blank background — and under
    // reduced motion, that frame is all there is.
    draw(performance.now());
    startLoop();

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) startLoop();
      else stopLoop();
    });
    intersection.observe(canvas);
    const onVisibility = () => (document.hidden ? stopLoop() : startLoop());
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopLoop();
      unsubscribe();
      themeObserver.disconnect();
      resizeObserver.disconnect();
      intersection.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      /* No loseContext() here. The canvas outlives an effect re-run (React
         runs effects twice in development, and a remount can reuse the
         node), and getContext() on a canvas whose context was deliberately
         lost returns that dead context — the shader then fails to compile
         and the page silently shows the CSS fallback. The context is freed
         with the canvas. */
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
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
      style={{ imageRendering: 'pixelated', width: '100%', height: '100%', display: 'block' }}
    />
  );
}
