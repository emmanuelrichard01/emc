import React from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { ArrowRight, Terminal, ExternalLink, Github, Sparkles } from "lucide-react";

import { Project, ProjectMetric } from "@/types";
import { PROJECTS } from "@/data/projects";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SHARED UI                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

const MetricBadge = ({ metric }: { metric: ProjectMetric }) => (
  <div className="flex items-center gap-1.5 text-[11px] font-mono whitespace-nowrap">
    <span className="text-muted-foreground">[{metric.label}:</span>
    <span className="text-primary">{metric.value}]</span>
  </div>
);

const TechTag = ({ tech }: { tech: string }) => (
  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest border border-border px-2 py-0.5 hover:border-primary/40 hover:text-foreground hover:scale-[1.02] transition-all cursor-default">
    {tech}
  </span>
);

/* Slide-up terminal-styled status line, revealed on hover AND keyboard focus
   (group-focus-within — the existing corner-accent hover treatments on these
   cards were mouse-only; this one is built accessible from the start).
   Content is derived from the project's own first metric, not filler text. */
const TerminalStatusStrip = ({ project }: { project: Project }) => {
  const metric = project.metrics[0];
  return (
    <div
      className="absolute inset-x-0 bottom-0 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 transition-all duration-300 ease-out pointer-events-none z-10"
      aria-hidden="true"
    >
      <div className="px-4 py-2 bg-background/95 backdrop-blur-sm border-t border-primary/30 font-mono text-[10px] flex items-center gap-2 overflow-hidden">
        <span className="text-primary shrink-0">$</span>
        <span className="text-muted-foreground truncate">
          status --check {project.id} <span className="text-emerald-400">→ ONLINE</span>
          {metric && <>{" // "}{metric.label}: <span className="text-primary">{metric.value}</span></>}
        </span>
      </div>
    </div>
  );
};

