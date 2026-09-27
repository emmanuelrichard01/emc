/* ==========================================================================
   EVENT HORIZON — THE CPU HALF OF THE PHYSICS

   Everything the shader needs that is cheaper, or only possible, to work out
   once per frame rather than once per pixel: where the camera is, how wide
   its lens must be, and the hot spots orbiting in the disk. Pure functions
   and one small simulation, so all of it is unit-tested
   (physics.test.ts) — nothing here touches WebGL.

   Units throughout: Schwarzschild radius Rs = 1.
   ========================================================================== */

/** Critical impact parameter, 3√3/2 — rays aimed inside it are captured. */
export const BCRIT = (3 * Math.sqrt(3)) / 2;
/** Innermost stable circular orbit: the disk's inner edge. */
export const RIN = 3;

/* ── The camera: a static observer, falling during the dive ─────────────── */

/** Camera distance at rest — far enough that the view is nearly flat. */
export const CAM_REST = 30;
/** Where the dive ends: inside the disk's outer edge, above its inner one. */
export const CAM_NEAR = 5.2;

/**
 * Angular radius of the shadow on the sky of a static observer at distance
 * `d`: sin α = (b_crit / d) · √(1 − 1/d). The √ is gravitational aberration —
 * the observer's own frame is squeezed radially — and is why the shadow
 * swells faster than perspective alone as the camera falls in.
 */
export function shadowAngle(d: number): number {
  return Math.asin(Math.min(1, (BCRIT / d) * Math.sqrt(1 - 1 / d)));
}

/**
 * The lens: the factor that turns a screen offset (in short-sides from the
 * hole) into the tangent of an angle off the camera axis. Chosen so the
 * shadow's edge lands at exactly `radius · zoom` on screen at any distance —
 * the contract Hero.tsx's CSS mask is built on — which makes the dive a
 * dolly zoom: the camera moves in while the lens widens to keep the frame,
 * so the shadow grows as Hero asks and the perspective around it (the disk
 * foreshortening, the sky squeezing into the ring) changes as a real fall
 * would.
 */
export function lensFactor(d: number, radius: number, zoom: number): number {
  return Math.tan(shadowAngle(d)) / (radius * zoom);
}

/**
 * Camera distance for a scroll zoom. Falls quickly at first and then
 * slows, so most of the change in perspective happens while the photon ring
 * is still on screen to show it; it approaches CAM_NEAR and never reaches
 * the disk's inner edge.
 */
export function cameraDistance(zoom: number): number {
  const z = Math.max(1, zoom);
  return CAM_NEAR + (CAM_REST - CAM_NEAR) / Math.pow(z, 0.9);
}

/**
 * Camera elevation above the disk plane, radians. Grazing at rest — the
 * cinematic edge-on view — and rising as it falls, so the camera flies over
 * the disk rather than into it.
 */
export function cameraInclination(d: number): number {
  const t = (CAM_REST - d) / (CAM_REST - CAM_NEAR);
  return 0.1 + 0.22 * Math.max(0, Math.min(1, t));
}

/* ── Hot spots ──────────────────────────────────────────────────────────── */

/*
   Flares near real black holes are compact clumps of hot gas orbiting just
   outside the innermost stable orbit — GRAVITY watched them circle Sgr A* in
   2018. Here the prompt feeds them:

     gather   keystrokes collect into one clump in the outer disk, which
              orbits there and brightens as the visitor types
     fall     running the command releases it (or it goes by itself if the
              visitor stops): it spirals inward, faster and hotter, sheared
              into an arc by the disk's differential rotation, until it
              reaches the inner edge and plunges — gone

   The shader treats each as extra emission in the disk, so a spot is
   Doppler-beamed and lensed like the rest of the gas: it flashes each time
   it swings toward the camera, and appears in the secondary image beneath
   the hole and in the photon ring as well as in the primary.
*/

export const MAX_SPOTS = 6;

/** Orbital angular speed per unit of disk phase, as the shader uses it. */
export const KEPLER = 9;

export interface HotSpot {
  r: number;
  /** World angle, radians, in the same sense the gas orbits. */
  phi: number;
  /** 0..1, how much gas the clump holds. */
  amp: number;
  /** Seconds since it started falling (or gathering). */
  age: number;
  falling: boolean;
}

