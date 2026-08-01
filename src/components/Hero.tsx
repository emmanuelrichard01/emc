import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Github, Linkedin, ArrowRight, Command, Terminal } from "lucide-react";
import { XLogo } from "@/components/ui/XLogo";
import { CVDownloadButton } from "@/components/ui/CVDownloadButton";
import { scrollToSection } from "@/lib/scrollToSection";
import { useTheme } from "@/components/ThemeProvider";

/* -------------------------------------------------------------------------- */
/* LIVE OPS CONSOLE — The Signature Terminal                                   */
/* A senior-level production operations console that feels alive and real.     */
/* Features: live metrics tickers, timestamped entries, severity levels,       */
/* a persistent status bar, and realistic deployment/monitoring workflows.     */
/* -------------------------------------------------------------------------- */

type Severity = 'info' | 'success' | 'warn' | 'error' | 'cmd' | 'sys' | 'data';

interface ConsoleEntry {
  severity: Severity;
  text: string;
  hold: number; // ms before next entry
}

const CONSOLE_SEQUENCE: ConsoleEntry[] = [
  { severity: 'sys',     text: 'BOOT // kernel v4.2.9 — loading subsystems',          hold: 400 },
  { severity: 'info',    text: 'Mounting encrypted volumes...done',                    hold: 250 },
  { severity: 'success', text: '✓ Auth gateway online — mTLS verified',                hold: 350 },
  { severity: 'cmd',     text: '$ terraform plan -var-file=prod.tfvars',               hold: 700 },
  { severity: 'info',    text: 'Refreshing state... 47 resources found',               hold: 500 },
  { severity: 'success', text: '✓ Plan: 0 to add, 2 to change, 0 to destroy',         hold: 400 },
  { severity: 'cmd',     text: '$ kubectl rollout status deploy/ingestion-worker',     hold: 600 },
  { severity: 'info',    text: 'Waiting for rollout to finish: 3/3 replicas updated',  hold: 800 },
  { severity: 'success', text: '✓ deployment "ingestion-worker" successfully rolled out', hold: 300 },
  { severity: 'cmd',     text: '$ make pipeline.deploy ENV=prod REGION=us-east-1',     hold: 900 },
  { severity: 'info',    text: 'Compiling DAG graph — resolving 14 dependencies...',   hold: 700 },
  { severity: 'warn',    text: '⚠ Broker latency elevated: p99=142ms (threshold: 150ms)', hold: 600 },
  { severity: 'data',    text: '{"cluster":"kafka-prod","brokers":15,"lag":0,"throughput":"12.4M evt/day"}', hold: 500 },
  { severity: 'success', text: '✓ Pipeline deployed. All health checks passing.',      hold: 400 },
  { severity: 'cmd',     text: '$ dbt run --select marts.core --full-refresh',         hold: 1000 },
  { severity: 'info',    text: 'Running 18 models across 3 schemas...',                hold: 900 },
  { severity: 'success', text: '✓ 18 of 18 OK — 2.4M rows materialized in 11.3s',     hold: 600 },
  { severity: 'cmd',     text: '$ psql -c "SELECT pg_size_pretty(pg_database_size(current_database()))"', hold: 800 },
  { severity: 'data',    text: '  pg_size_pretty\n  ────────────────\n  248 GB',        hold: 500 },
  { severity: 'sys',     text: 'ALL SYSTEMS NOMINAL // HANDING OFF TO OPERATOR',        hold: 900 },
];

// Single source of truth for per-character typing pace — used by both the
// typer (rAF loop) and the advance timer, so they can never drift apart.
const TYPE_SPEED: Record<Severity, number> = {
  cmd: 30,
  data: 2,
  sys: 15,
  info: 8,
  success: 8,
  warn: 8,
  error: 8,
};

const SEVERITY_STYLES: Record<Severity, string> = {
  info:    'text-muted-foreground',
  success: 'text-emerald-400',
  warn:    'text-amber-400',
  error:   'text-red-400',
  cmd:     'text-foreground font-medium',
  sys:     'text-primary/70 uppercase tracking-widest text-[10px]',
  data:    'text-blue-400/80',
};

const SEVERITY_PREFIX: Record<Severity, string> = {
  info:    '',
  success: '',
  warn:    '',
  error:   '',
  cmd:     '❯ ',
  sys:     '# ',
  data:    '',
};

