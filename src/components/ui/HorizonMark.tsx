import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils';

/* ==========================================================================
   HORIZON MARK

   The hero's black hole, drawn as a few lines rather than ray-traced: a
   shadow, the bright ring around it, and the accretion disk as a tilted
   ellipse crossing in front. Used where the site has to say "something is
   missing" (the 404 and the error page), so those pages read as part of the
   same place as the first screen instead of a generic fallback.

   Plain SVG, so it costs nothing and cannot itself be the thing that breaks
   on a page whose job is to survive breakage. The ring turns slowly; under
   reduced motion it holds still. `broken` opens a gap in the ring.
   Strokes do not scale, so drawn large it stays a set of hairlines.
   ========================================================================== */

interface HorizonMarkProps {
  className?: string;
  /** Leaves a gap in the ring: the error page's variant. */
  broken?: boolean;
}

export default function HorizonMark({ className, broken = false }: HorizonMarkProps) {
  const reduced = useReducedMotion();
  const id = useId().replace(/:/g, '');

  return (
    <svg viewBox="0 0 400 400" className={cn('block', className)} aria-hidden="true">
      <defs>
        <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
          <stop offset="55%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
        </linearGradient>
        <radialGradient id={`halo-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="hsl(var(--primary))" stopOpacity="0.10" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft light around the hole. */}
      <circle cx="200" cy="200" r="190" fill={`url(#halo-${id})`} />

      {/* Back half of the disk, behind the shadow. */}
      <ellipse cx="200" cy="200" rx="185" ry="34" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.28" strokeWidth="1"
        vectorEffect="non-scaling-stroke" transform="rotate(-12 200 200)" />

      {/* The shadow. */}
      <circle cx="200" cy="200" r="92" fill="hsl(var(--background))" />

      {/* The far side of the disk, bent up over the shadow by its gravity:
          the arc that makes this read as a black hole and not a planet. */}
      <path
        d="M 82 206 A 120 112 0 0 1 318 194"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeOpacity="0.45"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        transform="rotate(-12 200 200)"
      />

      {/* The photon ring, turning. */}
      <motion.g
        style={{ transformOrigin: '200px 200px' }}
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}
      >
        <circle
          cx="200"
          cy="200"
          r="96"
          fill="none"
          stroke={`url(#ring-${id})`}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          strokeDasharray={broken ? '470 133' : undefined}
          strokeLinecap="round"
        />
      </motion.g>

      {/* Front half of the disk, crossing in front of the shadow. */}
      <path
        d="M 15 200 A 185 34 0 0 0 385 200"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeOpacity="0.75"
        strokeWidth="1.25"
        vectorEffect="non-scaling-stroke"
        transform="rotate(-12 200 200)"
      />
    </svg>
  );
}
