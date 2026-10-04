import { useEffect } from 'react';

import { takeHighlight, type PendingHighlight } from '@/lib/aiActions';
import { scrollToY } from '@/lib/smoothScroll';

/* ==========================================================================
   HIGHLIGHT ON ARRIVAL

   When a citation or an offered action opens a case study at a section,
   possibly with the sentence it leaned on, the page shows where: it scrolls
   the sentence (or the section) into view and marks it in amber, the
   site's "live" colour, for a few seconds, then lets go. The mark clears
   early if the reader scrolls away from it.

   The sentence is marked with the CSS Custom Highlight API, which paints a
   range without touching the DOM. Where that is missing, or the sentence
   cannot be found, the containing block gets a short amber outline pulse
   instead (no pulse under reduced motion: the outline simply stays, then
   goes).
   ========================================================================== */

const HIGHLIGHT_NAME = 'ai-quote';
const PULSE_CLASS = 'ai-section-pulse';
const HOLD_MS = 6000;

/* ── Locating a quote ───────────────────────────────────────────────── */

const fold = (ch: string) => {
  if (/[‘’‛′]/.test(ch)) return "'";
  if (/[“”‟″]/.test(ch)) return '"';
  if (/[‐-―−]/.test(ch)) return '-';
  return ch.toLowerCase();
};

/** Folds case, quotes, dashes and runs of whitespace; `map[i]` is the original index of folded char i. */
function normalize(text: string): { text: string; map: number[] } {
  let out = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      if (out.length && out[out.length - 1] !== ' ') {
        out += ' ';
        map.push(i);
      }
      continue;
    }
    out += fold(ch);
    map.push(i);
  }
  return { text: out, map };
}

/**
 * Where `quote` sits in `haystack`, forgiving case, curly quotes, dashes
 * and whitespace. A quote the model trimmed or ended differently still lands
 * on its opening words (the first eight, then the first five).
 */
export function locateQuote(haystack: string, quote: string): { start: number; end: number } | null {
  const hay = normalize(haystack);
  const needle = normalize(quote.trim().replace(/^["'“‘]+|["'”’.…]+$/g, '')).text.trim();
  if (needle.length < 4) return null;
  const words = needle.split(' ');
  // A prefix ends at a word, never on the punctuation after it ("step," still finds "step —").
  const prefix = (n: number) => words.slice(0, n).join(' ').replace(/[,.;:!?]+$/, '');
  const attempts = [needle, prefix(8), prefix(5)].filter(
    (n, i, all) => n.length >= 12 && all.indexOf(n) === i
  );
  if (!attempts.length) attempts.push(needle);
  for (const n of attempts) {
    const at = hay.text.indexOf(n);
    if (at >= 0) return { start: hay.map[at], end: hay.map[at + n.length - 1] + 1 };
  }
  return null;
}

/** The DOM range of `quote` inside `root`, across text nodes. */
export function findQuoteRange(root: Element, quote: string): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let text = '';
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    nodes.push(node as Text);
    text += (node as Text).data;
  }
  const found = locateQuote(text, quote);
  if (!found) return null;

  const at = (offset: number, isEnd: boolean): [Text, number] | null => {
    let seen = 0;
    for (const node of nodes) {
      const len = node.data.length;
      if (offset < seen + len || (isEnd && offset === seen + len)) return [node, offset - seen];
      seen += len;
    }
    return null;
  };
  const start = at(found.start, false);
  const end = at(found.end, true);
  if (!start || !end) return null;
  const range = document.createRange();
  range.setStart(start[0], start[1]);
  range.setEnd(end[0], end[1]);
  return range;
}

/* ── Showing it ─────────────────────────────────────────────────────── */

type HighlightRegistry = { set(name: string, value: unknown): void; delete(name: string): void };
const registry = (): HighlightRegistry | null => {
  const css = (globalThis as { CSS?: { highlights?: HighlightRegistry } }).CSS;
  const Ctor = (globalThis as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;
  return css?.highlights && Ctor ? css.highlights : null;
};

async function whenPresent(find: () => Element | null, timeoutMs = 2500): Promise<Element | null> {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    const el = find();
    if (el) return el;
    await new Promise((r) => setTimeout(r, 80));
  }
  return null;
}

/** Shows one pending highlight; returns a function that clears it. */
async function show(pending: PendingHighlight, signal: { cancelled: boolean }): Promise<() => void> {
  const noop = () => {};
  const section = pending.section
    ? await whenPresent(() => document.getElementById(pending.section!))
    : null;
  if (signal.cancelled) return noop;
  const scope = section ?? document.getElementById('main-content');
  if (!scope) return noop;

  const range = pending.quote ? findQuoteRange(scope, pending.quote) : null;
  if (!range && !section) return noop;

  // Into view: the sentence a third of the way down, or the section's top under the running head.
  const rect = range ? range.getBoundingClientRect() : section!.getBoundingClientRect();
  const top = range ? rect.top + window.scrollY - window.innerHeight / 3 : rect.top + window.scrollY - 96;
  scrollToY(Math.max(0, top));

  const reg = registry();
  let target: Element;
  if (range && reg) {
    const Ctor = (globalThis as unknown as { Highlight: new (...ranges: Range[]) => unknown }).Highlight;
    reg.set(HIGHLIGHT_NAME, new Ctor(range));
    target = range.startContainer.parentElement ?? scope;
  } else {
    // The containing block of the sentence, or the section itself.
    target = (range?.startContainer.parentElement?.closest('p, li, blockquote, figure, h3') as Element | null) ?? section ?? scope;
    target.classList.add(PULSE_CLASS);
  }

  let done = false;
  const clear = () => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    window.removeEventListener('scroll', onScroll);
    if (range && reg) reg.delete(HIGHLIGHT_NAME);
    target.classList.remove(PULSE_CLASS);
  };
  const timer = window.setTimeout(clear, HOLD_MS);

  // Let go early once the reader scrolls it out of view; not during the
  // scroll that brought it in (up to about 1.6s with Lenis).
  const armedAt = performance.now() + 1800;
  const onScroll = () => {
    if (performance.now() < armedAt) return;
    const r = target.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) clear();
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return clear;
}

/**
 * Case-study pages call this with their project id: it shows a highlight
 * left by the assistant on arrival, and again whenever one is raised while
 * already on the page ('emc:ai-highlight').
 */
export function useArrivalHighlight(projectId: string | undefined): void {
  useEffect(() => {
    if (!projectId) return;
    const signal = { cancelled: false };
    let clear: () => void = () => {};

    const run = () => {
      const pending = takeHighlight(projectId);
      if (!pending) return;
      clear();
      void show(pending, signal).then((fn) => {
        if (signal.cancelled) fn();
        else clear = fn;
      });
    };

    // After the page's own arrival scroll (a frame) has run.
    const t = window.setTimeout(run, 120);
    window.addEventListener('emc:ai-highlight', run);
    return () => {
      signal.cancelled = true;
      window.clearTimeout(t);
      window.removeEventListener('emc:ai-highlight', run);
      clear();
    };
  }, [projectId]);
}
