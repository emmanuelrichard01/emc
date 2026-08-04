import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Command, Github, Linkedin, Terminal } from 'lucide-react';

import { XLogo } from '@/components/ui/XLogo';
import { CVDownloadButton } from '@/components/ui/CVDownloadButton';
import { scrollToSection } from '@/lib/scrollToSection';
import { useCommandPalette } from '@/components/CommandPaletteProvider';
import CircuitCanvas from '@/components/hero/CircuitCanvas';
import OpsConsole from '@/components/hero/OpsConsole';

/* ==========================================================================
   HERO

   Composition only. The two heavy pieces — the circuit background and the
   ops console — live in ./hero and are imported here, which is what keeps
   this file readable.
   ========================================================================== */

/* ── Decoding headline ──────────────────────────────────────────────────── */

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+{}|:<>?-=[]\\;',./";

/* Scrambles every character past `revealed`, preserving spaces so word
   boundaries — and therefore the line's measured width — never move. */
function scrambleOf(text: string, revealed: number): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    if (i < revealed || text[i] === ' ') out += text[i];
    else out += SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
  }
  return out;
}

const REVEAL_MS_PER_CHAR = 26;
const SCRAMBLE_FRAME_MS = 33;

/**
 * Visual-only decode effect.
 *
 * Rendered inside an `aria-hidden` wrapper with the real sentence supplied
 * separately as `sr-only` text — otherwise the page's `h1`, and therefore
 * its accessible name, is a second of random punctuation.
 *
 * The first render already emits a full-length scrambled string rather than
 * blank space, so the heading occupies its final box immediately. That is
 * what removes the need for the hand-tuned `min-h` values this used to
 * carry, which only approximated the real height at three breakpoints.
 */
const ScrambleText = ({
  text,
  className = '',
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) => {
  const prefersReduced = useReducedMotion();
  const [display, setDisplay] = useState(() => scrambleOf(text, 0));

  useEffect(() => {
    // Under reduced motion the render path below uses `text` directly rather
    // than syncing it into state here — an effect whose only job is to
    // setState an already-known value is exactly the cascading-render
    // pattern React's rules flag.
    if (prefersReduced) return;

    let rafId = 0;
    let startTime = 0;
    let lastPaint = 0;

    const tick = (now: number) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime - delay;

      if (elapsed < 0) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const revealed = elapsed / REVEAL_MS_PER_CHAR;
      if (revealed >= text.length) {
        setDisplay(text);
        return;
      }

      // Churn at ~30fps. The scramble needs to look alive, but re-randomising
      // every character on every frame is invisible work above that.
      if (now - lastPaint >= SCRAMBLE_FRAME_MS) {
        lastPaint = now;
        setDisplay(scrambleOf(text, Math.floor(revealed)));
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [text, delay, prefersReduced]);

  return <span className={className}>{prefersReduced ? text : display}</span>;
};

/* ── Staggered paragraph reveal ─────────────────────────────────────────── */

const StaggeredReveal = ({ text, className = '' }: { text: string; className?: string }) => {
  const words = text.split(' ');
  return (
    <motion.p
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.012, delayChildren: 0.5 } } }}
      className={`flex flex-wrap ${className}`}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { opacity: 0, filter: 'blur(4px)', y: 4 },
            visible: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { duration: 0.4 } },
          }}
          className="relative inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </motion.p>
  );
};

/* ── Socials ────────────────────────────────────────────────────────────── */

const SOCIALS = [
  { icon: Github, href: 'https://github.com/emmanuelrichard01', label: 'GitHub' },
  { icon: Linkedin, href: 'https://linkedin.com/in/e-mc', label: 'LinkedIn' },
  { icon: XLogo, href: 'https://x.com/mrebr', label: 'X' },
];

/* Kept deliberately short and in plain English.

   A hero has about three seconds to land with a mixed audience — recruiters
   and non-technical readers included — and the ops console sitting beside it
   already establishes that this person is technical. Domain vocabulary
   (multi-PSP, CBN, NDPR) buys nothing here and costs comprehension; it earns
   its place further down the page, where a reader has opted in. */
