/* ==========================================================================
   EVENT HORIZON — RENDERER

   The GL half: programs, buffers, and the order of the passes. It knows
   nothing about React, the page, or the physics beyond the uniforms it is
   handed.

     HDR pipeline (WebGL2 + renderable half floats), per frame:

       trace     the black hole, jittered, into a float buffer   ─ 1/pixel res
       resolve   blended into the history, reprojected + clamped ─ 1/pixel res
       bloom     the history down a 4-level pyramid and back up  ─ ½ … 1/16
       finish    glow, tone, grain, to the canvas                ─ 1/pixel res

     DIRECT (anything less): the tracer alone, toning its own pixels onto a
     canvas at trace resolution, shown pixelated — the renderer as it was.

   Everything expensive is in the trace; the other passes together cost
   about a dozen texture reads per traced pixel.
   ========================================================================== */

import { COMPOSITE, DOWN, RESOLVE, UP, VERT_ES1, VERT_ES3, traceShader } from './shaders';

export interface FrameParams {
  time: number;
  phase: number;
  energy: number;
  recede: number;
  tilt: [number, number];
  /** Where the hole sits, 0..1 of the canvas, GL convention (y up). */
  center: [number, number];
  roll: number;
  zoom: number;
  cam: number;
  incl: number;
  lens: number;
  spots: Float32Array;
  /** Sub-pixel offset of this frame's samples, in trace pixels. */
  jitter: [number, number];
  /** This frame's lens scale over the previous frame's — for reprojection. */
  reproject: number;
  /** Weight of the new frame in the history: 1 discards it. */
  blend: number;
}

export interface Renderer {
  /** True when the full HDR pipeline is running. */
  readonly hdr: boolean;
  setColours(accent: [number, number, number], bg: [number, number, number]): void;
  /** Sizes the buffers for a canvas `width × height` CSS pixels, traced at 1/`pixel`. */
  resize(width: number, height: number, pixel: number): void;
  render(frame: FrameParams): void;
  dispose(): void;
}

type GL = WebGLRenderingContext | WebGL2RenderingContext;
type Uniforms = Record<string, WebGLUniformLocation | null>;

interface Program {
  program: WebGLProgram;
  u: Uniforms;
}

interface Target {
  tex: WebGLTexture;
  fbo: WebGLFramebuffer;
  w: number;
  h: number;
}

const BLOOM_LEVELS = 4;
/** How much of the light is spread into glow. */
const BLOOM_MIX = 0.32;

