import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';

/* ==========================================================================
   SECTION SEAM

   The join between two modules, drawn as the trace that connects them.

   The page is built as a system — modules numbered like boards in a rack,
   a circuit under the hero — but the sections met at a bare border, so
   scrolling from one to the next was a cut rather than a hand-off. The seam
   is a hairline that draws itself left to right as the next module comes
   up, with a lit head riding the leading edge: the same packet the hero's
   circuit sends, arriving somewhere.

   Scroll-linked, not time-based. It completes when the boundary reaches the
   middle of the screen and reverses if you scroll back, so it describes
   where you are rather than performing at you. Under reduced motion it is
   a plain, fully drawn rule.
   ========================================================================== */

interface SectionSeamProps {
  /** The module being entered, e.g. "02". */
  index: string;
  /** Its name, lowercase, e.g. "engineering". */
  label: string;
}

export default function SectionSeam({ index, label }: SectionSeamProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 95%', 'start 45%'] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const head = useTransform(progress, (p) => `${p * 100}%`);
  const headOpacity = useTransform(progress, [0, 0.05, 0.95, 1], [0, 1, 1, 0.35]);
  const labelOpacity = useTransform(progress, [0.55, 1], [0, 1]);

  return (
    <div ref={ref} className="relative container px-6 md:px-12 lg:px-24 max-w-7xl mx-auto py-6" aria-hidden="true">
      <div className="relative h-px bg-border/70">
        {prefersReduced ? (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/40 to-primary/20" />
        ) : (
          <>
            <motion.div
              className="absolute inset-0 origin-left bg-gradient-to-r from-transparent via-primary/50 to-primary/80"
              style={{ scaleX: progress }}
            />
            <motion.span
              className="absolute top-1/2 -translate-y-1/2 -ml-[3px] w-[7px] h-[7px] bg-primary"
              style={{ left: head, opacity: headOpacity, boxShadow: '0 0 12px hsl(var(--primary) / 0.8)' }}
            />
          </>
        )}
      </div>
      <motion.div
        className="mt-3 flex justify-end font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70"
        style={prefersReduced ? undefined : { opacity: labelOpacity }}
      >
        <span className="text-primary/70 mr-2">{index}</span>
        {label}
      </motion.div>
    </div>
  );
}
