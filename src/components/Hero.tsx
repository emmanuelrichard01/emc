import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useMotionTemplate } from 'framer-motion';
import { ArrowRight, Download, Github, Linkedin, Twitter, Command } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* SINGLE-LINE TERMINAL                                                       */
/* -------------------------------------------------------------------------- */

const TERMINAL_LINES = [
  { text: "deploying pipeline → us-east-1", duration: 3000, prefix: "$" },
  { text: "building containers ....✓", duration: 2000, prefix: "›" },
  { text: "pushing to registry ....✓", duration: 2000, prefix: "›" },
  { text: "routing traffic to gateway", duration: 2200, prefix: "›" },
  { text: "all services operational", duration: 4000, prefix: "●" },
];

const TypingTerminal = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % TERMINAL_LINES.length);
    }, TERMINAL_LINES[currentIndex].duration);
    return () => clearTimeout(timeout);
  }, [currentIndex]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-sm mx-auto mt-4"
    >
      <div className="rounded-full border border-white/[0.06] bg-white/[0.015] backdrop-blur-md h-9 flex items-center px-4 gap-2.5">
        {/* Terminal Icon */}
        <Command className="w-3 h-3 text-white/20 shrink-0" />
        <div className="w-px h-3.5 bg-white/[0.06] shrink-0" />

        {/* Animated text line */}
        <div className="flex-1 relative h-full flex items-center overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={currentIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute inset-0 flex items-center font-mono text-[11px] text-white/30 whitespace-nowrap tracking-wide"
            >
              <span className="text-white/15 mr-1.5">{TERMINAL_LINES[currentIndex].prefix}</span>
              {TERMINAL_LINES[currentIndex].text}
            </motion.span>
          </AnimatePresence>
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
  { icon: Linkedin, href: "https://www.linkedin.com/in/emmanuelrichard01", label: "LinkedIn" },
  { icon: Twitter, href: "https://twitter.com/_mrebuka", label: "X / Twitter" },
];


/* -------------------------------------------------------------------------- */
/* STAGGER LINK (Continuous Cycle + Gradient)                                 */
/* -------------------------------------------------------------------------- */

/**
 * 3-layer continuous rolling stagger:
 *   [white] → [gradient] → [white]
 * Always rolls upward (never reverses). Cycles periodically + on hover.
 */
