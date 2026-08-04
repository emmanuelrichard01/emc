import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Command, Palette } from 'lucide-react';

import { SECTIONS } from '@/data/sections';
import { MODIFIER_KEY } from '@/lib/platform';
import { scrollToSection } from '@/lib/scrollToSection';
import { useSectionObserver } from '../hooks/useSectionObserver';
import { PUBLIC_THEMES, useTheme } from './ThemeProvider';
import { LOGO_PATHS } from './ui/LogoMark';

/* Scroll distance in one direction before the bar reacts.

   Without it, a single pixel of downward movement — a trackpad tremor, a
   focus jump, the address bar collapsing on mobile — was enough to hide the
   whole navigation. */
const DIRECTION_THRESHOLD = 12;
/** Below this, the bar is always shown regardless of direction. */
const ALWAYS_VISIBLE_ABOVE = 300;

/* -------------------------------------------------------------------------- */
/* LOGO                                                                       */
/* -------------------------------------------------------------------------- */

const Logo = () => {
  const hasDrawn = useRef(false);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    if (hasDrawn.current) return;
    hasDrawn.current = true;
    const timer = setTimeout(() => setDrawn(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    // Purely decorative: the surrounding control carries the accessible name,
    // so labelling the mark as well made screen readers announce it twice.
    <motion.div
      className="relative w-6 h-6 text-primary flex items-center justify-center"
      aria-hidden="true"
      whileHover={{ scale: 1.1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      <motion.svg viewBox="0 0 200 120" className="w-full h-full">
        <motion.g
          fill="currentColor"
          initial={{ fillOpacity: drawn ? 1 : 0 }}
          animate={{ fillOpacity: 1 }}
          transition={{ duration: 0.5, delay: drawn ? 0 : 1.0 }}
        >
          {LOGO_PATHS.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: drawn ? 1 : 0, opacity: drawn ? 1 : 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={drawn ? { duration: 0 } : { duration: 1, ease: 'easeInOut', delay: i * 0.15 }}
            />
          ))}
        </motion.g>
      </motion.svg>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/* NAV LINK                                                                   */
/* -------------------------------------------------------------------------- */

/* A real anchor, not a button.

   These point at real fragments, so middle-click, ⌘-click and "copy link
   address" all behave the way a visitor expects, and the URL is shareable.
   The click handler only intercepts plain left-clicks to smooth-scroll —
   modified clicks fall through to the browser. */
const NavLink = ({
  section,
  isActive,
  onNavigate,
}: {
  section: { id: string; short: string; label: string };
  isActive: boolean;
  onNavigate: (id: string) => void;
}) => (
  <a
    href={`#${section.id}`}
    aria-current={isActive ? 'location' : undefined}
    onClick={(e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      onNavigate(section.id);
    }}
    className={`relative px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors duration-200 ${
      isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
    }`}
  >
    <span className="relative z-10">{section.short}</span>
    {isActive && (
      <motion.span
        layoutId="nav-indicator-desktop"
        className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary z-0"
        style={{ boxShadow: '0 1px 6px hsl(var(--primary) / 0.4)' }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
    )}
  </a>
);

/* -------------------------------------------------------------------------- */
/* NAVBAR                                                                     */
/* -------------------------------------------------------------------------- */

const NavbarContent = ({ onOpenCommandPalette }: { onOpenCommandPalette?: () => void }) => {
  const { theme, setTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const { scrollY, scrollYProgress } = useScroll();
  const lastScrollY = useRef(0);
  const travel = useRef(0);
  const focusWithin = useRef(false);

  const prefersReduced = useReducedMotion();
  const { pathname } = useLocation();

  // Reading progress across the document, smoothed so it glides rather than
  // snapping on every wheel tick.
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const delta = latest - lastScrollY.current;
    lastScrollY.current = latest;

    setIsScrolled(latest > 100);

    if (latest <= ALWAYS_VISIBLE_ABOVE) {
      travel.current = 0;
      setIsHidden(false);
      return;
    }

    // Accumulate movement in one direction, resetting whenever it reverses.
    travel.current = Math.sign(delta) === Math.sign(travel.current) ? travel.current + delta : delta;

    if (travel.current > DIRECTION_THRESHOLD) {
      // Never retract the bar out from under a keyboard user who is tabbing
      // through it — the focused control would scroll off screen.
      if (!focusWithin.current) setIsHidden(true);
    } else if (travel.current < -DIRECTION_THRESHOLD) {
      setIsHidden(false);
    }
  });

  /* Cycles the visible themes only. A theme outside the public list yields
     index -1, so the next step lands on the first public theme — the toggle
     always returns you somewhere you could have reached without it. */
  const cycleTheme = useCallback(() => {
    const index = PUBLIC_THEMES.indexOf(theme);
    setTheme(PUBLIC_THEMES[(index + 1) % PUBLIC_THEMES.length]);
  }, [theme, setTheme]);

  const observedSection = useSectionObserver();

  // Sections only exist on the landing route. Without this guard a case study
  // page keeps whatever section was last current and renders Home as active,
  // which reads as "you are on the home page" when you demonstrably are not.
  const activeSection = pathname === '/' ? observedSection : null;

  const handleFocus = useCallback(() => {
    focusWithin.current = true;
    setIsHidden(false);
  }, []);
  const handleBlur = useCallback(() => {
    focusWithin.current = false;
  }, []);

  const shortcutLabel = `${MODIFIER_KEY}+K`;

  return (
    <>
      {/* --- DESKTOP: floating structural pill --- */}
      <motion.nav
        initial={{ y: prefersReduced ? 0 : -100, opacity: 0 }}
        animate={{ y: isHidden && !prefersReduced ? -100 : 0, opacity: isHidden ? 0 : 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-6 left-0 right-0 z-50 hidden md:flex justify-center px-4"
        aria-label="Main"
        onFocusCapture={handleFocus}
        onBlurCapture={handleBlur}
      >
        <div
          className={`relative flex items-center gap-4 px-3 py-2 border transition-all duration-500 ${
            isScrolled
              ? 'bg-card/95 backdrop-blur-xl border-border shadow-2xl'
              : 'bg-card/70 backdrop-blur-md border-border/60'
          }`}
        >
          {/* Reading progress along the pill's bottom edge. */}
          <motion.div
            className="absolute bottom-0 left-0 h-[1px] w-full bg-primary/50 origin-left"
            style={{ scaleX: progress }}
            aria-hidden="true"
          />

          <a
            href="#home"
            aria-label="Emmanuel Moghalu — back to top"
            className="flex items-center pl-1"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              scrollToSection('home');
            }}
          >
            <Logo />
          </a>

          <div className="w-[1px] h-4 bg-border" aria-hidden="true" />

          <div className="flex items-center gap-1">
            {SECTIONS.map((section) => (
              <NavLink
                key={section.id}
                section={section}
                isActive={activeSection === section.id}
                onNavigate={scrollToSection}
              />
            ))}
          </div>

          <div className="w-[1px] h-4 bg-border" aria-hidden="true" />

          <button
            type="button"
            onClick={cycleTheme}
            aria-label={`Accent colour: ${theme}. Switch to next.`}
            className="flex items-center justify-center w-7 h-7 border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
          >
            <Palette className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onOpenCommandPalette}
            aria-label={`Open command palette (${shortcutLabel})`}
            className="flex items-center gap-2 px-2.5 py-1 border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
          >
            <Command className="h-3 w-3" aria-hidden="true" />
            {/* Reflects the actual platform rather than always claiming ⌘. */}
            <kbd className="font-mono text-[9px] uppercase tracking-widest">{shortcutLabel}</kbd>
          </button>
        </div>
      </motion.nav>

      {/* --- MOBILE: floating bottom island --- */}
      <motion.nav
        initial={{ y: prefersReduced ? 0 : 100, opacity: 0 }}
        animate={{ y: isHidden && !prefersReduced ? 100 : 0, opacity: isHidden ? 0 : 1 }}
        transition={{ type: 'tween', ease: 'easeOut', duration: 0.3 }}
        className="fixed bottom-6 left-0 right-0 z-50 md:hidden flex justify-center px-4 pointer-events-none"
        aria-label="Sections"
        onFocusCapture={handleFocus}
        onBlurCapture={handleBlur}
      >
        <div className="pointer-events-auto flex items-stretch gap-0.5 p-1.5 bg-card/95 backdrop-blur-xl border border-border shadow-2xl">
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                aria-current={isActive ? 'location' : undefined}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  scrollToSection(section.id);
                }}
                className={`relative flex flex-col items-center justify-center gap-0.5 w-[52px] min-h-[48px] px-1 py-1.5 transition-colors active:scale-95 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="mobile-indicator"
                    className="absolute inset-0 bg-primary/10 border border-primary/30 z-0"
                    transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                  />
                )}
                <section.icon className="h-[17px] w-[17px] relative z-10" aria-hidden="true" />
                {/* Icon-only navigation asks every visitor to decode a
                    pictogram. The label costs 9px and removes the guess. */}
                <span className="relative z-10 font-mono text-[8px] uppercase tracking-wider leading-none">
                  {section.short}
                </span>
              </a>
            );
          })}

          <div className="w-[1px] self-stretch bg-border mx-1" aria-hidden="true" />

          <button
            type="button"
            onClick={cycleTheme}
            aria-label={`Accent colour: ${theme}. Switch to next.`}
            className="min-w-[40px] flex items-center justify-center text-muted-foreground active:scale-95 transition-transform"
          >
            <Palette className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onOpenCommandPalette}
            aria-label="Open command palette"
            className="min-w-[40px] flex items-center justify-center text-muted-foreground active:scale-95 transition-transform"
          >
            <Command className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </motion.nav>
    </>
  );
};

export default function Navbar(props: { onOpenCommandPalette?: () => void }) {
  return <NavbarContent {...props} />;
}