/* ── JSON syntax highlighting for `data` severity lines ── */
function highlightJSON(text: string): React.ReactNode {
  if (!text.trim().startsWith('{')) return text;

  const tokenRegex = /(?<key>"(?:\\.|[^"\\])*")(?=\s*:)|(?<string>"(?:\\.|[^"\\])*")|(?<number>-?\d+\.?\d*)|(?<bool>true|false|null)|(?<punct>[{}[\],:])/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const groups = match.groups!;
    const cls = groups.key ? 'text-primary/80'
      : groups.string ? 'text-emerald-400/80'
      : groups.number ? 'text-blue-300'
      : groups.bool ? 'text-amber-400'
      : 'text-muted-foreground/50';
    nodes.push(<span key={key++} className={cls}>{match[0]}</span>);
    lastIndex = tokenRegex.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/* ── Interactive terminal command dictionary ── */
const HELP_LINES = [
  'help              list available commands',
  'whoami            who runs this terminal',
  'about             jump to the about section',
  'projects          jump to the projects section',
  'experience        jump to the experience section',
  'contact           jump to the contact section',
  'stack             core tech stack',
  'resume            download the CV (alias: cv)',
  'theme <name>      switch accent — amber | purple',
  'clear             clear this session\'s output',
].join('\n');

const TECH_STACK_SHORT = ['Python', 'TypeScript', 'React', 'PostgreSQL', 'AWS', 'Docker', 'Kafka', 'Terraform'];

const KONAMI_KEYS = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

/* ── Live Metrics Bar ── */
const SPARKLINE_SAMPLES = 20;
const SPARKLINE_W = 48;
const SPARKLINE_H = 14;

const LiveMetrics = () => {
  const [metrics, setMetrics] = useState({
    evtSec: 143842,
    latency: 12,
    uptime: 99.97,
  });
  const [evtHistory, setEvtHistory] = useState<number[]>(() => Array(SPARKLINE_SAMPLES).fill(143842));

  useEffect(() => {
    const iv = setInterval(() => {
      // Computed once per tick as plain locals (not state), then fed into
      // both setters' own functional updaters — keeps each updater pure
      // w.r.t. its own prior state while still staying numerically in sync,
      // since both draw from the same delta for this tick.
      const evtDelta = Math.floor(Math.random() * 200 - 80);
      const latencyDelta = Math.random() * 2 - 1;

      setMetrics(prev => ({
        evtSec: prev.evtSec + evtDelta,
        latency: Math.max(8, Math.min(24, prev.latency + latencyDelta)),
        uptime: 99.97,
      }));
      setEvtHistory(prev => [...prev.slice(1), prev[prev.length - 1] + evtDelta]);
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  const min = Math.min(...evtHistory);
  const max = Math.max(...evtHistory);
  const range = Math.max(1, max - min);
  const points = evtHistory
    .map((v, i) => {
      const x = (i / (SPARKLINE_SAMPLES - 1)) * SPARKLINE_W;
      const y = SPARKLINE_H - ((v - min) / range) * SPARKLINE_H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="flex items-center gap-4 text-[9px] font-mono uppercase tracking-widest">
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 bg-emerald-500 status-live" />
        <svg
          width={SPARKLINE_W}
          height={SPARKLINE_H}
          viewBox={`0 0 ${SPARKLINE_W} ${SPARKLINE_H}`}
          className="text-emerald-400/70 shrink-0"
          aria-hidden="true"
        >
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-emerald-400">{(metrics.evtSec / 1000).toFixed(1)}K</span>
        <span className="text-muted-foreground/50">evt/s</span>
      </div>
      <div className="w-[1px] h-3 bg-border" />
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">{metrics.latency.toFixed(0)}ms</span>
        <span className="text-muted-foreground/50">p99</span>
      </div>
      <div className="w-[1px] h-3 bg-border" />
      <div className="flex items-center gap-1.5">
        <span className="text-primary">{metrics.uptime}%</span>
        <span className="text-muted-foreground/50">up</span>
      </div>
    </div>
  );
};

/* ── Interactive session log entry ── */
interface SessionLine {
  id: number;
  type: 'cmd' | 'output';
  content: React.ReactNode;
}

/* ── Console Component ── */
const OpsConsole = () => {
  const [history, setHistory] = useState<ConsoleEntry[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const [bootComplete, setBootComplete] = useState(false);
  const prefersReduced = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { setTheme } = useTheme();

  // Interactive session state — live only once the scripted boot finishes.
  const [sessionLog, setSessionLog] = useState<SessionLine[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const lineIdRef = useRef(0);
  const nextLineId = () => ++lineIdRef.current;

  const [timestamp] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  const entry = CONSOLE_SEQUENCE[currentIdx];
  const visibleText = prefersReduced ? entry.text : displayed;

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, visibleText, sessionLog]);

  // Typing effect — driven by a single requestAnimationFrame loop rather
  // than setInterval. `data` lines type at 2ms/char, well under the ~4ms
  // floor browsers clamp intervals to, so setInterval was firing far more
  // often than the visible result needed; rAF paces off elapsed real time
  // instead, so it's always exactly as fast as the numbers say, no faster.
  useEffect(() => {
    // Under reduced motion the render path uses `entry.text` directly
    // (see JSX below) instead of syncing it into `displayed` state here —
    // an effect that just calls setState with an already-known value is
    // exactly the case React's rules flag as unnecessary.
    if (bootComplete || prefersReduced) return;

    const speed = TYPE_SPEED[entry.severity];
    const startTime = performance.now();
    let rafId: number;

    // First frame naturally computes chars=0 → setDisplayed(''), so the
    // reset itself happens inside the async rAF callback rather than as a
    // synchronous setState call at the top of the effect body.
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const chars = Math.min(entry.text.length, Math.floor(elapsed / speed));
      setDisplayed(entry.text.slice(0, chars));
      if (chars < entry.text.length) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [currentIdx, entry.text, entry.severity, prefersReduced, bootComplete]);

  // Advance to next entry, or hand off to the interactive prompt once the
  // scripted boot sequence has fully played out.
  useEffect(() => {
    if (bootComplete) return;

    const speed = TYPE_SPEED[entry.severity];
    const typeDur = prefersReduced ? 0 : entry.text.length * speed;

    const t = setTimeout(() => {
      setHistory(prev => [...prev, entry]);

      if (currentIdx + 1 >= CONSOLE_SEQUENCE.length) {
        setBootComplete(true);
      } else {
        setCurrentIdx(p => p + 1);
      }
    }, typeDur + entry.hold);

    return () => clearTimeout(t);
  }, [currentIdx, entry, prefersReduced, bootComplete]);

  // Cursor blink
  useEffect(() => {
    const iv = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(iv);
  }, []);

  const isTypingDone = prefersReduced || visibleText.length === entry.text.length;

  const triggerKonami = useCallback(() => {
    KONAMI_KEYS.forEach((k, i) => {
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })), i * 30);
    });
  }, []);

  const downloadResume = useCallback(() => {
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = '/Emmanuel_Moghalu_CV.pdf';
      a.download = 'Emmanuel_Moghalu_CV.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, 150);
  }, []);

  // Fixed command dictionary — plain string matching only, nothing typed by
  // the visitor is ever passed to eval or rendered as HTML.
  const runCommand = useCallback((raw: string): { output: React.ReactNode; sideEffect?: () => void } | null => {
    const input = raw.trim();
    if (!input) return null;
    const [cmd, ...rest] = input.toLowerCase().split(/\s+/);
    const arg = rest.join(' ');

    switch (cmd) {
      case 'help':
        return { output: HELP_LINES };
      case 'whoami':
        return { output: 'emmanuel — data engineer & systems architect. builds things that stay up.' };
      case 'about':
      case 'projects':
      case 'experience':
      case 'contact':
        return { output: `→ navigating to #${cmd}`, sideEffect: () => scrollToSection(cmd) };
      case 'stack':
        return { output: TECH_STACK_SHORT.join(', ') };
      case 'resume':
      case 'cv':
        return { output: 'downloading Emmanuel_Moghalu_CV.pdf...', sideEffect: downloadResume };
      case 'theme':
        if (arg === 'amber' || arg === 'purple') {
          return { output: `theme → ${arg}`, sideEffect: () => setTheme(arg) };
        }
        return { output: "usage: theme <amber|purple>" };
      case 'konami':
        return { output: 'unlocking classified sector...', sideEffect: triggerKonami };
      case 'sudo':
        return { output: 'permission denied: nice try.' };
      case 'clear':
        return { output: null, sideEffect: () => setSessionLog([]) };
      default:
        return { output: `command not found: ${cmd}. type 'help' for available commands.` };
    }
  }, [downloadResume, setTheme, triggerKonami]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const raw = inputValue;
    if (!raw.trim()) return;

    setCmdHistory(prev => [...prev, raw]);
    setHistoryCursor(null);
    setInputValue('');

    const result = runCommand(raw);
    if (!result) return;

    if (result.output === null) {
      result.sideEffect?.();
      return;
    }

    setSessionLog(prev => [
      ...prev,
      { id: nextLineId(), type: 'cmd', content: raw },
      { id: nextLineId(), type: 'output', content: result.output },
    ]);
    result.sideEffect?.();
  }, [inputValue, runCommand]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!cmdHistory.length) return;
      setHistoryCursor(prev => {
        const next = prev === null ? cmdHistory.length - 1 : Math.max(0, prev - 1);
        setInputValue(cmdHistory[next]);
        return next;
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!cmdHistory.length) return;
      setHistoryCursor(prev => {
        if (prev === null) return null;
        const next = prev + 1;
        if (next >= cmdHistory.length) {
          setInputValue('');
          return null;
        }
        setInputValue(cmdHistory[next]);
        return next;
      });
    }
  }, [cmdHistory]);

  return (
    <div
      className="w-full max-w-[620px] border border-border bg-card relative flex flex-col overflow-hidden"
      style={{ boxShadow: 'var(--shadow-lg), var(--shadow-glow)' }}
      role="group"
      aria-label="Live operations console — scripted boot log, then a live terminal you can type into"
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 status-live" />
            <span className="text-[9px] font-mono text-emerald-400/70 uppercase tracking-widest">live</span>
          </div>
          <div className="w-[1px] h-3 bg-border" />
          <span className="font-mono text-[10px] text-muted-foreground/80 uppercase tracking-widest">
            ops.console
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] text-muted-foreground/40 tracking-wider hidden sm:inline">
            {timestamp} UTC
          </span>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-border" />
            <div className="w-1.5 h-1.5 bg-border" />
            <div className="w-1.5 h-1.5 bg-primary/60" />
          </div>
        </div>
      </div>

      {/* Console body */}
      <div
        ref={scrollRef}
        className="p-4 h-[260px] lg:h-[320px] overflow-y-auto font-mono text-[11px] leading-[1.7] flex flex-col gap-0.5"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {/* Scripted boot history */}
        {history.map((h, i) => (
          <div key={i} className="flex items-start w-full opacity-60 hover:opacity-100 transition-opacity">
            <span className={`${SEVERITY_STYLES[h.severity]} whitespace-pre-wrap break-all`}>
              {SEVERITY_PREFIX[h.severity]}
              {h.severity === 'data' ? highlightJSON(h.text) : h.text}
            </span>
          </div>
        ))}

        {/* Currently typing scripted line */}
        {!bootComplete && (
          <div className="flex items-start w-full">
            <span className={`${SEVERITY_STYLES[entry.severity]} whitespace-pre-wrap break-all`}>
              {SEVERITY_PREFIX[entry.severity]}
              {entry.severity === 'data' ? highlightJSON(visibleText) : visibleText}
              <span
                className="inline-block ml-0.5 align-middle"
                style={{
                  width: '5px',
                  height: '13px',
                  background: cursorVisible && !isTypingDone
                    ? 'hsl(var(--primary))'
                    : isTypingDone && cursorVisible
                      ? 'hsl(var(--muted-foreground))'
                      : 'transparent',
                  transition: 'background 0.1s',
                }}
              />
            </span>
          </div>
        )}

        {/* Interactive prompt — appears once the boot sequence hands off */}
        <AnimatePresence>
          {bootComplete && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {sessionLog.length === 0 && (
                <div className="text-muted-foreground/40 mb-1">
                  Type 'help' to begin.
                </div>
              )}

              {sessionLog.map((line) => (
                <div key={line.id} className="flex items-start w-full">
                  {line.type === 'cmd' ? (
                    <span className="text-foreground font-medium whitespace-pre-wrap break-all">
                      ❯ {line.content}
                    </span>
                  ) : (
                    <span className="text-muted-foreground whitespace-pre-wrap break-all pl-0">
                      {line.content}
                    </span>
                  )}
                </div>
              ))}

              <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
                <span className="text-foreground font-medium shrink-0">❯</span>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  spellCheck={false}
                  autoComplete="off"
                  autoCapitalize="off"
                  aria-label="Terminal command input"
                  className="flex-1 bg-transparent border-none outline-none text-foreground font-mono text-[11px] placeholder:text-muted-foreground/30"
                />
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20">
        <LiveMetrics />
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest hidden sm:inline">
            us-east-1
          </span>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* TEXT ANIMATION COMPONENTS                                                  */
/* -------------------------------------------------------------------------- */

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+{}|:<>?-=[]\\;',./";

const ScrambleText = ({ text, className = "", delay = 0 }: { text: string, className?: string, delay?: number }) => {
  const prefersReduced = useReducedMotion();
  const [displayText, setDisplayText] = useState(() => prefersReduced ? text : text.replace(/./g, ' '));
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (prefersReduced) return;
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay, prefersReduced]);

  useEffect(() => {
    if (!started || prefersReduced) return;

    let iteration = 0;
    const maxIterations = text.length;
    const interval = setInterval(() => {
      setDisplayText(
        text.split("").map((char, index) => {
          if (index < iteration) return text[index];
          if (text[index] === " ") return " ";
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        }).join("")
      );

      if (iteration >= maxIterations) clearInterval(interval);
      iteration += 1 / 2;
    }, 25);

    return () => clearInterval(interval);
  }, [text, prefersReduced, started]);

  return <span className={className}>{displayText}</span>;
}

