import React, { useEffect, useMemo, useState } from 'react';
import { Github, Linkedin } from 'lucide-react';

import { XLogo } from '@/components/ui/XLogo';
import { FPS_SAMPLES, formatUptime, useSystemTelemetry } from './useSystemTelemetry';

/* ==========================================================================
   STATUS RAIL

   An instrument panel, not a debug overlay.

   The previous version was a single row of fragments separated by pipes —
   a dot, a 44px sparkline, "58 fps", "03:49 up", "45.3 mb" — all at one
   weight, in one size, with nothing grouping them. It read as leftover
   console output because that is structurally what it was.

   Three things do most of the work here:

     · Every reading is a labelled cell with a fixed width. A value that
       changes from 58 to 8 no longer shifts everything to its right, which
       is the single biggest reason the old one felt cheap — the whole bar
       twitched once a second.
     · Numbers carry a unit at a smaller weight, so the figure reads first
       and the unit second, the way an instrument is actually scanned.
     · Where a number has a meaningful range it gets a shape: the frame rate
       an area chart against a 60fps reference, the heap a fill bar against
       the currently allocated total.

   Everything shown is measured from this page. Nothing here is a plausible
   constant, which is the same rule the message-of-the-day follows.
   ========================================================================== */

const SOCIALS = [
  { icon: Github, href: 'https://github.com/emmanuelrichard01', label: 'GitHub', short: 'gh' },
  { icon: Linkedin, href: 'https://linkedin.com/in/e-mc', label: 'LinkedIn', short: 'in' },
  { icon: XLogo, href: 'https://x.com/mrebr', label: 'X', short: 'x' },
];

/* ── Primitives ─────────────────────────────────────────────────────────── */

