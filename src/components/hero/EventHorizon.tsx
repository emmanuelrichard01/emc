import { useEffect, useRef, useState } from 'react';
import type { MotionValue } from 'framer-motion';

import { onCircuitSignal } from '@/lib/circuitBus';

/* ==========================================================================
   EVENT HORIZON

   The hero's background: a black hole, ray-traced, seen through an
   instrument.

   Why a shader rather than the video it was modelled on. The reference was a
   10-second 4K loop — 9 MB, a visible seam every ten seconds, and deaf to
   everything on the page. This is a few kilobytes of GLSL that never loops
   and listens.

   WHAT IS COMPUTED, NOT DRAWN
   Every pixel fires a ray from the camera and follows it through curved
   spacetime around a Schwarzschild black hole, using the compact Cartesian
   form of the null geodesic (Rs = 1):

       d²x/dλ² = −1.5 · h² · x / |x|⁵        h = |x × dx/dλ|

   The accretion disk is what it really is — a *flat*, thin ring in the
   equatorial plane, from the innermost stable orbit (3 Rs) outward — and a
   ray collects its light wherever it crosses that plane inside the ring.
   The famous look is then not painted; it falls out of the physics:

     lensed halo    light from the far side of the flat disk, bent up and
                    over the hole — and a second image of it bent underneath
     photon ring    rays that loop around the hole before escaping pile up
                    in a thin bright circle at the shadow's edge (b ≈ 2.6 Rs)
     shadow         rays that fall through the horizon: nothing comes back
     beaming        the gas orbits at up to ~0.6c; the side moving toward
                    the camera is Doppler-boosted (intensity ∝ g³) and
                    whiter, the side moving away dimmer and warmer, and
                    everything near the hole is gravitationally dimmed
     disk light     a Novikov–Thorne-like profile: zero at the inner edge,
                    peaking just outside it, falling off with radius
     turbulence     streaks that orbit at the Keplerian rate (ω ∝ r^−1.5),
                    so the inner gas visibly laps the outer
     stars          looked up along each ray's *final* direction, so the
                    background is lensed exactly as the disk is

   HOW IT LOOKS LIKE THE SITE
   The luminance the tracer produces is tone-mapped onto the current accent
   — dark → accent → a warm near-white at the hottest — so it follows the
   theme toggle, including the hidden phosphor green. Half resolution, a
   touch of film grain, faded into the page by a mask in Hero.tsx.

   WHAT IT LISTENS TO (lib/circuitBus — no React state in the loop)
     burst   a keystroke or a command: the inner disk flares, then settles
     load    a command or an answer in progress: the disk spins up
     recede  output on screen: the hole dims and falls back, so text wins
   and the pointer, which moves the camera by a fraction of a degree.

   COST
   ≤ 96 adaptive integration steps per pixel (small near the hole, large far
   from it), at half resolution, capped at 30 fps outside the dive. The
   loop measures its own frame time and coarsens the resolution on a slow
   GPU rather than dropping frames. Paused off-screen and in background
   tabs; one still frame under reduced motion; a CSS gradient without WebGL.
   ========================================================================== */

const FRAG = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;       // buffer size in pixels
uniform float uTime;
uniform float uPhase;     // accumulated disk rotation, integrated on the CPU
uniform float uEnergy;    // 0..1 — flare from keystrokes and commands
uniform float uRecede;    // 0..1 — dim and shrink while output is shown
uniform vec2  uTilt;      // pointer parallax, -1..1
uniform vec3  uAccent;
uniform vec3  uBg;
uniform vec2  uCenter;    // where the hole sits, in 0..1 of the buffer
uniform float uRadius;    // shadow radius on screen, as a fraction of the buffer's short side
uniform float uRoll;      // camera roll, radians — the cinematic diagonal
uniform float uZoom;      // 1 at rest; grows as the visitor scrolls into the hole

// Units: Schwarzschild radius Rs = 1.
const float RIN = 3.0;       // innermost stable circular orbit
const float ROUT = 15.0;     // outer edge of the visible disk
const float BCRIT = 2.598;   // critical impact parameter, 3√3/2 — the shadow's edge
const float CAM = 30.0;      // camera distance
const int   STEPS = 96;

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

