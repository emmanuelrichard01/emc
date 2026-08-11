import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
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

/* Fraction of the viewport the visitor must scroll before the navigation
   exists at all on the landing page.

   The hero is a full-screen terminal, and navigating it is the point — you
   type, or you press a chip. A floating nav pill hovering over that undercuts
   the idea and repeats the logo a third time before anyone has done anything.
   So the site opens as a terminal and *becomes* a website on scroll: the nav
   arrives with the first real section, and from then on behaves normally.

   Only the landing route is affected. A case study is an ordinary page and
   needs its navigation immediately. */
const NAV_REVEAL_FRACTION = 0.55;

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
  href,
  onNavigate,
}: {
  section: { id: string; short: string; label: string };
  isActive: boolean;
  /** Absolute on a case study, a bare fragment on the landing page. */
  href: string;
  onNavigate: (id: string) => void;
}) => (
  <a
    href={href}
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

  const isLanding = pathname === '/';
  const navigate = useNavigate();

  /* ── Going to a section ────────────────────────────────────────────────────
     On the landing page a section is somewhere to scroll. On a case study it
     is a different page, and treating it as a scroll target is why every
     link in this component was dead there.

     Both navs pointed at bare fragments — `#projects`, `#about` — and then
     called preventDefault() unconditionally before handing off to
     scrollToSection, which returns false when the element does not exist.
     None of those sections exist on /projects/:id, so the preventDefault
     suppressed the browser's own fragment handling and nothing replaced it:
     clicking Work on a case study changed neither the URL nor the scroll
     position. Six controls on desktop, five on the mobile island, all inert
     — including the logo, which is the one thing a visitor reaches for to
     get back out.

     The href carries the real destination now, so middle-click and "copy
     link address" give a URL that works, and the router handles the plain
     click. Index already scrolls to an inbound hash on arrival, so landing
     on /#projects from here behaves exactly like clicking it from home. */
  const sectionHref = useCallback(
    (id: string) => (isLanding ? `#${id}` : `/#${id}`),
    [isLanding]
  );

  const goToSection = useCallback(
    (id: string) => {
      if (isLanding) {
        scrollToSection(id);
        return;
      }
      navigate(`/#${id}`);
    },
    [isLanding, navigate]
  );

  /* Seeded from the live scroll position, then maintained by the same
     scroll subscription the hide-on-scroll behaviour already uses — rather
     than a second listener and an effect that would have to setState on
     mount to catch up. Only the landing route consults it; everywhere else
     the nav is unconditional. */
  const [scrolledPastHero, setScrolledPastHero] = useState(
    () => typeof window !== 'undefined' && window.scrollY > window.innerHeight * NAV_REVEAL_FRACTION
  );
  const pastHero = !isLanding || scrolledPastHero;

  // Reading progress across the document, smoothed so it glides rather than
  // snapping on every wheel tick.
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const delta = latest - lastScrollY.current;
    lastScrollY.current = latest;

    setIsScrolled(latest > 100);
    setScrolledPastHero(latest > window.innerHeight * NAV_REVEAL_FRACTION);

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

  /* Hidden either because the visitor is scrolling down, or because they have
     not yet left the hero. Pointer events and tab order are dropped too — an
     invisible bar that still swallows clicks and takes focus is worse than a
     visible one. */
  const concealed = isHidden || !pastHero;
  const concealedProps = {
    style: { pointerEvents: concealed ? ('none' as const) : ('auto' as const) },
    'aria-hidden': concealed || undefined,
    inert: concealed,
  };

  return (
    <>
      {/* --- DESKTOP: floating structural pill --- */}
      <motion.nav
        initial={{ y: prefersReduced ? 0 : -100, opacity: 0 }}
        animate={{ y: concealed && !prefersReduced ? -100 : 0, opacity: concealed ? 0 : 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-6 left-0 right-0 z-50 hidden md:flex justify-center px-4"
        aria-label="Main"
        onFocusCapture={handleFocus}
        onBlurCapture={handleBlur}
        {...concealedProps}
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

          {/* "Back to top" only where there is a top to go back to. From a
              case study the mark is the way home, so it says so and goes
              there — plain `/` rather than `/#home`, since the hash would
              only name the place the page already opens at. */}
          <a
            href={isLanding ? '#home' : '/'}
            aria-label={
              isLanding ? 'Emmanuel Moghalu — back to top' : 'Emmanuel Moghalu — home'
            }
            className="flex items-center pl-1"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              if (isLanding) scrollToSection('home');
              else navigate('/');
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
                href={sectionHref(section.id)}
                onNavigate={goToSection}
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
        animate={{ y: concealed && !prefersReduced ? 100 : 0, opacity: concealed ? 0 : 1 }}
        transition={{ type: 'tween', ease: 'easeOut', duration: 0.3 }}
        className="fixed bottom-6 left-0 right-0 z-50 md:hidden flex justify-center px-4 pointer-events-none"
        aria-label="Sections"
        onFocusCapture={handleFocus}
        onBlurCapture={handleBlur}
        aria-hidden={concealed || undefined}
        inert={concealed}
      >
        {/* Fluid, not fixed.

            Five 52px tabs plus two 40px controls and their gaps came to about
            377px of rigid width, which fits a 390px phone and nothing
            narrower — on a 320px screen the island ran ~34px past the edge,
            clipping the command-palette button entirely. It is `fixed`, so it
            never widened the document and no overflow check caught it.

            The tabs now share the available width instead of claiming a fixed
            slice of it, and the island is capped so it does not stretch into
            a full-width bar on a large phone. */}
        <div className="pointer-events-auto w-full max-w-[380px] flex items-stretch gap-0.5 p-1.5 bg-card/95 backdrop-blur-xl border border-border shadow-2xl">
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <a
                key={section.id}
                href={sectionHref(section.id)}
                aria-current={isActive ? 'location' : undefined}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  goToSection(section.id);
                }}
                className={`relative flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 min-h-[48px] px-0.5 py-1.5 transition-colors active:scale-95 ${
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
                <span className="relative z-10 max-w-full truncate font-mono text-[8px] uppercase tracking-wider leading-none">
                  {section.short}
                </span>
              </a>
            );
          })}

          <div className="w-px shrink-0 self-stretch bg-border mx-0.5" aria-hidden="true" />

          <button
            type="button"
            onClick={cycleTheme}
            aria-label={`Accent colour: ${theme}. Switch to next.`}
            className="shrink-0 w-9 flex items-center justify-center text-muted-foreground active:scale-95 transition-transform"
          >
            <Palette className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onOpenCommandPalette}
            aria-label="Open command palette"
            className="shrink-0 w-9 flex items-center justify-center text-muted-foreground active:scale-95 transition-transform"
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
