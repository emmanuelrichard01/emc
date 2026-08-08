import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

import { onCircuitSignal } from '@/lib/circuitBus';
import { cumulativeLengths, edgePoints } from '@/lib/circuitGeometry';

/* ==========================================================================
   CIRCUIT CANVAS — packets on a routed board.

   The board is a graph, and everything you see moving travels along it.

   That is the whole change from the previous version, and it is the reason
   this reads as a circuit rather than as decoration. Before, the substrate
   drew traces between nodes while the pulses moved along arbitrary grid
   lines: motion and wiring were two unrelated systems drawn on top of each
   other, so nothing ever appeared to travel *through* anything. Now a single
   edge list is built once and used twice — rasterised as the etched trace,
   and walked as the path a packet follows. A packet cannot leave the wire,
   because the wire is its coordinate space.

   Packets route source → hub → … → sink over real graph paths, decelerate
   into a node, flash it, and accelerate out. They travel in small bursts,
   the way a message is actually transmitted, rather than as an even drizzle.

   The hot loop still allocates nothing: geometry is precomputed into flat
   Float32Arrays at build time, packet state lives in typed arrays, and the
   substrate is a single drawImage.
   ========================================================================== */

const GRID = 48;
const MAJOR = GRID * 4;

const MAX_PACKETS = 48;
const MAX_FLASHES = 32;

/** Points sampled behind the head to draw the trail. */
const TAIL_SAMPLES = 12;

/* Two speeds, deliberately far apart.

   Almost everything drifts: slow enough that you register it as steady
   rather than as animation, which is what keeps a background from competing
   with the text on top of it. Then, rarely, one packet runs — a streak with
   a long tail that crosses and is gone. The contrast is the whole effect;
   a field where everything moves at one speed reads as a screensaver no
   matter how slow you make it. */
const DRIFT_SPEED = 0.42;
const STREAK_SPEED = 4.6;
/** Share of spawns that streak. */
const STREAK_CHANCE = 0.13;

const ROLE_HUB = 1;
const ROLE_SOURCE = 2;
const ROLE_SINK = 3;

interface Tier {
  packets: number;
  burst: number;
  stars: number;
  dprCap: number;
  glow: boolean;
}

/* Three quality budgets. The renderer starts wherever the device advertises
   and can drop, never climb — an upgrade path invites oscillation on a
   device sitting exactly at the boundary. */
const TIERS: Tier[] = [
  { packets: 2, burst: 1, stars: 70, dprCap: 1.5, glow: false },
  { packets: 3, burst: 1, stars: 150, dprCap: 2, glow: true },
  { packets: 4, burst: 2, stars: 230, dprCap: 2, glow: true },
];

function detectTier(): number {
  if (typeof window === 'undefined') return 1;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (coarse && window.innerWidth < 768) return 0;

  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;

  if (memory <= 2 || cores <= 2) return 0;
  if (memory <= 4 || cores <= 4) return 1;
  return 2;
}

/* Pre-rendered glow. Setting shadowBlur per packet per frame forces a full
   offscreen blur pass on every fill; a radial-gradient sprite blitted with
   drawImage is visually equivalent and effectively free. */
