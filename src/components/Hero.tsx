import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Command } from 'lucide-react';

import { MODIFIER_KEY } from '@/lib/platform';
import { useCommandPalette } from '@/components/CommandPaletteProvider';
import CircuitCanvas from '@/components/hero/CircuitCanvas';
import { useBooted } from '@/components/hero/BootOverlay';
import TerminalHero from '@/components/hero/TerminalHero';

/* ==========================================================================
   HERO

   Composition only. The site boots (BootOverlay) and hands over to a live
   shell that owns the viewport (TerminalHero), on the circuit board that was
   already the background.

   The previous hero split the screen: a decoding headline and CTA buttons on
   the left, a 320px-tall console on the right. The console was the most
   distinctive thing on the site and had the least room to be it, while the
   headline said in prose what the terminal could simply demonstrate. This
   gives the demonstration the whole screen and moves the identity copy into
   the shell's message-of-the-day, where it arrives as output rather than as
   decoration beside a terminal.
   ========================================================================== */

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReduced = useReducedMotion();
  const { open: openCommandPalette } = useCommandPalette();

  /* The cold open belongs to <BootProvider> in App, not here.

     It used to be rendered by this component — which lives in the lazily
     loaded route chunk, so the overlay could not exist until the page it was
     covering had already painted. All that is left of it here is the flag,
     which gates focus and telemetry: focusing the prompt underneath a
     full-screen overlay scrolls the page to an input nobody can see. */
  const live = useBooted();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  // A whisper, not a backdrop — see the background note below. Folded into
  // the transform rather than a class, since the inline style would win.
  const circuitOpacity = useTransform(scrollYProgress, [0, 0.8], [0.2, 0]);

  return (
    <section
      ref={sectionRef}
      id="home"
      data-section="home"
      aria-label="Introduction"
      /* No top padding for a navbar, because there is no navbar here — it is
         suppressed until the visitor scrolls past this section. The hero is a
         terminal occupying a whole screen; a floating pill over it would be
         the site apologising for its own idea. */
      className="relative h-[100svh] min-h-[520px] flex flex-col overflow-hidden px-6 md:px-10 lg:px-16 pt-14 pb-4"
    >
      {/* ── Background ──
          A flat, dim surface, the way the reference does it. The circuit
          board is kept at a whisper rather than removed: it still answers
          commands through the circuit bus, so the screen has a pulse when the
          shell is used, but at rest it reads as one calm colour instead of as
          pattern under 14px mono. */}
      <div className="absolute inset-0 z-0 bg-[hsl(var(--hero-surface))]" aria-hidden="true" />

      {/* Static grid — the site's own drafting language, held at a whisper.
          Two scales, minor and major, masked so it fades out behind the
          reading column and around the edges. This is the half of the
          background that stays still; the canvas below is the half that
          moves. Together they read as a surface with structure rather than
          as either a flat void or a busy pattern. */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--foreground) / 0.022) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground) / 0.022) 1px, transparent 1px),
            linear-gradient(to right, hsl(var(--foreground) / 0.032) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground) / 0.032) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px, 48px 48px, 192px 192px, 192px 192px',
          maskImage:
            'radial-gradient(ellipse 70% 60% at 40% 45%, transparent 0%, #000 55%, #000 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 60% at 40% 45%, transparent 0%, #000 55%, #000 100%)',
        }}
      />

      <motion.div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ opacity: circuitOpacity }}
      >
        <CircuitCanvas />
      </motion.div>

      {/* Soft lift behind the reading column, and a darker edge around it, so
          the text sits on its own surface without a visible box. */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 40% 45%, hsl(0 0% 100% / 0.014) 0%, transparent 70%), radial-gradient(ellipse 90% 80% at 50% 50%, transparent 40%, hsl(0 0% 0% / 0.45) 100%)',
        }}
      />
      <div className="absolute inset-0 z-0 pointer-events-none select-none noise-overlay" />

      {/* Faint CRT raster over the whole hero. Subtle enough to read as a
          screen rather than as an effect — it disappears at a glance and only
          registers as texture. */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none opacity-[0.5]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, hsl(var(--foreground) / 0.018) 0px, hsl(var(--foreground) / 0.018) 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* ── Shell ── */}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        <TerminalHero live={live} />
      </div>

      {/* Palette hint, floated clear of the shell's own status rail. */}
      <motion.button
        type="button"
        initial={prefersReduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1 }}
        onClick={openCommandPalette}
        aria-label={`Open command palette (${MODIFIER_KEY}+K)`}
        className="absolute right-4 md:right-8 lg:right-12 top-24 z-20 hidden md:flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/50 hover:text-foreground transition-colors group"
      >
        <Command className="w-3 h-3 group-hover:text-primary transition-colors" aria-hidden="true" />
        <kbd className="font-mono">{MODIFIER_KEY}+K</kbd>
      </motion.button>
    </section>
  );
}
