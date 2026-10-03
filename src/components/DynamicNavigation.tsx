import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, type MotionValue } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

import { SECTIONS } from '@/data/sections';
import { MODIFIER_KEY } from '@/lib/platform';
import { scrollToSection } from '@/lib/scrollToSection';
import { useSectionObserver } from '../hooks/useSectionObserver';
import { LOGO_PATHS } from './ui/LogoMark';
import { useAsk } from './ai/AskProvider';

/* ==========================================================================
   NAVIGATION — the running head

   A monograph carries its title and section along the top of every page in
   small type; this is that line. Mark and name on the left, the sections on
   the right, then the two doors that are not places — ask, and go (⌘K).

   It is absent over the hero, whose own top edge already carries the mark
   and shortcuts, and arrives with the first section. It steps out of the
   way while reading down and returns on the first scroll up.

   The accent toggle moved to the command palette (Theme). A colour switch
   is the least-used control a visitor could be offered in the most
   prominent place on the page.
   ========================================================================== */

/* Scroll distance in one direction before the bar reacts — a trackpad
   tremor or the mobile address bar collapsing must not hide it. */
const DIRECTION_THRESHOLD = 12;
/** Below this, the bar is always shown regardless of direction. */
const ALWAYS_VISIBLE_ABOVE = 300;

/* How much of the viewport the hero must have left before the navigation
   exists at all on the landing page. Measured from where the hero actually
   ends (the hero is a pinned scroll scene), not from a fixed distance. Only
   the landing route is affected; a case study needs its navigation at once. */
const NAV_REVEAL_FRACTION = 0.55;

/* After the dive, the next section is pinned on its own stage while it
   grows in (Hero.tsx, #hero-stage). The bar arrives once that reveal is
   nearly done, so it never lands on top of the section's entrance. */
const REVEAL_PIN_FRACTION = 0.45; // mirrors REVEAL_LENGTH in Hero.tsx

function heroHasPassed(): boolean {
  if (typeof window === 'undefined') return false;
  const stage = document.getElementById('hero-stage');
  if (stage) return stage.getBoundingClientRect().top < -window.innerHeight * REVEAL_PIN_FRACTION * 0.8;
  const hero = document.getElementById('home');
  if (!hero) return window.scrollY > window.innerHeight * NAV_REVEAL_FRACTION;
  return (
    window.scrollY > window.innerHeight * NAV_REVEAL_FRACTION &&
    hero.getBoundingClientRect().bottom < window.innerHeight * 1.04
  );
}

const EASE = [0.16, 1, 0.3, 1] as const;

/* -------------------------------------------------------------------------- */
/* MARK                                                                       */
/* -------------------------------------------------------------------------- */

/** The E·MC mark, in ink. Decorative: the link around it carries the name. */
export const Mark = ({ className = 'w-[22px] h-[13px]' }: { className?: string }) => (
  <svg viewBox="0 0 200 120" className={className} aria-hidden="true">
    {LOGO_PATHS.map((d, i) => (
      <path key={i} d={d} fill="currentColor" />
    ))}
  </svg>
);

/* -------------------------------------------------------------------------- */
/* NAV LINK                                                                   */
/* -------------------------------------------------------------------------- */

/* A real anchor, not a button: middle-click, ⌘-click and "copy link address"
   all behave as a visitor expects. Only plain left-clicks are intercepted to
   smooth-scroll. */
const NavLink = ({
  section,
  isActive,
  href,
  onNavigate,
  progress,
}: {
  section: { id: string; short: string; label: string };
  isActive: boolean;
  /** Absolute on a case study, a bare fragment on the landing page. */
  href: string;
  onNavigate: (id: string) => void;
  /** How far through the active section the reader is, 0–1. */
  progress: MotionValue<number>;
}) => (
  <a
    href={href}
    aria-current={isActive ? 'location' : undefined}
    onClick={(e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      onNavigate(section.id);
    }}
    className={`relative py-2 text-[13px] tracking-[-0.003em] transition-colors duration-300 ${
      isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
    }`}
  >
    {section.label}
    {/* The marker is also a meter: a hairline under the current section
        that fills, in the accent, with how far through it the reader is. */}
    {isActive && (
      <motion.span
        layoutId="nav-indicator-desktop"
        className="absolute left-0 right-0 bottom-0.5 h-px bg-rule-strong overflow-hidden"
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        aria-hidden="true"
      >
        <motion.span className="absolute inset-0 bg-primary origin-left" style={{ scaleX: progress }} />
      </motion.span>
    )}
  </a>
);

