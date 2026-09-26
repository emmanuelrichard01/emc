import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { ArrowRight, Check, ExternalLink, Github } from 'lucide-react';

import TransitionLink from '@/components/ui/TransitionLink';
import { transitionName } from '@/lib/viewTransition';
import { STATUS_CLASS, STATUS_LABEL, projectStatus } from '@/lib/project';
import type { Project } from '@/types';
import { TierRule, groupByTier } from './tiers';
import ProjectArt from './ProjectArt';
import { depthOf, yearLabel, type Result } from './workModel';

/* ==========================================================================
   PROJECT INDEX

   The scannable view, in the terminal's language — close to what `ls`
   prints in the hero, so the section and the shell above it read as one
   site. A list of links rather than a <table>: every row navigates, so the
   row *is* the control, and a screen reader hears destinations rather than
   a grid to traverse cell by cell.

   What this pass added, each for a reader who is scanning:

     · Search snippets. A row found by something its case study says shows
       where — "trade-offs: …chose Redpanda over Kafka…" — with the words
       marked, instead of appearing in the list unexplained.
     · A depth column: how many trade-offs and field notes the write-up
       carries. The fastest honest signal of which case studies go deep.
     · A preview that follows the pointer (desktop only): the screenshot or
       spec sheet, so the row can stay one line and the picture is still one
       glance away.
     · Compare toggles, sitting beside the row rather than inside it — a
       control inside a link is two targets pretending to be one.

   CONTRAST
   Every piece of text here is at full token opacity; quiet is done with
   size and tracking, never with alpha (muted at 40% measures 1.76:1).
   ========================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

/* Declared once and reused by the header — the only way the two can be
   guaranteed to line up. */
const COLUMNS =
  'grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1.8fr)_6.5rem_minmax(0,1fr)_3.5rem_3.5rem_1rem] gap-x-5 items-baseline';