const HEADLINE = 'I build data systems that hold up.';

/* ── Hero ───────────────────────────────────────────────────────────────── */

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReduced = useReducedMotion();
  const { open: openCommandPalette } = useCommandPalette();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const circuitOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <section
      ref={sectionRef}
      id="home"
      data-section="home"
      aria-label="Introduction"
      className="relative min-h-[100svh] flex flex-col justify-center px-6 md:px-12 lg:px-24 overflow-hidden pt-24 lg:pt-0"
    >
      {/* ── Background ── */}
      <motion.div className="absolute inset-0 z-0 pointer-events-none" style={{ opacity: circuitOpacity }}>
        <CircuitCanvas />
      </motion.div>

      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] max-w-full h-[400px] z-0 pointer-events-none"
        style={{ background: 'var(--gradient-hero)' }}
      />
      <div className="absolute inset-0 z-0 pointer-events-none select-none noise-overlay" />

      {/* ── Content ── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full max-w-7xl mx-auto py-12 lg:py-24">
        {/* Left: copy */}
        <motion.div
          initial={{ opacity: 0, x: prefersReduced ? 0 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease }}
          className="flex flex-col items-start"
        >
          <div className="flex items-center gap-3 mb-8">
            <Terminal className="w-4 h-4 text-primary" aria-hidden="true" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Data Engineer // Backend Systems
            </span>
          </div>

          {/* The real sentence is exposed once, flat, to assistive tech; the
              decoding treatment is presentational and hidden from it. */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-[1.15] mb-6">
            <span className="sr-only">{HEADLINE}</span>
            <span aria-hidden="true" className="flex flex-col items-start">
              <ScrambleText text="I build data systems" delay={0} />
              <ScrambleText
                text="that hold up."
                className="text-muted-foreground font-mono font-normal text-2xl sm:text-3xl md:text-4xl mt-2"
                delay={220}
              />
            </span>
          </h1>

          <StaggeredReveal
            text="Backend and data engineering — payment reconciliation, streaming telemetry, and analytics platforms. Each one ships with the tests that prove it."
            className="text-base text-muted-foreground leading-relaxed mb-10 max-w-[480px]"
          />

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-8"
          >
            <button
              type="button"
              onClick={() => scrollToSection('projects')}
              className="btn-structural group flex items-center justify-center gap-3 w-full sm:w-auto"
            >
              <span>View My Work</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </button>

            <CVDownloadButton variant="ghost" />
          </motion.div>

          {/* Socials */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.05 }}
            className="flex items-center gap-4 pt-6 border-t border-border/50 w-full sm:w-auto"
          >
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Find me //
            </span>
            <div className="flex items-center gap-3">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${social.label} (opens in a new tab)`}
                  className="group flex items-center justify-center w-10 h-10 border border-border bg-card/50 hover:bg-card hover:border-primary transition-colors"
                >
                  <social.icon
                    className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors"
                    aria-hidden="true"
                  />
                </a>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Right: ops console */}
        <motion.div
          initial={{ opacity: 0, x: prefersReduced ? 0 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease }}
          className="flex justify-center lg:justify-end w-full"
        >
          <OpsConsole />
        </motion.div>
      </div>

      {/* ── Command palette hint ──
          Bottom-left is deliberately left empty: the copy column already runs
          to the bottom of the section on short viewports, so anything
          absolutely positioned there collides with the socials row. */}
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.8 }}
        onClick={openCommandPalette}
        className="absolute right-6 md:right-12 lg:right-24 bottom-12 z-20 hidden lg:flex items-center gap-3 group"
        aria-label="Open command palette"
      >
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest group-hover:text-foreground transition-colors">
          Command
        </span>
        <span className="flex items-center justify-center w-8 h-8 border border-border bg-card group-hover:border-primary transition-colors">
          <Command className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
        </span>
      </motion.button>
    </section>
  );
}
