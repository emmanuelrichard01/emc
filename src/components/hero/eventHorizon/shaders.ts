/* ==========================================================================
   EVENT HORIZON — SHADERS

   One tracer, two ways out:

     HDR     (WebGL2 with float render targets) the tracer writes linear
             radiance — light, light-weighted Doppler shift, and whether
             the ray fell in — and the frame is finished downstream:
             temporal accumulation, bloom, tone and grain (see renderer.ts)
     DIRECT  (WebGL1, or no float targets) the tracer tones its own output,
             as the whole renderer once did

   The tracer is written in GLSL ES 1.0 and lifted to 3.0 by a header, so
   the two paths can never trace different black holes.
   ========================================================================== */

import { BCRIT, KEPLER, MAX_SPOTS, RIN } from './physics';

const num = (n: number) => n.toFixed(4);

/** The shared tone curve: luminance onto the site's accent, dark → accent → warm white. */
const TONE = /* glsl */ `
vec3 tone(float light, float warmth, float captured, vec3 accent, vec3 bg) {
  float l = 1.0 - exp(-light * 0.95);
  float w = clamp(warmth / max(light, 1e-3), -0.5, 0.5);
  // The shadow is where no light escapes: a shade darker than the surface
  // around it, so it reads as a void rather than as the page.
  vec3 base = mix(bg, bg * 0.3, captured);
  vec3 warm = accent * 0.6;
  // The approaching side runs whiter, the receding side deeper — beaming,
  // made visible as colour as well as brightness.
  vec3 hot = mix(accent, vec3(1.0, 0.96, 0.9), clamp(0.45 + w * 0.9, 0.0, 0.95));
  vec3 col = mix(base, warm, smoothstep(0.0, 0.5, l));
  return mix(col, hot, smoothstep(0.5, 1.0, l));
}
`;

