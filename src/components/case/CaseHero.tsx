import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, Check, Link2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import TransitionLink from '@/components/ui/TransitionLink';
import { Reveal } from '@/components/ui/Reveal';
import { useAsk } from '@/components/ai/AskProvider';
import ProjectArt from '@/components/projects/ProjectArt';
import { projectStatus } from '@/lib/project';
import { VIEW_TRANSITIONS, transitionName } from '@/lib/viewTransition';
import type { Project } from '@/types';
import { leadOf, statusInWords } from './caseModel';

/* ==========================================================================
   CASE HERO — the chapter opening

   A case study is a chapter of the monograph, and it opens like one: the
   way back, the title set large, one line of what it is, a quiet line of
   facts (what kind, when, whether it runs, where the source is), the
   measured figures set as numerals, and then the plate.

   It answers three questions before a word of the write-up is read: what is
   it, is it real, and is it worth my time.

   The title and the plate carry the shared-element names the Work plates
   use, so arriving from the index morphs one into the other. Where the
   browser does that morph, nothing here runs an entrance of its own — two
   animations of the same element would fight.
   ========================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

export function CaseHero({ project, minutes }: { project: Project; minutes: number }) {
  const status = projectStatus(project);
  const prefersReduced = useReducedMotion();
  const { openAsk } = useAsk();
  const [copied, setCopied] = useState(false);
  const still = VIEW_TRANSITIONS || Boolean(prefersReduced);
  const enter = (delay: number) =>
    still ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay, ease: EASE } };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/projects/${project.id}`);
      setCopied(true);
      toast.success('Link copied', { description: project.title });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy the link');
    }
  };

  const facts: ReactNode[] = [
    project.category,
    project.timeline,
    <span key="status" className="inline-flex items-center gap-2 text-foreground">
      {status === 'live' && <span className="w-1.5 h-1.5 bg-status-ok status-live" aria-hidden="true" />}
      {statusInWords(project)}
    </span>,
    `${minutes} min read`,
  ];

  return (
    <header className="mb-16 md:mb-24">
      <motion.nav {...enter(0)} aria-label="Breadcrumb" className="mb-14 md:mb-20">
        <TransitionLink
          to="/#projects"
          className="group inline-flex items-center gap-2.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-300 ease-out-expo group-hover:-translate-x-1" aria-hidden="true" />
          <span className="link-draw">All projects</span>
        </TransitionLink>
      </motion.nav>

      <div className="grid grid-cols-12 gap-x-6 gap-y-8">
        <div className="col-span-12 xl:col-span-10 min-w-0">
          <h1 className="t-display text-foreground">
            <span className="inline-block" style={{ viewTransitionName: transitionName('title', project.id) }}>
              {project.title}
            </span>
          </h1>
          <motion.p {...enter(0.08)} className="mt-6 md:mt-8 t-lede text-muted-foreground max-w-[40ch]">
            {project.subtitle}
          </motion.p>
        </div>

        <motion.div {...enter(0.14)} className="col-span-12 lg:col-span-7 min-w-0">
          <p className="t-lede max-w-[60ch]">{leadOf(project.description, 280)}</p>
        </motion.div>

        <motion.div {...enter(0.2)} className="col-span-12 lg:col-span-4 lg:col-start-9 min-w-0 flex flex-col gap-5 lg:pt-1.5">
          {/* The facts, in a line. */}
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 t-caption">
            {facts.map((fact, i) => (
              <li key={i} className="inline-flex items-center">
                {fact}
              </li>
            ))}
          </ul>

          {/* The ways in. */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[14px]">
            {project.liveUrl && (
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="group tap inline-flex items-center gap-1.5 text-foreground">
                <span className="link-draw">Visit the live site</span>
                <ArrowUpRight className="nudge-up w-3.5 h-3.5" aria-hidden="true" />
              </a>
            )}
            {project.github && (
              <a href={project.github} target="_blank" rel="noopener noreferrer" className="group tap inline-flex items-center gap-1.5 text-foreground">
                <span className="link-draw">View the code</span>
                <ArrowUpRight className="nudge-up w-3.5 h-3.5" aria-hidden="true" />
              </a>
            )}
            <button type="button" onClick={() => openAsk()} className="group tap inline-flex items-center gap-2 text-foreground hover:text-primary transition-colors">
              <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              <span className="link-draw">Ask a question</span>
            </button>
            <button
              type="button"
              onClick={copyLink}
              aria-label="Copy a link to this case study"
              className="tap inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-status-ok" aria-hidden="true" /> : <Link2 className="w-3.5 h-3.5" aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </motion.div>
      </div>

      {/* The measured figures, set as numerals between hairlines. */}
      {project.metrics.length > 0 && (
        <motion.dl
          {...enter(0.26)}
          className="mt-12 md:mt-16 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-y border-border py-5"
        >
          {project.metrics.map((metric) => (
            <div key={metric.label} className="flex items-baseline gap-2 min-w-0">
              <dt className="t-caption order-2">{metric.label}</dt>
              {/* Numerals as measurements; a word (a provider, a pattern) in the display face. */}
              <dd
                className={`order-1 text-foreground text-[1.125rem] md:text-[1.25rem] leading-none whitespace-nowrap ${
                  /^[~<>≈]?\d/.test(metric.value) ? 't-figure' : 'font-display font-[560] tracking-[-0.02em]'
                }`}
              >
                {metric.value}
              </dd>
            </div>
          ))}
        </motion.dl>
      )}

      <CasePlate project={project} />
    </header>
  );
}

/* ── The plate ────────────────────────────────────────────────────────────
   A screenshot where there is a front end; the spec sheet where there is
   not. Uncovered top to bottom on arrival — unless the browser is morphing
   it in from the Work plate, in which case it must be on screen at once. */

function CasePlate({ project }: { project: Project }) {
  const prefersReduced = useReducedMotion();
  const still = VIEW_TRANSITIONS || Boolean(prefersReduced);

  const body = project.image ? (
    <div className="plate aspect-[16/10] md:aspect-[16/9]">
      <img
        src={project.image}
        alt={`${project.title} interface`}
        decoding="async"
        className="block w-full h-full object-cover object-top"
        style={{ viewTransitionName: transitionName('art', project.id) }}
      />
    </div>
  ) : (
    <ProjectArt project={project} transitionName={transitionName('art', project.id)} className="aspect-[2/1] md:aspect-[3/1]" />
  );

  return (
    <figure className="mt-14 md:mt-20">
      {still ? (
        body
      ) : (
        <motion.div
          initial={{ clipPath: 'inset(0% 0% 100% 0%)' }}
          animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
          transition={{ duration: 1.25, delay: 0.3, ease: [0.77, 0, 0.18, 1] }}
        >
          {body}
        </motion.div>
      )}
      {project.image && (
        <Reveal as="span" className="mt-4 block t-caption" delay={0.2} y={0}>
          {project.liveUrl
            ? `${project.title}, live at ${new URL(project.liveUrl).host}`
            : `${project.title}, a screenshot from the project’s code repository`}
        </Reveal>
      )}
    </figure>
  );
}
