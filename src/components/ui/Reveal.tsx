import { Children, isValidElement, type ElementType, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils';

/* ==========================================================================
   REVEALS

   The monograph's three entrances, and the only ones on the site:

     RevealText   a title rises into place word by word from behind its own
                  baseline, as type set on a page that is being turned to
     Reveal       a block settles up a few pixels and in
     Plate        an image is uncovered top to bottom while the picture
                  inside it settles from a slight enlargement

   Each runs once, when the element first crosses into view, and never
   again. Under reduced motion all three render their final state with no
   transition at all — not a faster animation, none.

   Content is in the DOM and readable by assistive tech from the start; only
   its paint is staged.
   ========================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

/** Where on the screen an entrance triggers: a little above the bottom edge. */
const VIEWPORT = { once: true, margin: '0px 0px -12% 0px' } as const;

/* ── RevealText ─────────────────────────────────────────────────────────── */

interface RevealTextProps {
  /** Plain text, split on spaces. Inline elements are kept whole. */
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Seconds before the first word moves. */
  delay?: number;
  /** Seconds between words. */
  stagger?: number;
  id?: string;
}

/** Splits text children into words, keeping any element child as one unit. */
function toUnits(children: ReactNode): ReactNode[] {
  const units: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      String(child)
        .split(/(\s+)/)
        .filter((part) => part.length > 0 && !/^\s+$/.test(part))
        .forEach((word) => units.push(word));
    } else if (isValidElement(child)) {
      units.push(child);
    }
  });
  return units;
}

export function RevealText({ children, as = 'span', className, delay = 0, stagger = 0.045, id }: RevealTextProps) {
  const reduced = useReducedMotion();
  const Tag = as;

  if (reduced) {
    return (
      <Tag id={id} className={className}>
        {children}
      </Tag>
    );
  }

  const units = toUnits(children);
  return (
    <Tag id={id} className={className}>
      {/* The words are read as one string, not one word at a time. */}
      <motion.span
        className="inline"
        initial="hidden"
        whileInView="shown"
        viewport={VIEWPORT}
        transition={{ staggerChildren: stagger, delayChildren: delay }}
      >
        {units.map((unit, i) => (
          <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
            <motion.span
              className="inline-block will-change-transform"
              variants={{
                hidden: { y: '105%' },
                shown: { y: '0%', transition: { duration: 0.95, ease: EASE } },
              }}
            >
              {unit}
            </motion.span>
            {i < units.length - 1 ? ' ' : null}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}

/* ── Reveal ──────────────────────────────────────────────────────────────── */

interface RevealProps {
  children: ReactNode;
  as?: 'div' | 'section' | 'li' | 'p' | 'figure' | 'article' | 'header' | 'footer' | 'span';
  className?: string;
  delay?: number;
  /** Pixels travelled. Small on purpose: arrival, not flight. */
  y?: number;
}

export function Reveal({ children, as = 'div', className, delay = 0, y = 14 }: RevealProps) {
  const reduced = useReducedMotion();
  const Tag = motion[as];

  if (reduced) {
    const Static = as;
    return <Static className={className}>{children}</Static>;
  }

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
}

/* ── Rule ────────────────────────────────────────────────────────────────── */

/** A hairline that draws itself across the measure, left to right. */
export function Rule({ className, delay = 0 }: { className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={cn('rule', className)} aria-hidden="true" />;
  return (
    <motion.div
      aria-hidden="true"
      className={cn('rule origin-left', className)}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={VIEWPORT}
      transition={{ duration: 1.4, delay, ease: EASE }}
    />
  );
}

/* ── Plate ───────────────────────────────────────────────────────────────── */

interface PlateProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** CSS aspect-ratio, e.g. "16 / 10". */
  aspect?: string;
  loading?: 'lazy' | 'eager';
  /** For a shared-element view transition into a case study. */
  viewTransitionName?: string;
  delay?: number;
  sizes?: string;
}

export function Plate({
  src,
  alt,
  className,
  imgClassName,
  aspect = '16 / 10',
  loading = 'lazy',
  viewTransitionName,
  delay = 0,
}: PlateProps) {
  const reduced = useReducedMotion();

  const img = (
    <motion.img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      className={cn('block w-full h-full object-cover object-top', imgClassName)}
      style={viewTransitionName ? { viewTransitionName } : undefined}
      initial={reduced ? false : { scale: 1.08 }}
      whileInView={reduced ? undefined : { scale: 1 }}
      viewport={VIEWPORT}
      transition={{ duration: 1.6, delay, ease: EASE }}
    />
  );

  if (reduced) {
    return (
      <div className={cn('plate', className)} style={{ aspectRatio: aspect }}>
        {img}
      </div>
    );
  }

  return (
    <motion.div
      className={cn('plate', className)}
      style={{ aspectRatio: aspect }}
      initial={{ clipPath: 'inset(0% 0% 100% 0%)' }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      viewport={VIEWPORT}
      transition={{ duration: 1.25, delay, ease: [0.77, 0, 0.18, 1] }}
    >
      {img}
    </motion.div>
  );
}

/* ── SectionHead ─────────────────────────────────────────────────────────── */

interface SectionHeadProps {
  /** The section's title — its h2. */
  title: ReactNode;
  /** Optional opening paragraph, set as a lede beside or under the title. */
  lede?: ReactNode;
  /** Optional quiet content on the right of the rule line — a count, a link. */
  aside?: ReactNode;
  id?: string;
  className?: string;
}

/**
 * A section opening, monograph-style: a hairline drawn across the measure,
 * the title rising under it, and the lede in the right-hand columns. No
 * eyebrow, no number — the title carries itself.
 */
export function SectionHead({ title, lede, aside, id, className }: SectionHeadProps) {
  return (
    <header className={cn('relative', className)}>
      <div className="flex items-center justify-between gap-6 mb-10 md:mb-14">
        <Rule className="flex-1" />
        {aside && <Reveal className="shrink-0 t-caption" delay={0.3} y={0}>{aside}</Reveal>}
      </div>
      <div className="grid grid-cols-12 gap-x-6 gap-y-8">
        <RevealText as="h2" id={id} className="t-title col-span-12 lg:col-span-6 xl:col-span-5">
          {title}
        </RevealText>
        {lede && (
          <Reveal className="col-span-12 md:col-span-10 lg:col-span-5 lg:col-start-8 t-lede text-muted-foreground lg:pt-2" delay={0.15}>
            {lede}
          </Reveal>
        )}
      </div>
    </header>
  );
}