const StaggerLink = ({ text, intervalMs = 4000 }: { text: string; intervalMs?: number }) => {
  // 0 = white visible, 1 = gradient visible, 2 = white2 visible (then reset to 0)
  const [phase, setPhase] = useState(0);

  // Shuffled delay order
  const shuffledDelays = React.useMemo(() => {
    const indices = Array.from({ length: text.length }, (_, i) => i);
    const seed = text.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    let s = seed;
    for (let j = indices.length - 1; j > 0; j--) {
      s = (s * 16807 + 11) % 2147483647;
      const k = s % (j + 1);
      [indices[j], indices[k]] = [indices[k], indices[j]];
    }
    const delayMap = new Array(text.length);
    indices.forEach((orig, rank) => { delayMap[orig] = rank; });
    return delayMap;
  }, [text]);

  // Advance one phase
  const advance = React.useCallback(() => {
    setPhase((p) => {
      const next = p + 1;
      // After reaching phase 2, schedule a snap-reset to 0
      if (next >= 2) {
        // Wait for the stagger to finish, then silently reset
        const resetDelay = text.length * 30 + 400;
        setTimeout(() => setPhase(0), resetDelay);
      }
      return next;
    });
  }, [text.length]);

  // Periodic auto-cycle
  useEffect(() => {
    const interval = setInterval(advance, intervalMs);
    return () => clearInterval(interval);
  }, [advance, intervalMs]);

  // y offset: each phase shifts up by -33.33%
  const getY = (p: number) => `${-p * 33.333}%`;

  return (
    <span
      className="inline-flex cursor-pointer"
      onMouseEnter={advance}
    >
      {Array.from(text).map((char, i) => (
        <span
          key={i}
          className="inline-block overflow-hidden relative"
          style={{ lineHeight: "1.3em", height: "1.3em" }}
        >
          <motion.span
            className="inline-flex flex-col"
            animate={{ y: getY(phase) }}
            transition={
              phase === 0
                ? { duration: 0 } // instant snap-reset (invisible)
                : { duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: shuffledDelays[i] * 0.03 }
            }
          >
            {/* Layer 1: White */}
            <span className="inline-block text-white" style={{ lineHeight: "1.3em" }}>
              {char === " " ? "\u00A0" : char}
            </span>
            {/* Layer 2: Gradient (spans full word) */}
            <span
              className="inline-block bg-clip-text text-transparent"
              style={{
                lineHeight: "1.3em",
                backgroundImage: "linear-gradient(to right, hsl(280 100% 55%), #c084fc, #c922ee)",
                backgroundSize: `${text.length}ch 100%`,
                backgroundPosition: `${-i}ch 0`,
              }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
            {/* Layer 3: White (for seamless loop) */}
            <span className="inline-block text-white" style={{ lineHeight: "1.3em" }}>
              {char === " " ? "\u00A0" : char}
            </span>
          </motion.span>
        </span>
      ))}
    </span>
  );
};


/* -------------------------------------------------------------------------- */
/* HERO                                                                       */
/* -------------------------------------------------------------------------- */

export default function Hero() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  const y = useTransform(scrollY, [0, 400], [0, 60]);

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
      className="relative min-h-[100svh] flex flex-col items-center justify-center px-4 overflow-hidden group/hero"
      onMouseMove={handleMouseMove}
    >
      {/* Background Glows (Hero specific) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/6 blur-[180px]" />
        <div className="absolute bottom-[-10%] left-[-8%] w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[180px]" />
      </div>

      {/* Spotlight */}
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-500 group-hover/hero:opacity-100 z-0"
        style={{
          background: useMotionTemplate`radial-gradient(600px circle at ${mouseX}px ${mouseY}px, rgba(168,85,247,0.03), transparent 80%)`,
        }}
      />

      {/* Content */}
      <motion.div
        style={{ y, opacity }}
        className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto mt-20 md:mt-16 lg:mt-12"
      >
        {/* Role Tag */}
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-[11px] font-mono font-medium text-primary/80 tracking-[0.2em] uppercase mb-8"
        >
          Data Engineer & Cloud Architect
        </motion.span>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-5"
        >
          I build data <StaggerLink text="Systems" />{' '}
          that <StaggerLink text="Scale." />
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-base md:text-lg text-white/40 leading-relaxed mb-8 max-w-md"
        >
          Building the invisible pipelines that power decision engines,
          production infrastructure, and resilient software.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-4 mb-10"
        >
          <button
            onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
            className="group/btn px-8 py-3.5 rounded-full font-medium text-[13px] bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:scale-[1.02] transition-all duration-300 flex items-center gap-2"
          >
            View My Work
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
          </button>
          <a
            href="/resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="group/btn px-8 py-3.5 rounded-full font-medium text-[13px] border border-white/[0.15] bg-white/[0.03] text-white/80 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.25] transition-all duration-300 flex items-center gap-2 backdrop-blur-md hover:scale-[1.02]"
          >
            Download CV
            <Download className="w-3.5 h-3.5 transition-transform group-hover/btn:-translate-y-0.5" />
          </a>
        </motion.div>

        {/* Terminal */}
        <TypingTerminal />
      </motion.div>

      {/* Social Links*/}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute left-4 md:left-8 top-1/3 -translate-y-1/3 z-40 hidden sm:flex flex-col items-center gap-4 md:gap-5 px-3 py-5 md:px-3.5 md:py-6 rounded-full bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] group/socials overflow-hidden"
      >
        {/* Inner Left Glow */}
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/[0.15] to-transparent pointer-events-none" />

        {SOCIALS.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.label}
            className="relative p-1.5 text-white/40 transition-all duration-300 group-hover/socials:text-white/50 hover:!text-white hover:scale-110 hover:-translate-y-0.5"
          >
            <s.icon className="w-[18px] h-[18px]" />
          </a>
        ))}
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        style={{ opacity: useTransform(scrollY, [0, 120], [0.4, 0]) }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none"
      >
        <div className="w-5 h-8 rounded-full border border-white/10 flex items-start justify-center p-1.5">
          <motion.div
            className="w-0.5 h-1.5 rounded-full bg-white/30"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </section>
  );
}