function build(gl: GL, vert: string, frag: string, names: string[]): Program | null {
  const compile = (type: number, src: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('event horizon:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };
  const vs = compile(gl.VERTEX_SHADER, vert);
  const fs = compile(gl.FRAGMENT_SHADER, frag);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, 'aPos');
  gl.linkProgram(program);
  // The shaders are owned by the program once linked.
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('event horizon:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  const u: Uniforms = {};
  for (const name of names) u[name] = gl.getUniformLocation(program, name);
  return { program, u };
}

const TRACE_UNIFORMS = [
  'uRes', 'uJitter', 'uTime', 'uPhase', 'uEnergy', 'uRecede', 'uTilt', 'uCenter', 'uRoll',
  'uZoom', 'uCam', 'uIncl', 'uLens', 'uSpots', 'uAccent', 'uBg',
];

export function createRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const options: WebGLContextAttributes = {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
    preserveDrawingBuffer: false,
  };
  const gl2 = canvas.getContext('webgl2', options);
  const hdrCapable = Boolean(gl2 && gl2.getExtension('EXT_color_buffer_float'));
  const gl: GL | null = gl2 ?? canvas.getContext('webgl', options);
  if (!gl || gl.isContextLost()) return null;

  // One triangle that covers the screen, shared by every pass.
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const pipeline = hdrCapable && gl2 ? createHdr(gl2) : null;
  if (pipeline) return pipeline(quad);

  // DIRECT. The ES 1.0 tracer compiles on either context.
  const trace = build(gl, VERT_ES1, traceShader(false), TRACE_UNIFORMS);
  if (!trace) {
    gl.deleteBuffer(quad);
    return null;
  }
  gl.useProgram(trace.program);
  let w = 1;
  let h = 1;

  return {
    hdr: false,
    setColours(accent, bg) {
      gl.useProgram(trace.program);
      gl.uniform3fv(trace.u.uAccent, accent);
      gl.uniform3fv(trace.u.uBg, bg);
    },
    resize(width, height, pixel) {
      w = Math.max(1, Math.round(width / pixel));
      h = Math.max(1, Math.round(height / pixel));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    },
    render(f) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.useProgram(trace.program);
      setTraceUniforms(gl, trace.u, f, w, h, false);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteProgram(trace.program);
      gl.deleteBuffer(quad);
    },
  };

  function createHdr(gl: WebGL2RenderingContext) {
    const trace = build(gl, VERT_ES3, traceShader(true), TRACE_UNIFORMS);
    const resolve = build(gl, VERT_ES3, RESOLVE, ['uCur', 'uPrev', 'uRes', 'uCenterPx', 'uReproject', 'uBlend']);
    const down = build(gl, VERT_ES3, DOWN, ['uSrc', 'uTexel', 'uRes']);
    const up = build(gl, VERT_ES3, UP, ['uSrc', 'uBase', 'uTexel', 'uRes']);
    const finish = build(gl, VERT_ES3, COMPOSITE, ['uHist', 'uBloom', 'uOut', 'uBloomMix', 'uBloomNorm', 'uTime', 'uAccent', 'uBg']);
    const programs = [trace, resolve, down, up, finish];
    if (programs.some((p) => !p)) {
      for (const p of programs) if (p) gl.deleteProgram(p.program);
      return null;
    }
    const [T, R, D, U, F] = programs as Program[];

    const target = (w: number, h: number): Target | null => {
      const tex = gl.createTexture();
      const fbo = gl.createFramebuffer();
      if (!tex || !fbo) return null;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (!ok) {
        gl.deleteTexture(tex);
        gl.deleteFramebuffer(fbo);
        return null;
      }
      return { tex, fbo, w, h };
    };
    const free = (t: Target) => {
      gl.deleteTexture(t.tex);
      gl.deleteFramebuffer(t.fbo);
    };

    // A probe: some drivers advertise float targets and then refuse them.
    const probe = target(4, 4);
    if (!probe) {
      for (const p of programs as Program[]) gl.deleteProgram(p.program);
      return null;
    }
    free(probe);

    let cur: Target | null = null;
    let hist: [Target, Target] | null = null;
    let downs: Target[] = [];
    let ups: Target[] = [];
    let outW = 1;
    let outH = 1;
    /** No history yet: the next frame is taken whole. */
    let fresh = true;

    const release = () => {
      if (cur) free(cur);
      if (hist) hist.forEach(free);
      downs.forEach(free);
      ups.forEach(free);
      cur = null;
      hist = null;
      downs = [];
      ups = [];
    };

    const bind = (t: Target | null, w: number, h: number) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fbo : null);
      gl.viewport(0, 0, w, h);
    };
    const tex = (unit: number, t: Target) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
    };

    return (quad: WebGLBuffer | null): Renderer => ({
      hdr: true,
      setColours(accent, bg) {
        gl.useProgram(F.program);
        gl.uniform3fv(F.u.uAccent, accent);
        gl.uniform3fv(F.u.uBg, bg);
      },
      resize(width, height, pixel) {
        // The finish is written at trace resolution and the browser scales
        // the canvas up — the same filter, and none of the cost.
        const tw = Math.max(1, Math.round(width / pixel));
        const th = Math.max(1, Math.round(height / pixel));
        if (canvas.width !== tw || canvas.height !== th) {
          canvas.width = tw;
          canvas.height = th;
        }
        outW = tw;
        outH = th;
        if (cur && cur.w === tw && cur.h === th) return;
        release();
        cur = target(tw, th);
        const a = target(tw, th);
        const b = target(tw, th);
        hist = a && b ? [a, b] : null;
        for (let i = 1; i <= BLOOM_LEVELS; i++) {
          const lw = Math.max(1, tw >> i);
          const lh = Math.max(1, th >> i);
          const d = target(lw, lh);
          if (d) downs.push(d);
          if (i < BLOOM_LEVELS) {
            const u = target(lw, lh);
            if (u) ups.push(u);
          }
        }
        fresh = true;
      },
      render(f) {
        if (!cur || !hist || downs.length < BLOOM_LEVELS || ups.length < BLOOM_LEVELS - 1) return;
        const { w, h } = cur;

        // 1. Trace.
        bind(cur, w, h);
        gl.useProgram(T.program);
        setTraceUniforms(gl, T.u, f, w, h, true);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // 2. Resolve into the history (ping-pong).
        const [prev, next] = hist;
        bind(next, w, h);
        gl.useProgram(R.program);
        tex(0, cur);
        tex(1, prev);
        gl.uniform1i(R.u.uCur, 0);
        gl.uniform1i(R.u.uPrev, 1);
        gl.uniform2f(R.u.uRes, w, h);
        gl.uniform2f(R.u.uCenterPx, f.center[0] * w, f.center[1] * h);
        gl.uniform1f(R.u.uReproject, f.reproject);
        gl.uniform1f(R.u.uBlend, fresh ? 1 : f.blend);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        hist = [next, prev];
        fresh = false;

        // 3. Bloom: down the pyramid…
        gl.useProgram(D.program);
        gl.uniform1i(D.u.uSrc, 0);
        let src = next;
        for (const d of downs) {
          bind(d, d.w, d.h);
          tex(0, src);
          gl.uniform2f(D.u.uTexel, 1 / src.w, 1 / src.h);
          gl.uniform2f(D.u.uRes, d.w, d.h);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          src = d;
        }
        // …and back up, each level adding the one below it.
        gl.useProgram(U.program);
        gl.uniform1i(U.u.uSrc, 0);
        gl.uniform1i(U.u.uBase, 1);
        for (let i = ups.length - 1; i >= 0; i--) {
          const dst = ups[i];
          bind(dst, dst.w, dst.h);
          tex(0, src);
          tex(1, downs[i]);
          gl.uniform2f(U.u.uTexel, 1 / src.w, 1 / src.h);
          gl.uniform2f(U.u.uRes, dst.w, dst.h);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          src = dst;
        }

        // 4. Finish, to the screen.
        bind(null, outW, outH);
        gl.useProgram(F.program);
        tex(0, next);
        tex(1, src);
        gl.uniform1i(F.u.uHist, 0);
        gl.uniform1i(F.u.uBloom, 1);
        gl.uniform2f(F.u.uOut, outW, outH);
        gl.uniform1f(F.u.uBloomMix, BLOOM_MIX);
        gl.uniform1f(F.u.uBloomNorm, 1 / BLOOM_LEVELS);
        gl.uniform1f(F.u.uTime, f.time);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      dispose() {
        release();
        for (const p of programs as Program[]) gl.deleteProgram(p.program);
        gl.deleteBuffer(quad);
      },
    });
  }
}

function setTraceUniforms(gl: GL, u: Uniforms, f: FrameParams, w: number, h: number, hdr: boolean) {
  gl.uniform2f(u.uRes, w, h);
  gl.uniform2f(u.uJitter, hdr ? f.jitter[0] : 0, hdr ? f.jitter[1] : 0);
  gl.uniform1f(u.uTime, f.time);
  gl.uniform1f(u.uPhase, f.phase);
  gl.uniform1f(u.uEnergy, f.energy);
  gl.uniform1f(u.uRecede, f.recede);
  gl.uniform2f(u.uTilt, f.tilt[0], f.tilt[1]);
  gl.uniform2f(u.uCenter, f.center[0], f.center[1]);
  gl.uniform1f(u.uRoll, f.roll);
  gl.uniform1f(u.uZoom, f.zoom);
  gl.uniform1f(u.uCam, f.cam);
  gl.uniform1f(u.uIncl, f.incl);
  gl.uniform1f(u.uLens, f.lens);
  gl.uniform4fv(u.uSpots, f.spots);
}