function makeGlowSprite(hsl: string, radius: number): HTMLCanvasElement {
  const size = Math.ceil(radius * 2);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  gradient.addColorStop(0, `hsl(${hsl} / 0.95)`);
  gradient.addColorStop(0.25, `hsl(${hsl} / 0.5)`);
  gradient.addColorStop(0.6, `hsl(${hsl} / 0.14)`);
  gradient.addColorStop(1, `hsl(${hsl} / 0)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

interface Edge {
  a: number;
  b: number;
  pts: Float32Array;
  /** Cumulative distance at each point; last entry is the total length. */
  cum: Float32Array;
  len: number;
}

interface Route {
  /** Edge index per leg, with the direction it is traversed. */
  edges: Int32Array;
  forward: Uint8Array;
  legs: number;
}

const CircuitCanvas = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent || prefersReduced) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let tierIndex = detectTier();
    let tier = TIERS[tierIndex];

    let w = 0;
    let h = 0;
    let rafId = 0;
    let running = true;

    const substrate = document.createElement('canvas');
    const subCtx = substrate.getContext('2d');

    /* ── Graph ──────────────────────────────────────────────────────────── */
    let nodeX = new Float32Array(0);
    let nodeY = new Float32Array(0);
    let nodeRole = new Uint8Array(0);
    /** Activation level per node, decayed each frame. */
    let nodeAct = new Float32Array(0);
    let nodeCount = 0;

    let edges: Edge[] = [];
    let routes: Route[] = [];

    /* ── Star field ──────────────────────────────────────────────────────
       The board is mostly stillness. Hundreds of tiny lights sit on grid
       intersections and breathe on their own slow cycles, and the routed
       traffic moves through them — so the eye reads a quiet field with
       something occasionally crossing it, rather than a machine demanding
       attention behind body copy. */
    let starX = new Float32Array(0);
    let starY = new Float32Array(0);
    let starPhase = new Float32Array(0);
    let starRate = new Float32Array(0);
    let starBase = new Float32Array(0);
    let starCount = 0;

    /* ── Packets ────────────────────────────────────────────────────────── */
    const pkActive = new Uint8Array(MAX_PACKETS);
    const pkRoute = new Int32Array(MAX_PACKETS);
    const pkLeg = new Int32Array(MAX_PACKETS);
    const pkDist = new Float32Array(MAX_PACKETS);
    const pkSpeed = new Float32Array(MAX_PACKETS);
    const pkBase = new Float32Array(MAX_PACKETS);
    /** Frames left dwelling at a node before moving on. */
    const pkDwell = new Float32Array(MAX_PACKETS);
    const pkSize = new Float32Array(MAX_PACKETS);
    /** Trail length in px — long on a streak, short on a drifter. */
    const pkTail = new Float32Array(MAX_PACKETS);

    /* ── Node flashes ───────────────────────────────────────────────────── */
    const flNode = new Int32Array(MAX_FLASHES);
    const flLife = new Float32Array(MAX_FLASHES);
    const flMax = new Float32Array(MAX_FLASHES);
    const flActive = new Uint8Array(MAX_FLASHES);

    /* ── Activity ───────────────────────────────────────────────────────── */
    let activity = 0;
    let externalLoad = 0;
    let spawnCooldown = 0;
    let burstQueue = 0;
    let burstRoute = -1;

    /* ── Pointer ────────────────────────────────────────────────────────── */
    let pointerX = -9999;
    let pointerY = -9999;
    let hasPointer = false;
    let rectLeft = 0;
    let rectTop = 0;
    let rectWidth = 0;
    let rectHeight = 0;
    let rectDirty = true;

    /* ── Theme ──────────────────────────────────────────────────────────── */
    let primaryHSL = '38 92% 50%';
    let foregroundHSL = '0 0% 93%';
    let glowSprite = makeGlowSprite(primaryHSL, 9);

    const readTheme = () => {
      const style = getComputedStyle(document.documentElement);
      const p = style.getPropertyValue('--primary').trim();
      const f = style.getPropertyValue('--foreground').trim();
      const changed = (p && p !== primaryHSL) || (f && f !== foregroundHSL);
      if (p) primaryHSL = p;
      if (f) foregroundHSL = f;
      return changed;
    };

    readTheme();

    /* ── Path sampling ──────────────────────────────────────────────────── */

    const out = new Float32Array(2);

    /** Writes the point `dist` along an edge into `out`. */
    const pointOnEdge = (edge: Edge, dist: number, forward: boolean) => {
      const target = forward ? dist : edge.len - dist;
      const { pts, cum } = edge;

      // Few points per edge (2 or 4), so a linear scan beats a binary search.
      let i = 1;
      while (i < cum.length - 1 && cum[i] < target) i++;

      const segStart = cum[i - 1];
      const segLen = cum[i] - segStart;
      const t = segLen > 0 ? (target - segStart) / segLen : 0;

      out[0] = pts[(i - 1) * 2] + (pts[i * 2] - pts[(i - 1) * 2]) * t;
      out[1] = pts[(i - 1) * 2 + 1] + (pts[i * 2 + 1] - pts[(i - 1) * 2 + 1]) * t;
    };

    /**
     * Writes the point `back` units behind a packet's head, walking into
     * earlier legs when the trail crosses a corner.
     *
     * Walking rather than clamping is what lets a trail bend around a corner
     * instead of bunching up at it — the detail that makes a packet look like
     * it is following the wire rather than sliding over it.
     */
    const pointBehind = (packet: number, back: number) => {
      const route = routes[pkRoute[packet]];
      let leg = pkLeg[packet];
      let dist = pkDist[packet] - back;

      while (dist < 0 && leg > 0) {
        leg -= 1;
        dist += edges[route.edges[leg]].len;
      }
      if (dist < 0) dist = 0;

      pointOnEdge(edges[route.edges[leg]], dist, route.forward[leg] === 1);
    };

    /* ── Topology ───────────────────────────────────────────────────────── */

    const buildTopology = (width: number, height: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, tier.dprCap);
      w = width;
      h = height;

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      substrate.width = canvas.width;
      substrate.height = canvas.height;

      const cols = Math.max(6, Math.floor(w / GRID));
      const rows = Math.max(5, Math.floor(h / GRID));

      /* Roles by zone so the board reads left to right: ingest on the left,
         routing across the middle, sinks on the right. Nothing sits on the
         outer ring, where a pad would be clipped by the canvas edge. */
      const xs: number[] = [];
      const ys: number[] = [];
      const roles: number[] = [];

      /* Placement is zoned left-to-right but scattered within each zone.

         Nodes on exact shared columns and evenly divided rows produced a
         lattice — every trace the same length, every corner in line with the
         next, which reads as wallpaper. Jittering the column and row (still
         snapped to the grid, so nothing leaves the ruling) gives runs of
         different lengths and corners at different depths: the board looks
         laid out rather than generated, without adding any noise. */
      /* Layer, not column, is what the wiring walks. With the jitter above no
         two nodes share an exact x any more, so bucketing by coordinate would
         put every node in a column of its own and the graph would come out
         empty. The layer is assigned here, where the intent is known. */
      const layers: number[] = [];

      const place = (col: number, row: number, role: number, layer: number) => {
        const c = Math.max(1, Math.min(cols - 1, Math.round(col)));
        const r = Math.max(1, Math.min(rows - 1, Math.round(row)));
        xs.push(c * GRID);
        ys.push(r * GRID);
        roles.push(role);
        layers.push(layer);
      };

      /** Even spread across the usable rows, nudged by up to a cell. */
      const scatterRow = (i: number, total: number) =>
        1 + ((rows - 2) * (i + 0.5)) / total + (Math.random() - 0.5) * 1.6;

      const ports = Math.max(2, Math.min(5, Math.floor(rows / 3)));

      for (let i = 0; i < ports; i++) {
        place(cols * 0.07 + Math.random() * cols * 0.06, scatterRow(i, ports), ROLE_SOURCE, 0);
      }
      for (let i = 0; i < ports; i++) {
        place(cols * 0.87 + Math.random() * cols * 0.07, scatterRow(i, ports), ROLE_SINK, 5);
      }

      // Three routing bands, each jittered so the columns do not line up.
      const hubRows = Math.max(2, Math.min(5, Math.floor(rows / 3)));
      [0.26, 0.42, 0.58, 0.74].forEach((band, bandIndex) => {
        for (let i = 0; i < hubRows; i++) {
          place(
            cols * band + (Math.random() - 0.5) * cols * 0.07,
            scatterRow(i, hubRows),
            ROLE_HUB,
            bandIndex + 1
          );
        }
      });

      nodeCount = xs.length;
      nodeX = Float32Array.from(xs);
      nodeY = Float32Array.from(ys);
      nodeRole = Uint8Array.from(roles);
      nodeAct = new Float32Array(nodeCount);

      /* Wire the graph in columns: every node connects rightward to the two
         nearest nodes in the next column. That produces a board that always
         has a path from any source to some sink, which the previous
         nearest-hub wiring did not guarantee — and a source with no route is
         a source that silently emits nothing. */
      const byLayer = new Map<number, number[]>();
      layers.forEach((layer, i) => {
        const bucket = byLayer.get(layer);
        if (bucket) bucket.push(i);
        else byLayer.set(layer, [i]);
      });

      const layerKeys = [...byLayer.keys()].sort((a, b) => a - b);
      edges = [];
      const adjacency: number[][] = Array.from({ length: nodeCount }, () => []);

      const addEdge = (a: number, b: number) => {
        // Deterministic per pair, so the board is stable across redraws while
        // still mixing which axis leads.
        const hFirst = (a + b) % 2 === 0;
        const pts = Float32Array.from(edgePoints(nodeX[a], nodeY[a], nodeX[b], nodeY[b], hFirst));
        const cum = cumulativeLengths(pts);
        const index = edges.length;
        edges.push({ a, b, pts, cum, len: cum[cum.length - 1] });
        adjacency[a].push(index);
        return index;
      };

      for (let c = 0; c < layerKeys.length - 1; c++) {
        const from = byLayer.get(layerKeys[c])!;
        const to = byLayer.get(layerKeys[c + 1])!;

        for (const a of from) {
          // Nearest two in the next layer by vertical distance: enough for a
          // node to have a choice of onward path, few enough that the board
          // stays legible rather than becoming a mesh.
          const ranked = [...to].sort(
            (p, q) => Math.abs(nodeY[p] - nodeY[a]) - Math.abs(nodeY[q] - nodeY[a])
          );
          for (const b of ranked.slice(0, 2)) addEdge(a, b);
        }
      }

      /* Precompute routes source → sink. Depth-first over the forward-only
         adjacency, which cannot cycle because every edge advances a column. */
      routes = [];
      const walk = (node: number, path: number[]) => {
        if (nodeRole[node] === ROLE_SINK) {
          routes.push({
            edges: Int32Array.from(path),
            forward: Uint8Array.from(path.map(() => 1)),
            legs: path.length,
          });
          return;
        }
        if (path.length > 6) return;
        for (const edgeIndex of adjacency[node]) {
          path.push(edgeIndex);
          walk(edges[edgeIndex].b, path);
          path.pop();
        }
      };
      for (let i = 0; i < nodeCount; i++) if (nodeRole[i] === ROLE_SOURCE) walk(i, []);

      /* Stars land on grid intersections, so even the scatter obeys the
         ruling — the field looks placed rather than sprinkled. Rejecting
         cells already occupied by a functional node keeps the two readable
         as different things. */
      const taken = new Set<number>();
      for (let i = 0; i < nodeCount; i++) {
        taken.add(Math.round(nodeX[i] / GRID) * 1000 + Math.round(nodeY[i] / GRID));
      }

      const wanted = tier.stars;
      const sx: number[] = [];
      const sy: number[] = [];
      for (let attempt = 0; attempt < wanted * 3 && sx.length < wanted; attempt++) {
        const c = 1 + ((Math.random() * (cols - 1)) | 0);
        const r = 1 + ((Math.random() * (rows - 1)) | 0);
        const key = c * 1000 + r;
        if (taken.has(key)) continue;
        taken.add(key);
        sx.push(c * GRID);
        sy.push(r * GRID);
      }

      starCount = sx.length;
      starX = Float32Array.from(sx);
      starY = Float32Array.from(sy);
      starPhase = new Float32Array(starCount);
      starRate = new Float32Array(starCount);
      starBase = new Float32Array(starCount);
      for (let i = 0; i < starCount; i++) {
        starPhase[i] = Math.random() * Math.PI * 2;
        // Wide spread of periods, so no two ever pulse in step.
        starRate[i] = 0.00018 + Math.random() * 0.00042;
        starBase[i] = 0.06 + Math.random() * 0.16;
      }

      drawSubstrate();
    };

    /* ── Substrate ──────────────────────────────────────────────────────── */

    const drawSubstrate = () => {
      if (!subCtx || w === 0 || h === 0) return;

      subCtx.setTransform(1, 0, 0, 1, 0, 0);
      subCtx.clearRect(0, 0, substrate.width, substrate.height);
      const dpr = Math.min(window.devicePixelRatio || 1, tier.dprCap);
      subCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      subCtx.lineWidth = 1;

      // Minor grid.
      subCtx.strokeStyle = `hsl(${foregroundHSL} / 0.03)`;
      subCtx.beginPath();
      for (let x = 0; x <= w; x += GRID) {
        subCtx.moveTo(x, 0);
        subCtx.lineTo(x, h);
      }
      for (let y = 0; y <= h; y += GRID) {
        subCtx.moveTo(0, y);
        subCtx.lineTo(w, y);
      }
      subCtx.stroke();

      // Major grid.
      subCtx.strokeStyle = `hsl(${foregroundHSL} / 0.06)`;
      subCtx.beginPath();
      for (let x = 0; x <= w; x += MAJOR) {
        subCtx.moveTo(x, 0);
        subCtx.lineTo(x, h);
      }
      for (let y = 0; y <= h; y += MAJOR) {
        subCtx.moveTo(0, y);
        subCtx.lineTo(w, y);
      }
      subCtx.stroke();

      // The traces — the exact polylines packets travel.
      subCtx.strokeStyle = `hsl(${foregroundHSL} / 0.05)`;
      subCtx.lineWidth = 1;
      subCtx.beginPath();
      for (const edge of edges) {
        subCtx.moveTo(edge.pts[0], edge.pts[1]);
        for (let i = 1; i < edge.pts.length / 2; i++) {
          subCtx.lineTo(edge.pts[i * 2], edge.pts[i * 2 + 1]);
        }
      }
      subCtx.stroke();

      // Pads.
      subCtx.strokeStyle = `hsl(${primaryHSL} / 0.12)`;
      subCtx.beginPath();
      for (let i = 0; i < nodeCount; i++) {
        if (nodeRole[i] !== ROLE_HUB) continue;
        subCtx.moveTo(nodeX[i] + 5.5, nodeY[i]);
        subCtx.arc(nodeX[i], nodeY[i], 5.5, 0, Math.PI * 2);
      }
      subCtx.stroke();
    };

    /* ── Spawning ───────────────────────────────────────────────────────── */

    const freeSlot = () => {
      for (let i = 0; i < MAX_PACKETS; i++) if (!pkActive[i]) return i;
      return -1;
    };

    const spawnPacket = (routeIndex: number) => {
      if (!routes.length) return;
      const slot = freeSlot();
      if (slot === -1) return;

      const streak = Math.random() < STREAK_CHANCE;

      pkActive[slot] = 1;
      pkRoute[slot] = routeIndex >= 0 ? routeIndex : (Math.random() * routes.length) | 0;
      pkLeg[slot] = 0;
      pkDist[slot] = 0;
      pkBase[slot] = streak
        ? STREAK_SPEED * (0.85 + Math.random() * 0.3)
        : DRIFT_SPEED * (0.8 + Math.random() * 0.5);
      pkSpeed[slot] = pkBase[slot];
      pkDwell[slot] = 0;
      // The trail is proportional to speed, which is what makes a streak
      // read as a streak rather than as the same dot moving faster.
      pkTail[slot] = streak ? 130 : 26;
      pkSize[slot] = streak ? 1.9 : 1.3;
    };

    const flash = (node: number, strength: number) => {
      for (let i = 0; i < MAX_FLASHES; i++) {
        if (flActive[i]) continue;
        flActive[i] = 1;
        flNode[i] = node;
        flLife[i] = 0;
        flMax[i] = strength;
        return;
      }
    };

    /* ── Input ──────────────────────────────────────────────────────────── */

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const x = e.clientX - rectLeft;
      const y = e.clientY - rectTop;
      hasPointer = x >= 0 && y >= 0 && x <= rectWidth && y <= rectHeight;
      pointerX = x;
      pointerY = y;
      if (hasPointer) activity = Math.min(1, activity + 0.01);
    };

    const onPointerLeave = () => {
      hasPointer = false;
      pointerX = -9999;
      pointerY = -9999;
    };

    const markRectDirty = () => {
      rectDirty = true;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave, { passive: true });
    window.addEventListener('scroll', markRectDirty, { passive: true });
    window.addEventListener('resize', markRectDirty, { passive: true });

    /* ── Signals from the page ──────────────────────────────────────────── */

    const unsubscribe = onCircuitSignal((signal) => {
      if (signal.type === 'load') {
        externalLoad = Math.max(0, Math.min(1, signal.value));
        return;
      }
      activity = Math.min(1, activity + (signal.strength ?? 0.5));
      // A command sends a real burst down one route, so running something in
      // the terminal is legible on the board as traffic rather than as a
      // number quietly ticking up.
      if (routes.length) {
        burstRoute = (Math.random() * routes.length) | 0;
        burstQueue = tier.burst + 1;
      }
    });

    /* ── Visibility ─────────────────────────────────────────────────────── */

    let onScreen = true;
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0].isIntersecting;
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(canvas);

    let lastTime = 0;
    const onVisibility = () => {
      running = !document.hidden;
      // Reset the clock so returning from a background tab does not apply one
      // enormous delta and teleport every packet across the board.
      lastTime = 0;
    };
    document.addEventListener('visibilitychange', onVisibility);

    const themeObserver = new MutationObserver(() => {
      if (readTheme()) {
        glowSprite = makeGlowSprite(primaryHSL, 9);
        drawSubstrate();
      }
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target !== parent) continue;
        const { width, height } = entry.contentRect;
        if (Math.round(width) === Math.round(w) && Math.round(height) === Math.round(h)) continue;
        if (width === 0 || height === 0) continue;
        buildTopology(width, height);
        rectDirty = true;
      }
    });

    const initial = parent.getBoundingClientRect();
    buildTopology(initial.width, initial.height);
    resizeObserver.observe(parent);

    // Warm start, so the first painted frame already carries traffic rather
    // than filling in over the first two seconds.
    for (let i = 0; i < tier.packets; i++) {
      spawnPacket(-1);
      const slot = i;
      if (pkActive[slot]) {
        const route = routes[pkRoute[slot]];
        if (route) {
          const leg = (Math.random() * route.legs) | 0;
          pkLeg[slot] = leg;
          pkDist[slot] = Math.random() * edges[route.edges[leg]].len;
        }
      }
    }

    /* ── Simulation ─────────────────────────────────────────────────────── */

    const advance = (i: number, ratio: number) => {
      const route = routes[pkRoute[i]];
      if (!route) {
        pkActive[i] = 0;
        return;
      }

      if (pkDwell[i] > 0) {
        pkDwell[i] -= ratio;
        return;
      }

      const edge = edges[route.edges[pkLeg[i]]];
      const nodeIndex = route.forward[pkLeg[i]] === 1 ? edge.b : edge.a;

      /* Ease into and out of a node. A packet that arrives at constant speed
         reads as a dot passing a coordinate; decelerating into the pad, then
         accelerating away, is what makes it look like it was *handled*. */
      const remaining = edge.len - pkDist[i];
      const approach = Math.min(1, remaining / 46);
      const depart = Math.min(1, pkDist[i] / 46);
      // Eased in and out of every node, so a corner is a glide rather than a
      // stop. Never below half speed: a packet that visibly halts mid-board
      // draws the eye, which is the opposite of what this is for.
      pkSpeed[i] = pkBase[i] * (0.55 + 0.45 * Math.min(approach, depart));

      pkDist[i] += pkSpeed[i] * ratio;

      if (pkDist[i] < edge.len) return;

      // Arrived at the node terminating this leg.
      nodeAct[nodeIndex] = 1;

      if (pkLeg[i] + 1 >= route.legs) {
        // Absorbed at the sink.
        flash(nodeIndex, 0.6);
        pkActive[i] = 0;
        return;
      }

      flash(nodeIndex, 0.3);
      pkLeg[i] += 1;
      pkDist[i] = 0;
      // A drifter pauses at the hub, so routing looks like a decision. A
      // streak does not — it is already past.
      pkDwell[i] = pkBase[i] > 2 ? 0 : 6 + Math.random() * 14;
    };

    /* ── Render ─────────────────────────────────────────────────────────── */

    let frameAvg = 16.7;
    let slowFrames = 0;

    const draw = (time: number) => {
      rafId = requestAnimationFrame(draw);
      if (!running || !onScreen || w === 0) {
        lastTime = 0;
        return;
      }

      if (lastTime === 0) lastTime = time;
      const dt = time - lastTime;
      lastTime = time;
      const ratio = Math.min(dt, 50) / (1000 / 60);

      // Self-tuning quality: degrading gracefully beats locking a weak device
      // at 20fps. Steps down only, after a sustained run of slow frames.
      frameAvg += (dt - frameAvg) * 0.05;
      if (frameAvg > 24 && tierIndex > 0) {
        if (++slowFrames > 120) {
          tierIndex--;
          tier = TIERS[tierIndex];
          slowFrames = 0;
          frameAvg = 16.7;
        }
      } else if (slowFrames > 0) {
        slowFrames--;
      }

      if (rectDirty) {
        const r = canvas.getBoundingClientRect();
        rectLeft = r.left;
        rectTop = r.top;
        rectWidth = r.width;
        rectHeight = r.height;
        rectDirty = false;
      }

      activity *= Math.pow(0.99, ratio);
      const load = Math.max(activity, externalLoad);

      /* Traffic arrives in bursts rather than a steady drip — a handful of
         packets down one route in convoy, then a gap. Even spacing reads as
         a screensaver; convoys read as messages. */
      spawnCooldown -= ratio;
      if (spawnCooldown <= 0) {
        let live = 0;
        for (let i = 0; i < MAX_PACKETS; i++) if (pkActive[i]) live++;

        const target = tier.packets + Math.round(load * 6);
        if (burstQueue > 0) {
          spawnPacket(burstRoute);
          burstQueue--;
          spawnCooldown = 10;
        } else if (live < target) {
          const convoy = 1 + ((Math.random() * tier.burst) | 0);
          const route = (Math.random() * routes.length) | 0;
          for (let n = 0; n < convoy && live + n < target; n++) spawnPacket(route);
          spawnCooldown = 70 + Math.random() * 110;
        } else {
          spawnCooldown = 45;
        }
      }

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(substrate, 0, 0, w, h);

      /* 1. Star field. Each light breathes on its own period, so the field
            shimmers without anything in it ever demanding attention. */
      ctx.fillStyle = `hsl(${foregroundHSL})`;
      // Clamped to the current tier rather than the count generated at build
      // time, so dropping a tier actually sheds this work — the field is
      // generated once and simply drawn shorter.
      const visibleStars = Math.min(starCount, tier.stars);
      for (let i = 0; i < visibleStars; i++) {
        const pulse = 0.72 + 0.28 * Math.sin(starPhase[i] + time * starRate[i]);
        ctx.globalAlpha = starBase[i] * pulse;
        ctx.fillRect(starX[i] - 0.6, starY[i] - 0.6, 1.2, 1.2);
      }
      ctx.globalAlpha = 1;

      /* 2. Node flashes — an expanding ring where a packet was handled. */
      ctx.lineWidth = 1;
      for (let i = 0; i < MAX_FLASHES; i++) {
        if (!flActive[i]) continue;
        flLife[i] += ratio * 0.03;
        if (flLife[i] >= 1) {
          flActive[i] = 0;
          continue;
        }
        const node = flNode[i];
        const eased = 1 - Math.pow(1 - flLife[i], 2);
        const radius = 4 + eased * 22 * flMax[i];
        ctx.strokeStyle = `hsl(${primaryHSL} / ${(1 - flLife[i]) * 0.22 * flMax[i]})`;
        ctx.beginPath();
        ctx.arc(nodeX[node], nodeY[node], radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      /* 3. Nodes. Role-shaped so the topology reads without labels. */
      const decay = 0.02 * ratio;
      for (let i = 0; i < nodeCount; i++) {
        const act = nodeAct[i];
        if (act > 0) nodeAct[i] = Math.max(0, act - decay);

        const x = nodeX[i];
        const y = nodeY[i];
        const role = nodeRole[i];
        const lit = 0.16 + act * 0.55 + load * 0.08;

        ctx.fillStyle = `hsl(${primaryHSL} / ${Math.min(1, lit)})`;

        if (role === ROLE_SINK) {
          /* Square, not a diamond. A rotated square is drawn from four
             diagonal edges, which put the only off-axis lines on the board
             right on the nodes traffic terminates at. Axis-aligned keeps the
             silhouette distinct from the round hubs without breaking the
             ruling. */
          const r = 2.6 + act * 0.9;
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        } else if (role === ROLE_SOURCE) {
          ctx.beginPath();
          ctx.arc(x, y, 1.9 + act * 0.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = `hsl(${primaryHSL} / ${0.16 + act * 0.3})`;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, 2.1 + act * 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      /* 4. Packets — trail sampled back along the wire, then the head. */
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < MAX_PACKETS; i++) {
        if (!pkActive[i]) continue;
        advance(i, ratio);
        if (!pkActive[i]) continue;

        const size = pkSize[i];

        // Trail: three bands of decreasing alpha, each a polyline that bends
        // with the trace because every sample is taken on the path itself.
        for (let band = 2; band >= 0; band--) {
          const from = (TAIL_SAMPLES / 3) * band;
          const to = Math.min(TAIL_SAMPLES, from + TAIL_SAMPLES / 3 + 1);
          ctx.strokeStyle = `hsl(${primaryHSL} / ${(0.26 - band * 0.08) * (0.75 + load * 0.4)})`;
          ctx.lineWidth = size * (1 - band * 0.22);
          ctx.beginPath();
          for (let s = from; s < to; s++) {
            pointBehind(i, (pkTail[i] * s) / TAIL_SAMPLES);
            if (s === from) ctx.moveTo(out[0], out[1]);
            else ctx.lineTo(out[0], out[1]);
          }
          ctx.stroke();
        }

        // Head.
        pointBehind(i, 0);
        const hx = out[0];
        const hy = out[1];

        if (tier.glow) {
          const half = glowSprite.width / 2;
          ctx.drawImage(glowSprite, hx - half, hy - half);
        }

        ctx.fillStyle = `hsl(${primaryHSL})`;
        ctx.beginPath();
        ctx.arc(hx, hy, size, 0, Math.PI * 2);
        ctx.fill();

        // A white-hot core sells it as energy rather than as a coloured dot.
        ctx.fillStyle = `hsl(${foregroundHSL} / 0.85)`;
        ctx.beginPath();
        ctx.arc(hx, hy, size * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }

      /* 5. Cursor probe — the nearest node, as an instrument reading. */
      if (hasPointer) {
        let best = -1;
        let bestSq = Infinity;
        for (let i = 0; i < nodeCount; i++) {
          const dx = nodeX[i] - pointerX;
          const dy = nodeY[i] - pointerY;
          const distSq = dx * dx + dy * dy;
          if (distSq < bestSq) {
            bestSq = distSq;
            best = i;
          }
        }

        const reach = 170;
        if (best !== -1 && bestSq < reach * reach) {
          const alpha = (1 - Math.sqrt(bestSq) / reach) * 0.35;
          ctx.strokeStyle = `hsl(${primaryHSL} / ${alpha})`;
          ctx.setLineDash([3, 4]);
          ctx.lineWidth = 1;

          /* Routed, not straight-lined. This was the last diagonal on the
             board: a direct pointer-to-node line sits at whatever angle the
             cursor happens to be at, which is the one thing nothing else
             here does. Now it turns a corner like every other connection. */
          const probe = edgePoints(pointerX, pointerY, nodeX[best], nodeY[best], true);
          ctx.beginPath();
          ctx.moveTo(probe[0], probe[1]);
          for (let i = 1; i < probe.length / 2; i++) ctx.lineTo(probe[i * 2], probe[i * 2 + 1]);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.font = '9px ui-monospace, "JetBrains Mono", monospace';
          ctx.fillStyle = `hsl(${primaryHSL} / ${alpha * 1.4})`;
          ctx.fillText(
            `[${Math.round(nodeX[best] / GRID)},${Math.round(nodeY[best] / GRID)}]`,
            pointerX + 12,
            pointerY - 8
          );
        }
      }
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      unsubscribe();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('scroll', markRectDirty);
      window.removeEventListener('resize', markRectDirty);
    };
  }, [prefersReduced]);

  if (prefersReduced) {
    return (
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--foreground) / 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground) / 0.04) 1px, transparent 1px)
          `,
          backgroundSize: `${GRID}px ${GRID}px`,
          maskImage: 'radial-gradient(ellipse 70% 65% at 50% 45%, #000 35%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 65% at 50% 45%, #000 35%, transparent 100%)',
        }}
      />
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        aria-hidden="true"
        style={{
          /* Edge falloff as a CSS mask rather than a per-frame composite —
             costs nothing each frame and composites on the GPU. */
          maskImage: 'radial-gradient(ellipse 78% 72% at 50% 45%, #000 34%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 78% 72% at 50% 45%, #000 34%, transparent 100%)',
        }}
      />
    </div>
  );
});

CircuitCanvas.displayName = 'CircuitCanvas';

export default CircuitCanvas;
