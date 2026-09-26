import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, ExternalLink, Github } from 'lucide-react';

import TransitionLink from '@/components/ui/TransitionLink';
import { transitionName } from '@/lib/viewTransition';
import { trackPointer } from '@/lib/pointer';
import { STATUS_CLASS, STATUS_LABEL, projectStatus } from '@/lib/project';
import type { Project } from '@/types';
import { TierRule, groupByTier } from './tiers';
import ProjectArt from './ProjectArt';
import { depthOf, yearLabel, type Result } from './workModel';

/* ==========================================================================
   PROJECT CARDS

   The browsing view. Every card now has the same anatomy — art, then text —
   because every project now has art: a screenshot where there is a front
   end, the spec sheet where there is not. The old grid had pictures on five
   cards and a blank on eight, so row heights lurched and the pipelines
   looked unfinished beside the web apps.

   Design-stage work keeps its dashed border: the one visual guarantee that
   a blueprint is never mistaken for something running.
   ========================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

interface CardProps {
  project: Project;
  index: number;
  compared: boolean;
  compareFull: boolean;
  onCompare: (id: string) => void;
}

function ProjectCard({ project, index, compared, compareFull, onCompare }: CardProps) {
  const status = projectStatus(project);
  const depth = depthOf(project);
  const isDesign = project.tier === 'design';
  const prefersReduced = useReducedMotion();
  const named = project.tier !== 'flagship'; // see ProjectIndex

  return (
    <motion.article
      layout={prefersReduced ? false : true}
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.14 } }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.2), ease: EASE }}
      onPointerMove={trackPointer}
      className={`pointer-glow group flex flex-col bg-card/30 transition-colors ${
        isDesign ? 'border border-dashed border-border' : 'border border-border/80'
      } ${compared ? '!border-primary/70' : ''}`}
    >
      <div className="relative border-b border-border/70">
        <ProjectArt
          project={project}
          compact
          className="aspect-[16/9]"
          transitionName={named ? transitionName('art', project.id) : undefined}
        />
        {project.image && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest">
            {status === 'live' && <span className="w-1.5 h-1.5 bg-emerald-500 status-live" aria-hidden="true" />}
            <span className={STATUS_CLASS[status]}>{STATUS_LABEL[status]}</span>
          </span>
        )}
        {/* Compare — above the stretched link so it stays its own target. */}
        <button
          type="button"
          role="checkbox"
          aria-checked={compared}
          aria-label={`Compare ${project.title}`}
          disabled={!compared && compareFull}
          onClick={() => onCompare(project.id)}
          className={`absolute z-10 top-2 right-2 flex items-center gap-1.5 px-1.5 py-1 border font-mono text-[9px] uppercase tracking-widest backdrop-blur-sm transition-all disabled:hidden ${
            compared
              ? 'bg-primary border-primary text-primary-foreground'
              : 'bg-background/80 border-border text-muted-foreground md:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-foreground'
          }`}
        >
          <span className={`w-2.5 h-2.5 flex items-center justify-center border ${compared ? 'border-primary-foreground' : 'border-current'}`}>
            {compared && <Check className="w-2 h-2" strokeWidth={4} aria-hidden="true" />}
          </span>
          compare
        </button>
      </div>

      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary truncate">{project.category}</span>
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums shrink-0">{yearLabel(project.timeline)}</span>
        </div>

        {/* Stretched link: the title's pseudo-element covers the card, leaving
            one link in the accessibility tree and the repo links clickable. */}
        <h3 className="font-mono text-[15px] leading-tight">
          <TransitionLink
            to={`/projects/${project.id}`}
            className="text-foreground group-hover:text-primary transition-colors before:absolute before:inset-0 before:content-['']"
          >
            <span className="inline-block" style={named ? { viewTransitionName: transitionName('title', project.id) } : undefined}>
              {project.title}
            </span>
          </TransitionLink>
        </h3>
        <p className="text-[12px] text-muted-foreground mt-1 leading-snug line-clamp-2">{project.subtitle}</p>

        <ul className="flex flex-wrap gap-1 mt-4" aria-label="Stack">
          {project.stack.slice(0, 4).map((tech) => (
            <li key={tech} className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider border border-border/70 px-1.5 py-0.5">
              {tech}
            </li>
          ))}
          {project.stack.length > 4 && (
            <li className="font-mono text-[10px] text-muted-foreground px-1 py-0.5">+{project.stack.length - 4}</li>
          )}
        </ul>

        <div className="flex items-center justify-between gap-3 mt-auto pt-5">
          <span className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest">
            <span className="flex items-center gap-1.5 text-primary">
              case study
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </span>
            {(depth.tradeoffs > 0 || depth.fieldNotes > 0) && (
              <span className="text-muted-foreground normal-case tracking-normal tabular-nums">
                {depth.tradeoffs} trade-offs{depth.fieldNotes ? ` · ${depth.fieldNotes} notes` : ''}
              </span>
            )}
          </span>
          <span className="relative z-10 flex items-center gap-3">
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`${project.title} source code (opens in new tab)`}
              >
                <Github className="w-3.5 h-3.5" aria-hidden="true" />
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
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            )}
          </span>
        </div>
      </div>
    </motion.article>
  );
}

interface ProjectCardsProps {
  results: Result[];
  grouped: boolean;
  compare: string[];
  onCompare: (id: string) => void;
  compareMax: number;
}

export default function ProjectCards({ results, grouped, compare, onCompare, compareMax }: ProjectCardsProps) {
  const projects = results.map((r) => r.project);
  const groups = grouped ? groupByTier(projects) : [{ tier: '', items: projects }];

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <div key={group.tier || 'all'} className="flex flex-col gap-3">
          {grouped && group.tier && <TierRule tier={group.tier} count={group.items.length} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {group.items.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  compared={compare.includes(project.id)}
                  compareFull={compare.length >= compareMax}
                  onCompare={onCompare}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}