const LinkButtons = ({ project }: { project: Project }) => (
  <div className="flex items-center gap-4 shrink-0">
    <Link
      to={`/projects/${project.id}`}
      className="group flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-primary hover:text-primary-hover transition-colors"
    >
      Details
      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
    </Link>
    {project.github && (
      <a
        href={project.github}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Source code"
      >
        <Github className="w-4 h-4" />
      </a>
    )}
    {project.liveUrl && (
      <a
        href={project.liveUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Live site"
      >
        <ExternalLink className="w-4 h-4" />
      </a>
    )}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CARDS (Structural / Ledger style)                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */

const FlagshipCard = ({ project, index }: { project: Project; index: number }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="group relative w-full border border-border bg-card p-6 md:p-10 pb-9 hover:border-primary/40 transition-all duration-300 overflow-hidden"
      style={{ boxShadow: 'var(--shadow-sm)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md), var(--shadow-glow)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'; }}
    >
      {/* Left accent edge — always visible for flagship distinction */}
    <div className="absolute top-0 left-0 w-[2px] h-full bg-primary/60 group-hover:bg-primary transition-colors" />
    <TerminalStatusStrip project={project} />

    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            {project.category}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            // {project.timeline}
          </span>
        </div>
        <h3 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mb-2">
          {project.title}
        </h3>
        <p className="text-sm font-mono text-muted-foreground uppercase tracking-wide">
          {project.subtitle}
        </p>
      </div>
      <LinkButtons project={project} />
    </div>

    {/* Metric strip */}
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 border-y border-border mb-8">
      {project.metrics.map((m) => (
        <MetricBadge key={m.label} metric={m} />
      ))}
    </div>

    {/* 2-Column: Description + Decisions */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-5">
        <p className="text-sm text-foreground/80 leading-relaxed font-light">
          {project.description}
        </p>
      </div>

      <div className="lg:col-span-7 space-y-4">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
          Architecture Decisions
        </div>
        {project.decisions.map((d, i) => (
          <div key={i} className="flex gap-4">
            <span className="font-mono text-[11px] text-primary mt-0.5">0{i + 1}</span>
            <div>
              <span className="block text-[13px] font-semibold text-foreground mb-1">
                {d.title}
              </span>
              <p className="text-[12px] text-muted-foreground leading-relaxed font-light">
                {d.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Stack footer */}
    <div className="flex flex-wrap gap-2 pt-8 mt-8 border-t border-border">
      {project.stack.map((tech) => (
        <TechTag key={tech} tech={tech} />
      ))}
    </div>
  </motion.div>
  );
};

const ProductionCard = ({ project, index }: { project: Project; index: number }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="group relative flex flex-col h-full border border-border bg-card p-6 md:p-8 pb-9 hover:border-primary/30 transition-all duration-300 overflow-hidden"
      style={{ boxShadow: 'var(--shadow-sm)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'; }}
    >
      <TerminalStatusStrip project={project} />
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            {project.category}
          </span>
        </div>
        <h3 className="text-xl font-bold text-foreground leading-tight mb-1">
          {project.title}
        </h3>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide">
          {project.timeline}
        </p>
      </div>
      <LinkButtons project={project} />
    </div>

    {/* Metric strip */}
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 border-y border-border mb-6">
      {project.metrics.map((m) => (
        <MetricBadge key={m.label} metric={m} />
      ))}
    </div>

    {/* Description */}
    <p className="text-[13px] text-foreground/80 leading-relaxed font-light mb-6 flex-1">
      {project.description}
    </p>

    {/* Stack footer */}
    <div className="flex flex-wrap gap-2 pt-6 mt-auto border-t border-border">
      {project.stack.map((tech) => (
        <TechTag key={tech} tech={tech} />
      ))}
    </div>
  </motion.div>
  );
};

const SystemCard = ({ project, index }: { project: Project; index: number }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="group relative flex flex-col h-full border border-border bg-card p-6 pb-9 hover:border-primary/30 transition-all duration-300 overflow-hidden"
      style={{ boxShadow: 'var(--shadow-sm)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'; }}
    >
      <TerminalStatusStrip project={project} />
    <div className="mb-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-2">
        {project.category}
      </div>
      <h3 className="text-lg font-bold text-foreground leading-tight mb-1">
        {project.title}
      </h3>
    </div>

    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
      {project.metrics.map((m) => (
        <MetricBadge key={m.label} metric={m} />
      ))}
    </div>

    <p className="text-[12px] text-muted-foreground leading-relaxed font-light mb-6 flex-1">
      {project.description}
    </p>

    <div className="flex items-end justify-between gap-4 pt-4 mt-auto border-t border-border">
      <div className="flex flex-wrap gap-2">
        {project.stack.slice(0, 3).map((tech) => (
          <TechTag key={tech} tech={tech} />
        ))}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {project.github && (
          <a href={project.github} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
            <Github className="w-4 h-4" />
          </a>
        )}
        {project.liveUrl && (
          <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TIER LABEL                                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */

const TierLabel = ({ label, num }: { label: string; num: string }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <div ref={ref} className="flex items-center gap-4 mb-8 mt-16">
      <span className="font-mono text-[13px] text-primary">{num}</span>
      <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-foreground">
        {label}
      </span>
      <motion.div
        className="h-[1px] flex-1 bg-border origin-left"
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  FLAGSHIP SPOTLIGHT                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* Parses a metric string like "99.5%" or "1.5M+" into a numeric target +
   suffix for AnimatedCounter. Returns null for non-numeric metrics (e.g.
   "<10s", "Medallion") so the caller can fall back to plain text. */
function parseMetricForCounter(value: string): { target: number; suffix: string } | null {
  const match = value.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  return { target: parseFloat(match[1]), suffix: match[2] };
}

const FlagshipSpotlight = ({ project }: { project: Project }) => {
  const heroMetric = project.metrics[0];
  const parsed = heroMetric ? parseMetricForCounter(heroMetric.value) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative border border-primary/30 bg-card p-8 md:p-12 mb-8 overflow-hidden"
      style={{ boxShadow: 'var(--shadow-lg), var(--shadow-glow)' }}
    >
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-primary border border-primary/30 bg-primary/5 px-2.5 py-1">
          <Sparkles className="w-3 h-3" aria-hidden="true" />
          Featured System
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">// {project.timeline}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
        <div className="lg:col-span-8">
          <h3 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-3">
            {project.title}
          </h3>
          <p className="text-sm font-mono text-muted-foreground uppercase tracking-wide mb-6">
            {project.subtitle}
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed font-light max-w-2xl mb-8">
            {project.description}
          </p>
          <Link
            to={`/projects/${project.id}`}
            className="btn-structural inline-flex items-center gap-3 w-fit"
          >
            View Case Study
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {heroMetric && (
          <div className="lg:col-span-4 flex flex-col items-center lg:items-end text-center lg:text-right">
            <span className="text-5xl md:text-6xl font-mono font-bold text-primary tabular-nums">
              {parsed ? <AnimatedCounter target={parsed.target} suffix={parsed.suffix} /> : heroMetric.value}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-2">
              {heroMetric.label}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TECH FILTER                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

const ALL_TECH = Array.from(new Set(PROJECTS.flatMap((p) => p.stack))).sort();

const FilterChip = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`text-[10px] font-mono uppercase tracking-widest border px-3 py-1.5 transition-all ${
      active
        ? "border-primary bg-primary/10 text-primary"
        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
    }`}
  >
    {label}
  </button>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN SECTION                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */

const flagships = PROJECTS.filter((p) => p.tier === "flagship");
const production = PROJECTS.filter((p) => p.tier === "production");
const systems = PROJECTS.filter((p) => p.tier === "system");

// The spotlight is a fixed narrative anchor — always visible regardless of
// the tech filter — so it's pulled out of the filterable pool entirely
// rather than being just another card that could vanish mid-browse.
const spotlightProject = flagships[0];
const remainingFlagships = flagships.slice(1);
const filterablePool = PROJECTS.filter((p) => p.id !== spotlightProject.id);

const Projects: React.FC = () => {
  const [selectedTech, setSelectedTech] = React.useState<string[]>([]);

  const toggleTech = (tech: string) => {
    setSelectedTech((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    );
  };

  const matchesFilter = (project: Project) =>
    selectedTech.length === 0 || project.stack.some((t) => selectedTech.includes(t));

  const visibleFlagships = remainingFlagships.filter(matchesFilter);
  const visibleProduction = production.filter(matchesFilter);
  const visibleSystems = systems.filter(matchesFilter);
  const visibleCount = filterablePool.filter(matchesFilter).length;

  return (
    <section id="projects" data-section="projects" className="py-24 relative" aria-label="Projects and case studies">
      <div className="container px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">

        {/* Section Header */}
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <div className="flex items-center gap-3 text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase mb-4">
              <Terminal className="w-4 h-4 text-primary" />
              <span>Module 02 // Engineering</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Production <span className="text-muted-foreground font-normal font-mono">Systems</span>
            </h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-muted-foreground max-w-md text-[13px] leading-relaxed font-light"
          >
            Real systems designed and built for scale — focusing on data pipelines, architectural decisions, and resilient infrastructure.
          </motion.p>
        </div>

        {/* ── Featured System ── */}
        <FlagshipSpotlight project={spotlightProject} />

        {/* ── Tech Filter ── */}
        <div className="flex flex-col gap-4 mb-4 pb-8 border-b border-border">
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip label="All" active={selectedTech.length === 0} onClick={() => setSelectedTech([])} />
            {ALL_TECH.map((tech) => (
              <FilterChip
                key={tech}
                label={tech}
                active={selectedTech.includes(tech)}
                onClick={() => toggleTech(tech)}
              />
            ))}
          </div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Showing {visibleCount} of {filterablePool.length} systems
          </span>
        </div>

        {/* ── TIER 1: Flagship ── */}
        {visibleFlagships.length > 0 && (
          <motion.div layout>
            <TierLabel num="01" label="Flagship Architecture" />
            <div className="flex flex-col gap-8">
              <AnimatePresence mode="popLayout">
                {visibleFlagships.map((project, index) => (
                  <FlagshipCard key={project.id} project={project} index={index} />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── TIER 2: Production ── */}
        {visibleProduction.length > 0 && (
          <motion.div layout>
            <TierLabel num="02" label="Production Applications" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <AnimatePresence mode="popLayout">
                {visibleProduction.map((project, index) => (
                  <ProductionCard key={project.id} project={project} index={index} />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── TIER 3: Systems ── */}
        {visibleSystems.length > 0 && (
          <motion.div layout>
            <TierLabel num="03" label="System Prototypes" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {visibleSystems.map((project, index) => (
                  <SystemCard key={project.id} project={project} index={index} />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {visibleCount === 0 && (
          <div className="py-16 text-center">
            <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">
              No systems match this filter.
            </p>
          </div>
        )}

      </div>
    </section>
  );
};

export default Projects;