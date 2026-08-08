import React, { useEffect, useState } from 'react';

/* ==========================================================================
   CASE STUDY CONTENTS

   A sticky table of contents with scroll-spy.

   These pages run four or five sections of real writing and previously
   offered no way to see the shape of one or move around inside it — you
   scrolled, or you did not read it. For the reader these pages are written
   for, a recruiter or engineer skimming for the trade-offs, that is the
   difference between finding the best part of the page and missing it.

   Spy is IntersectionObserver used as a *trigger* only, with the decision
   made by measuring live geometry — the same approach the nav's section
   observer takes, and for the same reason: intersectionRatio is relative to
   each target's own height, so a long section that fills the viewport scores
   lower than a short one clipping it, and comparing entries directly picks
   the wrong heading.
   ========================================================================== */

export interface CaseStudySection {
  id: string;
  num: string;
  label: string;
}

/** Fraction of the viewport that counts as "being read". */
const BAND_TOP = 0.12;
const BAND_BOTTOM = 0.5;

export default function CaseStudyNav({ sections }: { sections: CaseStudySection[] }) {
  const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);

  useEffect(() => {
    if (!sections.length) return;

    const pick = () => {
      const top = window.innerHeight * BAND_TOP;
      const bottom = window.innerHeight * BAND_BOTTOM;

      let bestId: string | null = null;
      let bestOverlap = 0;

      for (const section of sections) {
        const el = document.getElementById(section.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const overlap = Math.min(rect.bottom, bottom) - Math.max(rect.top, top);
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestId = section.id;
        }
      }

      // Nothing occupies the band at the very top or bottom of the document;
      // holding the previous value there stops the marker flickering at both
      // ends of every scroll.
      if (bestId) setActive(bestId);
    };

    const observer = new IntersectionObserver(pick, {
      rootMargin: `-${BAND_TOP * 100}% 0px -${(1 - BAND_BOTTOM) * 100}% 0px`,
      threshold: 0,
    });

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    pick();
    window.addEventListener('resize', pick, { passive: true });
    return () => {
      window.removeEventListener('resize', pick);
      observer.disconnect();
    };
  }, [sections]);

  if (sections.length < 2) return null;

  return (
    <nav aria-label="On this page">
      <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-3">
        // Contents
      </span>

      <ul className="flex flex-col">
        {sections.map((section) => {
          const isActive = active === section.id;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={isActive ? 'true' : undefined}
                className={`flex items-baseline gap-2.5 py-1.5 border-l-2 pl-3 -ml-px transition-colors ${
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                }`}
              >
                <span className="font-mono text-[9px] tabular-nums text-muted-foreground">{section.num}</span>
                <span className="font-mono text-[11px] leading-tight">{section.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
