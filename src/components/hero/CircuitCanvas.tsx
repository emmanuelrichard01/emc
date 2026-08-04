import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

import { onCircuitSignal } from '@/lib/circuitBus';

/* ==========================================================================
   CIRCUIT CANVAS — a data path, not a particle field.

   The board depicts a pipeline. Nodes carry roles: ingest sources on the
   left, routing hubs through the middle, sinks on the right. Streams are
   emitted by sources, Manhattan-routed toward a sink, flare when they cross
   a hub, and are absorbed on arrival. Motion is therefore *directional and
   purposeful* — left to right, ingest to storage — rather than the random
   edge-to-edge drift it replaced, which was pleasant but depicted nothing.

   Structured as two layers with very different costs:

     · The substrate (grid, routed traces, pads) never changes between
       resizes, so it is rasterised once into an offscreen canvas and blitted
       as a single drawImage each frame.
     · The signal layer (pulses, activations, sparks, shockwaves) is the only
       thing actually redrawn per frame.

   Everything in the hot loop reads and writes pre-allocated typed arrays.
   There are no object literals, no closures and no array methods inside
   draw() — a 60fps loop that allocates is a 60fps loop that stutters every
   few seconds when the collector runs.
   ========================================================================== */

const GRID = 48;
const MAJOR = GRID * 4;

/* Ring-buffer capacity per pulse. Trails are a fixed window of points rather
   than a growing array, so a long-lived pulse costs exactly as much memory
   as a new one. */
const TRAIL_CAP = 128;
const POOL = 40;
const MAX_SPARKS = 64;
const MAX_SHOCKWAVES = 16;

/* Direction is an index, not a string — it indexes straight into these
   lookup tables, which removes a per-step string comparison for every pulse
   on every frame. */
const DX = [0, 1, 0, -1] as const;
const DY = [-1, 0, 1, 0] as const;
const opposite = (dir: number) => (dir + 2) % 4;

const CLASS_STREAM = 0;
const CLASS_TELEMETRY = 1;
const CLASS_RELAY = 2;

const ROLE_PLAIN = 0;
const ROLE_HUB = 1;
const ROLE_SOURCE = 2;
const ROLE_SINK = 3;

/** Chance a routed stream re-evaluates its heading at an intersection. */
const ROUTE_CHANCE = 0.55;
/** Chance an unrouted (ambient) pulse turns at an intersection. */
const DRIFT_TURN_CHANCE = 0.25;

interface Tier {
  streams: number;
  telemetry: number;
  maxRelays: number;
  sparks: boolean;
  dprCap: number;
}

/* Three quality budgets. The renderer starts at whichever the device
   advertises and can drop down at runtime, but never climbs — an upgrade
   path invites oscillation on a device sitting right at the boundary. */
/* Stream counts are deliberately lower than the old free-drifting design
   needed. Routed streams all converge on a handful of sinks in one quarter
   of the board, so the same count that read as ambient when spread edge-to-
   edge reads as a pile-up once it has a destination. */