/* -------------------------------------------------------------------------- */
/* NAVBAR                                                                     */
/* -------------------------------------------------------------------------- */

const NavbarContent = ({ onOpenCommandPalette }: { onOpenCommandPalette?: () => void }) => {
  const { toggleAsk, open: askOpen } = useAsk();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const { scrollY } = useScroll();
  const lastScrollY = useRef(0);
  const travel = useRef(0);
  const focusWithin = useRef(false);

  const prefersReduced = useReducedMotion();
  const { pathname } = useLocation();

  const isLanding = pathname === '/';
  const navigate = useNavigate();

  /* On the landing page a section is somewhere to scroll; on a case study it
     is a different page. The href carries the real destination, so modified
     clicks and copied links work, and Index scrolls to an inbound hash on
     arrival. */
  const sectionHref = useCallback((id: string) => (isLanding ? `#${id}` : `/#${id}`), [isLanding]);

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

  const [scrolledPastHero, setScrolledPastHero] = useState(heroHasPassed);
  const pastHero = !isLanding || scrolledPastHero;

  /* Progress through the current section, written straight to a motion value
     from the scroll subscription: it changes every frame of a scroll, and
     routing it through React state would re-render the bar to move a 1px line. */
  const rawSectionProgress = useMotionValue(0);
  const sectionProgress = useSpring(rawSectionProgress, { stiffness: 200, damping: 34, restDelta: 0.001 });
  const activeRef = useRef<string | null>(null);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const current = activeRef.current && document.getElementById(activeRef.current);
    if (current) {
      const rect = current.getBoundingClientRect();
      const line = window.innerHeight * 0.3;
      rawSectionProgress.set(Math.min(1, Math.max(0, (line - rect.top) / rect.height)));
    }

    const delta = latest - lastScrollY.current;
    lastScrollY.current = latest;

    setIsScrolled(latest > 40);
    setScrolledPastHero(heroHasPassed());

    if (latest <= ALWAYS_VISIBLE_ABOVE) {
      travel.current = 0;
      setIsHidden(false);
      return;
    }

    travel.current = Math.sign(delta) === Math.sign(travel.current) ? travel.current + delta : delta;

    if (travel.current > DIRECTION_THRESHOLD) {
      // Never retract the bar from under a keyboard user tabbing through it.
      if (!focusWithin.current) setIsHidden(true);
    } else if (travel.current < -DIRECTION_THRESHOLD) {
      setIsHidden(false);
    }
  });

  const observedSection = useSectionObserver();

  // Sections only exist on the landing route.
  const activeSection = pathname === '/' ? observedSection : null;
  useEffect(() => {
    activeRef.current = activeSection;
  }, [activeSection]);

  const handleFocus = useCallback(() => {
    focusWithin.current = true;
    setIsHidden(false);
  }, []);
  const handleBlur = useCallback(() => {
    focusWithin.current = false;
  }, []);

  /* Hidden while reading down, or before the hero has been left. Pointer
     events and tab order go with it — an invisible bar that still takes
     clicks and focus is worse than a visible one. */
  const concealed = isHidden || !pastHero;
  const concealedProps = {
    style: { pointerEvents: concealed ? ('none' as const) : ('auto' as const) },
    'aria-hidden': concealed || undefined,
    inert: concealed,
  };

  // The running head lists the sections a reader moves between; Home is the mark.
  const headSections = SECTIONS.filter((section) => section.id !== 'home');

  return (
    <>
      {/* --- DESKTOP: the running head --- */}
      <motion.nav
        initial={{ y: prefersReduced ? 0 : -24, opacity: 0 }}
        animate={{ y: concealed && !prefersReduced ? -24 : 0, opacity: concealed ? 0 : 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="fixed top-0 left-0 right-0 z-50 hidden md:block"
        aria-label="Main"
        onFocusCapture={handleFocus}
        onBlurCapture={handleBlur}
        {...concealedProps}
      >
        <div
          className={`transition-[background-color,box-shadow] duration-500 ${
            isScrolled ? 'bg-background/90 backdrop-blur-md shadow-[inset_0_-1px_0_hsl(var(--border))]' : 'bg-transparent'
          }`}
        >
          <div className="page-max page-x h-16 flex items-center justify-between gap-8">
            {/* "Back to top" on the landing page; home from anywhere else. */}
            <a
              href={isLanding ? '#home' : '/'}
              aria-label={isLanding ? 'Emmanuel Moghalu, back to top' : 'Emmanuel Moghalu, home page'}
              className="group flex items-center gap-3 text-foreground"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                if (isLanding) scrollToSection('home');
                else navigate('/');
              }}
            >
              <Mark className="w-[22px] h-[13px] transition-transform duration-500 ease-out-expo group-hover:-translate-y-px" />
              <span className="font-display text-[14px] font-[560] tracking-[-0.01em] [font-stretch:112%]">Emmanuel Moghalu</span>
            </a>

            <div className="flex items-center gap-8">
              <div className="flex items-center gap-7">
                {headSections.map((section) => (
                  <NavLink
                    key={section.id}
                    section={section}
                    isActive={activeSection === section.id}
                    href={sectionHref(section.id)}
                    onNavigate={goToSection}
                    progress={sectionProgress}
                  />
                ))}
              </div>

              <span className="w-px h-4 bg-border" aria-hidden="true" />

              <div className="flex items-center gap-2">
                {/* The assistant: the one control here that answers rather
                    than goes somewhere, so the one that may carry the accent. */}
                <button
                  type="button"
                  onClick={toggleAsk}
                  aria-label={`${askOpen ? 'Close' : 'Open'} the assistant (${MODIFIER_KEY}+J)`}
                  aria-expanded={askOpen}
                  className={`group flex items-center gap-2 h-8 px-3 text-[13px] transition-colors ${
                    askOpen ? 'text-primary' : 'text-foreground hover:text-primary'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary transition-transform duration-500 ease-out-expo group-hover:rotate-12" aria-hidden="true" />
                  Ask
                </button>
                <button
                  type="button"
                  onClick={onOpenCommandPalette}
                  aria-label={`Open the command palette (${MODIFIER_KEY}+K)`}
                  className="flex items-center gap-1 h-8 pl-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <kbd className="kbd">{MODIFIER_KEY}</kbd>
                  <kbd className="kbd">K</kbd>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* --- MOBILE: a quiet island at the thumb --- */}
      <motion.nav
        initial={{ y: prefersReduced ? 0 : 24, opacity: 0 }}
        animate={{ y: concealed && !prefersReduced ? 24 : 0, opacity: concealed ? 0 : 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-0 right-0 z-50 md:hidden flex justify-center px-4 pointer-events-none"
        aria-label="Sections"
        onFocusCapture={handleFocus}
        onBlurCapture={handleBlur}
        aria-hidden={concealed || undefined}
        inert={concealed}
      >
        {/* Fluid: the tabs share the available width, capped so the island
            does not become a full-width bar on a large phone, and fitting a
            320px screen. */}
        <div className="pointer-events-auto w-full max-w-[400px] flex items-stretch bg-background/95 backdrop-blur-md shadow-[0_0_0_1px_hsl(var(--border)),0_18px_48px_-16px_rgba(0,0,0,0.8)]">
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
                /* Home steps aside below 360px so the other four names fit
                   whole; the top of the page is still one tap on the mark
                   in the hero, or the footer's back-to-top. */
                className={`relative flex-1 min-w-0 items-center justify-center min-h-[48px] px-0.5 text-[11px] min-[360px]:text-[12px] tracking-[-0.01em] transition-colors ${
                  section.id === 'home' ? 'hidden min-[360px]:flex' : 'flex'
                } ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {isActive && (
                  <motion.span
                    layoutId="mobile-indicator"
                    className="absolute top-0 left-3 right-3 h-px bg-primary"
                    transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
                    aria-hidden="true"
                  />
                )}
                <span className="truncate">{section.short}</span>
              </a>
            );
          })}

          <span className="w-px shrink-0 my-3 bg-border" aria-hidden="true" />

          <button
            type="button"
            onClick={toggleAsk}
            aria-label={askOpen ? 'Close the assistant' : 'Ask the assistant'}
            aria-expanded={askOpen}
            className="shrink-0 w-10 min-[360px]:w-11 flex items-center justify-center text-primary active:scale-95 transition-transform"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onOpenCommandPalette}
            aria-label="Open the command palette"
            className="shrink-0 w-10 min-[360px]:w-11 flex items-center justify-center text-muted-foreground active:scale-95 transition-transform"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
              <path d="M2 4h12M2 8h12M2 12h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" fill="none" />
            </svg>
          </button>
        </div>
      </motion.nav>
    </>
  );
};

export default function Navbar(props: { onOpenCommandPalette?: () => void }) {
  return <NavbarContent {...props} />;
}
