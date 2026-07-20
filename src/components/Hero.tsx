import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useMotionTemplate, useReducedMotion } from 'framer-motion';
import { ArrowRight, Download, Github, Linkedin, Twitter, Command } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* ROTATING WORD                                                              */
/* -------------------------------------------------------------------------- */

const WORDS = ["Scale.", "Ship.", "Last.", "Matter."];

/**
 * Single-slot vertical word rotator.
 * - First word visible immediately (no entry delay)
 * - Subsequent words slide up with fade
 * - The active word gets a gradient treatment
 * - Period stays fixed outside the animation
 */
const RotatingWord = () => {
  const [index, setIndex] = useState(0);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % WORDS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [prefersReduced]);

  return (
    <span className="relative inline-block" style={{ verticalAlign: 'bottom' }}>
      {/* Invisible sizer — widest word sets the container width at any font size */}
      <span className="invisible select-none" aria-hidden="true">Matter.</span>

      {/* Animated overlay */}
      <span className="absolute inset-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={WORDS[index]}
            initial={{ y: '110%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '-110%', opacity: 0 }}
            transition={{
              y: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.25 },
            }}
            className="absolute left-0 bottom-0 whitespace-nowrap"
          >
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(to right, hsl(280 100% 60%), #c084fc, hsl(280 100% 55%))',
              }}
            >
              {WORDS[index].slice(0, -1)}
            </span>
            <span className="text-white">.</span>
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
};


/* -------------------------------------------------------------------------- */
/* TERMINAL                                                                   */
/* -------------------------------------------------------------------------- */

type TerminalEntry = {
  type: 'cmd' | 'out';
  colour: 'green' | 'cyan' | 'yellow' | 'red' | 'muted' | 'white';
  text: string;
  hold: number;
};

const ENTRIES: TerminalEntry[] = [
  { type: 'cmd', colour: 'white', text: 'dbt run --select pipeline.ingestion.*', hold: 2400 },
  { type: 'out', colour: 'green', text: '✔  3 of 3 models completed  (0 errors)', hold: 2000 },
  { type: 'cmd', colour: 'white', text: 'terraform apply -auto-approve', hold: 2400 },
  { type: 'out', colour: 'cyan', text: '↑  Apply complete  |  6 added, 0 destroyed', hold: 2000 },
  { type: 'cmd', colour: 'white', text: 'kubectl rollout status deploy/api-gateway', hold: 2400 },
  { type: 'out', colour: 'green', text: '✔  deployment "api-gateway" rolled out', hold: 2200 },
  { type: 'cmd', colour: 'white', text: 'python src/jobs/streaming_ingest.py', hold: 2000 },
  { type: 'out', colour: 'yellow', text: '⚑  Kafka consumer ready  |  topic: events.raw', hold: 2200 },
  { type: 'out', colour: 'green', text: '✔  Ingested 1.2 M events  (avg latency 4 ms)', hold: 2600 },
  { type: 'cmd', colour: 'white', text: 'pytest tests/ -q --tb=short', hold: 2400 },
  { type: 'out', colour: 'green', text: '✔  42 passed, 0 failed  in 3.18 s', hold: 2200 },
];

const colourClass: Record<TerminalEntry['colour'], string> = {
  green: 'text-emerald-400',
  cyan: 'text-sky-400',
  yellow: 'text-amber-400',
  red: 'text-rose-400',
  muted: 'text-white/55',
  white: 'text-white/80',
};

