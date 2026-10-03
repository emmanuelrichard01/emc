import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, ExternalLink, Github } from 'lucide-react';

import TransitionLink from '@/components/ui/TransitionLink';
import { transitionName } from '@/lib/viewTransition';
import { projectStatus } from '@/lib/project';
import type { Project } from '@/types';
import { StatusText, TierRule, describeDepth, groupByTier } from './tiers';
import ProjectArt from './ProjectArt';
import { depthOf, yearLabel, type Result } from './workModel';

/* ==========================================================================
   PROJECT PLATES

   The browsing view: every project as a small plate with its caption under
   it, like a contact sheet. Every entry has the same anatomy — art, then
   text — because every project has art: a screenshot where there is a
   front end, the spec plate where there is not.

   No boxes. The plates sit on the stock with space between them; the
   caption is set under the picture the way a book sets it. Design-stage
   work carries the dashed hairline frame on its plate (ProjectArt), the one
   visual guarantee that a blueprint is never mistaken for something running.
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
      layout={prefersReduced ? false : 'position'}
      initial={prefersReduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.05, 0.25), ease: EASE }}
      className="group relative flex flex-col"
    >
      <div className="relative">
        <ProjectArt
          project={project}
          compact
          className={`aspect-[16/10] transition-shadow duration-300 ${compared ? 'shadow-[0_0_0_1px_hsl(var(--primary))]' : ''}`}
          transitionName={named ? transitionName('art', project.id) : undefined}
        />
        {/* Compare — above the stretched link so it stays its own target. */}
        <button
          type="button"
          role="checkbox"
          aria-checked={compared}
          aria-label={`Compare ${project.title}`}
          disabled={!compared && compareFull}
          onClick={() => onCompare(project.id)}
          className={`tap absolute z-10 top-0 right-0 flex items-center gap-2 px-3 py-2 text-[12px] transition-all duration-300 disabled:hidden ${
            compared
              ? 'bg-primary text-primary-foreground'
              : 'bg-background/90 text-muted-foreground md:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-foreground'
          }`}
        >
          <span
            className={`w-3 h-3 flex items-center justify-center ${
              compared ? 'shadow-[inset_0_0_0_1px_hsl(var(--primary-foreground))]' : 'shadow-[inset_0_0_0_1px_currentColor]'
            }`}
          >
            {compared && <Check className="w-2.5 h-2.5" strokeWidth={3} aria-hidden="true" />}
          </span>
          Compare
        </button>
      </div>

      <div className="flex flex-col flex-1 pt-5">
        <div className="flex items-baseline justify-between gap-3 t-caption">
          <span className="truncate">{project.category}</span>
          <span className="tabular-nums shrink-0">{yearLabel(project.timeline)}</span>
        </div>

        {/* Stretched link: the title's pseudo-element covers the entry,
            leaving one link in the accessibility tree and the repo links
            clickable. */}
        <h3 className="mt-3 t-subhead">
          <TransitionLink
            to={`/projects/${project.id}`}
            className={`before:absolute before:inset-0 before:content-[''] ${isDesign ? 'text-muted-foreground group-hover:text-foreground' : 'text-foreground'} transition-colors`}
          >
            <span className="inline-block" style={named ? { viewTransitionName: transitionName('title', project.id) } : undefined}>
              {project.title}
            </span>
          </TransitionLink>
        </h3>
        <p className="t-caption mt-1 line-clamp-2">{project.subtitle}</p>
        <p className="t-caption mt-3 truncate">
          {project.stack.length ? project.stack.slice(0, 4).join(' · ') + (project.stack.length > 4 ? ` and ${project.stack.length - 4} more` : '') : 'Not built yet'}
        </p>

        <div className="flex items-center justify-between gap-3 mt-auto pt-5 border-b border-border pb-4">
          <span className="flex items-center gap-4 text-[13px]">
            <StatusText status={status} />
            {(depth.tradeoffs > 0 || depth.fieldNotes > 0) && (
              <span className="text-muted-foreground tabular-nums hidden sm:inline">
                {describeDepth(depth.tradeoffs, depth.fieldNotes)}
              </span>
            )}
          </span>
          <span className="relative z-10 flex items-center gap-1 -mr-2">
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
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
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`${project.title} live site (opens in new tab)`}
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            )}
            <ArrowRight className="nudge w-4 h-4 ml-1 text-muted-quiet group-hover:text-foreground transition-colors" aria-hidden="true" />
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
    <div className="flex flex-col gap-20">
      {groups.map((group) => (
        <div key={group.tier || 'all'} className="flex flex-col gap-6">
          {grouped && group.tier && <TierRule tier={group.tier} count={group.items.length} className="pb-4 border-b border-border" />}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-14">
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