/** Where gathering clumps sit: the outer, dimmer part of the disk. */
const GATHER_R = 10.5;
/** A clump left alone this long falls anyway. */
const GATHER_MAX_S = 3.5;
/** Signals at or above this are commands; below, keystrokes. */
const COMMAND = 0.3;

export class HotSpots {
  readonly spots: HotSpot[] = [];
  private readonly random: () => number;

  constructor(random: () => number = Math.random) {
    this.random = random;
  }

  /** Feeds a burst from the prompt into the disk. */
  feed(strength: number): void {
    const gathering = this.spots.find((s) => !s.falling);
    if (strength < COMMAND) {
      const spot = gathering ?? this.spawn();
      spot.amp = Math.min(1, spot.amp + strength * 0.9);
      spot.age = 0;
      return;
    }
    const spot = gathering ?? this.spawn();
    spot.amp = Math.min(1.4, spot.amp + strength);
    spot.falling = true;
    spot.age = 0;
  }

  /**
   * Advances every spot by `dt` seconds, while the disk's own phase advanced
   * by `dPhase` — so a spot co-moves with the gas around it at the same
   * Keplerian rate, whatever the disk's spin.
   */
  step(dt: number, dPhase: number): void {
    for (const s of this.spots) {
      s.age += dt;
      s.phi += dPhase * KEPLER * Math.pow(s.r, -1.5);
      if (!s.falling) {
        if (s.age > GATHER_MAX_S) {
          s.falling = true;
          s.age = 0;
        }
        continue;
      }
      // Inspiral, quickening as it goes: ~6 s from the gathering radius.
      s.r -= dt * 0.55 * Math.pow(GATHER_R / s.r, 1.5);
      // At the inner edge there is no stable orbit left: it plunges.
      if (s.r < RIN + 0.35) s.amp *= Math.exp(-dt * 6);
    }
    for (let i = this.spots.length - 1; i >= 0; i--) {
      const s = this.spots[i];
      if (s.amp < 0.01 || s.r < RIN) this.spots.splice(i, 1);
    }
  }

  /**
   * Packs the spots for the shader, four floats each: radius, angle, emitted
   * brightness, and the square of the clump's length along its orbit (it
   * shears out into an arc as it falls). Empty slots have zero brightness.
   */
  pack(out: Float32Array): Float32Array {
    out.fill(0);
    this.spots.forEach((s, i) => {
      // Hotter as it falls: dissipation rises steeply toward the hole.
      const heat = s.falling ? Math.pow(GATHER_R / s.r, 1.2) : 0.55;
      const arc = 0.7 + (s.falling ? s.age * 0.45 : 0);
      out[i * 4] = s.r;
      out[i * 4 + 1] = s.phi;
      out[i * 4 + 2] = s.amp * heat * 1.3;
      out[i * 4 + 3] = arc * arc;
    });
    return out;
  }

  private spawn(): HotSpot {
    if (this.spots.length >= MAX_SPOTS) {
      // Full: the faintest clump makes way.
      let faintest = 0;
      this.spots.forEach((s, i) => {
        if (s.amp < this.spots[faintest].amp) faintest = i;
      });
      this.spots.splice(faintest, 1);
    }
    const spot: HotSpot = {
      r: GATHER_R + (this.random() - 0.5) * 1.5,
      phi: this.random() * Math.PI * 2,
      amp: 0,
      age: 0,
      falling: false,
    };
    this.spots.push(spot);
    return spot;
  }
}

/* ── Sub-pixel jitter ───────────────────────────────────────────────────── */

function halton(index: number, base: number): number {
  let f = 1;
  let r = 0;
  for (let i = index; i > 0; i = Math.floor(i / base)) {
    f /= base;
    r += f * (i % base);
  }
  return r;
}

/**
 * The i-th sub-pixel offset, in pixels, centred on zero: a Halton (2, 3)
 * sequence, which covers the pixel evenly in any window of frames, so the
 * temporal accumulation converges to a properly supersampled image.
 */
export function jitter(i: number): [number, number] {
  const n = (i % 16) + 1;
  return [halton(n, 2) - 0.5, halton(n, 3) - 0.5];
}
