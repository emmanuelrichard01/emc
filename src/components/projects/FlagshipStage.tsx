import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, ExternalLink, Github, Sparkles } from 'lucide-react';

import TransitionLink from '@/components/ui/TransitionLink';
import { Reveal, RevealText } from '@/components/ui/Reveal';
import { useAsk } from '@/components/ai/AskProvider';
import { projectStatus } from '@/lib/project';
import { transitionName } from '@/lib/viewTransition';
import type { Project } from '@/types';
import ProjectArt from './ProjectArt';
import { StatusText, describeDepth } from './tiers';
import { depthOf, yearLabel } from './workModel';

/* ==========================================================================
   FLAGSHIP PLATES

   The four flagships, each given a plate the way a monograph gives its
   strongest work a full page: the picture large, a caption column beside
   it, and a number the index below refers back to.

   The compositions alternate — plate left with its caption on the right,
   then the reverse — so the run reads as a sequence of spreads rather than
   four identical cards. Every plate opens its case study, and the picture
   and title travel into it as shared elements (lib/viewTransition.ts).

   What the caption says is what a reader deciding whether to open the case
   study wants: what it is, whether it runs, when, what it is built with,
   how much the write-up documents, and two ways in — read it, or ask.
   ========================================================================== */

const VIEWPORT = { once: true, margin: '0px 0px -12% 0px' } as const;

/* Plates follow their picture's shape. Screenshots are 16:10; Vega
   Studio's art is a 1200×630 share card, which a 16:10 frame would crop
   through its headline. */
const PLATE_ASPECT: Record<string, string> = { 'vega-canva': 'aspect-[40/21]' };

/* The plate's own entrance: uncovered top to bottom. Local rather than the
   shared <Plate>, because the picture inside must stay free to scale on
   hover, which an inline transform from the entrance would pin in place. */
function PlateFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ clipPath: 'inset(0% 0% 100% 0%)' }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      viewport={VIEWPORT}
      transition={{ duration: 1.25, ease: [0.77, 0, 0.18, 1] }}
    >
      {children}
    </motion.div>
  );
}

function FlagshipPlate({ project, index }: { project: Project; index: number }) {
  const { openAsk } = useAsk();
  const status = projectStatus(project);
  const depth = depthOf(project);
  const flipped = index % 2 === 1;
  const href = `/projects/${project.id}`;
  const titleId = `flagship-${project.id}`;

  return (
    <article aria-labelledby={titleId} className="grid grid-cols-12 gap-x-6 gap-y-8 items-start">
      {/* ── The plate ── */}
      <PlateFrame
        className={`col-span-12 lg:col-span-8 ${flipped ? 'lg:col-start-5 lg:row-start-1' : ''}`}
      >
        <TransitionLink
          to={href}
          tabIndex={-1}
          aria-hidden="true"
          className="group relative block"
        >
          <ProjectArt
            project={project}
            transitionName={transitionName('art', project.id)}
            className={PLATE_ASPECT[project.id] ?? 'aspect-[16/10]'}
          />
          {/* A corner mark that arrives on hover: the plate is a door. */}
          <span className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center bg-background text-foreground opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-500 ease-out-expo">
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
          </span>
        </TransitionLink>
      </PlateFrame>

      {/* ── The caption ── */}
      <div
        className={`col-span-12 lg:col-span-4 lg:row-start-1 flex flex-col min-w-0 ${
          flipped ? 'lg:col-start-1 lg:pr-4' : 'lg:col-start-9 lg:pl-4'
        } lg:pt-1`}
      >
        <Reveal className="flex items-baseline justify-between gap-4" y={8}>
          <span className="t-folio text-foreground">{String(index + 1).padStart(2, '0')}</span>
        </Reveal>

        <div className="mt-6 lg:mt-10">
          <h3 id={titleId} className="t-heading text-foreground">
            <TransitionLink to={href} className="group/title inline">
              <RevealText as="span" className="inline-block" stagger={0.03}>
                <span style={{ viewTransitionName: transitionName('title', project.id) }}>{project.title}</span>
              </RevealText>
            </TransitionLink>
          </h3>
          <Reveal as="p" className="mt-2 t-body text-foreground/90" delay={0.1} y={8}>
            {project.subtitle}
          </Reveal>
        </div>

        <Reveal as="p" className="mt-5 t-body line-clamp-4 lg:line-clamp-5" delay={0.15} y={8}>
          {project.description}
        </Reveal>

        <Reveal delay={0.2} y={8}>
          <dl className="mt-8 border-t border-border text-[13px]">
            {[
              { term: 'Kind', detail: project.category },
              { term: 'Status', detail: <StatusText status={status} /> },
              { term: 'Year', detail: <span className="tabular-nums">{yearLabel(project.timeline)}</span> },
              {
                term: 'Built with',
                detail: project.stack.length ? project.stack.slice(0, 6).join(' · ') + (project.stack.length > 6 ? ` and ${project.stack.length - 6} more` : '') : 'Not built yet',
              },
              {
                term: 'Write-up',
                detail: describeDepth(depth.tradeoffs, depth.fieldNotes),
              },
            ].map((row) => (
              <div key={row.term} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 py-2.5 border-b border-border">
                <dt className="text-muted-foreground">{row.term}</dt>
                <dd className="text-foreground min-w-0">{row.detail}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3" delay={0.25} y={8}>
          <TransitionLink to={href} className="group inline-flex items-center gap-2 text-[15px] text-foreground">
            <span className="link-draw">Read the case study</span>
            <ArrowRight className="nudge w-4 h-4" aria-hidden="true" />
          </TransitionLink>
          <button
            type="button"
            onClick={() => openAsk({ question: `how does ${project.title} work, end to end?` })}
            className="tap group inline-flex items-center gap-2 text-[14px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary transition-transform duration-500 ease-out-expo group-hover:rotate-12" aria-hidden="true" />
            Ask about it
          </button>
          <span className="flex items-center gap-1 ml-auto -mr-2.5">
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 text-muted-foreground hover:text-foreground transition-colors"
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
                className="p-2.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`${project.title} live site (opens in new tab)`}
              >
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </a>
            )}
          </span>
        </Reveal>
      </div>
    </article>
  );
}

export default function FlagshipStage({ projects }: { projects: Project[] }) {
  if (!projects.length) return null;
  return (
    <div className="flex flex-col gap-28 md:gap-40" aria-label="Flagship projects" role="group">
      {projects.map((project, index) => (
        <FlagshipPlate key={project.id} project={project} index={index} />
      ))}
    </div>
  );
}
