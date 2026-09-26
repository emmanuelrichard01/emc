import { useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ExternalLink, Github, Sparkles } from 'lucide-react';

import TransitionLink from '@/components/ui/TransitionLink';
import { useAsk } from '@/components/ai/AskProvider';
import { STATUS_CLASS, STATUS_LABEL, projectStatus } from '@/lib/project';
import { transitionName } from '@/lib/viewTransition';
import { trackPointer } from '@/lib/pointer';
import type { Project } from '@/types';
import ProjectArt from './ProjectArt';
import { depthOf } from './workModel';

/* ==========================================================================
   FLAGSHIP STAGE

   The four flagships, one at a time, at a size that does them justice.

   The section used to feature exactly one — whichever flagship happened to
   be authored first — and push the other three into the index as rows the
   same height as a prototype. The stage keeps the index honest (every
   project is still there) while giving the strongest work a place to be
   looked at: a list to choose from on the left, the chosen one on the right.

   Chosen, not rotated. An auto-advancing carousel moves the thing you were
   reading out from under you, and is the single most-ignored pattern on the
   web. This moves when you ask it to: click, hover-intent on desktop, or the
   arrow keys — it is a real tablist, with roving focus.

   What the panel says is what a reader deciding whether to open the case
   study wants: what it is, the measured figures, how much the write-up
   actually documents (trade-offs, field notes), what it is built with — and
   two ways in: read it, or ask about it.
   ========================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;
/* Hover selects only after the pointer rests, so sweeping across the list on
   the way to somewhere else does not flick the panel through every entry. */
const HOVER_INTENT_MS = 140;