const Cell = ({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={`flex flex-col gap-[2px] ${className}`}>
    <span className="font-mono text-[7px] uppercase tracking-[0.2em] text-muted-foreground leading-none">
      {label}
    </span>
    <div className="flex items-center gap-1.5 h-[12px]">{children}</div>
  </div>
);

/** Figure first, unit second — and tabular so the column never reflows. */
const Value = ({
  children,
  unit,
  tone = 'text-foreground',
  width,
}: {
  children: React.ReactNode;
  unit?: string;
  tone?: string;
  width?: string;
}) => (
  <span className="flex items-baseline gap-0.5 leading-none">
    <span className={`font-mono text-[10px] tabular-nums ${tone}`} style={width ? { minWidth: width } : undefined}>
      {children}
    </span>
    {unit && (
      <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">{unit}</span>
    )}
  </span>
);

const Divider = () => <span className="w-px h-5 bg-border/60 shrink-0" aria-hidden="true" />;

/* ── Frame rate ─────────────────────────────────────────────────────────── */

const SPARK_W = 66;
const SPARK_H = 14;
const FPS_CEILING = 72;

const FrameChart = ({ history, healthy }: { history: number[]; healthy: boolean }) => {
  const geometry = useMemo(() => {
    if (history.length < 2) return null;

    // Anchored to the right edge, so a partly-filled window grows leftward
    // instead of stretching a handful of samples across the whole box.
    const step = SPARK_W / (FPS_SAMPLES - 1);
    const offset = SPARK_W - (history.length - 1) * step;

    const points = history.map((value, i) => {
      const x = offset + i * step;
      const y = SPARK_H - Math.min(1, value / FPS_CEILING) * SPARK_H;
      return [x, y] as const;
    });

    const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${offset.toFixed(1)},${SPARK_H} ${line} ${SPARK_W},${SPARK_H}`;
    const last = points[points.length - 1];

    return { line, area, last };
  }, [history]);

  const stroke = healthy ? 'text-emerald-400' : 'text-amber-400';

  return (
    <svg
      width={SPARK_W}
      height={SPARK_H}
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      className={`shrink-0 overflow-visible ${stroke}`}
      aria-hidden="true"
    >
      {/* 60fps reference. Without a baseline a sparkline shows shape but no
          scale — you cannot tell a good run from a bad one. */}
      <line
        x1={0}
        x2={SPARK_W}
        y1={SPARK_H - (60 / FPS_CEILING) * SPARK_H}
        y2={SPARK_H - (60 / FPS_CEILING) * SPARK_H}
        stroke="currentColor"
        strokeWidth={0.5}
        strokeDasharray="2 3"
        opacity={0.25}
      />

      {geometry && (
        <>
          <polygon points={geometry.area} fill="currentColor" opacity={0.12} />
          <polyline
            points={geometry.line}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.25}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* The live sample, called out so the eye lands on "now". */}
          <circle cx={geometry.last[0]} cy={geometry.last[1]} r={1.7} fill="currentColor" />
        </>
      )}
    </svg>
  );
};

/* ── Heap ───────────────────────────────────────────────────────────────── */

const Meter = ({ ratio, tone }: { ratio: number; tone: string }) => (
  <span className="relative block w-[36px] h-[3px] bg-border/60 overflow-hidden shrink-0" aria-hidden="true">
    <span
      className={`absolute inset-y-0 left-0 ${tone} transition-[width] duration-500 ease-out`}
      style={{ width: `${Math.max(2, Math.min(100, ratio * 100))}%` }}
    />
  </span>
);

/* ── Client ─────────────────────────────────────────────────────────────── */

interface ConnectionInfo {
  effectiveType?: string;
}

function useClientInfo(active: boolean) {
  const [info, setInfo] = useState(() => ({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
    dpr: typeof window === 'undefined' ? 1 : window.devicePixelRatio,
  }));

  useEffect(() => {
    if (!active) return;
    const onResize = () =>
      setInfo({ width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio });
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, [active]);

  // Chromium-only; omitted rather than guessed elsewhere.
  const connection = (navigator as Navigator & { connection?: ConnectionInfo }).connection;
  return { ...info, effectiveType: connection?.effectiveType };
}

/* ── Rail ───────────────────────────────────────────────────────────────── */

export default function StatusRail({ active }: { active: boolean }) {
  const telemetry = useSystemTelemetry(active);
  const client = useClientInfo(active);

  const pending = telemetry.fps === null;
  const fps = telemetry.fps ?? 0;
  const healthy = pending || fps >= 50;

  // Frame time is what a rendering problem is actually measured in; fps is
  // the friendlier face of the same number, so both are shown.
  const frameMs = pending || fps === 0 ? null : 1000 / fps;

  const heapRatio =
    telemetry.heapMB !== null && telemetry.heapTotalMB
      ? telemetry.heapMB / telemetry.heapTotalMB
      : null;

  const heapTone =
    heapRatio !== null && heapRatio > 0.9 ? 'bg-amber-400/80' : 'bg-primary/70';

  return (
    <div className="flex items-center gap-3 min-w-0">
      {/* Live indicator doubles as the section label. */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={`w-1.5 h-1.5 status-live ${healthy ? 'bg-emerald-500' : 'bg-amber-500'}`}
          aria-hidden="true"
        />
        <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-muted-foreground hidden lg:inline">
          live
        </span>
      </div>

      <Divider />

      <Cell label="render" className="shrink-0">
        <FrameChart history={telemetry.fpsHistory} healthy={healthy} />
        <Value unit="fps" tone={healthy ? 'text-emerald-400' : 'text-amber-400'} width="1.6em">
          {pending ? '––' : fps}
        </Value>
        <span className="hidden xl:flex items-baseline gap-0.5">
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground" style={{ minWidth: '2.2em' }}>
            {frameMs === null ? '––' : frameMs.toFixed(1)}
          </span>
          <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">ms</span>
        </span>
      </Cell>

      <Divider />

      {/* Heap where the browser reports it, DOM size where it does not —
          rather than a blank cell on Firefox and Safari. */}
      {telemetry.heapMB !== null ? (
        <Cell label="heap" className="shrink-0 hidden sm:flex">
          {heapRatio !== null && <Meter ratio={heapRatio} tone={heapTone} />}
          <Value unit="mb" tone="text-primary" width="2.6em">
            {telemetry.heapMB.toFixed(1)}
          </Value>
          {telemetry.heapTotalMB !== null && (
            <span className="font-mono text-[9px] tabular-nums text-muted-foreground hidden xl:inline">
              /{telemetry.heapTotalMB.toFixed(0)}
            </span>
          )}
        </Cell>
      ) : (
        <Cell label="dom" className="shrink-0 hidden sm:flex">
          <Value unit="nodes" tone="text-primary" width="2.8em">
            {telemetry.domNodes}
          </Value>
        </Cell>
      )}

      <Divider />

      <Cell label="session" className="shrink-0 hidden md:flex">
        <Value tone="text-foreground" width="3.4em">
          {formatUptime(telemetry.uptimeSeconds)}
        </Value>
      </Cell>

      <span className="hidden xl:contents">
        <Divider />
        <Cell label="client" className="shrink-0 hidden xl:flex">
          <Value tone="text-muted-foreground">
            {client.width}×{client.height}
          </Value>
          <span className="font-mono text-[9px] text-muted-foreground">
            @{client.dpr}x{client.effectiveType ? ` · ${client.effectiveType}` : ''}
          </span>
        </Cell>
      </span>

      {/* Socials sit in the same rail but on their own side of a divider, so
          they read as a separate group rather than a fourth reading. */}
      <div className="flex items-center gap-4 ml-auto pl-4 shrink-0">
        <Divider />
        <div className="flex items-center gap-3.5">
          {SOCIALS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${social.label} (opens in a new tab)`}
              /* The label is hidden below `sm`, which left a bare 14px icon
                 as the whole tap target on exactly the devices least able to
                 hit it. Padding plus a cancelling negative margin brings the
                 hit area to 30px without changing the rail's layout. */
              className="flex items-center gap-1.5 p-2 -m-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <social.icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="font-mono text-[9px] uppercase tracking-widest hidden sm:inline">
                {social.short}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
