import React, { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { ArrowRight, Check, ExternalLink, Github } from 'lucide-react';

import TransitionLink from '@/components/ui/TransitionLink';
import { transitionName } from '@/lib/viewTransition';
import { projectStatus } from '@/lib/project';
import type { Project } from '@/types';
import { DESIGN_OUTLINE_MD, StatusText, TierRule, describeDepth, groupByTier, plural } from './tiers';
import ProjectArt from './ProjectArt';
import { depthOf, yearLabel, type Result } from './workModel';

/* ==========================================================================
   PROJECT INDEX

   The monograph's index: every system on one typographic table — number,
   name, status, stack, how deeply it is documented, and year — rows
   divided by hairlines. A list of links rather than a <table>: every row
   navigates, so the row *is* the control, and a screen reader hears
   destinations rather than a grid to traverse cell by cell.

   For a reader who is scanning:

     · Search snippets. A row found by something its case study says shows
       where — "in trade-offs: …chose Redpanda over Kafka…" — with the words
       marked, instead of appearing in the list unexplained.
     · Depth: trade-offs · field notes. The fastest honest signal of which
       write-ups go deep.
     · A preview that follows the pointer (desktop only): the screenshot or
       spec plate, so the row stays one line and the picture is a glance away.
     · Compare: pointing at a row turns its number into a tick box. The tick
       sits beside the link, not inside it — a control inside a link is two
       targets pretending to be one.

   Filtering re-ranks the rows in place — each keeps its identity and moves
   to its new position — rather than the list being redrawn.

   Built work is set solid; design-stage work sits under a dashed rule with
   its name in grey, so "not built" reads before the status does.
   ========================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

/* Declared once and reused by the header — the only way the two line up. */
const COLUMNS =
  'grid grid-cols-[2rem_minmax(0,1fr)_auto] md:grid-cols-[2.75rem_minmax(0,1.7fr)_9.5rem_minmax(0,1fr)_6.5rem_4rem_1rem] gap-x-4 md:gap-x-6 items-baseline';

/** Marks each query word inside a snippet. */
function Highlighted({ text, query }: { text: string; query: string }) {
  const words = query.toLowerCase().trim().split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return <>{text}</>;
  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return (
    <>
      {text.split(pattern).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-primary/20 text-foreground px-px">
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

const IndexHeader = () => (
  <div className={`${COLUMNS} pb-3 t-caption`} aria-hidden="true">
    <span>No.</span>
    <span>Project</span>
    <span className="hidden md:block">Status</span>
    <span className="hidden md:block">Built with</span>
    <span className="hidden md:block text-right" title="Trade-offs and debugging stories in the write-up">
      Write-up
    </span>
    <span className="hidden md:block text-right">Year</span>
    <span className="hidden md:block" />
  </div>
);

/* ── Row ─────────────────────────────────────────────────────────────── */

interface RowProps {
  result: Result;
  folio: number;
  query: string;
  compared: boolean;
  compareFull: boolean;
  onCompare: (id: string) => void;
}

const IndexRow = ({ result, folio, query, compared, compareFull, onCompare }: RowProps) => {
  const { project, hit } = result;
  const status = projectStatus(project);
  const depth = depthOf(project);
  const prefersReduced = useReducedMotion();
  const isDesign = project.tier === 'design';
  // The flagship plates above own the shared-element names for flagships; a
  // name used twice on one page cancels the transition for both.
  const named = project.tier !== 'flagship';

  return (
    <motion.li
      layout={prefersReduced ? false : 'position'}
      initial={prefersReduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={prefersReduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, transition: { duration: 0.15 } }}
      transition={{ layout: { duration: 0.55, ease: EASE }, opacity: { duration: 0.35 } }}
      className={`group/row relative border-t ${isDesign ? 'border-dashed border-rule-strong' : 'border-border'}`}
      data-preview={project.id}
    >
      <TransitionLink to={`/projects/${project.id}`} className={`${COLUMNS} group relative py-5 md:py-6`}>
        <span
          className={`t-folio transition-opacity duration-300 ${compared ? 'md:opacity-0' : 'md:group-hover/row:opacity-0'}`}
          aria-hidden="true"
        >
          {String(folio).padStart(2, '0')}
        </span>

        <span className="min-w-0">
          <span
            /* Titles wrap on a phone rather than being cut; a design study's
               title is drawn in outline and inks in when pointed at. */
            className={`block w-fit max-w-full t-subhead md:truncate transition-[transform,color] duration-500 ease-out-expo group-hover:translate-x-1 ${
              isDesign ? `${DESIGN_OUTLINE_MD} group-hover:text-foreground md:group-hover:text-foreground md:group-hover:[-webkit-text-stroke:0]` : 'text-foreground'
            }`}
            style={named ? { viewTransitionName: transitionName('title', project.id) } : undefined}
          >
            {project.title}
          </span>
          {hit?.snippet ? (
            <span className="block t-caption mt-1.5 line-clamp-2">
              <span className="text-foreground mr-1.5">in {hit.field}:</span>
              <Highlighted text={hit.snippet} query={query} />
            </span>
          ) : (
            <span className="block t-caption md:truncate mt-1 group-hover:text-foreground transition-colors duration-300">
              {project.subtitle}
            </span>
          )}
        </span>

        <span className="text-[13px] justify-self-end md:justify-self-start whitespace-nowrap">
          <StatusText status={status} className={status === 'design' ? '' : 'group-hover:text-foreground transition-colors duration-300'} />
        </span>

        <span className="hidden md:block text-[13px] text-muted-foreground truncate group-hover:text-foreground transition-colors duration-300">
          {project.stack.length ? project.stack.slice(0, 3).join(' · ') : 'Not built yet'}
        </span>

        <span
          className="hidden md:block text-right text-[13px] text-muted-foreground tabular-nums group-hover:text-foreground transition-colors duration-300"
          title={describeDepth(depth.tradeoffs, depth.fieldNotes)}
        >
          {/* Spelled out, two short lines, so the column needs no legend. */}
          {depth.tradeoffs || depth.fieldNotes ? (
            <>
              <span className="sr-only">{describeDepth(depth.tradeoffs, depth.fieldNotes)}</span>
              <span aria-hidden="true" className="flex flex-col leading-[1.45]">
                {depth.tradeoffs > 0 && <span>{plural(depth.tradeoffs, 'trade-off')}</span>}
                {depth.fieldNotes > 0 && <span>{plural(depth.fieldNotes, 'bug')}</span>}
              </span>
            </>
          ) : (
            <span className="text-muted-quiet">Summary only</span>
          )}
        </span>

        <span className="hidden md:block text-right text-[13px] text-muted-foreground tabular-nums whitespace-nowrap group-hover:text-foreground transition-colors duration-300">
          {yearLabel(project.timeline)}
        </span>

        <ArrowRight
          className="nudge hidden md:block w-4 h-4 self-center text-muted-quiet group-hover:text-foreground transition-colors"
          aria-hidden="true"
        />
      </TransitionLink>

      {/* Compare: takes the number's place while the row is pointed at. */}
      <button
        type="button"
        role="checkbox"
        aria-checked={compared}
        aria-label={`Compare ${project.title}`}
        disabled={!compared && compareFull}
        onClick={() => onCompare(project.id)}
        title={!compared && compareFull ? 'You can compare three at a time' : 'Add to compare'}
        className={`hidden md:flex absolute left-0 top-[1.85rem] w-4 h-4 items-center justify-center transition-all duration-300 disabled:cursor-not-allowed ${
          compared
            ? 'opacity-100 bg-primary text-primary-foreground'
            : 'opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 shadow-[inset_0_0_0_1px_hsl(var(--muted-foreground))] hover:shadow-[inset_0_0_0_1px_hsl(var(--foreground))] disabled:opacity-0'
        }`}
      >
        {compared && <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" />}
      </button>
    </motion.li>
  );
};

/* ── Cursor preview ──────────────────────────────────────────────────── */

function useFinePointer(): boolean {
  const query = '(hover: hover) and (pointer: fine) and (min-width: 1024px)';
  const [fine, setFine] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setFine(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return fine;
}

const PREVIEW_W = 300;

/*
   Which row the preview shows is read from what is under the pointer, never
   remembered from enter/leave events. Those were the source of a preview
   that followed the cursor out of the section: a leave never fires when
   the page scrolls the list out from under a still mouse, or when a filter
   removes the row beneath it — and the preview is `position: fixed`, so it
   stayed beside the cursor over whatever came next. Now every pointer
   move asks which row (if any) the pointer is over; a scroll, or a change
   to the list, asks again at the last known position; leaving the window
   or losing focus clears it. There is no state that can go stale.
*/
function CursorPreview({ rootRef, projects }: { rootRef: RefObject<HTMLElement | null>; projects: Map<string, Project> }) {
  const prefersReduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.5 });
  const [id, setId] = useState<string | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);

  /* Positioned from the pointer, written to motion values — the preview
     moves every frame the mouse does, and none of it goes through React. It
     flips to the cursor's left near the right edge so it never clips. The
     row under the pointer does go through React, but only when it changes. */
  useEffect(() => {
    const rowAt = (target: EventTarget | null) => {
      const row = target instanceof Element ? target.closest('[data-preview]') : null;
      return row && rootRef.current?.contains(row) ? row.getAttribute('data-preview') : null;
    };
    const place = (cx: number, cy: number) => {
      const flip = cx + PREVIEW_W + 40 > window.innerWidth;
      x.set(flip ? cx - PREVIEW_W - 24 : cx + 24);
      y.set(Math.min(cy - 60, window.innerHeight - 260));
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      pointer.current = { x: e.clientX, y: e.clientY };
      place(e.clientX, e.clientY);
      setId(rowAt(e.target));
    };
    // After a scroll, the content under a still pointer has changed.
    let frame = 0;
    const onScroll = () => {
      if (frame || !pointer.current) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const p = pointer.current;
        if (p) setId(rowAt(document.elementFromPoint(p.x, p.y)));
      });
    };
    const clear = () => {
      pointer.current = null;
      setId(null);
    };
    // Out of the window: relatedTarget is null when the pointer left the document.
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) clear();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    document.addEventListener('pointerout', onOut);
    window.addEventListener('blur', clear);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll, { capture: true });
      document.removeEventListener('pointerout', onOut);
      window.removeEventListener('blur', clear);
    };
  }, [x, y, rootRef]);

  /* A filter or sort can move or remove the row under a resting pointer.
     Ask again once the list has laid out. */
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const p = pointer.current;
      if (!p) return;
      const row = document.elementFromPoint(p.x, p.y)?.closest('[data-preview]');
      setId(row && rootRef.current?.contains(row) ? row.getAttribute('data-preview') : null);
    });
    return () => cancelAnimationFrame(frame);
  }, [projects, rootRef]);

  const project = id ? projects.get(id) ?? null : null;

  return (
    <motion.div
      className="fixed left-0 top-0 z-30 pointer-events-none"
      style={{ x: prefersReduced ? x : sx, y: prefersReduced ? y : sy, width: PREVIEW_W }}
      aria-hidden="true"
    >
      {/* Overlapping crossfade rather than mode="wait": "wait" queues each
          card behind the last one's exit, and a quick run of rows could
          leave a stale card mounted. */}
      <AnimatePresence initial={false}>
        {project && (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, scale: 0.94, rotate: prefersReduced ? 0 : -1.5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute left-0 top-0 w-full bg-card shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)]"
          >
            <ProjectArt project={project} compact className="aspect-[16/10]" />
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="t-caption truncate">{project.category}</span>
              <span className="t-caption text-foreground shrink-0">Open →</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Index ───────────────────────────────────────────────────────────── */

interface ProjectIndexProps {
  results: Result[];
  query: string;
  /** False when the list is not in tier order, or one tier is filtered. */
  grouped?: boolean;
  compare: string[];
  onCompare: (id: string) => void;
  compareMax: number;
}

export default function ProjectIndex({ results, query, grouped = true, compare, onCompare, compareMax }: ProjectIndexProps) {
  const fine = useFinePointer();
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  // Stable between renders unless the list itself changes — the preview
  // re-checks what is under the pointer whenever it does.
  const projectsById = useMemo(() => new Map(results.map((r) => [r.project.id, r.project])), [results]);

  if (!results.length) return null;

  /* One flat, keyed list of sub-heads and rows. AnimatePresence only sees
     its direct children, and a Fragment per group hid every row inside it —
     so rows filtered out simply vanished instead of leaving. */
  const byId = new Map(results.map((r) => [r.project.id, r]));
  const items: React.ReactNode[] = [];
  let folio = 0;
  for (const group of grouped ? groupByTier(results.map((r) => r.project)) : [{ tier: '', items: results.map((r) => r.project) }]) {
    if (grouped && group.tier) {
      items.push(
        <motion.li
          layout={prefersReduced ? false : 'position'}
          key={`rule-${group.tier}`}
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ layout: { duration: 0.55, ease: EASE } }}
          className="pt-12 first:pt-2 pb-4"
        >
          <TierRule tier={group.tier} count={group.items.length} />
        </motion.li>
      );
    }
    for (const project of group.items) {
      items.push(
        <IndexRow
          key={project.id}
          result={byId.get(project.id)!}
          folio={++folio}
          query={query}
          compared={compare.includes(project.id)}
          compareFull={compare.length >= compareMax}
          onCompare={onCompare}
        />
      );
    }
  }

  return (
    <div ref={rootRef}>
      <IndexHeader />
      {/* No closing rule: the totals line under the last row closes the
          table, and the next section opens on its own rule. Two hairlines a
          section apart read as a missing row. */}
      <ul>
        <AnimatePresence initial={false}>{items}</AnimatePresence>
      </ul>

      {/* External links deliberately stay out of the rows: a row's job is to
          open the case study. The totals are here instead. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 pt-5 t-caption">
        <span className="tabular-nums">{results.length} shown</span>
        <span className="flex items-center gap-1.5">
          <Github className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="tabular-nums">{results.filter((r) => r.project.github).length}</span> with public code
        </span>
        <span className="flex items-center gap-1.5">
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="tabular-nums">{results.filter((r) => r.project.liveUrl).length}</span> live
        </span>
        <span className="hidden md:inline ml-auto">
          Hover a row's number to compare up to {plural(compareMax, 'project')}
        </span>
      </div>

      {fine && <CursorPreview rootRef={rootRef} projects={projectsById} />}
    </div>
  );
}