const TIERS: Tier[] = [
  { streams: 2, telemetry: 2, maxRelays: 1, sparks: false, dprCap: 1.5 },
  { streams: 4, telemetry: 3, maxRelays: 2, sparks: true, dprCap: 2 },
  { streams: 6, telemetry: 4, maxRelays: 2, sparks: true, dprCap: 2 },
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

/* Pre-rendered glow sprite. Setting ctx.shadowBlur per pulse head per frame
   forces a full offscreen blur pass on every fill, and was comfortably the
   most expensive call in the loop. A radial-gradient sprite blitted with
   drawImage is visually equivalent and effectively free. */
function makeGlowSprite(hsl: string, radius: number): HTMLCanvasElement {
  const size = Math.ceil(radius * 2);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  gradient.addColorStop(0, `hsl(${hsl} / 1)`);
  gradient.addColorStop(0.2, `hsl(${hsl} / 0.6)`);
  gradient.addColorStop(0.5, `hsl(${hsl} / 0.18)`);
  gradient.addColorStop(1, `hsl(${hsl} / 0)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
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

    /* ── Quality ────────────────────────────────────────────────────────── */
    let tierIndex = detectTier();
    let tier = TIERS[tierIndex];

    /* ── Surface ────────────────────────────────────────────────────────── */
    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let nodeCount = 0;
    let rafId = 0;
    let running = true;

    const substrate = document.createElement('canvas');
    const subCtx = substrate.getContext('2d');

    /* ── Node grid ──────────────────────────────────────────────────────── */
    let nodeAct = new Float32Array(0);
    let nodeRole = new Uint8Array(0);
    let drawnStamp = new Uint32Array(0);

    let hubList = new Int32Array(0);
    let hubCount = 0;
    let sourceList = new Int32Array(0);
    let sourceCount = 0;
    let sinkList = new Int32Array(0);
    let sinkCount = 0;

    /* Only lit nodes are visited each frame, rather than sweeping every cell
       with a sqrt per cell. */
    let activeList = new Int32Array(0);
    let activeFlag = new Uint8Array(0);
    let activeCount = 0;

    /* ── Pulses ─────────────────────────────────────────────────────────── */
    const pActive = new Uint8Array(POOL);
    const pClass = new Uint8Array(POOL);
    const pX = new Float32Array(POOL);
    const pY = new Float32Array(POOL);
    const pDir = new Uint8Array(POOL);
    const pSpeed = new Float32Array(POOL);
    const pAccum = new Float32Array(POOL);
    const pMaxTrail = new Uint16Array(POOL);
    const pTrailLen = new Uint16Array(POOL);
    const pTrailHead = new Uint16Array(POOL);
    /** Destination node index, or -1 for ambient drifters. */
    const pTarget = new Int32Array(POOL);
    const trailXY = new Float32Array(POOL * TRAIL_CAP * 2);

    /* ── Sparks ─────────────────────────────────────────────────────────── */
    const sActive = new Uint8Array(MAX_SPARKS);
    const sX = new Float32Array(MAX_SPARKS);
    const sY = new Float32Array(MAX_SPARKS);
    const sVX = new Float32Array(MAX_SPARKS);
    const sVY = new Float32Array(MAX_SPARKS);
    const sLife = new Float32Array(MAX_SPARKS);
    const sMaxLife = new Float32Array(MAX_SPARKS);
    const sSize = new Float32Array(MAX_SPARKS);

    /* ── Shockwaves ─────────────────────────────────────────────────────── */
    const wActive = new Uint8Array(MAX_SHOCKWAVES);
    const wX = new Float32Array(MAX_SHOCKWAVES);
    const wY = new Float32Array(MAX_SHOCKWAVES);
    const wR = new Float32Array(MAX_SHOCKWAVES);
    const wMaxR = new Float32Array(MAX_SHOCKWAVES);
    const wAlpha = new Float32Array(MAX_SHOCKWAVES);
    const wSpeed = new Float32Array(MAX_SHOCKWAVES);
    const wInward = new Uint8Array(MAX_SHOCKWAVES);

    /* ── Activity ───────────────────────────────────────────────────────────
       The board idles quietly and ramps under activity — pointer movement,
       or explicit signals from the page. `activity` decays on its own;
       `externalLoad` is held until the page clears it. */
    let activity = 0;
    let externalLoad = 0;

    /* Streams are replaced on a stagger rather than the instant one is
       absorbed. Respawning inline made arrivals and departures lock-step, so
       the board pulsed in unison instead of carrying continuous traffic. */
    let pendingStreams = 0;
    let spawnCooldown = 0;

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
    let glowStream = makeGlowSprite(primaryHSL, 7);
    let glowRelay = makeGlowSprite(primaryHSL, 5);

    const readTheme = () => {
      const style = getComputedStyle(document.documentElement);
      const p = style.getPropertyValue('--primary').trim();
      const f = style.getPropertyValue('--foreground').trim();
      const changed = (p && p !== primaryHSL) || (f && f !== foregroundHSL);
      if (p) primaryHSL = p;
      if (f) foregroundHSL = f;
      return changed;
    };

    const rebuildSprites = () => {
      glowStream = makeGlowSprite(primaryHSL, 7);
      glowRelay = makeGlowSprite(primaryHSL, 5);
    };

    readTheme();
    rebuildSprites();

    /* ── Helpers ────────────────────────────────────────────────────────── */

    const colOf = (idx: number) => idx % cols;
    const rowOf = (idx: number) => (idx / cols) | 0;

    const activateNode = (idx: number) => {
      if (idx < 0 || idx >= nodeCount) return;
      nodeAct[idx] = 1;
      if (!activeFlag[idx]) {
        activeFlag[idx] = 1;
        activeList[activeCount++] = idx;
      }
    };

    const perpDir = (dir: number) => {
      const vertical = dir === 0 || dir === 2;
      const pick = Math.random() < 0.5 ? 0 : 1;
      return vertical ? (pick === 0 ? 1 : 3) : pick === 0 ? 0 : 2;
    };

    const countClass = (cls: number) => {
      let n = 0;
      for (let i = 0; i < POOL; i++) if (pActive[i] && pClass[i] === cls) n++;
      return n;
    };

    const triggerShockwave = (x: number, y: number, maxR: number, inward: boolean) => {
      for (let i = 0; i < MAX_SHOCKWAVES; i++) {
        if (wActive[i]) continue;
        wActive[i] = 1;
        wX[i] = x;
        wY[i] = y;
        wR[i] = inward ? maxR : 2;
        wMaxR[i] = maxR;
        wAlpha[i] = 0.8;
        wSpeed[i] = 1.4;
        wInward[i] = inward ? 1 : 0;
        return;
      }
    };

    const emitSpark = (x: number, y: number, dir: number) => {
      if (!tier.sparks) return;
      for (let i = 0; i < MAX_SPARKS; i++) {
        if (sActive[i]) continue;
        sActive[i] = 1;
        sX[i] = x + (Math.random() - 0.5) * 4;
        sY[i] = y + (Math.random() - 0.5) * 4;
        // Spray opposite the direction of travel, like a contact spark.
        sVX[i] = (Math.random() - 0.5) * 0.8 - DX[dir] * 0.6;
        sVY[i] = (Math.random() - 0.5) * 0.8 - DY[dir] * 0.6;
        sLife[i] = 0;
        sMaxLife[i] = 20 + Math.random() * 20;
        sSize[i] = 1 + Math.random() * 0.8;
        return;
      }
    };

    const freeSlot = () => {
      for (let i = 0; i < POOL; i++) if (!pActive[i]) return i;
      return -1;
    };

    const initTrail = (slot: number) => {
      pAccum[slot] = 0;
      pTrailLen[slot] = 0;
      pTrailHead[slot] = 0;
    };

    /** Emits a routed stream from a source toward a sink. */
    const spawnStream = () => {
      if (!sourceCount || !sinkCount) return;
      const slot = freeSlot();
      if (slot === -1) return;

      const source = sourceList[(Math.random() * sourceCount) | 0];
      const sink = sinkList[(Math.random() * sinkCount) | 0];

      pActive[slot] = 1;
      pClass[slot] = CLASS_STREAM;
      pX[slot] = colOf(source) * GRID;
      pY[slot] = rowOf(source) * GRID;
      pDir[slot] = 1; // sources sit on the left, so flow begins rightward
      pTarget[slot] = sink;
      pSpeed[slot] = 2.4 + Math.random() * 1.2;
      pMaxTrail[slot] = 44 + ((Math.random() * 20) | 0);
      initTrail(slot);
      // No ring on emit. Ringing on both departure and arrival meant every
      // completed stream produced two, which is what turned the sink zone
      // into a constant strobe.
    };

    /** Ambient wide drifter with no destination — background traffic. */
    const spawnTelemetry = () => {
      if (cols === 0 || rows === 0) return;
      const slot = freeSlot();
      if (slot === -1) return;

      const edge = (Math.random() * 4) | 0;
      const c = (Math.random() * cols) | 0;
      const r = (Math.random() * rows) | 0;

      pActive[slot] = 1;
      pClass[slot] = CLASS_TELEMETRY;
      pTarget[slot] = -1;

      if (edge === 0) {
        pX[slot] = c * GRID;
        pY[slot] = 0;
        pDir[slot] = 2;
      } else if (edge === 1) {
        pX[slot] = (cols - 1) * GRID;
        pY[slot] = r * GRID;
        pDir[slot] = 3;
      } else if (edge === 2) {
        pX[slot] = c * GRID;
        pY[slot] = (rows - 1) * GRID;
        pDir[slot] = 0;
      } else {
        pX[slot] = 0;
        pY[slot] = r * GRID;
        pDir[slot] = 1;
      }

      pSpeed[slot] = 0.8 + Math.random() * 0.4;
      pMaxTrail[slot] = 100 + ((Math.random() * 28) | 0);
      initTrail(slot);
    };

    /** Short fast fork thrown off a hub as it routes. */
    const spawnRelay = (x: number, y: number, dir: number) => {
      const slot = freeSlot();
      if (slot === -1) return;

      pActive[slot] = 1;
      pClass[slot] = CLASS_RELAY;
      pTarget[slot] = -1;
      pX[slot] = x;
      pY[slot] = y;
      pDir[slot] = dir;
      pSpeed[slot] = 4.2 + Math.random() * 1.8;
      pMaxTrail[slot] = 18 + ((Math.random() * 10) | 0);
      initTrail(slot);
    };

    /* ── Substrate ──────────────────────────────────────────────────────── */

    /** Orthogonal run with a 45-degree corner — how a board actually routes. */
    const traceTo = (c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      c.moveTo(x1, y1);

      if (dx === 0 || dy === 0) {
        c.lineTo(x2, y2);
        return;
      }

      const sx = Math.sign(dx);
      const sy = Math.sign(dy);
      const chamfer = Math.min(GRID * 0.6, Math.abs(dx), Math.abs(dy));

      c.lineTo(x2 - sx * chamfer, y1);
      c.lineTo(x2, y1 + sy * chamfer);
      c.lineTo(x2, y2);
    };

    const drawSubstrate = () => {
      if (!subCtx || w === 0 || h === 0) return;

      subCtx.setTransform(1, 0, 0, 1, 0, 0);
      subCtx.clearRect(0, 0, substrate.width, substrate.height);
      const dpr = Math.min(window.devicePixelRatio || 1, tier.dprCap);
      subCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      subCtx.lineWidth = 1;

      // Minor grid.
      subCtx.strokeStyle = `hsl(${foregroundHSL} / 0.035)`;
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
      subCtx.strokeStyle = `hsl(${foregroundHSL} / 0.07)`;
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

      // Registration crosses.
      subCtx.strokeStyle = `hsl(${primaryHSL} / 0.22)`;
      subCtx.beginPath();
      for (let x = 0; x <= w; x += MAJOR) {
        for (let y = 0; y <= h; y += MAJOR) {
          subCtx.moveTo(x - 3, y);
          subCtx.lineTo(x + 3, y);
          subCtx.moveTo(x, y - 3);
          subCtx.lineTo(x, y + 3);
        }
      }
      subCtx.stroke();

      /* Routed traces. Every source and sink is wired to its nearest hub, and
         each hub to its nearest neighbouring hub, so the etched board shows
         the same ingest → route → sink topology the signals follow. */
      subCtx.strokeStyle = `hsl(${foregroundHSL} / 0.055)`;
      subCtx.beginPath();

      const wireToNearestHub = (list: Int32Array, count: number) => {
        for (let i = 0; i < count; i++) {
          const from = list[i];
          const ax = colOf(from) * GRID;
          const ay = rowOf(from) * GRID;

          let bestDistSq = Infinity;
          let bx = 0;
          let by = 0;

          for (let j = 0; j < hubCount; j++) {
            const hub = hubList[j];
            if (hub === from) continue;
            const cx = colOf(hub) * GRID;
            const cy = rowOf(hub) * GRID;
            const distSq = (cx - ax) * (cx - ax) + (cy - ay) * (cy - ay);
            if (distSq < bestDistSq) {
              bestDistSq = distSq;
              bx = cx;
              by = cy;
            }
          }

          if (bestDistSq !== Infinity) traceTo(subCtx, ax, ay, bx, by);
        }
      };

      wireToNearestHub(hubList, hubCount);
      wireToNearestHub(sourceList, sourceCount);
      wireToNearestHub(sinkList, sinkCount);
      subCtx.stroke();

      // Solder pads around every functional node.
      subCtx.strokeStyle = `hsl(${primaryHSL} / 0.16)`;
      subCtx.beginPath();
      for (let i = 0; i < hubCount; i++) {
        const x = colOf(hubList[i]) * GRID;
        const y = rowOf(hubList[i]) * GRID;
        subCtx.moveTo(x + 5.5, y);
        subCtx.arc(x, y, 5.5, 0, Math.PI * 2);
      }
      subCtx.stroke();
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

      cols = Math.floor(w / GRID) + 2;
      rows = Math.floor(h / GRID) + 2;
      nodeCount = cols * rows;

      nodeAct = new Float32Array(nodeCount);
      nodeRole = new Uint8Array(nodeCount);
      drawnStamp = new Uint32Array(nodeCount);
      activeList = new Int32Array(nodeCount);
      activeFlag = new Uint8Array(nodeCount);
      activeCount = 0;

      /* Roles are placed by zone so the board reads left-to-right: ingest on
         the left quarter, routing across the middle, sinks on the right
         quarter. Nothing is placed on the outer ring, where a pad or trace
         would be clipped by the canvas edge. */
      const interiorRows = Math.max(1, rows - 4);
      const pick = (minCol: number, maxCol: number) => {
        const span = Math.max(1, maxCol - minCol);
        const col = minCol + ((Math.random() * span) | 0);
        const row = 2 + ((Math.random() * interiorRows) | 0);
        return row * cols + col;
      };

      const leftEdge = Math.max(2, Math.floor(cols * 0.08));
      const leftLimit = Math.max(leftEdge + 1, Math.floor(cols * 0.22));
      const rightEdge = Math.min(cols - 3, Math.floor(cols * 0.78));
      const rightLimit = Math.min(cols - 2, Math.floor(cols * 0.92));

      const targetHubs = Math.max(5, Math.floor(nodeCount / 55));
      /* More ports than before. Three sinks meant every stream on the board
         terminated at one of three points, concentrating all arrivals into a
         small area; spreading them down the full height keeps the traffic
         legible as flow rather than as a queue. */
      const targetPorts = Math.max(4, Math.floor(rows / 3));

      hubList = new Int32Array(targetHubs);
      sourceList = new Int32Array(targetPorts);
      sinkList = new Int32Array(targetPorts);
      hubCount = 0;
      sourceCount = 0;
      sinkCount = 0;

      const claim = (idx: number, role: number, list: Int32Array, count: number) => {
        if (idx < 0 || idx >= nodeCount || nodeRole[idx] !== ROLE_PLAIN) return count;
        nodeRole[idx] = role;
        list[count] = idx;
        return count + 1;
      };

      for (let i = 0; i < targetPorts; i++) {
        sourceCount = claim(pick(leftEdge, leftLimit), ROLE_SOURCE, sourceList, sourceCount);
      }
      for (let i = 0; i < targetPorts; i++) {
        sinkCount = claim(pick(rightEdge, rightLimit), ROLE_SINK, sinkList, sinkCount);
      }
      for (let i = 0; i < targetHubs; i++) {
        hubCount = claim(pick(leftLimit + 1, rightEdge - 1), ROLE_HUB, hubList, hubCount);
      }

      /* Random placement can collide on a narrow board and leave a zone
         empty. Streams are emitted from a source toward a sink, so zero of
         either means zero streams — a silently near-dead animation rather
         than a visibly broken one. Deterministic sweep as a floor. */
      const ensurePort = (minCol: number, maxCol: number, role: number, list: Int32Array, count: number) => {
        if (count > 0) return count;
        for (let row = 2; row < rows - 2; row++) {
          for (let col = minCol; col <= maxCol && col < cols; col++) {
            const idx = row * cols + col;
            if (idx >= 0 && idx < nodeCount && nodeRole[idx] === ROLE_PLAIN) {
              nodeRole[idx] = role;
              list[0] = idx;
              return 1;
            }
          }
        }
        return count;
      };

      sourceCount = ensurePort(leftEdge, leftLimit, ROLE_SOURCE, sourceList, sourceCount);
      sinkCount = ensurePort(rightEdge, rightLimit, ROLE_SINK, sinkList, sinkCount);
      hubCount = ensurePort(leftLimit + 1, Math.max(leftLimit + 1, rightEdge - 1), ROLE_HUB, hubList, hubCount);

      drawSubstrate();
    };

    const applyTier = () => {
      tier = TIERS[tierIndex];
      let streams = 0;
      let telemetry = 0;
      for (let i = 0; i < POOL; i++) {
        if (!pActive[i]) continue;
        if (pClass[i] === CLASS_STREAM && ++streams > tier.streams) pActive[i] = 0;
        if (pClass[i] === CLASS_TELEMETRY && ++telemetry > tier.telemetry) pActive[i] = 0;
      }
    };

    /* Measured synchronously before the first spawn — the previous
       implementation spawned before the ResizeObserver had fired, so cols and
       rows were still 0 and every pulse started at (0,0). */
    const initialRect = parent.getBoundingClientRect();
    buildTopology(initialRect.width, initialRect.height);

    for (let i = 0; i < tier.streams; i++) spawnStream();
    for (let i = 0; i < tier.telemetry; i++) spawnTelemetry();

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
    resizeObserver.observe(parent);

    /* ── Input ──────────────────────────────────────────────────────────── */

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;

      const x = e.clientX - rectLeft;
      const y = e.clientY - rectTop;

      // Only claim the pointer while it is genuinely over the board, so the
      // probe doesn't trail a cursor that has moved on to the nav or console.
      hasPointer = x >= 0 && y >= 0 && x <= rectWidth && y <= rectHeight;
      pointerX = x;
      pointerY = y;

      if (hasPointer) activity = Math.min(1, activity + 0.012);
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

      activity = Math.min(1, activity + (signal.strength ?? 0.45));

      // A discrete event fires a visible packet out of a hub, so running a
      // command in the terminal is legible on the board rather than merely
      // raising a number.
      if (hubCount) {
        const hub = hubList[(Math.random() * hubCount) | 0];
        const hx = colOf(hub) * GRID;
        const hy = rowOf(hub) * GRID;
        triggerShockwave(hx, hy, 64, false);
        activateNode(hub);
        if (countClass(CLASS_RELAY) < tier.maxRelays) {
          spawnRelay(hx, hy, (Math.random() * 4) | 0);
        }
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

    const onVisibility = () => {
      running = !document.hidden;
      // Reset the clock so returning from a background tab doesn't apply one
      // enormous delta and teleport every pulse across the board.
      lastTime = 0;
    };
    document.addEventListener('visibilitychange', onVisibility);

    /* ── Theme observation ──────────────────────────────────────────────── */

    const themeObserver = new MutationObserver(() => {
      if (readTheme()) {
        rebuildSprites();
        drawSubstrate();
      }
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    /* ── Simulation ─────────────────────────────────────────────────────── */

    const retire = (i: number) => {
      pActive[i] = 0;
    };

    const updatePulse = (i: number, dtRatio: number) => {
      pAccum[i] += pSpeed[i] * dtRatio;
      const step = Math.floor(pAccum[i]);
      if (step <= 0) return;
      pAccum[i] -= step;

      // Append the current position to the ring buffer.
      const base = i * TRAIL_CAP * 2;
      const head = pTrailHead[i];
      trailXY[base + head * 2] = pX[i];
      trailXY[base + head * 2 + 1] = pY[i];
      pTrailHead[i] = (head + 1) % TRAIL_CAP;
      if (pTrailLen[i] < Math.min(pMaxTrail[i], TRAIL_CAP)) pTrailLen[i]++;

      const dir = pDir[i];
      const prevCol = Math.floor(pX[i] / GRID);
      const prevRow = Math.floor(pY[i] / GRID);

      pX[i] += DX[dir] * step;
      pY[i] += DY[dir] * step;

      const currCol = Math.floor(pX[i] / GRID);
      const currRow = Math.floor(pY[i] / GRID);

      // Snap to the intersection actually crossed this step.
      let hitX = -1;
      let hitY = -1;
      if (dir === 1 && currCol > prevCol) {
        hitX = currCol * GRID;
        hitY = Math.round(pY[i] / GRID) * GRID;
      } else if (dir === 3 && currCol < prevCol) {
        hitX = prevCol * GRID;
        hitY = Math.round(pY[i] / GRID) * GRID;
      } else if (dir === 2 && currRow > prevRow) {
        hitX = Math.round(pX[i] / GRID) * GRID;
        hitY = currRow * GRID;
      } else if (dir === 0 && currRow < prevRow) {
        hitX = Math.round(pX[i] / GRID) * GRID;
        hitY = prevRow * GRID;
      }

      if (hitX !== -1) {
        pX[i] = hitX;
        pY[i] = hitY;

        const col = Math.round(hitX / GRID);
        const row = Math.round(hitY / GRID);
        const idx = row * cols + col;
        const onBoard = col >= 0 && col < cols && idx >= 0 && idx < nodeCount;

        if (onBoard) {
          activateNode(idx);

          if (pClass[i] === CLASS_STREAM) {
            if (Math.random() < 0.25) emitSpark(hitX, hitY, dir);

            /* Arrived at its sink. The ring is occasional, not guaranteed:
               a handful of sinks absorbing a dozen streams meant an arrival
               every few frames in one small area, reading as a malfunction
               rather than as traffic. */
            if (idx === pTarget[i]) {
              if (Math.random() < 0.18) triggerShockwave(hitX, hitY, 24, true);
              retire(i);
              pendingStreams++;
              return;
            }

            // Crossing a hub: flare and fork a relay onto the perpendicular.
            if (nodeRole[idx] === ROLE_HUB) {
              if (Math.random() < 0.15) triggerShockwave(hitX, hitY, 38, false);
              if (countClass(CLASS_RELAY) < tier.maxRelays) {
                spawnRelay(hitX, hitY, perpDir(dir));
              }
            }
          }
        }

        /* Routing. A stream with a destination performs Manhattan routing —
           it picks an axis that reduces the remaining distance and never
           reverses into itself, which is what makes the traffic read as
           deliberate rather than as a random walk. */
        const target = pTarget[i];
        if (target >= 0) {
          const dc = colOf(target) - col;
          const dr = rowOf(target) - row;

          if (Math.random() < ROUTE_CHANCE) {
            let choiceA = -1;
            let choiceB = -1;
            if (dc > 0) choiceA = 1;
            else if (dc < 0) choiceA = 3;
            if (dr > 0) choiceB = 2;
            else if (dr < 0) choiceB = 0;

            const back = opposite(dir);
            if (choiceA === back) choiceA = -1;
            if (choiceB === back) choiceB = -1;

            if (choiceA !== -1 && choiceB !== -1) {
              // Favour the axis with further to go, so paths stay direct.
              pDir[i] = Math.abs(dc) >= Math.abs(dr) ? choiceA : choiceB;
            } else if (choiceA !== -1) {
              pDir[i] = choiceA;
            } else if (choiceB !== -1) {
              pDir[i] = choiceB;
            }
          }
        } else if (Math.random() < DRIFT_TURN_CHANCE) {
          pDir[i] = perpDir(dir);
        }
      }

      // Retire once the head and its whole trail have left the board.
      const margin = GRID * 2;
      if (pX[i] < -margin || pX[i] > w + margin || pY[i] < -margin || pY[i] > h + margin) {
        const trailSpan = pTrailLen[i] * pSpeed[i];
        if (
          pX[i] < -margin - trailSpan ||
          pX[i] > w + margin + trailSpan ||
          pY[i] < -margin - trailSpan ||
          pY[i] > h + margin + trailSpan
        ) {
          const cls = pClass[i];
          retire(i);
          if (cls === CLASS_STREAM) pendingStreams++;
          else if (cls === CLASS_TELEMETRY) spawnTelemetry();
        }
      }
    };

    // Warm start, so the first painted frame isn't an empty board.
    for (let n = 0; n < 140; n++) {
      for (let i = 0; i < POOL; i++) if (pActive[i]) updatePulse(i, 1);
    }

    /* ── Render ─────────────────────────────────────────────────────────── */

    let lastTime = 0;
    let frame = 0;
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
      frame++;

      /* Self-tuning quality. Degrading gracefully beats locking a weak device
         at 20fps. Only ever steps down, after a sustained run of slow frames. */
      frameAvg += (dt - frameAvg) * 0.05;
      if (frameAvg > 24 && tierIndex > 0) {
        if (++slowFrames > 120) {
          tierIndex--;
          applyTier();
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

      // Activity decays toward the level the page is holding.
      activity *= Math.pow(0.988, ratio);
      const load = Math.max(activity, externalLoad);

      // Budget is expressed as a queue; the drain below paces it. Counting
      // what is already queued stops the top-up from over-ordering while
      // earlier requests are still waiting to launch.
      if (frame % 30 === 0) {
        const desired = tier.streams + Math.round(load * 2);
        const have = countClass(CLASS_STREAM) + pendingStreams;
        if (have < desired) pendingStreams += desired - have;
      }

      spawnCooldown -= ratio;
      if (pendingStreams > 0 && spawnCooldown <= 0) {
        spawnStream();
        pendingStreams--;
        spawnCooldown = 22 + Math.random() * 45;
      }

      ctx.clearRect(0, 0, w, h);

      // 1. Substrate — one blit, no path work.
      ctx.drawImage(substrate, 0, 0, w, h);

      // 2. Shockwaves.
      ctx.lineWidth = 1;
      for (let i = 0; i < MAX_SHOCKWAVES; i++) {
        if (!wActive[i]) continue;

        if (wInward[i]) {
          wR[i] -= wSpeed[i] * ratio;
          if (wR[i] <= 1) {
            wActive[i] = 0;
            continue;
          }
        } else {
          wR[i] += wSpeed[i] * ratio;
          if (wR[i] >= wMaxR[i]) {
            wActive[i] = 0;
            continue;
          }
        }

        wAlpha[i] *= Math.pow(0.95, ratio);
        if (wAlpha[i] < 0.02) {
          wActive[i] = 0;
          continue;
        }

        ctx.strokeStyle = `hsl(${primaryHSL} / ${wAlpha[i] * 0.4})`;
        ctx.beginPath();
        ctx.arc(wX[i], wY[i], wR[i], 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. Functional nodes — role-shaped so the topology reads without labels.
      const breathe = 6.5 + Math.sin(time * 0.003) * 1.8;
      ctx.fillStyle = `hsl(${primaryHSL})`;

      for (let i = 0; i < hubCount; i++) {
        const idx = hubList[i];
        const x = colOf(idx) * GRID;
        const y = rowOf(idx) * GRID;
        drawnStamp[idx] = frame;

        ctx.globalAlpha = Math.max(0.2 + load * 0.15, nodeAct[idx] * 0.85);
        ctx.beginPath();
        ctx.arc(x, y, 2.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `hsl(${primaryHSL} / ${(0.12 + nodeAct[idx] * 0.3) * (0.6 + load * 0.4)})`;
        ctx.beginPath();
        ctx.arc(x, y, breathe, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Sources: ringed, to read as an inlet.
      for (let i = 0; i < sourceCount; i++) {
        const idx = sourceList[i];
        const x = colOf(idx) * GRID;
        const y = rowOf(idx) * GRID;
        drawnStamp[idx] = frame;

        ctx.globalAlpha = Math.max(0.3, nodeAct[idx] * 0.9);
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `hsl(${primaryHSL} / 0.3)`;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Sinks: diamonds, a distinct silhouette from every other node.
      for (let i = 0; i < sinkCount; i++) {
        const idx = sinkList[i];
        const x = colOf(idx) * GRID;
        const y = rowOf(idx) * GRID;
        drawnStamp[idx] = frame;

        ctx.globalAlpha = Math.max(0.3, nodeAct[idx] * 0.9);
        ctx.beginPath();
        ctx.moveTo(x, y - 3.6);
        ctx.lineTo(x + 3.6, y);
        ctx.lineTo(x, y + 3.6);
        ctx.lineTo(x - 3.6, y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Lit plain nodes, decayed in the same pass and compacted by swap-remove.
      const decay = 0.02 * ratio;
      for (let k = activeCount - 1; k >= 0; k--) {
        const idx = activeList[k];
        const act = nodeAct[idx] - decay;

        if (act <= 0) {
          nodeAct[idx] = 0;
          activeFlag[idx] = 0;
          activeList[k] = activeList[--activeCount];
          continue;
        }
        nodeAct[idx] = act;

        if (drawnStamp[idx] === frame) continue;
        drawnStamp[idx] = frame;

        ctx.globalAlpha = act * 0.85;
        ctx.beginPath();
        ctx.arc(colOf(idx) * GRID, rowOf(idx) * GRID, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Nodes near the cursor — only the local neighbourhood is visited.
      if (hasPointer) {
        const reach = 150;
        const span = Math.ceil(reach / GRID);
        const cc = Math.floor(pointerX / GRID);
        const cr = Math.floor(pointerY / GRID);

        for (let r = Math.max(0, cr - span); r <= Math.min(rows - 1, cr + span); r++) {
          for (let c = Math.max(0, cc - span); c <= Math.min(cols - 1, cc + span); c++) {
            const idx = r * cols + c;
            if (drawnStamp[idx] === frame) continue;

            const nx = c * GRID;
            const ny = r * GRID;
            const dx = nx - pointerX;
            const dy = ny - pointerY;
            const distSq = dx * dx + dy * dy;
            if (distSq > reach * reach) continue;

            const prox = 1 - Math.sqrt(distSq) / reach;
            drawnStamp[idx] = frame;
            ctx.globalAlpha = prox * 0.4;
            ctx.beginPath();
            ctx.arc(nx, ny, 1.2 + prox * 0.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }

      // 4. Sparks.
      if (tier.sparks) {
        for (let i = 0; i < MAX_SPARKS; i++) {
          if (!sActive[i]) continue;
          sX[i] += sVX[i] * ratio;
          sY[i] += sVY[i] * ratio;
          sLife[i] += ratio;
          if (sLife[i] >= sMaxLife[i]) {
            sActive[i] = 0;
            continue;
          }
          const progress = sLife[i] / sMaxLife[i];
          ctx.fillStyle = `hsl(${primaryHSL} / ${(1 - progress) * 0.55})`;
          ctx.beginPath();
          ctx.arc(sX[i], sY[i], sSize[i] * (1 - progress * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 5. Pulses — simulated and stroked straight out of the ring buffer.
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const trailBoost = 1 + load * 0.35;

      for (let i = 0; i < POOL; i++) {
        if (!pActive[i]) continue;
        updatePulse(i, ratio);
        if (!pActive[i]) continue;

        const len = pTrailLen[i];
        if (len < 2) continue;

        const cls = pClass[i];
        const base = i * TRAIL_CAP * 2;
        const head = pTrailHead[i];
        const bands = cls === CLASS_TELEMETRY ? 2 : 4;
        const maxAlpha =
          (cls === CLASS_TELEMETRY ? 0.09 : cls === CLASS_RELAY ? 0.42 : 0.28) * trailBoost;
        const width = cls === CLASS_TELEMETRY ? 3.5 : cls === CLASS_RELAY ? 1.5 : 1.8;
        const bandSize = Math.ceil(len / bands);

        for (let b = 0; b < bands; b++) {
          const start = b * bandSize;
          if (start >= len) break;
          const end = Math.min(start + bandSize, len - 1);
          if (end <= start) continue;

          ctx.strokeStyle = `hsl(${primaryHSL} / ${Math.min(1, ((b + 1) / bands) * maxAlpha)})`;
          ctx.lineWidth = width;
          ctx.beginPath();

          for (let j = start; j <= end; j++) {
            const slot = (head - len + j + TRAIL_CAP * 2) % TRAIL_CAP;
            const px = trailXY[base + slot * 2];
            const py = trailXY[base + slot * 2 + 1];
            if (j === start) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

        if (cls !== CLASS_TELEMETRY) {
          const sprite = cls === CLASS_STREAM ? glowStream : glowRelay;
          const half = sprite.width / 2;
          ctx.drawImage(sprite, pX[i] - half, pY[i] - half);
        }
      }

      /* 6. Cursor probe — links to the two nearest nodes. Two reads as a
            triangulating instrument; one reads as a single leader line and
            loses the sense of the cursor sitting inside a mesh. */
      if (hasPointer) {
        let bestSq = Infinity;
        let secondSq = Infinity;
        let bestX = 0;
        let bestY = 0;
        let secondX = 0;
        let secondY = 0;

        const cc = Math.floor(pointerX / GRID);
        const cr = Math.floor(pointerY / GRID);

        for (let r = Math.max(0, cr - 1); r <= Math.min(rows - 1, cr + 2); r++) {
          for (let c = Math.max(0, cc - 1); c <= Math.min(cols - 1, cc + 2); c++) {
            const nx = c * GRID;
            const ny = r * GRID;
            const dx = nx - pointerX;
            const dy = ny - pointerY;
            const distSq = dx * dx + dy * dy;

            if (distSq < bestSq) {
              secondSq = bestSq;
              secondX = bestX;
              secondY = bestY;
              bestSq = distSq;
              bestX = nx;
              bestY = ny;
            } else if (distSq < secondSq) {
              secondSq = distSq;
              secondX = nx;
              secondY = ny;
            }
          }
        }

        const probeReach = 140;
        ctx.lineWidth = 1;

        for (let n = 0; n < 2; n++) {
          const distSq = n === 0 ? bestSq : secondSq;
          if (distSq === Infinity) continue;

          const dist = Math.sqrt(distSq);
          if (dist >= probeReach) continue;

          const alpha = (1 - dist / probeReach) * 0.3;
          const tx = n === 0 ? bestX : secondX;
          const ty = n === 0 ? bestY : secondY;

          ctx.strokeStyle = `hsl(${primaryHSL} / ${alpha})`;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(pointerX, pointerY);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = `hsl(${primaryHSL} / ${alpha * 1.5})`;
          ctx.beginPath();
          ctx.arc(tx, ty, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Grid address of the nearest node — the cursor as an instrument
        // rather than a decoration that follows the mouse.
        if (bestSq < probeReach * probeReach) {
          ctx.font = '9px ui-monospace, "JetBrains Mono", monospace';
          ctx.fillStyle = `hsl(${primaryHSL} / 0.32)`;
          ctx.fillText(
            `[${Math.round(bestX / GRID)},${Math.round(bestY / GRID)}]`,
            pointerX + 12,
            pointerY - 8
          );
        }

        ctx.strokeStyle = `hsl(${primaryHSL} / 0.22)`;
        ctx.beginPath();
        ctx.arc(pointerX, pointerY, 8, 0, Math.PI * 2);
        ctx.stroke();
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
            linear-gradient(to right, hsl(var(--foreground) / 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground) / 0.05) 1px, transparent 1px),
            linear-gradient(to right, hsl(var(--foreground) / 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground) / 0.08) 1px, transparent 1px)
          `,
          backgroundSize: `${GRID}px ${GRID}px, ${GRID}px ${GRID}px, ${MAJOR}px ${MAJOR}px, ${MAJOR}px ${MAJOR}px`,
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
          /* The edge falloff used to be a full-canvas destination-in
             composite with a fresh gradient allocated every frame. As a CSS
             mask it costs nothing per frame and composites on the GPU. */
          maskImage: 'radial-gradient(ellipse 72% 68% at 50% 45%, #000 32%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 72% 68% at 50% 45%, #000 32%, transparent 100%)',
        }}
      />
    </div>
  );
});

CircuitCanvas.displayName = 'CircuitCanvas';

export default CircuitCanvas;