const TypingTerminal = () => {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const prefersReduced = useReducedMotion();
  const entry = ENTRIES[idx];

  useEffect(() => {
    if (prefersReduced) { setDisplayed(entry.text); return; }
    setDisplayed('');
    setShowCursor(true);
    let i = 0;
    const speed = entry.type === 'cmd' ? 38 : 12;
    const iv = setInterval(() => {
      i++;
      setDisplayed(entry.text.slice(0, i));
      if (i >= entry.text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [idx, entry.text, entry.type, prefersReduced]);

  useEffect(() => {
    const typeDur = prefersReduced ? 0 : entry.text.length * (entry.type === 'cmd' ? 38 : 12);
    const t = setTimeout(() => setIdx((p) => (p + 1) % ENTRIES.length), typeDur + entry.hold);
    return () => clearTimeout(t);
  }, [idx, entry.text.length, entry.type, entry.hold, prefersReduced]);

  useEffect(() => {
    const iv = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(iv);
  }, []);

  const isTypingDone = displayed.length === entry.text.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[420px] mx-auto px-2 sm:px-0"
      role="status"
      aria-label="Terminal simulation showing engineering commands"
    >
      <span className="sr-only" aria-live="polite">
        Terminal output: {entry.text}
      </span>
      <div
        className="rounded-xl overflow-hidden"
        aria-hidden="true"
        style={{
          background: 'rgba(10,10,14,0.65)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <div
          className="flex items-center gap-1.5 px-3.5 py-2"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            background: 'rgba(255,255,255,0.015)',
          }}
        >
          <span className="w-[9px] h-[9px] rounded-full bg-[#ff5f57]/80" />
          <span className="w-[9px] h-[9px] rounded-full bg-[#febc2e]/80" />
          <span className="w-[9px] h-[9px] rounded-full bg-[#28c840]/80" />
          <span className="flex-1 text-center font-mono text-[9px] tracking-wide select-none" style={{ color: 'rgba(255,255,255,0.50)' }} aria-hidden="true">
            ~/projects/emc — zsh
          </span>
          <span className="w-[38px]" />
        </div>

        <div className="px-3.5 py-2.5 h-[44px] flex items-center">
          <div className="flex items-center gap-0 w-full overflow-hidden font-mono text-[11px] leading-none tracking-wide">
            {entry.type === 'cmd' && (
              <span className="shrink-0" style={{ color: 'rgba(139,92,246,0.8)' }}>❯&nbsp;</span>
            )}
            {entry.type === 'out' && (
              <span style={{ color: 'rgba(255,255,255,0.40)' }} className="mr-2.5 shrink-0" aria-hidden="true">│</span>
            )}
            <AnimatePresence mode="wait">
              <motion.span
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.08 }}
                className={`${colourClass[entry.colour]} whitespace-nowrap overflow-hidden text-ellipsis flex items-center`}
              >
                {displayed}
                <span
                  className="inline-block ml-px align-middle"
                  style={{
                    width: '5px',
                    height: '12px',
                    background: showCursor && !isTypingDone
                      ? 'rgba(139,92,246,0.8)'
                      : isTypingDone && showCursor
                        ? 'rgba(255,255,255,0.3)'
                        : 'transparent',
                    borderRadius: '1px',
                    transition: 'background 0.08s',
                  }}
                />
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};


/* -------------------------------------------------------------------------- */
/* SOCIAL LINKS                                                               */
/* -------------------------------------------------------------------------- */

const SOCIALS = [
  { icon: Github, href: "https://github.com/emmanuelrichard01", label: "GitHub" },
  { icon: Linkedin, href: "https://linkedin.com/in/e-mc", label: "LinkedIn" },
  { icon: Twitter, href: "https://x.com/_mrebuka", label: "X" },
];


/* -------------------------------------------------------------------------- */
/* HERO                                                                       */
/* -------------------------------------------------------------------------- */

export default function Hero() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);
  const y = useTransform(scrollY, [0, 500], [0, 80]);
  const scale = useTransform(scrollY, [0, 500], [1, 0.97]);

  // Portrait parallax — moves slower than content for depth
  const portraitY = useTransform(scrollY, [0, 500], [0, 40]);
  const portraitScale = useTransform(scrollY, [0, 500], [1, 1.04]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <section
      id="home"
      data-section="home"
      aria-label="Hero introduction"
      className="relative min-h-[100svh] flex flex-col items-center justify-center px-4 overflow-hidden group/hero"
      onMouseMove={handleMouseMove}
    >
      {/* ── Background ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-[-18%] right-[-8%] w-[300px] h-[300px] sm:w-[550px] sm:h-[550px] rounded-full bg-primary/[0.05] blur-[200px]" />
        <div className="absolute bottom-[-12%] left-[-10%] w-[250px] h-[250px] sm:w-[450px] sm:h-[450px] rounded-full bg-blue-500/[0.04] blur-[200px]" />
      </div>

      {/* ── Atmospheric Portrait ── */}
      <motion.div
        className="absolute inset-0 z-[1] pointer-events-none overflow-hidden select-none"
        style={{ y: portraitY, scale: portraitScale }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        aria-hidden="true"
      >
        {/* Primary glow behind portrait */}
        <div className="absolute top-[15%] left-1/2 -translate-x-1/3 w-[400px] h-[400px] md:w-[500px] md:h-[500px] rounded-full bg-primary/[0.04] blur-[120px]" />

        {/* Portrait image with mask + blend */}
        <div
          className="absolute top-[6%] sm:top-[4%] left-1/2 -translate-x-1/2 md:-translate-x-[15%] w-[320px] h-[420px] sm:w-[400px] sm:h-[520px] md:w-[480px] md:h-[620px] lg:w-[540px] lg:h-[700px]"
          style={{
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 35%, black 20%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 35%, black 20%, transparent 70%)',
          }}
        >
          <img
            src="/profile.png"
            alt=""
            className="w-full h-full object-cover object-top grayscale opacity-[0.18] md:opacity-[0.22] mix-blend-luminosity"
            loading="eager"
            decoding="async"
          />
        </div>
      </motion.div>

      {/* Mouse spotlight */}
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-500 group-hover/hero:opacity-100 z-0"
        style={{
          background: useMotionTemplate`radial-gradient(600px circle at ${mouseX}px ${mouseY}px, rgba(168,85,247,0.03), transparent 75%)`,
        }}
      />

      {/* ── Content ── */}
      <motion.div
        style={{ y, opacity, scale }}
        className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto pt-16 sm:pt-24 md:pt-16 px-1"
      >
        {/* Badge: availability + role */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] backdrop-blur-md mb-7"
        >
          <span className="text-[10px] font-mono tracking-[0.15em] text-white/60 uppercase">
            Data Engineer · Cloud Architect
          </span>
        </motion.div>

        {/* Headline — single rotating word */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="text-[2rem] sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-[-0.02em] text-white leading-[1.08] mb-6"
        >
          I engineer data{' '}
          <br className="hidden sm:block" />
          systems that <RotatingWord />
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="text-[15px] md:text-base text-white/60 leading-[1.7] mb-10 max-w-[440px] font-light"
        >
          Building the invisible pipelines that power decision engines,
          production infrastructure, and resilient software.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-3.5 mb-12 w-full sm:w-auto"
        >
          <button
            onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
            className="group/btn relative px-8 py-3.5 rounded-full font-medium text-[13px] bg-white text-black transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
            style={{
              boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.3)',
            }}
          >
            <span className="relative z-10">View My Work</span>
            <ArrowRight className="w-3.5 h-3.5 relative z-10 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-out" />
          </button>

          <a
            href="/resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="group/btn px-6 py-3 rounded-full font-medium text-[13px] border border-white/[0.08] bg-white/[0.02] text-white/60 hover:text-white/90 hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
          >
            Download CV
            <Download className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:-translate-y-0.5" />
          </a>
        </motion.div>

        {/* Terminal */}
        <TypingTerminal />
      </motion.div>

      {/* ── Social Links ── */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.0, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="absolute left-6 md:left-8 bottom-[28%] z-40 hidden lg:flex flex-col items-center gap-3.5 px-2 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] backdrop-blur-2xl"
        style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
      >
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent pointer-events-none" />
        {SOCIALS.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.label}
            className="p-1.5 text-white/55 transition-all duration-300 hover:text-white hover:scale-110"
          >
            <s.icon className="w-4 h-4" />
          </a>
        ))}
      </motion.div>

      {/* ── ⌘K Hint ── */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-8 right-6 md:right-8 z-40 hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.05] bg-white/[0.02] backdrop-blur-md cursor-pointer hover:border-white/[0.1] hover:bg-white/[0.04] transition-all duration-300"
        onClick={() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }));
        }}
      >
        <Command className="w-3 h-3 text-white/50" />
        <span className="font-mono text-[9px] text-white/50 tracking-wide">K</span>
      </motion.button>

      {/* ── Scroll Indicator ── */}
      <motion.div
        style={{ opacity: useTransform(scrollY, [0, 150], [0.3, 0]) }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none hidden sm:block"
      >
        <div className="w-[18px] h-7 rounded-full border border-white/[0.08] flex items-start justify-center p-1">
          <motion.div
            className="w-[3px] h-[5px] rounded-full bg-white/20"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </section>
  );
}