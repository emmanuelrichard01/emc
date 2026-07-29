import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Terminal, ExternalLink, Github } from "lucide-react";

import { Project, ProjectMetric } from "@/types";
import { PROJECTS } from "@/data/projects";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SHARED UI                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

const MetricBadge = ({ metric }: { metric: ProjectMetric }) => (
  <div className="flex items-center gap-1.5 text-[10px] font-mono">
    <span className="text-white/50">{metric.label}:</span>
    <span className="text-emerald-400/80">{metric.value}</span>
  </div>
);

const TechTag = ({ tech }: { tech: string }) => (
  <span className="text-[10px] font-mono text-white/50 bg-white/[0.02] px-2 py-0.5 rounded-md border border-white/[0.04] cursor-default hover:text-white/70 hover:border-white/[0.08] transition-all duration-300">
    {tech}
  </span>
);

const LinkButtons = ({ project }: { project: Project }) => (
  <div className="flex items-center gap-2 shrink-0">
    <Link
      to={`/projects/${project.id}`}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all duration-300 text-[11px] font-medium"
    >
      <ArrowRight className="w-3 h-3" />
      View Details
    </Link>
    {project.github && (
      <a
        href={project.github}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/60 hover:text-white/80 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300 text-[11px] font-medium"
      >
        <Github className="w-3 h-3" />
        Source
      </a>
    )}
    {project.liveUrl && (
      <a
        href={project.liveUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all duration-300 text-[11px] font-medium"
      >
        <ExternalLink className="w-3 h-3" />
        Live Site
      </a>
    )}
  </div>
);

const CategoryBadge = ({ category }: { category: string }) => (
  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-mono font-semibold uppercase tracking-[0.12em] border border-primary/20">
    {category}
  </span>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TIER 1: FLAGSHIP CARD — Full-width, 2-column, narrative + decisions      */
/* ═══════════════════════════════════════════════════════════════════════════ */

const FlagshipCard = ({ project, index }: { project: Project; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.1 }}
    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    className="group relative w-full rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-xl overflow-hidden p-5 sm:p-6 md:p-10 hover:border-white/[0.1] transition-all duration-500"
  >
    {/* Top edge glow */}
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />

    {/* Hover spotlight */}
    <div className="absolute -inset-px bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />

    {/* Header */}
    <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <CategoryBadge category={project.category} />
          <span className="text-[9px] font-mono text-white/50 border border-white/[0.05] px-2 py-0.5 rounded-full">
            {project.timeline}
          </span>
        </div>
        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white/90 leading-tight mb-1.5">
          {project.title}
        </h3>
        <p className="text-sm text-white/55 font-light">{project.subtitle}</p>
      </div>
      <LinkButtons project={project} />
    </div>

    {/* Metric strip */}
    <div className="relative z-10 flex flex-wrap items-center gap-x-3 sm:gap-x-5 gap-y-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] mb-6 sm:mb-8">
      {project.metrics.map((m) => (
        <MetricBadge key={m.label} metric={m} />
      ))}
    </div>

    {/* 2-Column: Description + Decisions */}
    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
      {/* Left: Description */}
      <div className="lg:col-span-5">
        <p className="text-[13px] md:text-sm text-white/60 leading-relaxed font-light">
          {project.description}
        </p>
      </div>

      {/* Right: Key Decisions */}
      <div className="lg:col-span-7 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-1 rounded-full bg-primary/60" />
          <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/50">
            Key Decisions
          </span>
        </div>
        {project.decisions.map((d, i) => (
          <div
            key={i}
            className="px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.03] transition-all duration-300"
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-[9px] font-mono text-primary/50">0{i + 1}</span>
              <span className="text-[13px] font-medium text-white/65">{d.title}</span>
            </div>
            <p className="text-[12px] text-white/55 leading-relaxed pl-4 sm:pl-6 font-light">
              {d.detail}
            </p>
          </div>
        ))}
      </div>
    </div>

    {/* Stack footer */}
    <div className="relative z-10 flex flex-wrap gap-1.5 pt-6 mt-8 border-t border-white/[0.04]">
      {project.stack.map((tech) => (
        <TechTag key={tech} tech={tech} />
      ))}
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TIER 2: PRODUCTION CARD — Half-width, compact, 1 decision callout       */
/* ═══════════════════════════════════════════════════════════════════════════ */

const ProductionCard = ({ project, index }: { project: Project; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.1 }}
    transition={{ duration: 0.6, delay: (index % 2) * 0.1, ease: [0.16, 1, 0.3, 1] }}
    className="group relative flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-xl overflow-hidden p-5 sm:p-6 md:p-7 hover:border-white/[0.1] transition-all duration-500"
  >
    {/* Top edge glow */}
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent pointer-events-none" />

    {/* Hover spotlight */}
    <div className="absolute -inset-px bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />

    {/* Header */}
    <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2.5">
          <CategoryBadge category={project.category} />
          <span className="text-[9px] font-mono text-white/50">{project.timeline}</span>
        </div>
        <h3 className="text-xl font-bold text-white/85 leading-tight mb-1">
          {project.title}
        </h3>
        <p className="text-xs text-white/55 font-light">{project.subtitle}</p>
      </div>
      <LinkButtons project={project} />
    </div>

    {/* Metric strip */}
    <div className="relative z-10 flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] mb-5">
      {project.metrics.map((m) => (
        <MetricBadge key={m.label} metric={m} />
      ))}
    </div>

    {/* Description */}
    <p className="relative z-10 text-[12px] text-white/60 leading-relaxed font-light mb-5 flex-1">
      {project.description}
    </p>

    {/* Single decision callout */}
    {project.decisions.length > 0 && (
      <div className="relative z-10 px-3.5 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04] mb-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-1 rounded-full bg-primary/60" />
          <span className="text-[9px] font-mono tracking-[0.15em] uppercase text-white/50">
            Key Decision
          </span>
        </div>
        <p className="text-[11px] font-medium text-white/55 mb-0.5">
          {project.decisions[0].title}
        </p>
        <p className="text-[11px] text-white/55 leading-relaxed font-light">
          {project.decisions[0].detail}
        </p>
      </div>
    )}

    {/* Stack footer */}
    <div className="relative z-10 flex flex-wrap gap-1 pt-4 mt-auto border-t border-white/[0.04]">
      {project.stack.map((tech) => (
        <TechTag key={tech} tech={tech} />
      ))}
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TIER 3: SYSTEM CARD — Compact, minimal, no decisions inline              */
/* ═══════════════════════════════════════════════════════════════════════════ */

const SystemCard = ({ project, index }: { project: Project; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.1 }}
    transition={{ duration: 0.5, delay: (index % 2) * 0.1, ease: [0.16, 1, 0.3, 1] }}
    className="group relative flex flex-col rounded-xl border border-white/[0.05] bg-white/[0.01] backdrop-blur-xl overflow-hidden p-5 hover:border-white/[0.1] hover:bg-white/[0.025] transition-all duration-400"
  >
    {/* Header */}
    <div className="relative z-10 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <CategoryBadge category={project.category} />
      </div>
      <h3 className="text-base font-semibold text-white/80 leading-tight mb-0.5">
        {project.title}
      </h3>
      <p className="text-[11px] text-white/50 font-light">{project.subtitle}</p>
    </div>

    {/* Metrics */}
    <div className="relative z-10 flex flex-wrap gap-x-4 gap-y-1 mb-3">
      {project.metrics.map((m) => (
        <MetricBadge key={m.label} metric={m} />
      ))}
    </div>

    {/* Description */}
    <p className="relative z-10 text-[11px] text-white/55 leading-relaxed font-light mb-4 flex-1">
      {project.description}
    </p>

    {/* Stack + links */}
    <div className="relative z-10 flex items-end justify-between gap-3 pt-3 mt-auto border-t border-white/[0.04]">
      <div className="flex flex-wrap gap-1">
        {project.stack.slice(0, 4).map((tech) => (
          <TechTag key={tech} tech={tech} />
        ))}
        {project.stack.length > 4 && (
          <span className="text-[10px] font-mono text-white/50 px-1.5 py-0.5">
            +{project.stack.length - 4}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {project.github && (
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md text-white/50 hover:text-white/70 hover:bg-white/[0.05] transition-all duration-300"
            aria-label={`${project.title} source code`}
          >
            <Github className="w-3.5 h-3.5" />
          </a>
        )}
        {project.liveUrl && (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md text-emerald-400/50 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-300"
            aria-label={`${project.title} live demo`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TIER LABEL                                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */

const TierLabel = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" />
    <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/60">
      {label}
    </span>
    <div className="h-px flex-1 bg-gradient-to-l from-white/[0.06] to-transparent" />
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN SECTION                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */

const flagships = PROJECTS.filter((p) => p.tier === "flagship");
const production = PROJECTS.filter((p) => p.tier === "production");
const systems = PROJECTS.filter((p) => p.tier === "system");

const Projects: React.FC = () => {
  return (
    <section id="projects" data-section="projects" className="py-20 sm:py-24 md:py-32 relative" aria-label="Projects and case studies">
      <div className="container px-4 md:px-6 max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="mb-12 sm:mb-16 md:mb-20 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 text-primary/60 font-mono text-[10px] tracking-[0.2em] uppercase mb-3">
              <Terminal className="w-3.5 h-3.5" />
              <span>Case Studies</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white/90">
              Recent{" "}
              <span className="text-white/60">Work</span>
            </h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-white/60 max-w-sm text-sm leading-relaxed font-light"
          >
            Real systems I've designed and built — focusing on
            architecture decisions and engineering tradeoffs.
          </motion.p>
        </div>

        {/* ── TIER 1: Flagship ── */}
        <TierLabel label="Flagship Systems" />
        <div className="flex flex-col gap-6 mb-12">
          {flagships.map((project, index) => (
            <FlagshipCard key={project.id} project={project} index={index} />
          ))}
        </div>

        {/* ── TIER 2: Production ── */}
        <TierLabel label="Production Apps" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
          {production.map((project, index) => (
            <ProductionCard key={project.id} project={project} index={index} />
          ))}
        </div>

        {/* ── TIER 3: Systems ── */}
        <TierLabel label="More Projects" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
          {systems.map((project, index) => (
            <SystemCard key={project.id} project={project} index={index} />
          ))}
        </div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-center gap-3"
        >
          <a
            href="https://github.com/emmanuelrichard01"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 text-[13px] font-medium text-white/60 hover:text-white/80 transition-colors"
          >
            <span>View more on GitHub</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default Projects;