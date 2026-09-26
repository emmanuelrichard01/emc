import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, Clock, ExternalLink, Github, Link2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import TransitionLink from '@/components/ui/TransitionLink';
import { useAsk } from '@/components/ai/AskProvider';
import ProjectArt from '@/components/projects/ProjectArt';
import { TIER_LABEL, TIER_RANK } from '@/components/projects/tiers';
import { STATUS_CLASS, STATUS_LABEL, projectStatus } from '@/lib/project';
import { trackPointer } from '@/lib/pointer';
import { VIEW_TRANSITIONS, transitionName } from '@/lib/viewTransition';
import type { Project } from '@/types';
import { leadOf } from './caseModel';

/* ==========================================================================
   CASE HERO

   The first screen of a case study answers three questions before a word of
   the write-up is read: what is it, is it real, and is it worth my time.

     what        title, the one-line subtitle, and the summary
     real        a ledger — status derived from the links it has, tier,
                 year, and the measured figures — beside the title, not
                 buried in a sidebar halfway down
     worth it    reading time, and the art: a screenshot where there is a
                 front end, the spec sheet where there is not. Previously
                 eight of thirteen pages opened on no picture at all.

   Then the ways in, in one row: the live system, the source, the assistant
   (told which page it is on), and a link to this page.
   ========================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

export function CaseHero({ project, minutes }: { project: Project; minutes: number }) {
  const status = projectStatus(project);
  const prefersReduced = useReducedMotion();
  const { openAsk } = useAsk();
  const [copied, setCopied] = useState(false);
  const enter = (delay: number) =>
    VIEW_TRANSITIONS || prefersReduced
      ? {}
      : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay, ease: EASE } };

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

  return (
    <header className="mb-14">
      {/* Breadcrumb */}
      <motion.nav {...enter(0)} className="flex flex-wrap items-center gap-2 mb-10 font-mono text-[11px] uppercase tracking-widest" aria-label="Breadcrumb">
        <TransitionLink to="/" className="group inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
          Home
        </TransitionLink>
        <span className="text-muted-foreground" aria-hidden="true">/</span>
        <TransitionLink to="/#projects" className="text-muted-foreground hover:text-foreground transition-colors">
          Work
        </TransitionLink>
        <span className="text-muted-foreground" aria-hidden="true">/</span>
        <span className="text-primary truncate max-w-[50vw]" aria-current="page">{project.title}</span>
      </motion.nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-end">
        <motion.div {...enter(0.05)} className="min-w-0">
          <p className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-5">
            <span className="text-primary tracking-[0.12em]" aria-hidden="true">{TIER_RANK[project.tier]}</span>
            {project.category}
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold tracking-tight text-foreground leading-[1.04]">
            <span className="inline-block" style={{ viewTransitionName: transitionName('title', project.id) }}>
              {project.title}
            </span>
          </h1>
          <p className="mt-4 font-mono text-[13px] md:text-[15px] text-muted-foreground">{project.subtitle}</p>
          <p className="mt-6 text-[16px] md:text-[17px] leading-[1.7] text-foreground/80 max-w-[60ch]">
            {leadOf(project.description, 280)}
          </p>
        </motion.div>

        {/* Ledger */}
        <motion.dl {...enter(0.12)} className="border border-border bg-card/40 divide-y divide-border self-start lg:self-end">
          <div className="grid grid-cols-3 divide-x divide-border">
            {[
              {
                label: 'status',
                value: (
                  <span className={`flex items-center gap-1.5 ${STATUS_CLASS[status]}`}>
                    {status === 'live' && <span className="w-1.5 h-1.5 bg-emerald-500 status-live" aria-hidden="true" />}
                    {STATUS_LABEL[status]}
                  </span>
                ),
              },
              { label: 'tier', value: TIER_LABEL[project.tier] },
              { label: 'when', value: project.timeline },
            ].map((item) => (
              <div key={item.label} className="px-3 py-2.5 min-w-0">
                <dt className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{item.label}</dt>
                <dd className="mt-1 font-mono text-[10px] uppercase tracking-wider text-foreground truncate">{item.value}</dd>
              </div>
            ))}
          </div>
          {project.metrics.map((metric) => (
            <div key={metric.label} className="flex items-baseline justify-between gap-4 px-3 py-2.5">
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground truncate">{metric.label}</dt>
              <dd className="font-mono text-[14px] text-primary tabular-nums text-right">{metric.value}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" aria-hidden="true" />
              {minutes} min read
            </span>
            <span className="tabular-nums">{project.stack.length} technologies</span>
          </div>
        </motion.dl>
      </div>

      {/* Actions */}
      <motion.div {...enter(0.18)} className="mt-8 flex flex-wrap items-center gap-2">
        {project.liveUrl && (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-structural inline-flex items-center gap-2 !px-4 !py-2.5 !text-[11px]"
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            Open live
          </a>
        )}
        {project.github && (
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost-structural inline-flex items-center gap-2 !px-4 !py-2.5 !text-[11px]"
          >
            <Github className="w-3.5 h-3.5" aria-hidden="true" />
            Source
          </a>
        )}
        <button
          type="button"
          onClick={() => openAsk()}
          className="inline-flex items-center gap-2 border border-primary/40 bg-primary/5 px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
          Ask about it
        </button>
        <button
          type="button"
          onClick={copyLink}
          aria-label="Copy a link to this case study"
          className="inline-flex items-center gap-2 px-3 py-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" /> : <Link2 className="w-3.5 h-3.5" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </motion.div>

      {/* Art */}
      <motion.figure
        {...(VIEW_TRANSITIONS || prefersReduced
          ? {}
          : { initial: { opacity: 0, scale: 0.99 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.7, delay: 0.2, ease: EASE } })}
        onPointerMove={trackPointer}
        className="pointer-glow group mt-12 border border-border bg-card p-1.5 md:p-2"
        style={{ boxShadow: 'var(--shadow-md), var(--shadow-glow)' }}
      >
        <ProjectArt
          project={project}
          transitionName={transitionName('art', project.id)}
          className={project.image ? 'aspect-video' : 'aspect-[2/1] md:aspect-[3/1]'}
        />
        {project.image && <figcaption className="sr-only">{project.title} interface</figcaption>}
      </motion.figure>
    </header>
  );
}

/* ==========================================================================
   IN 30 SECONDS

   The problem, the approach and the outcome, each cut to its lead. For the
   reader who will not read four sections — which is most readers — this is
   the case study; for the one who will, it is the map.

   Extracted, not rewritten (caseModel.leadOf): every case study is written
   to open with its point, so the short version is the long version's own
   first words, and can never claim something the long one does not.
   ========================================================================== */

export function CaseSummary({ project }: { project: Project }) {
  const study = project.caseStudy;
  const prefersReduced = useReducedMotion();
  if (!study) return null;

  const parts = [
    { id: 'problem', label: 'problem', text: leadOf(study.problem) },
    { id: 'approach', label: 'approach', text: leadOf(study.approach) },
    { id: 'outcome', label: 'outcome', text: leadOf(study.outcome) },
  ];

  return (
    <section aria-labelledby="summary-title" className="mb-16">
      <h2 id="summary-title" className="flex items-center gap-3 mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
        <span className="text-primary">//</span> in 30 seconds
        <span className="flex-1 h-px bg-border" aria-hidden="true" />
      </h2>
      <ol className="grid md:grid-cols-3 border border-border divide-y md:divide-y-0 md:divide-x divide-border bg-card/30">
        {parts.map((part, i) => (
          <motion.li
            key={part.id}
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4, delay: i * 0.08, ease: EASE }}
          >
            <a
              href={`#${part.id}`}
              className="group flex flex-col h-full p-5 md:p-6 hover:bg-primary/[0.04] transition-colors"
            >
              <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-3">
                <span>
                  <span className="text-muted-foreground mr-2 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  {part.label}
                </span>
                <span className="text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" aria-hidden="true">
                  read ↓
                </span>
              </span>
              <span className="text-[14px] leading-[1.65] text-foreground/85">{part.text}</span>
            </a>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