const StaggeredReveal = ({ text, className = "" }: { text: string; className?: string }) => {
  const words = text.split(" ");
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.015, delayChildren: 0.8 } }
      }}
      className={`flex flex-wrap ${className}`}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { opacity: 0, filter: "blur(4px)", y: 4 },
            visible: { opacity: 1, filter: "blur(0px)", y: 0, transition: { duration: 0.4 } }
          }}
          className="relative inline-block mr-[0.25em] mb-[0.2em]"
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* CIRCUIT-TRACE BACKGROUND (Canvas)                                          */
/* Senior-level data infrastructure visualization.                            */
/* Unified canvas draws both the grid and the dynamic multi-class pulses.    */
/* Grid nodes activate and decay as pulses pass through.                     */
/* Hub nodes route data and spawn secondary relay signals.                    */
/* -------------------------------------------------------------------------- */

const GRID = 48; // Must match the original CSS grid spacing

const CircuitCanvas = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReduced) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Use IntersectionObserver to pause rendering when off-screen
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting;
      },
      { threshold: 0 }
    );
    observer.observe(canvas);

    let w = 0;
    let h = 0;
    let gridCols = 0;
    let gridRows = 0;
    let rafId = 0;
    
    // --- Node Grid System ---
    // Flat array to store node activation levels (0.0 to 1.0)
    let nodes = new Float32Array(0);
    let hubs = new Set<number>();
    
    // --- Mouse Proximity ---
    let mouseX = -1000;
    let mouseY = -1000;
    let isTouch = false;

    const handleMouseMove = (e: MouseEvent) => {
      if (isTouch) return;
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };
    const handleTouchStart = () => {
      isTouch = true;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });

    /* ── Sizing (ResizeObserver for precision) ── */
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === canvas.parentElement) {
          const { width, height } = entry.contentRect;
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          w = width;
          h = height;
          canvas.width = w * dpr;
          canvas.height = h * dpr;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          
          gridCols = Math.floor(w / GRID) + 2;
          gridRows = Math.floor(h / GRID) + 2;
          
          const newNodes = new Float32Array(gridCols * gridRows);
          nodes = newNodes;
          
          // Re-pick hubs
          hubs.clear();
          const hubCount = 6;
          for(let i = 0; i < hubCount; i++) {
             const col = Math.floor(Math.random() * (gridCols - 2)) + 1;
             const row = Math.floor(Math.random() * (gridRows - 2)) + 1;
             hubs.add(row * gridCols + col);
          }
        }
      }
    });
    
    if (canvas.parentElement) {
       resizeObserver.observe(canvas.parentElement);
    } else {
       w = canvas.clientWidth;
       h = canvas.clientHeight;
    }


    /* ── Theme color ── */
    let primaryHSL = '';
    let fgHSL = '';
    const readTheme = () => {
      const style = getComputedStyle(document.documentElement);
      primaryHSL = style.getPropertyValue('--primary').trim();
      fgHSL = style.getPropertyValue('--foreground').trim();
    };
    readTheme();

    /* ── Pulse (particle) classes ── */
    type Dir = 'up' | 'down' | 'left' | 'right';
    type PulseClass = 'packet' | 'energy' | 'relay';

    interface Pulse {
      active: boolean;
      pClass: PulseClass;
      x: number;
      y: number;
      dir: Dir;
      speed: number; // pixels per frame (at 60fps)
      trail: { x: number; y: number }[];
      maxTrail: number;
      accum: number; // For sub-pixel movement
    }

    const PULSE_POOL_SIZE = 30; // Pre-allocate
    const pulses: Pulse[] = Array.from({ length: PULSE_POOL_SIZE }, () => ({
      active: false, pClass: 'packet', x: 0, y: 0, dir: 'down', speed: 0, trail: [], maxTrail: 0, accum: 0
    }));

    const TURN_CHANCE = 0.3;

    const randFrom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const perpDirs = (d: Dir): Dir[] => d === 'left' || d === 'right' ? ['up', 'down'] : ['left', 'right'];

    const spawnPulse = (pClass: PulseClass, specificX?: number, specificY?: number, specificDir?: Dir) => {
      // Find inactive pulse
      const p = pulses.find(p => !p.active);
      if (!p) return;

      p.active = true;
      p.pClass = pClass;
      p.trail = [];
      p.accum = 0;

      if (specificX !== undefined && specificY !== undefined && specificDir !== undefined) {
         p.x = specificX;
         p.y = specificY;
         p.dir = specificDir;
      } else {
         // Pick random edge
         const edge = Math.floor(Math.random() * 4);
         const c = Math.floor(Math.random() * gridCols);
         const r = Math.floor(Math.random() * gridRows);
         
         switch (edge) {
           case 0: p.x = c * GRID; p.y = 0; p.dir = 'down'; break;
           case 1: p.x = (gridCols - 1) * GRID; p.y = r * GRID; p.dir = 'left'; break;
           case 2: p.x = c * GRID; p.y = (gridRows - 1) * GRID; p.dir = 'up'; break;
           case 3: p.x = 0; p.y = r * GRID; p.dir = 'right'; break;
         }
      }

      if (pClass === 'packet') {
         p.speed = 2 + Math.random() * 1;
         p.maxTrail = 40 + Math.random() * 20;
      } else if (pClass === 'energy') {
         p.speed = 0.5 + Math.random() * 0.5;
         p.maxTrail = 120 + Math.random() * 60;
      } else if (pClass === 'relay') {
         p.speed = 4 + Math.random() * 2;
         p.maxTrail = 15 + Math.random() * 10;
      }
    };
    
    // Initial spawns
    for(let i=0; i<8; i++) spawnPulse('packet');
    for(let i=0; i<4; i++) spawnPulse('energy');

    const updatePulse = (p: Pulse, dtRatio: number) => {
      if (!p.active) return;
      
      const frameSpeed = p.speed * dtRatio;
      
      p.accum += frameSpeed;
      // Move by whole pixels when accumulator >= 1
      const movePx = Math.floor(p.accum);
      
      if (movePx > 0) {
        p.accum -= movePx;
        
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > p.maxTrail) p.trail.shift();
        
        const prevCol = Math.floor(p.x / GRID);
        const prevRow = Math.floor(p.y / GRID);
        
        switch (p.dir) {
          case 'right': p.x += movePx; break;
          case 'left':  p.x -= movePx; break;
          case 'down':  p.y += movePx; break;
          case 'up':    p.y -= movePx; break;
        }
        
        const currCol = Math.floor(p.x / GRID);
        const currRow = Math.floor(p.y / GRID);
        
        // Did we cross an intersection this step?
        let hitX = -1, hitY = -1;
        if (p.dir === 'right' && currCol > prevCol) { hitX = currCol * GRID; hitY = Math.round(p.y/GRID)*GRID; }
        else if (p.dir === 'left' && currCol < prevCol) { hitX = prevCol * GRID; hitY = Math.round(p.y/GRID)*GRID; }
        else if (p.dir === 'down' && currRow > prevRow) { hitX = Math.round(p.x/GRID)*GRID; hitY = currRow * GRID; }
        else if (p.dir === 'up' && currRow < prevRow) { hitX = Math.round(p.x/GRID)*GRID; hitY = prevRow * GRID; }

        if (hitX !== -1 && hitY !== -1) {
           p.x = hitX;
           p.y = hitY;
           
           const col = Math.round(hitX / GRID);
           const row = Math.round(hitY / GRID);
           const nodeIdx = row * gridCols + col;
           
           // Activate node
           if (nodeIdx >= 0 && nodeIdx < nodes.length) {
              nodes[nodeIdx] = 1.0; 
              
              // Hub logic
              if (hubs.has(nodeIdx) && p.pClass === 'packet') {
                 const activeRelays = pulses.filter(pp => pp.active && pp.pClass === 'relay').length;
                 if (activeRelays < 6) {
                    const rDir = randFrom(perpDirs(p.dir));
                    spawnPulse('relay', hitX, hitY, rDir);
                 }
              }
           }
           
           if (Math.random() < TURN_CHANCE) {
              p.dir = randFrom(perpDirs(p.dir));
           }
        }
      }

      // Respawn off-screen
      const m = GRID * 2;
      const headOOB = p.x < -m || p.x > w + m || p.y < -m || p.y > h + m;
      if (headOOB && p.trail.every(t => t.x < -m || t.x > w + m || t.y < -m || t.y > h + m)) {
        p.active = false;
        if (p.pClass !== 'relay') {
           spawnPulse(p.pClass);
        }
      }
    };

    /* ── Game Loop ── */
    let lastTime = 0;
    let frameCount = 0;
    
    // Warm up
    const dtRatio = 1.0;
    for (let i = 0; i < 300; i++) pulses.forEach(p => updatePulse(p, dtRatio));

    const draw = (time: number) => {
      rafId = requestAnimationFrame(draw);
      
      if (!isVisible) return;
      
      if (lastTime === 0) lastTime = time;
      const dt = time - lastTime;
      lastTime = time;
      const stepDt = Math.min(dt, 50);
      const ratio = stepDt / (1000 / 60);

      ctx.clearRect(0, 0, w, h);

      if (frameCount++ % 120 === 0) readTheme();

      // --- Background Grid ---
      ctx.lineWidth = 1;
      ctx.strokeStyle = `hsl(${fgHSL} / 0.05)`;
      ctx.beginPath();
      for (let x = 0; x <= w; x += GRID) {
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
      }
      for (let y = 0; y <= h; y += GRID) {
        ctx.moveTo(0, y); ctx.lineTo(w, y);
      }
      ctx.stroke();

      // --- Nodes ---
      const nodeDecay = 0.02 * ratio;
      ctx.fillStyle = `hsl(${primaryHSL})`;
      
      for (let r = 0; r < gridRows; r++) {
         for (let c = 0; c < gridCols; c++) {
            const idx = r * gridCols + c;
            const nx = c * GRID;
            const ny = r * GRID;
            
            let proxVal = 0;
            if (mouseX !== -1000) {
               const dx = nx - mouseX;
               const dy = ny - mouseY;
               const dist = Math.sqrt(dx*dx + dy*dy);
               if (dist < 120) {
                  proxVal = 1.0 - (dist / 120);
               }
            }

            let activation = nodes[idx] || 0;
            
            if (activation > 0 || proxVal > 0 || hubs.has(idx)) {
               const baseAlpha = hubs.has(idx) ? 0.15 : 0;
               const finalAlpha = Math.max(baseAlpha, activation * 0.8, proxVal * 0.3);
               
               if (finalAlpha > 0.01) {
                  ctx.globalAlpha = finalAlpha;
                  const radius = hubs.has(idx) ? 2.5 : 1.5;
                  ctx.beginPath();
                  ctx.arc(nx, ny, radius, 0, Math.PI * 2);
                  ctx.fill();
               }
               
               if (activation > 0) {
                  nodes[idx] = Math.max(0, activation - nodeDecay);
               }
            }
         }
      }
      ctx.globalAlpha = 1.0;

      // --- Pulses ---
      for (const p of pulses) {
        if (!p.active) continue;
        updatePulse(p, ratio);
        
        const { trail, pClass } = p;
        if (trail.length < 2) continue;

        const bands = pClass === 'energy' ? 2 : 4;
        const bandSize = Math.ceil(trail.length / bands);
        
        const maxAlpha = pClass === 'energy' ? 0.1 : (pClass === 'relay' ? 0.6 : 0.4);
        const width = pClass === 'energy' ? 3 : 1.5;

        for (let b = 0; b < bands; b++) {
          const s = b * bandSize;
          const e = Math.min(s + bandSize + 1, trail.length);
          if (s >= trail.length) break;

          const alpha = ((b + 1) / bands) * maxAlpha;
          ctx.strokeStyle = `hsl(${primaryHSL} / ${alpha})`;
          ctx.lineWidth = width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(trail[s].x, trail[s].y);
          for (let i = s + 1; i < e; i++) ctx.lineTo(trail[i].x, trail[i].y);
          ctx.stroke();
        }

        if (pClass !== 'energy') {
           const head = trail[trail.length - 1];
           ctx.save();
           ctx.shadowColor = `hsl(${primaryHSL})`;
           ctx.shadowBlur = pClass === 'packet' ? 8 : 4;
           ctx.fillStyle = `hsl(${primaryHSL} / 0.9)`;
           ctx.beginPath();
           ctx.arc(head.x, head.y, pClass === 'packet' ? 2 : 1.5, 0, Math.PI * 2);
           ctx.fill();
           ctx.restore();
        }
      }
      
      // --- Edge Vignette ---
      ctx.globalCompositeOperation = 'destination-in';
      const grad = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.2, w/2, h/2, Math.max(w,h)*0.6);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [prefersReduced]);

  if (prefersReduced) {
     return (
        <div className="absolute inset-0 z-0 pointer-events-none" style={{
           backgroundImage: 'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)',
           backgroundSize: '48px 48px',
           opacity: 0.05
        }} />
     );
  }

  return (
    <div className="absolute inset-0 z-0 pointer-events-auto" style={{ overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        aria-hidden="true"
        style={{ display: 'block' }}
      />
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/* SOCIAL LINKS                                                               */
/* -------------------------------------------------------------------------- */

const SOCIALS = [
  { icon: Github, href: "https://github.com/emmanuelrichard01", label: "GitHub" },
  { icon: Linkedin, href: "https://linkedin.com/in/e-mc", label: "LinkedIn" },
  { icon: XLogo, href: "https://x.com/mrebr", label: "X" },
];

/* -------------------------------------------------------------------------- */
/* HERO                                                                       */
/* -------------------------------------------------------------------------- */

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const circuitOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={sectionRef}
      id="home"
      data-section="home"
      aria-label="Hero introduction"
      className="relative min-h-[100svh] flex flex-col justify-center px-6 md:px-12 lg:px-24 overflow-hidden pt-20 lg:pt-0"
    >
      {/* ── Background ── */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none noise-overlay" />
      <motion.div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ opacity: circuitOpacity }}
      >
        <CircuitCanvas />
      </motion.div>
      {/* Ambient hero glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] z-0 pointer-events-none"
        style={{ background: 'var(--gradient-hero)' }}
      />

      {/* ── Content Grid ── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full max-w-7xl mx-auto py-12 lg:py-24">

        {/* Left: Copy */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-start"
        >
          <div className="flex items-center gap-3 mb-8">
            <Terminal className="w-4 h-4 text-primary" aria-hidden="true" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              ROLE // DATA ENGINEER & SYSTEM ARCHITECT
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-[1.1] mb-6 flex flex-col items-start min-h-[120px] sm:min-h-[150px] md:min-h-[180px]">
            <ScrambleText text="Engineering" className="inline-block" delay={0} />
            <ScrambleText
              text="the infrastructure"
              className="inline-block text-muted-foreground font-mono font-normal text-2xl sm:text-3xl md:text-4xl my-2"
              delay={300}
            />
            <ScrambleText text="behind the uptime." className="inline-block" delay={600} />
          </h1>

          <StaggeredReveal
            text="I design data pipelines, distributed systems, and cloud architecture that processes millions of events daily — reliably, quietly, and without incident."
            className="text-base text-muted-foreground leading-relaxed mb-10 max-w-[500px]"
          />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-8"
          >
            <button
              onClick={() => scrollToSection('projects')}
              className="btn-structural group flex items-center justify-center gap-3 w-full sm:w-auto"
            >
              <span>View My Work</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <CVDownloadButton variant="ghost" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.4 }}
            className="flex items-center gap-4 pt-6 border-t border-border/50 w-full sm:w-auto"
          >
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mr-2">
              Find me //
            </span>
            <div className="flex items-center gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex items-center justify-center w-10 h-10 border border-border bg-card/50 hover:bg-card hover:border-primary hover:scale-105 transition-all group"
                >
                  <s.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Right: Live Ops Console */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center lg:justify-end w-full"
        >
          <OpsConsole />
        </motion.div>
      </div>

      {/* ── ⌘K Hint (Fixed Right) ── */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.8 }}
        className="absolute right-6 bottom-12 z-40 hidden lg:flex items-center gap-3 group cursor-pointer"
        aria-label="Open command palette (Ctrl+K)"
        onClick={() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
        }}
      >
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest group-hover:text-foreground transition-colors">
          Command
        </div>
        <div className="flex items-center justify-center w-8 h-8 border border-border bg-card group-hover:border-primary transition-colors">
          <Command className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
        </div>
      </motion.button>
    </section>
  );
}