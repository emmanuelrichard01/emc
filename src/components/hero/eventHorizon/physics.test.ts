import { describe, expect, it } from 'vitest';

import {
  BCRIT,
  CAM_NEAR,
  CAM_REST,
  HotSpots,
  MAX_SPOTS,
  RIN,
  cameraDistance,
  cameraInclination,
  jitter,
  lensFactor,
  shadowAngle,
} from './physics';

describe('the camera', () => {
  it('sees the shadow at the textbook size far away', () => {
    // Far off, aberration vanishes and sin α → b_crit / d.
    expect(shadowAngle(1e6)).toBeCloseTo(BCRIT / 1e6, 10);
    // At the photon sphere the shadow is exactly half the sky.
    expect(shadowAngle(1.5)).toBeCloseTo(Math.PI / 2, 6);
  });

  it('keeps the shadow where Hero puts it at every depth of the dive', () => {
    // The screen offset at which a ray grazes the shadow is tan α / lens;
    // it must equal radius × zoom whatever the camera distance.
    for (const zoom of [1, 1.5, 3, 7, 13]) {
      const d = cameraDistance(zoom);
      const onScreen = Math.tan(shadowAngle(d)) / lensFactor(d, 0.31, zoom);
      expect(onScreen).toBeCloseTo(0.31 * zoom, 10);
    }
  });

  it('falls from rest toward, never past, its nearest point', () => {
    expect(cameraDistance(1)).toBeCloseTo(CAM_REST, 10);
    let previous = Infinity;
    for (let zoom = 1; zoom <= 40; zoom += 0.5) {
      const d = cameraDistance(zoom);
      expect(d).toBeLessThan(previous);
      expect(d).toBeGreaterThan(CAM_NEAR);
      previous = d;
    }
    // Nothing below rest: a stray zoom < 1 is not a retreat.
    expect(cameraDistance(0.5)).toBe(CAM_REST);
  });

  it('rises over the disk as it falls', () => {
    expect(cameraInclination(CAM_REST)).toBeCloseTo(0.1, 10);
    expect(cameraInclination(CAM_NEAR)).toBeGreaterThan(cameraInclination(15));
    expect(cameraInclination(15)).toBeGreaterThan(cameraInclination(CAM_REST));
  });
});

function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

/** Runs the simulation for `seconds` at 30 fps with the disk at resting spin. */
function run(spots: HotSpots, seconds: number) {
  for (let t = 0; t < seconds; t += 1 / 30) spots.step(1 / 30, 0.07 / 30);
}

describe('hot spots', () => {
  it('gathers keystrokes into one clump', () => {
    const spots = new HotSpots(seeded());
    for (let i = 0; i < 5; i++) spots.feed(0.12);
    expect(spots.spots).toHaveLength(1);
    expect(spots.spots[0].falling).toBe(false);
    expect(spots.spots[0].amp).toBeGreaterThan(0.5);
  });

  it('drops the clump when the command runs, and it spirals in and is swallowed', () => {
    const spots = new HotSpots(seeded());
    spots.feed(0.12);
    spots.feed(0.8);
    const [spot] = spots.spots;
    expect(spot.falling).toBe(true);

    const r0 = spot.r;
    run(spots, 2);
    expect(spot.r).toBeLessThan(r0);
    expect(spot.r).toBeGreaterThan(RIN);

    run(spots, 15);
    expect(spots.spots).toHaveLength(0);
  });

  it('releases a clump left alone', () => {
    const spots = new HotSpots(seeded());
    spots.feed(0.12);
    run(spots, 4);
    expect(spots.spots[0]?.falling).toBe(true);
  });

  it('orbits with the gas, in the gas’s sense, faster further in', () => {
    const spots = new HotSpots(seeded());
    spots.feed(0.8);
    const [spot] = spots.spots;
    const a0 = spot.phi;
    spots.step(0.001, 0.01);
    const outer = spot.phi - a0;
    expect(outer).toBeGreaterThan(0);
    spot.r = 4;
    const a1 = spot.phi;
    spots.step(0.001, 0.01);
    expect(spot.phi - a1).toBeGreaterThan(outer);
  });

  it('never holds more than the shader has slots for', () => {
    const spots = new HotSpots(seeded());
    for (let i = 0; i < 20; i++) spots.feed(0.8);
    expect(spots.spots.length).toBeLessThanOrEqual(MAX_SPOTS);
    const packed = spots.pack(new Float32Array(MAX_SPOTS * 4));
    expect(packed.every(Number.isFinite)).toBe(true);
  });

  it('packs empty slots as dark', () => {
    const packed = new HotSpots(seeded()).pack(new Float32Array(MAX_SPOTS * 4).fill(7));
    expect(Array.from(packed).every((v) => v === 0)).toBe(true);
  });
});

describe('jitter', () => {
  it('stays inside the pixel and averages to its centre', () => {
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < 16; i++) {
      const [x, y] = jitter(i);
      expect(Math.abs(x)).toBeLessThan(0.5);
      expect(Math.abs(y)).toBeLessThan(0.5);
      sx += x;
      sy += y;
    }
    expect(Math.abs(sx / 16)).toBeLessThan(0.05);
    expect(Math.abs(sy / 16)).toBeLessThan(0.05);
  });
});
