import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

import { passageQuestion } from '@/lib/aiStarters';

/* ==========================================================================
   SELECTION → ASK

   Highlight a sentence anywhere in the page's content and a small control
   offers to ask about it. The question is usually "what does that mean?"
   or "where does that number come from?" — and it occurs at the sentence,
   not at the top of the page where the assistant used to live.

   Restraint rules, because a control that appears on every selection is a
   control people learn to hate:

     · only inside <main>, never inside a field, a form, or anything marked
       data-no-ask (the terminal, which has its own selection semantics);
     · only for a selection that is plausibly a passage — a few words up to
       a paragraph — not a stray double-click on one word;
     · gone the moment the selection is, or the page scrolls.

   On touch the chip sits *below* the selection, because the platform's own
   copy/share callout owns the space above it.
   ========================================================================== */

const MIN_CHARS = 12;
const MAX_CHARS = 1200;
const CHIP_HEIGHT = 34;

interface Anchor {
  x: number;
  y: number;
  below: boolean;
  question: string;
}

function eligible(selection: Selection): string | null {
  if (selection.isCollapsed || selection.rangeCount === 0) return null;
  const text = selection.toString();
  const length = text.trim().length;
  if (length < MIN_CHARS || length > MAX_CHARS) return null;

  const node = selection.getRangeAt(0).commonAncestorContainer;
  const el = node instanceof Element ? node : node.parentElement;
  if (!el || !el.closest('#main-content')) return null;
  if (el.closest('input, textarea, select, form, [contenteditable="true"], [data-no-ask]')) return null;
  return text;
}

export default function SelectionAsk({ onAsk, disabled }: { onAsk: (question: string) => void; disabled?: boolean }) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const prefersReduced = useReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const evaluate = useCallback(() => {
    const selection = window.getSelection();
    const text = selection ? eligible(selection) : null;
    const question = text ? passageQuestion(text) : null;
    if (!selection || !question) {
      setAnchor(null);
      return;
    }
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    if (!rect.width && !rect.height) {
      setAnchor(null);
      return;
    }
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    // Flip below when there is no room above, as well as on touch.
    const below = coarse || rect.top < CHIP_HEIGHT + 16;
    const x = Math.min(Math.max(rect.left + rect.width / 2, 90), window.innerWidth - 90);
    const y = below ? rect.bottom + 10 : rect.top - CHIP_HEIGHT - 8;
    setAnchor({ x, y, below, question });
  }, []);

  useEffect(() => {
    /* selectionchange fires continuously while a drag is in progress, so it
       is debounced — the chip appears once the hand stops, rather than
       chasing the cursor across the paragraph. */
    const onSelectionChange = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(evaluate, 220);
    };
    const hide = () => setAnchor(null);

    document.addEventListener('selectionchange', onSelectionChange);
    window.addEventListener('scroll', hide, { passive: true });
    window.addEventListener('resize', hide);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener('selectionchange', onSelectionChange);
      window.removeEventListener('scroll', hide);
      window.removeEventListener('resize', hide);
    };
  }, [evaluate]);

  const visible = anchor && !disabled;

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="selection-ask"
          type="button"
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: anchor.below ? -4 : 4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          // Centred through framer's own x rather than a translate class: motion
          // writes an inline transform, which would silently override it.
          style={{ left: anchor.x, top: anchor.y, height: CHIP_HEIGHT, x: '-50%' }}
          /* mousedown would collapse the selection before click fires, and
             with it the thing being asked about. */
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onAsk(anchor.question);
            window.getSelection()?.removeAllRanges();
            setAnchor(null);
          }}
          className="fixed z-[80] flex items-center gap-2 px-3 bg-card/95 backdrop-blur-md border border-primary/40 text-foreground font-mono text-[11px] uppercase tracking-[0.18em] shadow-2xl hover:border-primary hover:text-primary transition-colors"
          aria-label="Ask the assistant about the selected text"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
          ask about this
        </motion.button>
      )}
    </AnimatePresence>
  );
}