export default function FlagshipStage({ projects }: { projects: Project[] }) {
  const [active, setActive] = useState(0);
  const prefersReduced = useReducedMotion();
  const { openAsk } = useAsk();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!projects.length) return null;
  const project = projects[Math.min(active, projects.length - 1)];
  const status = projectStatus(project);
  const depth = depthOf(project);

  const select = (index: number, focus = false) => {
    const next = (index + projects.length) % projects.length;
    setActive(next);
    if (focus) tabRefs.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => select(active + 1, true),
      ArrowRight: () => select(active + 1, true),
      ArrowUp: () => select(active - 1, true),
      ArrowLeft: () => select(active - 1, true),
      Home: () => select(0, true),
      End: () => select(projects.length - 1, true),
    };
    if (keys[e.key]) {
      e.preventDefault();
      keys[e.key]();
    }
  };

  const hoverSelect = (index: number) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setActive(index), HOVER_INTENT_MS);
  };
  const cancelHover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  };

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative mb-14 border border-border bg-card/30"
    >
      <span className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-primary/70 via-primary/20 to-transparent" aria-hidden="true" />

      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)]">
        {/* ── The list ── */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-border">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              <span className="text-[11px] tracking-[0.15em]" aria-hidden="true">▍▍▍</span>
              flagships
            </span>
            <span className="hidden lg:block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              ↑↓ to browse
            </span>
          </div>

          <div
            role="tablist"
            aria-label="Flagship projects"
            aria-orientation="vertical"
            onKeyDown={onKeyDown}
            onMouseLeave={cancelHover}
            className="flex lg:flex-col overflow-x-auto lg:overflow-visible snap-x snap-mandatory px-3 lg:px-0 pb-3 lg:pb-2 gap-2 lg:gap-0 [scrollbar-width:none]"
          >
            {projects.map((p, i) => {
              const selected = i === active;
              const s = projectStatus(p);
              return (
                <button
                  key={p.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`flagship-tab-${p.id}`}
                  aria-selected={selected}
                  aria-controls="flagship-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => select(i)}
                  onMouseEnter={() => hoverSelect(i)}
                  className={`group relative shrink-0 snap-start w-[72%] sm:w-[46%] lg:w-full text-left px-4 lg:px-5 py-3.5 lg:py-4 border lg:border-0 lg:border-t first:lg:border-t-0 border-border transition-colors ${
                    selected ? 'bg-primary/[0.06]' : 'hover:bg-foreground/[0.02]'
                  }`}
                >
                  {selected && (
                    <motion.span
                      layoutId="flagship-bar"
                      className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary"
                      style={{ boxShadow: '0 0 10px hsl(var(--primary) / 0.6)' }}
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="flex items-baseline gap-3">
                    <span
                      className={`font-mono text-[10px] tabular-nums transition-colors ${
                        selected ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block font-mono text-[13px] uppercase tracking-wide truncate transition-colors ${
                          selected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                        }`}
                      >
                        {p.title}
                      </span>
                      <span className="block text-[11px] text-muted-foreground truncate mt-0.5">{p.subtitle}</span>
                    </span>
                    <span className={`hidden sm:block font-mono text-[9px] uppercase tracking-wider shrink-0 ${STATUS_CLASS[s]}`}>
                      {STATUS_LABEL[s]}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <p className="hidden lg:block mt-auto px-5 py-4 border-t border-border font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground leading-relaxed">
            {projects.length} flagships of the catalogue below — every system is listed there, filterable and comparable.
          </p>
        </div>

        {/* ── The stage ── */}
        <div
          id="flagship-panel"
          role="tabpanel"
          aria-labelledby={`flagship-tab-${project.id}`}
          className="relative min-w-0"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={project.id}
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -6, filter: 'blur(3px)', transition: { duration: 0.14 } }}
              transition={{ duration: 0.32, ease: EASE }}
              className="flex flex-col h-full"
            >
              {/* Art */}
              <TransitionLink
                to={`/projects/${project.id}`}
                tabIndex={-1}
                aria-hidden="true"
                onPointerMove={trackPointer}
                className="pointer-glow group relative block border-b border-border"
              >
                {/* Wide, because the art is: screenshots and share cards are
                    landscape, and a tall column cropped them into fragments. */}
                <ProjectArt
                  project={project}
                  transitionName={transitionName('art', project.id)}
                  className="aspect-[16/9] sm:aspect-[2/1]"
                />
                {/* Over screenshots only — a spec sheet carries its own footer,
                    and the tab beside it already states the status. */}
                {project.image && (
                  <span className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest">
                    {status === 'live' && <span className="w-1.5 h-1.5 bg-emerald-500 status-live" aria-hidden="true" />}
                    <span className={STATUS_CLASS[status]}>{STATUS_LABEL[status]}</span>
                  </span>
                )}
              </TransitionLink>

              {/* Copy — what it is on the left, what's inside on the right. */}
              <div className="flex-1 grid md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-x-8 gap-y-5 p-5 md:p-7 min-w-0">
                <div className="min-w-0">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {project.category} · {project.timeline}
                </span>
                <h3 className="mt-3 text-2xl md:text-[28px] font-bold tracking-tight text-foreground leading-[1.1]">
                  <span className="inline-block" style={{ viewTransitionName: transitionName('title', project.id) }}>
                    {project.title}
                  </span>
                </h3>
                <p className="mt-1.5 font-mono text-[12px] text-muted-foreground">{project.subtitle}</p>
                <p className="mt-4 text-[14px] md:text-[13px] leading-relaxed text-muted-foreground line-clamp-4">
                  {project.description}
                </p>
                </div>

                <div className="flex flex-col min-w-0">

                {/* How much the write-up documents — what a technical reader
                    uses to decide whether it is worth opening. */}
                <dl className="grid grid-cols-3 border-y border-border divide-x divide-border">
                  {[
                    { label: 'trade-offs', value: depth.tradeoffs },
                    { label: 'field notes', value: depth.fieldNotes },
                    { label: 'highlights', value: depth.highlights },
                  ].map((item) => (
                    <div key={item.label} className="py-2.5 px-3 first:pl-0">
                      <dd className={`font-mono text-lg tabular-nums leading-none ${item.value ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {item.value}
                      </dd>
                      <dt className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                        {item.label}
                      </dt>
                    </div>
                  ))}
                </dl>

                <ul className="mt-4 flex flex-wrap gap-1" aria-label="Stack">
                  {project.stack.slice(0, 7).map((tech) => (
                    <li
                      key={tech}
                      className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground border border-border/70 px-1.5 py-0.5"
                    >
                      {tech}
                    </li>
                  ))}
                  {project.stack.length > 7 && (
                    <li className="font-mono text-[10px] text-muted-foreground px-1 py-0.5">+{project.stack.length - 7}</li>
                  )}
                </ul>

                <div className="mt-auto pt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <TransitionLink
                    to={`/projects/${project.id}`}
                    className="btn-structural inline-flex items-center gap-2.5 !px-4 !py-2.5 !text-[12px]"
                  >
                    Case study
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </TransitionLink>
                  <button
                    type="button"
                    onClick={() => openAsk({ question: `how does ${project.title} work, end to end?` })}
                    className="group/ask inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-primary/70 group-hover/ask:text-primary transition-colors" aria-hidden="true" />
                    ask about it
                  </button>
                  <span className="flex items-center gap-3 ml-auto">
                    {project.github && (
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={`${project.title} source code (opens in new tab)`}
                      >
                        <Github className="w-4 h-4" aria-hidden="true" />
                      </a>
                    )}
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={`${project.title} live site (opens in new tab)`}
                      >
                        <ExternalLink className="w-4 h-4" aria-hidden="true" />
                      </a>
                    )}
                  </span>
                </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