const TRACE_BODY = /* glsl */ `
uniform vec2  uRes;       // trace buffer size in pixels
uniform vec2  uJitter;    // sub-pixel offset this frame (HDR only)
uniform float uTime;
uniform float uPhase;     // accumulated disk rotation, integrated on the CPU
uniform float uEnergy;    // 0..1 — flare from keystrokes and commands
uniform float uRecede;    // 0..1 — dim and shrink while output is shown
uniform vec2  uTilt;      // pointer parallax, -1..1
uniform vec2  uCenter;    // where the hole sits, in 0..1 of the buffer
uniform float uRoll;      // camera roll, radians — the cinematic diagonal
uniform float uZoom;      // 1 at rest; grows as the visitor scrolls into the hole
uniform float uCam;       // camera distance — falls during the dive
uniform float uIncl;      // camera elevation above the disk plane
uniform float uLens;      // screen offset → tangent of the view angle
uniform vec4  uSpots[SPOTS]; // hot spots: radius, angle, brightness, arc²
#ifdef DIRECT
uniform vec3  uAccent;
uniform vec3  uBg;
#endif

const float RIN = ${num(RIN)};       // innermost stable circular orbit
const float ROUT = 15.0;             // outer edge of the visible disk
const float BCRIT = ${num(BCRIT)};   // critical impact parameter — the shadow's edge
const float KEPLER = ${num(KEPLER)};
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

// Emitted brightness of the gas at a point of the disk, before beaming:
// the radial profile, the turbulence, and any hot spot passing through.
float gas(vec3 p) {
  float r = length(p.xz);
  float a = atan(p.z, p.x);

  // Novikov–Thorne-like radial profile, normalised to peak at ~1.
  float x = RIN / r;
  float profile = 17.6 * x * x * x * (1.0 - sqrt(x));

  // Keplerian streaks: the texture turns at ω ∝ r^-1.5 in the sense the gas
  // orbits (+angle), so inner gas laps the outer. Sampled on a circle, so
  // there is no seam at ±π.
  float ang = a - uPhase * KEPLER * pow(r, -1.5);
  vec2 onCircle = vec2(cos(ang), sin(ang));
  float streak = fbm(vec2(r * 2.4, 0.0) + onCircle * 1.6);
  float clump = fbm(onCircle * 3.5 + r * 0.6);
  float e = profile * (0.35 + 1.05 * (0.65 * streak + 0.35 * clump));

  // Hot spots, stretched along their orbit as the disk shears them.
  for (int i = 0; i < SPOTS; i++) {
    vec4 s = uSpots[i];
    if (s.z <= 0.0) continue;
    float dr = r - s.x;
    float da = a - s.y;
    da -= 6.2831853 * floor((da + 3.1415927) / 6.2831853);
    float arc = da * r;
    e += s.z * exp(-dr * dr * 5.5 - arc * arc / s.w) * (0.75 + 0.5 * streak);
  }
  return e;
}

// Relativistic shift of light from gas orbiting at radius r, whose velocity
// makes cosine \`c\` with the photon's direction of travel. Returns g, the
// ratio of received to emitted frequency: Doppler, with the gravitational
// shift from the gas's radius up to the camera's.
float shift(float r, float c) {
  float beta = min(0.62, sqrt(0.5 / max(r - 1.0, 0.5)));
  float gamma = inversesqrt(1.0 - beta * beta);
  float doppler = 1.0 / (gamma * (1.0 - beta * c));
  return doppler * sqrt(max(0.0, 1.0 - 1.0 / r) / (1.0 - 1.0 / uCam));
}

// How hard Doppler beaming weighs brightness. Physically it is g cubed, and
// at the disk's ~0.6c that leaves the receding side a faint smear: correct,
// and on a first screen it reads as half the hole fading out. Interstellar's
// renderers made the same call and dropped beaming from brightness
// altogether. This keeps it, tempered: the approaching side still runs
// brighter and (through warmth, untouched) whiter, while the far side keeps
// its body.
const float BEAM = 1.35;

// Light the disk sends toward the camera from \`hit\`, for a photon travelling
// along \`toCam\`: luminance (x) and warmth (y), positive when blueshifted.
vec2 disk(vec3 hit, vec3 toCam) {
  float r = length(hit.xz);
  // Gas orbits counter-clockwise seen from above.
  vec3 v = normalize(vec3(-hit.z, 0.0, hit.x));
  float g = shift(r, dot(v, toCam));
  return vec2(gas(hit) * pow(g, BEAM), g - 1.0);
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

// What the tracer hands on: toned colour (DIRECT) or linear radiance.
vec4 result(float light, float warmth, float captured, vec2 frag) {
#ifdef DIRECT
  vec3 col = tone(light, warmth, captured, uAccent, uBg);
  col += (hash(frag + fract(uTime) * 91.0) - 0.5) * 0.018;
  return vec4(col, 1.0);
#else
  return vec4(light, warmth, captured, 1.0);
#endif
}

void main() {
  vec2 frag = gl_FragCoord.xy + uJitter;
  float scale = min(uRes.x, uRes.y);

  // Melt into the page away from the hole; the fade grows with the zoom so
  // the photon ring stays visible as it sweeps across the screen. Worked
  // out first: where it is zero — a good part of the screen at rest — the
  // ray is never traced at all.
  vec2 uv = frag / uRes;
  float reach = length((uv - uCenter) * vec2(uRes.x / uRes.y, 1.0));
  float fade = 1.0 - smoothstep(0.45 * uZoom, 1.35 * uZoom, reach);
  if (fade <= 0.0) {
    OUT = result(0.0, 0.0, 0.0, frag);
    return;
  }

  // Screen offset from where the hole sits, rolled onto the diagonal.
  vec2 s = (frag - uCenter * uRes) / scale;
  s *= 1.0 + uRecede * 0.28;
  float roll = uRoll + uTilt.x * 0.015;
  s = mat2(cos(roll), -sin(roll), sin(roll), cos(roll)) * s;

  // A static camera above the disk plane, looking at the hole. The lens
  // (uLens, from physics.ts) puts the shadow's edge at uRadius·uZoom on
  // screen at whatever distance the camera has fallen to.
  float incl = uIncl + uTilt.y * 0.012;
  vec3 pos = uCam * vec3(0.0, sin(incl), -cos(incl));
  vec3 fwd = normalize(-pos);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
  vec3 up = cross(fwd, right);
  vec3 look = normalize(fwd + (s.x * right + s.y * up) * uLens);

  // The camera's sky → the tracer's coordinates. A static observer's frame
  // is squeezed radially by √(1 − Rs/r); undoing that squeeze on the view
  // direction is the whole of gravitational aberration. At rest (r = 30) it
  // is a 2% correction; by the end of the dive it is what makes the shadow
  // swallow the sky.
  float mu = dot(look, fwd);
  vec3 dir = normalize(look + (sqrt(1.0 - 1.0 / uCam) - 1.0) * mu * fwd);
  // True impact parameter of this ray, from what the camera sees.
  float b = uCam * sqrt(max(0.0, 1.0 - mu * mu)) * inversesqrt(1.0 - 1.0 / uCam);

  // ── Trace ──
  // The Cartesian form of the Schwarzschild null geodesic:
  //     d²x/dλ² = −1.5 · h² · x / |x|⁵        h = |x × dx/dλ|
  // integrated with velocity Verlet — second order, for the price of one
  // force evaluation a step, like the Euler it replaced.
  // The radius from each step's force evaluation is carried into the next
  // step's tests, so a step costs one square root, as Euler's did.
  vec3 L = cross(pos, dir);
  float h2 = dot(L, L);
  float k = -1.5 * h2;
  float r2 = dot(pos, pos);
  float r = sqrt(r2);
  vec3 acc = pos * (k / (r2 * r2 * r));
  float escape = max(uCam, ROUT) + 2.0;
  float light = 0.0;
  float warmth = 0.0;
  float trans = 1.0;
  float captured = 0.0;

  for (int i = 0; i < STEPS; i++) {
    if (r < 1.0) { captured = 1.0; break; }
    if (r > escape && dot(pos, dir) > 0.0) break;   // escaped outward

    // Small steps where spacetime bends hardest, large ones far away.
    float dt = clamp(0.09 * r - 0.05, 0.035, 1.6);
    vec3 prev = pos;
    pos += (dir + 0.5 * dt * acc) * dt;
    r2 = dot(pos, pos);
    r = sqrt(r2);
    vec3 next = pos * (k / (r2 * r2 * r));
    dir += (acc + next) * (0.5 * dt);
    acc = next;

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
  if (captured < 0.5) light += trans * stars(normalize(dir));

  // ── Photon ring ──
  // Rays with impact parameter near b_crit orbit the hole before escaping,
  // each extra half-orbit adding another, thinner image of the disk; they
  // stack into a bright hairline at the shadow's edge. The step budget cannot
  // follow a ray through those orbits, so the ring is placed where theory
  // puts it — but it is lit by the disk, not painted: its light is the gas
  // it last passed through, where the ray's orbit crosses the disk plane,
  // beamed by the angle between the two. That angle is the tilt of the
  // ray's orbit (cos χ = L̂·ŷ), so the ring is brighter and whiter on the
  // side where light orbits with the gas, turbulent like the disk, and
  // carries every hot spot around it.
  float ringw = exp(-pow((b - BCRIT) / 0.045, 2.0));
  if (ringw > 0.004) {
    vec3 Lh = normalize(L);
    vec3 node = cross(vec3(0.0, 1.0, 0.0), Lh);
    node = length(node) > 1e-3 ? normalize(node) : right;
    float g = shift(4.5, Lh.y);
    float em = 0.5 * (gas(node * 4.5) + gas(-node * 4.5)) * pow(g, BEAM);
    float ring = trans * ringw * 0.9 * em;
    light += ring;
    warmth += ring * (g - 1.0);
  }

  // Energy flares the disk; receding dims everything.
  float m = fade * (1.0 + uEnergy * 0.5) * (1.0 - uRecede * 0.82);
  OUT = result(light * m, warmth * m, captured, frag);
}
`;