// Light emitted toward the camera by the disk at \`hit\`, for a photon
// arriving along \`toCam\`. Returns luminance (x) and a warmth shift (y):
// positive = blueshifted (whiter), negative = redshifted (warmer).
vec2 disk(vec3 hit, vec3 toCam) {
  float r = length(hit.xz);

  // Novikov–Thorne-like radial profile, normalised to peak at ~1.
  float x = RIN / r;
  float profile = 17.6 * x * x * x * (1.0 - sqrt(x));

  // Keplerian streaks: the texture is rotated at ω ∝ r^-1.5, so inner gas
  // laps the outer. Sampled on a circle, so there is no seam at ±π.
  float ang = atan(hit.z, hit.x) + uPhase * 9.0 * pow(r, -1.5);
  vec2 onCircle = vec2(cos(ang), sin(ang));
  float streak = fbm(vec2(r * 2.4, 0.0) + onCircle * 1.6);
  float clump = fbm(onCircle * 3.5 + r * 0.6);
  float gas = 0.35 + 1.05 * (0.65 * streak + 0.35 * clump);

  // Relativistic beaming. Orbital speed in Schwarzschild, capped below c;
  // gas orbits counter-clockwise seen from above.
  float beta = min(0.62, sqrt(0.5 / max(r - 1.0, 0.5)));
  vec3 v = normalize(vec3(-hit.z, 0.0, hit.x));
  float gamma = inversesqrt(1.0 - beta * beta);
  float doppler = 1.0 / (gamma * (1.0 - beta * dot(v, toCam)));
  float g = doppler * sqrt(max(0.0, 1.0 - 1.0 / r));   // + gravitational redshift
  float boost = g * g * g;

  return vec2(profile * gas * boost, g - 1.0);
}

