import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

import type { CaseSection } from './caseModel';

/* ==========================================================================
   CASE CONTENTS — the page's shape, and where you are in it

   Three instruments, one scroll subscription each:

     · ReadingProgress  a 2px bar across the top of the viewport
     · CaseContents     the desktop rail: each entry is a track that fills
                        as that section is read, plus an honest estimate of
                        the time left
     · MobileContents   on a phone the rail cannot sit beside the text, so
                        it becomes a sticky bar naming the current section,
                        which opens the full list

   Scroll-spy is geometric — the section occupying most of a reading band
   wins — for the reason the nav's observer gives: IntersectionObserver
   ratios are relative to each target's own height, so a long section that
   fills the screen scores lower than a short one clipping it. Progress
   values are written to motion values, never state, so reading re-renders
   nothing but the active label when it changes.
   ========================================================================== */

const BAND_TOP = 0.15;
const BAND_BOTTOM = 0.45;

/** The current section and a live 0–1 progress through it. */
function useSpy(sections: CaseSection[]) {
  const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);
  const progress = useMotionValue(0);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const top = window.innerHeight * BAND_TOP;
      const bottom = window.innerHeight * BAND_BOTTOM;
      let best: { id: string; el: HTMLElement } | null = null;
      let bestOverlap = 0;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const overlap = Math.min(r.bottom, bottom) - Math.max(r.top, top);
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          best = { id: s.id, el };
        }
      }
      if (!best) return; // hold the last value at both ends of the page
      setActive((prev) => (prev === best!.id ? prev : best!.id));
      const r = best.el.getBoundingClientRect();
      const line = window.innerHeight * 0.3;
      progress.set(Math.min(1, Math.max(0, (line - r.top) / Math.max(1, r.height))));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [sections, progress]);

  return { active, progress };
}

function jump(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  history.replaceState(history.state, '', `#${id}`);
}

/* ── Reading progress ──────────────────────────────────────────────── */

export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-primary origin-left z-[55] pointer-events-none"
      style={{ scaleX, boxShadow: '0 0 8px hsl(var(--primary) / 0.6)' }}
      aria-hidden="true"
    />
  );
}

/* ── Time left ─────────────────────────────────────────────────────── */

function useMinutesLeft(minutes: number): number {
  const { scrollYProgress } = useScroll();
  const [left, setLeft] = useState(minutes);
  useEffect(
    () =>
      scrollYProgress.on('change', (p) => {
        const next = Math.max(0, Math.ceil(minutes * (1 - p)));
        setLeft((prev) => (prev === next ? prev : next));
      }),
    [minutes, scrollYProgress]
  );
  return left;
}

/* ── Desktop rail ──────────────────────────────────────────────────── */

export function CaseContents({ sections, minutes }: { sections: CaseSection[]; minutes: number }) {
  const { active, progress } = useSpy(sections);
  const fill = useSpring(progress, { stiffness: 220, damping: 34, restDelta: 0.001 });
  const left = useMinutesLeft(minutes);
  const activeIndex = sections.findIndex((s) => s.id === active);

  if (sections.length < 2) return null;

  return (
    <nav aria-label="On this page">
      <div className="flex items-baseline justify-between mb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">// Contents</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
          {left > 0 ? `~${left} min left` : 'end'}
        </span>
      </div>
      <ul className="flex flex-col">
        {sections.map((section, i) => {
          const isActive = section.id === active;
          const read = activeIndex > i;
          return (
            <li key={section.id} className="relative">
              {/* Track: read sections full, the current one filling, the rest empty. */}
              <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-border" aria-hidden="true">
                {read && <span className="absolute inset-0 bg-primary/50" />}
                {isActive && <motion.span className="absolute inset-0 bg-primary origin-top" style={{ scaleY: fill }} />}
              </span>
              <a
                href={`#${section.id}`}
                aria-current={isActive ? 'location' : undefined}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  jump(section.id);
                }}
                className={`flex items-baseline gap-2.5 py-1.5 pl-4 transition-colors ${
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className={`font-mono text-[11px] tabular-nums ${isActive ? 'text-primary' : ''}`}>{section.num}</span>
                <span className="font-mono text-[11px] leading-tight">{section.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ── Mobile bar ────────────────────────────────────────────────────── */

export function MobileContents({ sections }: { sections: CaseSection[] }) {
  const { active, progress } = useSpy(sections);
  const fill = useSpring(progress, { stiffness: 220, damping: 34, restDelta: 0.001 });
  const [open, setOpen] = useState(false);
  const prefersReduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const current = sections.find((s) => s.id === active) ?? sections[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  if (sections.length < 2 || !current) return null;

  return (
    <div ref={rootRef} className="lg:hidden sticky top-2 z-40 -mx-2 mb-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`On this page: ${current.label}. Show all sections`}
        className="relative w-full flex items-center gap-3 overflow-hidden bg-card/95 backdrop-blur-xl border border-border px-4 py-3 shadow-2xl"
      >
        <span className="font-mono text-[11px] text-primary tabular-nums">{current.num}</span>
        <span className="flex-1 text-left font-mono text-[12px] uppercase tracking-wider text-foreground truncate">{current.label}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        <motion.span className="absolute left-0 bottom-0 h-[2px] w-full bg-primary origin-left" style={{ scaleX: fill }} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-[calc(100%+4px)] bg-card border border-border shadow-2xl py-1"
          >
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setOpen(false);
                    jump(s.id);
                  }}
                  className={`flex items-baseline gap-3 px-4 py-3 font-mono text-[12px] ${
                    s.id === active ? 'text-foreground bg-primary/[0.06]' : 'text-muted-foreground'
                  }`}
                >
                  <span className="tabular-nums text-primary/80 text-[11px]">{s.num}</span>
                  {s.label}
                </a>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