const ES1_HEADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#define OUT gl_FragColor
`;

const ES3_HEADER = `#version 300 es
precision highp float;
out vec4 fragOut;
#define OUT fragOut
`;

/** The tracer. `hdr` picks the GLSL ES 3.0 build that writes linear radiance. */
export function traceShader(hdr: boolean): string {
  const defines = `#define SPOTS ${MAX_SPOTS}\n${hdr ? '' : '#define DIRECT\n'}`;
  return (hdr ? ES3_HEADER : ES1_HEADER) + defines + (hdr ? '' : TONE) + TRACE_BODY;
}

export const VERT_ES1 = /* glsl */ `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const VERT_ES3 = /* glsl */ `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/*
   Temporal accumulation. Each frame is traced from a slightly different
   point inside every pixel; blended over time, the frames converge on a
   supersampled image — the hairline photon ring and the point stars
   resolve instead of crawling. History is reprojected for the dive's zoom
   (every point moves radially from the hole by the ratio of the lenses)
   and clamped to the range of the current frame's neighbourhood, so a
   flare or a hot spot is never smeared by a stale frame.
*/
export const RESOLVE = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uCur;
uniform sampler2D uPrev;
uniform vec2 uRes;
uniform vec2 uCenterPx;
uniform float uReproject;  // this frame's lens scale over last frame's
uniform float uBlend;      // weight of the new frame
out vec4 fragOut;

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  ivec2 hi = ivec2(uRes) - 1;
  vec4 cur = texelFetch(uCur, p, 0);
  // The neighbourhood as a cross: five taps, near enough the full nine.
  vec4 a = texelFetch(uCur, clamp(p + ivec2(1, 0), ivec2(0), hi), 0);
  vec4 b = texelFetch(uCur, clamp(p - ivec2(1, 0), ivec2(0), hi), 0);
  vec4 c = texelFetch(uCur, clamp(p + ivec2(0, 1), ivec2(0), hi), 0);
  vec4 d = texelFetch(uCur, clamp(p - ivec2(0, 1), ivec2(0), hi), 0);
  vec4 lo = min(cur, min(min(a, b), min(c, d)));
  vec4 up = max(cur, max(max(a, b), max(c, d)));
  vec2 was = uCenterPx + (gl_FragCoord.xy - uCenterPx) * uReproject;
  if (any(lessThan(was, vec2(0.0))) || any(greaterThan(was, uRes))) {
    fragOut = cur;
    return;
  }
  vec4 prev = clamp(texture(uPrev, was / uRes), lo, up);
  fragOut = mix(prev, cur, uBlend);
}
`;

/* Bloom: a dual-filter blur pyramid. Downsampling halves the image each
   level with a five-tap filter; upsampling walks back up with a tent,
   adding each level to the one above. The result is a wide, soft glow that
   costs a handful of taps per pixel of ever-smaller buffers. */
export const DOWN = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uTexel;   // one source texel, in uv
uniform vec2 uRes;     // destination size
out vec4 fragOut;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec4 c = texture(uSrc, uv) * 4.0;
  c += texture(uSrc, uv - uTexel);
  c += texture(uSrc, uv + uTexel);
  c += texture(uSrc, uv + vec2(uTexel.x, -uTexel.y));
  c += texture(uSrc, uv - vec2(uTexel.x, -uTexel.y));
  fragOut = c / 8.0;
}
`;

