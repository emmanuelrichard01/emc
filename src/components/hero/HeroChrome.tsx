import { motion, useReducedMotion } from 'framer-motion';
import { Github, Linkedin, Sparkles } from 'lucide-react';

import { XLogo } from '@/components/ui/XLogo';
import { LOGO_PATHS } from '@/components/ui/LogoMark';
import { useCommandPalette } from '@/components/CommandPaletteProvider';
import { useAsk } from '@/components/ai/AskProvider';
import { MODIFIER_KEY } from '@/lib/platform';
import { COMMIT_SHA, IS_DEV_BUILD } from '@/lib/buildInfo';
import { useLagosClock } from '@/lib/useLagosClock';

/* ==========================================================================
   HERO CHROME

   Everything on the first screen that is not the prompt, pushed to the
   edges and turned down, so the prompt is the only thing in the middle.

     top      the mark (small, once) · go ⌘K · ask ⌘J
     bottom   socials · live · Abuja time · the build it is running

   This replaces a telemetry rail of frame charts, heap meters and client
   dimensions. Measured, all of it, and all of it competing with the one
   thing on this screen that wants attention. The build SHA survives — it is
   the one reading that says something about the site rather than the
   browser — and `watch` still streams the rest for anyone who asks.
   ========================================================================== */

const SOCIALS = [
  { icon: Github, href: 'https://github.com/emmanuelrichard01', label: 'GitHub' },
  { icon: Linkedin, href: 'https://linkedin.com/in/e-mc', label: 'LinkedIn' },
  { icon: XLogo, href: 'https://x.com/mrebr', label: 'X' },
];

const EASE = [0.16, 1, 0.3, 1] as const;

export function HeroTopBar() {
  const { open: openPalette } = useCommandPalette();
  const { toggleAsk } = useAsk();
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5, ease: EASE }}
      className="relative z-20 flex items-center justify-between shrink-0"
    >
      <a href="#home" aria-label="Emmanuel Moghalu" className="group flex items-center gap-3 py-2.5 -my-2.5">
        <svg
          viewBox="0 0 200 120"
          className="w-8 h-5 text-primary transition-[filter] duration-500 group-hover:drop-shadow-[0_0_10px_hsl(var(--primary)/0.6)]"
          aria-hidden="true"
        >
          {LOGO_PATHS.map((d, i) => (
            <path key={i} d={d} fill="currentColor" />
          ))}
        </svg>
        <span className="font-mono text-[11px] tracking-[0.34em] text-foreground/80 uppercase">E·MC</span>
      </a>

      <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em]">
        <button
          type="button"
          onClick={openPalette}
          aria-label={`Open the command palette (${MODIFIER_KEY}+K)`}
          className="hidden md:flex items-center gap-2 px-2.5 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          go <kbd className="border border-border px-1.5 py-0.5 text-[10px] sm:text-[9px]">{MODIFIER_KEY}K</kbd>
        </button>
        <button
          type="button"
          onClick={toggleAsk}
          aria-label={`Open the assistant (${MODIFIER_KEY}+J)`}
          className="flex items-center gap-2 px-2.5 py-2.5 md:py-1.5 text-muted-foreground hover:text-primary transition-colors"
        >
          <Sparkles className="w-3 h-3 text-primary/80" aria-hidden="true" />
          ask <kbd className="hidden md:inline border border-border px-1.5 py-0.5 text-[10px] sm:text-[9px]">{MODIFIER_KEY}J</kbd>
        </button>
      </div>
    </motion.div>
  );
}

export function HeroBaseline() {
  const time = useLagosClock();
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.9 }}
      className="relative z-20 flex items-center justify-between gap-4 shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
    >
      <div className="flex items-center gap-1">
        {SOCIALS.map((social) => (
          <a
            key={social.label}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${social.label} (opens in a new tab)`}
            // 32px target without changing the line's height.
            className="p-2.5 -m-0.5 hover:text-primary transition-colors"
          >
            <social.icon className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        ))}
      </div>

      <div className="flex items-center gap-3 tabular-nums">
        {/* Availability is already said once, under the name; the baseline
            keeps to what only it says — the local time, and the build. */}
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-status-ok status-live" aria-hidden="true" />
          abuja {time}
        </span>
        {!IS_DEV_BUILD && (
          <span className="hidden md:contents">
            <span aria-hidden="true" className="text-border">/</span>
            <span className="normal-case tracking-[0.1em]">#{COMMIT_SHA}</span>
          </span>
        )}
      </div>
    </motion.div>
  );
}
