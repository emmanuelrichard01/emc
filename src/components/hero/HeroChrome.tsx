import { motion, useReducedMotion } from 'framer-motion';
import { Github, Linkedin, Sparkles } from 'lucide-react';

import { XLogo } from '@/components/ui/XLogo';
import { LOGO_PATHS } from '@/components/ui/LogoMark';
import { useCommandPalette } from '@/components/CommandPaletteProvider';
import { useAsk } from '@/components/ai/AskProvider';
import { MODIFIER_KEY } from '@/lib/platform';
import { COMMIT_SHA, IS_DEV_BUILD } from '@/lib/buildInfo';
import { useLagosClock } from '@/lib/useLagosClock';
import { SECTIONS } from '@/data/sections';
import { PROJECTS } from '@/data/projects';
import { projectStatus } from '@/lib/project';

/* The proof line: three counts read from the same data the page renders,
   so the first screen carries evidence, not only a promise. */
const BUILT = PROJECTS.filter((p) => p.tier !== 'design');
const PROOF = [
  { value: BUILT.length, label: 'systems built' },
  { value: BUILT.filter((p) => projectStatus(p) === 'live').length, label: 'live now' },
  { value: PROJECTS.filter((p) => p.caseStudy).length, label: 'written up in full' },
];
import { scrollToSection } from '@/lib/scrollToSection';

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
      className="relative z-20 flex items-center justify-between shrink-0 h-10"
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
        <span className="font-display text-[14px] font-[560] tracking-[-0.01em] [font-stretch:112%] text-foreground">E·MC</span>
      </a>

      {/* The same running head the page carries once the hero is left, so
          nothing jumps when the real navigation takes over. */}
      <div className="flex items-center gap-7">
        <nav aria-label="Jump to a section" className="hidden lg:flex items-center gap-7">
          {SECTIONS.filter((section) => section.id !== 'home').map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                scrollToSection(section.id);
              }}
              className="py-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {section.label}
            </a>
          ))}
        </nav>
        <span className="hidden lg:block w-px h-4 bg-border" aria-hidden="true" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAsk}
            aria-label={`Open the assistant (${MODIFIER_KEY}+J)`}
            className="group flex items-center gap-2 h-10 md:h-8 px-2 md:px-3 text-[13px] text-foreground hover:text-primary transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary transition-transform duration-500 ease-out-expo group-hover:rotate-12" aria-hidden="true" />
            Ask
          </button>
          <button
            type="button"
            onClick={openPalette}
            aria-label={`Open the command palette (${MODIFIER_KEY}+K)`}
            className="hidden md:flex items-center gap-1 h-8 pl-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <kbd className="kbd">{MODIFIER_KEY}</kbd>
            <kbd className="kbd">K</kbd>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function HeroBaseline() {
  const { time } = useLagosClock();
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.9 }}
      className="relative z-20 flex items-center justify-between gap-4 shrink-0 text-[12px] text-muted-foreground"
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

      <p className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-2.5 whitespace-nowrap text-muted-foreground">
        {PROOF.map((item, i) => (
          <span key={item.label} className="flex items-center gap-2.5">
            {i > 0 && <span aria-hidden="true" className="text-muted-ghost">·</span>}
            <span>
              <span className="t-figure text-foreground">{item.value}</span> {item.label}
            </span>
          </span>
        ))}
      </p>

      <div className="flex items-center gap-3 tabular-nums">
        {/* The way on is down: a hairline with a light travelling it, so the
            dive into the horizon is an invitation rather than an accident.
            Kept to the edge, where it never competes with the prompt. */}
        <a
          href="#about"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            scrollToSection('about');
          }}
          className="hidden md:flex items-center gap-2 text-muted-quiet hover:text-foreground transition-colors"
          aria-label="Scroll to the next section"
        >
          <span aria-hidden="true" className="relative block w-px h-4 bg-border overflow-hidden">
            {!prefersReduced && (
              <motion.span
                className="absolute inset-x-0 top-0 h-2 bg-primary"
                animate={{ y: ['-100%', '320%'] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: [0.65, 0, 0.35, 1], repeatDelay: 0.8 }}
              />
            )}
          </span>
          Scroll
        </a>
        <span aria-hidden="true" className="hidden md:inline text-border">/</span>
        {/* Availability is already said once, under the name; the baseline
            keeps to what only it says — the local time, and the build. */}
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-status-ok status-live" aria-hidden="true" />
          Abuja <span className="text-foreground tabular-nums">{time}</span>
        </span>
        {!IS_DEV_BUILD && (
          <span className="hidden md:contents">
            <span aria-hidden="true" className="text-border">/</span>
            <span className="font-mono text-[11px]">#{COMMIT_SHA}</span>
          </span>
        )}
      </div>
    </motion.div>
  );
}