/** Marks each query word inside a snippet. */
function Highlighted({ text, query }: { text: string; query: string }) {
  const words = query.toLowerCase().trim().split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return <>{text}</>;
  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return (
    <>
      {text.split(pattern).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-primary/15 text-foreground px-px">
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
  <div
    className={`${COLUMNS} pl-4 md:pl-11 pr-4 pt-4 pb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground`}
    aria-hidden="true"
  >
    <span>system</span>
    <span className="hidden md:block">status</span>
    <span className="hidden md:block">stack</span>
    <span className="hidden md:block text-right" title="trade-offs · field notes documented">depth</span>
    <span className="hidden md:block text-right">year</span>
    <span className="hidden md:block" />
  </div>
);

/* ── Row ─────────────────────────────────────────────────────────────── */

interface RowProps {
  result: Result;
  index: number;
  query: string;
  compared: boolean;
  compareFull: boolean;
  onCompare: (id: string) => void;
  onHover: (project: Project | null) => void;
}

const IndexRow = ({ result, index, query, compared, compareFull, onCompare, onHover }: RowProps) => {
  const { project, hit } = result;
  const status = projectStatus(project);
  const depth = depthOf(project);
  const prefersReduced = useReducedMotion();
  // The flagship stage above owns the shared-element names for flagships; a
  // name used twice on one page cancels the transition for both.
  const named = project.tier !== 'flagship';

  return (
    <motion.li
      layout={prefersReduced ? false : 'position'}
      initial={prefersReduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.18), ease: EASE }}
      className="group/row relative border-b border-border/60 last:border-b-0"
      onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(project)}
      onPointerLeave={() => onHover(null)}
    >
      <TransitionLink
        to={`/projects/${project.id}`}
        onFocus={() => onHover(null)}
        className={`${COLUMNS} group relative pl-4 md:pl-11 pr-4 py-3.5 hover:bg-primary/[0.045] focus-visible:bg-primary/[0.07] transition-colors ${
          compared ? 'bg-primary/[0.04]' : ''
        }`}
      >
        {/* Lit edge — the same affordance the terminal rows use. */}
        <span
          className={`absolute left-0 top-0 bottom-0 w-[2px] bg-primary origin-center transition-transform duration-200 ${
            compared ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100 group-focus-visible:scale-y-100'
          }`}
          aria-hidden="true"
        />

        <span className="min-w-0">
          <span
            className="block w-fit max-w-full font-mono text-[13px] text-foreground group-hover:text-primary transition-colors truncate"
            style={named ? { viewTransitionName: transitionName('title', project.id) } : undefined}
          >
            {project.title}
          </span>
          {hit?.snippet ? (
            <span className="block text-[11px] text-muted-foreground mt-1 leading-snug line-clamp-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary/80 mr-1.5">{hit.field}</span>
              <Highlighted text={hit.snippet} query={query} />
            </span>
          ) : (
            <span className="block text-[11px] text-muted-foreground truncate mt-0.5">{project.subtitle}</span>
          )}
        </span>

        <span className={`font-mono text-[10px] uppercase tracking-wider justify-self-end md:justify-self-start ${STATUS_CLASS[status]}`}>
          {STATUS_LABEL[status]}
        </span>

        <span className="hidden md:block font-mono text-[10px] text-muted-foreground truncate">
          {project.stack.length ? project.stack.slice(0, 3).join(' · ') : '—'}
        </span>

        {/* Depth as two tiny bars: trade-offs and field notes. */}
        <span
          className="hidden md:flex justify-end items-center gap-1.5 font-mono text-[10px] text-muted-foreground tabular-nums"
          title={`${depth.tradeoffs} trade-offs · ${depth.fieldNotes} field notes`}
        >
          {depth.tradeoffs || depth.fieldNotes ? (
            <>
              <span className="flex items-end gap-px h-3" aria-hidden="true">
                <span className="w-[3px] bg-primary/70" style={{ height: `${Math.min(100, 20 + depth.tradeoffs * 12)}%` }} />
                <span
                  className={`w-[3px] ${depth.fieldNotes ? 'bg-emerald-400/80' : 'bg-border'}`}
                  style={{ height: `${Math.min(100, 20 + depth.fieldNotes * 20)}%` }}
                />
              </span>
              {depth.tradeoffs}
              {depth.fieldNotes ? `·${depth.fieldNotes}` : ''}
            </>
          ) : (
            '—'
          )}
        </span>

        <span className="hidden md:block font-mono text-[10px] text-muted-foreground text-right tabular-nums whitespace-nowrap">
          {yearLabel(project.timeline)}
        </span>

        <ArrowRight
          className="hidden md:block w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
          aria-hidden="true"
        />
      </TransitionLink>

      {/* Compare, beside the link rather than inside it. */}
      <button
        type="button"
        role="checkbox"
        aria-checked={compared}
        aria-label={`Compare ${project.title}`}
        disabled={!compared && compareFull}
        onClick={() => onCompare(project.id)}
        title={!compared && compareFull ? 'Three at a time' : 'Add to compare'}
        className={`hidden md:flex absolute left-3 top-[18px] w-4 h-4 items-center justify-center border transition-all duration-200 disabled:cursor-not-allowed ${
          compared
            ? 'opacity-100 bg-primary border-primary text-primary-foreground scale-100'
            : 'opacity-0 scale-90 group-hover/row:opacity-100 group-hover/row:scale-100 focus-visible:opacity-100 focus-visible:scale-100 border-muted-foreground/60 hover:border-primary disabled:opacity-0'
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

function CursorPreview({ project }: { project: Project | null }) {
  const prefersReduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.5 });

  /* Positioned from the pointer, written to motion values — the preview
     moves every frame the mouse does, and none of it goes through React. It
     flips to the cursor's left near the right edge so it never clips. */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const flip = e.clientX + PREVIEW_W + 40 > window.innerWidth;
      x.set(flip ? e.clientX - PREVIEW_W - 24 : e.clientX + 24);
      y.set(Math.min(e.clientY - 60, window.innerHeight - 260));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [x, y]);

  return (
    <motion.div
      className="fixed left-0 top-0 z-30 pointer-events-none"
      style={{ x: prefersReduced ? x : sx, y: prefersReduced ? y : sy, width: PREVIEW_W }}
      aria-hidden="true"
    >
      <AnimatePresence mode="wait">
        {project && (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, scale: 0.94, rotate: prefersReduced ? 0 : -1.5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
            transition={{ duration: 0.2, ease: EASE }}
            className="border border-border bg-card shadow-2xl"
          >
            <ProjectArt project={project} compact className="aspect-[16/10]" />
            <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-border">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground truncate">
                {project.category}
              </span>
              <span className="font-mono text-[10px] text-primary shrink-0">open →</span>
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
  const [hovered, setHovered] = useState<Project | null>(null);

  if (!results.length) return null;

  /* One flat, keyed list of rules and rows. AnimatePresence only sees its
     direct children, and a Fragment per group hid every row inside it — so
     rows filtered out simply vanished instead of leaving. */
  const byId = new Map(results.map((r) => [r.project.id, r]));
  const items: React.ReactNode[] = [];
  let row = 0;
  for (const group of grouped ? groupByTier(results.map((r) => r.project)) : [{ tier: '', items: results.map((r) => r.project) }]) {
    if (grouped && group.tier) {
      items.push(
        <motion.li layout="position" key={`rule-${group.tier}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <TierRule tier={group.tier} count={group.items.length} className="pl-4 md:pl-11 pr-4 pt-5 pb-2.5" />
        </motion.li>
      );
    }
    for (const project of group.items) {
      items.push(
        <IndexRow
          key={project.id}
          result={byId.get(project.id)!}
          index={row++}
          query={query}
          compared={compare.includes(project.id)}
          compareFull={compare.length >= compareMax}
          onCompare={onCompare}
          onHover={setHovered}
        />
      );
    }
  }

  return (
    <div className="border border-border bg-card/20" onPointerLeave={() => setHovered(null)}>
      <IndexHeader />
      <ul className="border-t border-border">
        <AnimatePresence initial={false}>{items}</AnimatePresence>
      </ul>

      {/* External links deliberately stay out of the rows: a row's job is to
          open the case study. The totals are here instead. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3 border-t border-border font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="tabular-nums">{results.length} shown</span>
        <span className="flex items-center gap-1.5">
          <Github className="w-3 h-3" aria-hidden="true" />
          <span className="tabular-nums">{results.filter((r) => r.project.github).length}</span> with source
        </span>
        <span className="flex items-center gap-1.5">
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
          <span className="tabular-nums">{results.filter((r) => r.project.liveUrl).length}</span> live
        </span>
        <span className="hidden md:inline ml-auto normal-case tracking-normal text-[11px]">
          tick a row to compare up to {compareMax}
        </span>
      </div>

      {/* Only while the hovered project is still in the list — a filter can
          remove the row from under a resting pointer, which fires no leave. */}
      {fine && <CursorPreview project={hovered && byId.has(hovered.id) ? hovered : null} />}
    </div>
  );
}