// Sparse stars on the celestial sphere, sampled along the lensed direction.
// Each is a point at a random spot in its cell with a gaussian falloff, and
// the cells are a couple of pixels across at the resting lens — so a star is
// a crisp point, not a cell-shaped smear stretched by the projection.
float stars(vec3 d) {
  vec2 sph = vec2(atan(d.z, d.x), asin(clamp(d.y, -1.0, 1.0)));
  vec2 g = sph * 900.0;
  vec2 cell = floor(g);
  float h = hash(cell);
  if (h < 0.9985) return 0.0;
  vec2 at = vec2(hash(cell + 1.7), hash(cell + 5.3)) * 0.6 + 0.2;
  vec2 q = fract(g) - at;
  float s = exp(-dot(q, q) * 70.0) * (0.3 + 0.7 * hash(cell + 3.1));
  return s * (0.75 + 0.25 * sin(uTime * (0.4 + h * 1.7) + h * 50.0));
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float scale = min(uRes.x, uRes.y);

  // Screen offset from where the hole sits, rolled onto the diagonal.
  vec2 s = (frag - uCenter * uRes) / scale;
  s *= 1.0 + uRecede * 0.28;
  float roll = uRoll + uTilt.x * 0.015;
  s = mat2(cos(roll), -sin(roll), sin(roll), cos(roll)) * s;

  // Camera just above the disk plane, looking at the hole. The field of
  // view is set so the shadow's edge lands at uRadius·uZoom on screen —
  // zooming is narrowing the lens, as a real camera would.
  float incl = 0.1 + uTilt.y * 0.012;
  vec3 pos = CAM * vec3(0.0, sin(incl), -cos(incl));
  vec3 fwd = normalize(-pos);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
  vec3 up = cross(fwd, right);
  float k = (BCRIT / CAM) / (uRadius * uZoom);
  vec3 dir = normalize(fwd + (s.x * right + s.y * up) * k);

  // ── Trace ──
  vec3 c = cross(pos, dir);
  float h2 = dot(c, c);
  float light = 0.0;
  float warmth = 0.0;
  float trans = 1.0;
  bool captured = false;

  for (int i = 0; i < STEPS; i++) {
    float r2 = dot(pos, pos);
    float r = sqrt(r2);
    if (r < 1.0) { captured = true; break; }
    if (r > CAM + 2.0 && dot(pos, dir) > 0.0) break;   // escaped outward

    // Small steps where spacetime bends hardest, large ones far away.
    float dt = clamp(0.09 * r - 0.05, 0.035, 1.6);
    vec3 prev = pos;
    dir += -1.5 * h2 * pos / (r2 * r2 * r) * dt;
    pos += dir * dt;

    // Crossed the equatorial plane: did it pass through the disk?
    if (prev.y * pos.y < 0.0) {
      vec3 hit = mix(prev, pos, prev.y / (prev.y - pos.y));
      float rr = length(hit.xz);
      if (rr > RIN && rr < ROUT) {
        vec2 e = disk(hit, -normalize(dir));
        // Thin but not quite opaque, and soft at both edges.
        float alpha = 0.92 * smoothstep(RIN, RIN * 1.06, rr) * (1.0 - smoothstep(ROUT * 0.62, ROUT, rr));
        light += trans * e.x * alpha;
        warmth += trans * e.y * alpha * e.x;
        trans *= 1.0 - alpha;
        if (trans < 0.02) break;
      }
    }
  }
  if (!captured) light += trans * stars(normalize(dir));

  // Photon ring. Rays with impact parameter near b = 3√3/2 orbit the hole
  // (in principle, indefinitely) before escaping, stacking up ever-thinner
  // images of the disk into one bright hairline at the shadow's edge. The
  // step budget cannot follow a ray through many orbits, so the ring is
  // added where theory puts it — at b_crit — and dimmed wherever the disk
  // passes in front of it, exactly as the traced light is.
  float b = sqrt(h2);
  light += trans * 1.15 * exp(-pow((b - BCRIT) / 0.04, 2.0));

  // Energy flares the disk; receding dims everything.
  light *= (1.0 + uEnergy * 0.5) * (1.0 - uRecede * 0.82);

  // Melt into the page away from the hole; the fade grows with the zoom so
  // the photon ring stays visible as it sweeps across the screen.
  vec2 uv = frag / uRes;
  float reach = length((uv - uCenter) * vec2(uRes.x / uRes.y, 1.0));
  light *= 1.0 - smoothstep(0.45 * uZoom, 1.35 * uZoom, reach);

  // ── Tone: continuous, accent-tinted, soft-shouldered ──
  float l = 1.0 - exp(-light * 0.95);
  float w = clamp(warmth / max(light, 1e-3), -0.5, 0.5);
  // The shadow is where no light escapes: black, and a shade darker than the
  // surface around it so it reads as a void rather than as the page. (It was
  // tinted navy after the reference video, which read as a blue cast.)
  vec3 base = captured ? uBg * 0.3 : uBg;
  vec3 warm = uAccent * 0.6;
  // The approaching side runs whiter, the receding side deeper — beaming,
  // made visible as colour as well as brightness.
  vec3 hot = mix(uAccent, vec3(1.0, 0.96, 0.9), clamp(0.45 + w * 0.9, 0.0, 0.95));
  vec3 col = mix(base, warm, smoothstep(0.0, 0.5, l));
  col = mix(col, hot, smoothstep(0.5, 1.0, l));
  col += (hash(frag + fract(uTime) * 91.0) - 0.5) * 0.018;
  gl_FragColor = vec4(col, 1.0);
}
`;

const VERT = /* glsl */ `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/** Display pixels per rendered pixel, to start with. 2 is the hybrid: a soft
    grain of pixels, not a mosaic. Raised automatically on a slow GPU. */
const PIXEL = 2;
/** The coarsest the renderer will go before it stops trying. */
const PIXEL_MAX = 4;
const FRAME_MS = 1000 / 30;
/* The page's own frame budget. If the browser is delivering frames slower
   than this on average — which, with the tracer the heaviest thing on the
   page, means the GPU is behind — the resolution steps down. */
const SLOW_FRAME_MS = 1000 / 24;
const SAMPLES = 45;

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

    let pixel = PIXEL;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width / pixel));
      const h = Math.max(1, Math.round(rect.height / pixel));
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
    // Adaptive resolution: a running average of the interval between the
    // browser's frames, judged every SAMPLES frames.
    let lastTick = 0;
    let frameAvg = 0;
    let samples = 0;
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

    const startLoop = () => {
      if (reduced || raf || !visible || document.hidden) return;
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