export const UP = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uSrc;    // the smaller level, upsampled
uniform sampler2D uBase;   // this level's own downsample
uniform vec2 uTexel;
uniform vec2 uRes;
out vec4 fragOut;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 t = uTexel;
  vec4 c = texture(uSrc, uv) * 4.0;
  c += (texture(uSrc, uv + vec2(t.x, 0.0)) + texture(uSrc, uv - vec2(t.x, 0.0))
      + texture(uSrc, uv + vec2(0.0, t.y)) + texture(uSrc, uv - vec2(0.0, t.y))) * 2.0;
  c += texture(uSrc, uv + t) + texture(uSrc, uv - t)
     + texture(uSrc, uv + vec2(t.x, -t.y)) + texture(uSrc, uv - vec2(t.x, -t.y));
  fragOut = texture(uBase, uv) + c / 16.0;
}
`;

/*
   The finish, at trace resolution — the browser's compositor scales the
   canvas up with the same bilinear filter this pass would, for free. The
   glow is mixed in as a fraction of the light (energy-conserving, so
   nothing brightens; the brightest light simply spreads — the photon ring
   and the approaching side bloom, the dim outer disk barely does), then
   it is toned onto the accent and grained.
*/
export const COMPOSITE = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uHist;
uniform sampler2D uBloom;
uniform vec2 uOut;
uniform float uBloomMix;
uniform float uBloomNorm;  // the pyramid sums its levels; this averages them
uniform float uTime;
uniform vec3 uAccent;
uniform vec3 uBg;
out vec4 fragOut;
${TONE}
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  vec4 h = texture(uHist, uv);
  vec4 bl = texture(uBloom, uv) * uBloomNorm;
  float light = mix(h.r, bl.r, uBloomMix);
  float warmth = mix(h.g, bl.g, uBloomMix);
  vec3 col = tone(light, warmth, h.b, uAccent, uBg);
  // Grain strongest in the mid-tones, as in film; none in the void.
  float l = 1.0 - exp(-light);
  col += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * (0.012 + 0.03 * l * (1.0 - l));
  fragOut = vec4(col, 1.0);
}
`;
