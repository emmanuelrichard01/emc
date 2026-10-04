import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

import type { CiteRef } from '@/lib/aiAnswer';
import { runAction } from '@/lib/aiActions';
import { citationExcerpt, citationLabel, citationTitle } from './answerModel';

/* ==========================================================================
   CITATION

   A numbered chip straight after the claim it supports. Pointing at it (or
   focusing it) shows where it points: the project and section, and the
   first line of that passage, taken from the site's data. Pressing it goes
   there, and the case study marks the section on arrival.

   The card is drawn in a portal at fixed coordinates rather than inside the
   chip, because answers live in scrolling panels that would clip it, and it
   keeps itself inside the viewport with a 12px margin.
   ========================================================================== */

export type Register = 'reading' | 'terminal';

function citationAction(ref: CiteRef) {
  return ref.kind === 'project'
    ? ({ kind: 'open-case', label: citationTitle(ref), id: ref.id, ...(ref.section ? { section: ref.section } : {}) } as const)
    : ({ kind: 'open-role', label: citationTitle(ref), id: ref.id } as const);
}

const CARD_W = 272;

export function Citation({ cite, n, register }: { cite: CiteRef; n: number; register: Register }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const cardId = useId();
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const place = () => {
      const r = ref.current!.getBoundingClientRect();
      const left = Math.min(Math.max(12, r.left + r.width / 2 - CARD_W / 2), window.innerWidth - CARD_W - 12);
      const above = r.top > 160;
      setPos({ left, top: above ? r.top - 8 : r.bottom + 8, above });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  const show = () => {
    clearTimeout(hideTimer.current);
    setOpen(true);
  };
  const hide = () => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setOpen(false), 120);
  };

  const label = citationLabel(cite, n);
  const excerpt = open ? citationExcerpt(cite) : '';

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => {
          setOpen(false);
          void runAction(citationAction(cite), navigate);
        }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        aria-label={label}
        aria-describedby={open ? cardId : undefined}
        className={
          register === 'terminal'
            ? 'ai-cite-terminal mx-px align-baseline font-mono text-[0.85em] text-primary/80 hover:text-primary focus-visible:text-primary transition-colors'
            : 'ai-cite relative -top-[0.45em] mx-[2px] inline-flex items-center justify-center min-w-[1.35em] h-[1.35em] px-[0.3em] text-[0.68em] leading-none tabular-nums text-muted-foreground shadow-[inset_0_0_0_1px_hsl(var(--rule-strong))] hover:text-primary hover:shadow-[inset_0_0_0_1px_hsl(var(--primary))] focus-visible:text-primary transition-colors'
        }
      >
        {register === 'terminal' ? `[${n}]` : n}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            id={cardId}
            role="tooltip"
            onMouseEnter={show}
            onMouseLeave={hide}
            style={{ left: pos.left, top: pos.top, width: CARD_W, transform: pos.above ? 'translateY(-100%)' : undefined }}
            className="fixed z-[120] bg-popover px-4 py-3 shadow-[0_0_0_1px_hsl(var(--border)),0_18px_48px_-16px_rgba(0,0,0,0.85)] text-left font-sans"
          >
            <p className="flex items-center gap-1.5 text-[12px] text-foreground">
              <span className="t-folio text-primary">{n}</span>
              <span className="truncate">{citationTitle(cite)}</span>
              <ArrowUpRight className="w-3 h-3 ml-auto shrink-0 text-muted-foreground" aria-hidden="true" />
            </p>
            {excerpt && <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">{excerpt}</p>}
            <p className="mt-2 text-[11.5px] text-muted-quiet">Opens this part of the site</p>
          </div>,
          document.body
        )}
    </>
  );
}
