import React from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { ArrowRight, ExternalLink, Github, PenTool, Sparkles, Terminal } from "lucide-react";

import type { Project, ProjectMetric } from "@/types";
import { PROJECTS } from "@/data/projects";
import { STATUS_CLASS, STATUS_LABEL, projectStatus } from "@/lib/project";
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
  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest border border-border px-2 py-0.5 hover:border-primary/40 hover:text-foreground transition-colors cursor-default">
    {tech}
  </span>
);

/* Slide-up status line, revealed on hover and on keyboard focus.

   The status is derived from the project's actual links. The previous version
   printed "→ ONLINE" on every card unconditionally, including projects with
   no live URL and no public repository — a claim the card itself contradicted
   two rows below. */
const TerminalStatusStrip = ({ project }: { project: Project }) => {
  const status = projectStatus(project);
  const metric = project.metrics[0];

  return (
    <div
      className="absolute inset-x-0 bottom-0 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 transition-all duration-300 ease-out pointer-events-none z-10"
      aria-hidden="true"
    >
      <div className="px-4 py-2 bg-background/95 backdrop-blur-sm border-t border-primary/30 font-mono text-[10px] flex items-center gap-2 overflow-hidden">
        <span className="text-primary shrink-0">$</span>
        <span className="text-muted-foreground truncate">
          status --check {project.id} <span className={STATUS_CLASS[status]}>→ {STATUS_LABEL[status]}</span>
          {metric && (
            <>
              {" // "}
              {metric.label}: <span className="text-primary">{metric.value}</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
};

const LinkButtons = ({ project }: { project: Project }) => (
  <div className="flex items-center gap-4 shrink-0">
    <Link
      to={`/projects/${project.id}`}
      className="group/link flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-primary hover:text-primary-hover transition-colors"
    >
      Details
      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-1" aria-hidden="true" />
    </Link>
    {project.github && (
      <a
        href={project.github}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`${project.title} source code`}
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
        aria-label={`${project.title} live site`}
      >
        <ExternalLink className="w-4 h-4" aria-hidden="true" />
      </a>
    )}
  </div>
);

const CARD_MOTION = {
  layout: true,
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.2 } },
} as const;

const EASE = [0.16, 1, 0.3, 1] as const;

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CARDS                                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

const FlagshipCard = ({ project, index }: { project: Project; index: number }) => (
  <motion.article
    {...CARD_MOTION}
    transition={{ duration: 0.5, delay: Math.min(index * 0.1, 0.3), ease: EASE }}
    className="group card-elevate card-elevate-glow relative w-full border border-border bg-card p-6 md:p-10 pb-9 hover:border-primary/40 overflow-hidden"
  >
    <div className="absolute top-0 left-0 w-[2px] h-full bg-primary/60 group-hover:bg-primary transition-colors" />
    <TerminalStatusStrip project={project} />

    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8">
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">{project.category}</span>
          <span className="font-mono text-[10px] text-muted-foreground">// {project.timeline}</span>
        </div>
        <h3 className="text-2xl md:text-3xl font-bold text-foreground leading-tight mb-2">{project.title}</h3>
        <p className="text-sm font-mono text-muted-foreground uppercase tracking-wide">{project.subtitle}</p>
      </div>
      <LinkButtons project={project} />
    </div>

    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 border-y border-border mb-8">
      {project.metrics.map((m) => (
        <MetricBadge key={m.label} metric={m} />
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-5">
        <p className="text-sm text-foreground/80 leading-relaxed font-light">{project.description}</p>
      </div>

      <div className="lg:col-span-7 space-y-4">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
          Architecture Decisions
        </div>
        {project.decisions.map((d, i) => (
          <div key={d.title} className="flex gap-4">
            <span className="font-mono text-[11px] text-primary mt-0.5">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <span className="block text-[13px] font-semibold text-foreground mb-1">{d.title}</span>
              <p className="text-[12px] text-muted-foreground leading-relaxed font-light">{d.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="flex flex-wrap gap-2 pt-8 mt-8 border-t border-border">
      {project.stack.map((tech) => (
        <TechTag key={tech} tech={tech} />
      ))}
    </div>
  </motion.article>
);

const ProductionCard = ({ project, index }: { project: Project; index: number }) => (
  <motion.article
    {...CARD_MOTION}
    transition={{ duration: 0.5, delay: (index % 2) * 0.1, ease: EASE }}
    className="group card-elevate relative flex flex-col h-full border border-border bg-card hover:border-primary/30 overflow-hidden"
  >
    <TerminalStatusStrip project={project} />

    {/* Production applications are shipped products, so a glimpse of the
        actual interface earns its space here. Prototypes below stay
        text-only — a screenshot of a pipeline is not informative. */}
    {project.image && (
      <div className="w-full aspect-[16/7] overflow-hidden bg-muted border-b border-border relative">
        <img
          src={project.image}
          alt=""
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover object-top grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-90 transition-image-reveal"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
      </div>
    )}

    <div className="flex flex-col flex-1 p-6 md:p-8 pb-9">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-3">
            {project.category}
          </div>
          <h3 className="text-xl font-bold text-foreground leading-tight mb-1">{project.title}</h3>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide">{project.timeline}</p>
        </div>
        <LinkButtons project={project} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 border-y border-border mb-6">
        {project.metrics.map((m) => (
          <MetricBadge key={m.label} metric={m} />
        ))}
      </div>

      <p className="text-[13px] text-foreground/80 leading-relaxed font-light mb-6 flex-1">{project.description}</p>

      <div className="flex flex-wrap gap-2 pt-6 mt-auto border-t border-border">
        {project.stack.map((tech) => (
          <TechTag key={tech} tech={tech} />
        ))}
      </div>
    </div>
  </motion.article>
);

const SystemCard = ({ project, index }: { project: Project; index: number }) => (
  <motion.article
    {...CARD_MOTION}
    transition={{ duration: 0.5, delay: (index % 3) * 0.08, ease: EASE }}
    className="group card-elevate relative flex flex-col h-full border border-border bg-card p-6 pb-9 hover:border-primary/30 overflow-hidden"
  >
    <TerminalStatusStrip project={project} />

    <div className="mb-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-2">{project.category}</div>
      <h3 className="text-lg font-bold text-foreground leading-tight mb-1">{project.title}</h3>
    </div>

    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
      {project.metrics.map((m) => (
        <MetricBadge key={m.label} metric={m} />
      ))}
    </div>

    <p className="text-[12px] text-muted-foreground leading-relaxed font-light mb-6 flex-1">{project.description}</p>

    <div className="flex items-end justify-between gap-4 pt-4 mt-auto border-t border-border">
      <div className="flex flex-wrap gap-2">
        {project.stack.slice(0, 3).map((tech) => (
          <TechTag key={tech} tech={tech} />
        ))}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Link
          to={`/projects/${project.id}`}
          className="text-[10px] font-mono uppercase tracking-widest text-primary hover:text-primary-hover transition-colors"
        >
          Details
        </Link>
        {project.github && (
          <a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`${project.title} source code`}
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
            aria-label={`${project.title} live site`}
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  </motion.article>
);

/* Architecture study. Visually distinct from the shipped cards — a dashed
   border and an explicit badge — because the single worst outcome here is a
   reader assuming a blueprint is a running system. */
const DesignCard = ({ project, index }: { project: Project; index: number }) => (
  <motion.article
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 0.5, delay: (index % 2) * 0.08, ease: EASE }}
    className="group card-elevate relative flex flex-col h-full border border-dashed border-border bg-card/40 p-6 hover:border-amber-500/40"
  >
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <span className="inline-flex items-center gap-1.5 border border-amber-500/30 bg-amber-500/5 px-2 py-0.5">
        <PenTool className="w-3 h-3 text-amber-400" aria-hidden="true" />
        <span className="text-[9px] font-mono uppercase tracking-widest text-amber-400">Design stage</span>
      </span>
      <span className="font-mono text-[10px] text-muted-foreground">// {project.timeline}</span>
    </div>

    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-2">{project.category}</div>
    <h3 className="text-lg font-bold text-foreground leading-tight mb-1">{project.title}</h3>
    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-4">{project.subtitle}</p>

    {project.metrics.length > 0 && (
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
        {project.metrics.map((m) => (
          <MetricBadge key={m.label} metric={m} />
        ))}
      </div>
    )}

    <p className="text-[12px] text-muted-foreground leading-relaxed font-light flex-1">{project.description}</p>

    {project.stack.length > 0 && (
      <div className="flex flex-wrap gap-2 pt-4 mt-6 border-t border-border">
        {project.stack.map((tech) => (
          <TechTag key={tech} tech={tech} />
        ))}
      </div>
    )}
  </motion.article>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TIER LABEL                                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */

const TierLabel = ({ label, num }: { label: string; num: string }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex items-center gap-4 mb-8 mt-16"
    >
      <span className="font-mono text-[13px] text-primary">{num}</span>
      <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-foreground">{label}</span>
      <motion.div
        className="h-[1px] flex-1 bg-border origin-left"
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
      />
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  FLAGSHIP SPOTLIGHT                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* Parses "99.5%" or "1.5M+" into a numeric target plus suffix. Returns null
   for non-numeric metrics like "<10s" so the caller falls back to plain text. */
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
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="relative border border-primary/30 bg-card p-8 md:p-12 mb-8 overflow-hidden"
      style={{ boxShadow: "var(--shadow-lg), var(--shadow-glow)" }}
    >
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: EASE }}
        className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent origin-left"
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-primary border border-primary/30 bg-primary/5 px-2.5 py-1">
          <Sparkles className="w-3 h-3" aria-hidden="true" />
          Featured System
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">// {project.timeline}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
        <div className="lg:col-span-8">
          <h3 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-3">{project.title}</h3>
          <p className="text-sm font-mono text-muted-foreground uppercase tracking-wide mb-6">{project.subtitle}</p>
          <p className="text-sm text-foreground/80 leading-relaxed font-light max-w-2xl mb-8">
            {project.description}
          </p>
          <Link to={`/projects/${project.id}`} className="btn-structural inline-flex items-center gap-3 w-fit">
            View Case Study
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        {heroMetric && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25, ease: EASE }}
            className="lg:col-span-4 flex flex-col items-center lg:items-end text-center lg:text-right"
          >
            <span className="text-5xl md:text-6xl font-mono font-bold text-primary tabular-nums">
              {parsed ? <AnimatedCounter target={parsed.target} suffix={parsed.suffix} /> : heroMetric.value}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-2">
              {heroMetric.label}
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TECH FILTER                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* Ranked by how many projects actually use each technology.

   Rendering all ~40 technologies as equal-weight chips produced a wall that
   was slower to scan than the project list it filtered. The common ones —
   the ones that say something about what this person builds — are shown by
   default, with the long tail behind a toggle. */
/* Design studies are excluded from every filter surface below: they were
   never built, so ranking or filtering them by implementation stack would be
   filtering on a stack that does not exist yet. */
const BUILT = PROJECTS.filter((p) => p.tier !== "design");

const TECH_RANKED: { name: string; count: number }[] = Object.entries(
  BUILT.reduce<Record<string, number>>((acc, project) => {
    for (const tech of project.stack) acc[tech] = (acc[tech] ?? 0) + 1;
    return acc;
  }, {})
)
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

const PRIMARY_TECH_COUNT = 12;

const FilterChip = ({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest border px-3 py-1.5 transition-colors ${
      active
        ? "border-primary bg-primary/10 text-primary"
        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
    }`}
  >
    {label}
    {count !== undefined && <span className="text-muted-foreground/40 tabular-nums">{count}</span>}
  </button>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN SECTION                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */

const flagships = PROJECTS.filter((p) => p.tier === "flagship");
const production = PROJECTS.filter((p) => p.tier === "production");
const systems = PROJECTS.filter((p) => p.tier === "system");
const designs = PROJECTS.filter((p) => p.tier === "design");

// The spotlight is a fixed narrative anchor — always visible regardless of
// the tech filter — so it's pulled out of the filterable pool entirely
// rather than being just another card that could vanish mid-browse.
//
// Nullable by design: this runs at module scope, so an unconditional
// `flagships[0].id` would throw at *import* time — turning a data edit that
// merely retiers the last flagship into a blank page for the whole site.
const spotlightProject: Project | undefined = flagships[0];
const remainingFlagships = flagships.slice(1);
const filterablePool = spotlightProject ? BUILT.filter((p) => p.id !== spotlightProject.id) : BUILT;

const Projects: React.FC = () => {
  const [selectedTech, setSelectedTech] = React.useState<string[]>([]);
  const [showAllTech, setShowAllTech] = React.useState(false);

  const toggleTech = (tech: string) =>
    setSelectedTech((prev) => (prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]));

  const matchesFilter = React.useCallback(
    (project: Project) => selectedTech.length === 0 || project.stack.some((t) => selectedTech.includes(t)),
    [selectedTech]
  );

  const visibleFlagships = remainingFlagships.filter(matchesFilter);
  const visibleProduction = production.filter(matchesFilter);
  const visibleSystems = systems.filter(matchesFilter);
  const visibleCount = filterablePool.filter(matchesFilter).length;

  // Any selected technology stays visible even if it lives in the long tail,
  // so collapsing the list can never hide an active filter.
  const shownTech = showAllTech
    ? TECH_RANKED
    : TECH_RANKED.filter((t, i) => i < PRIMARY_TECH_COUNT || selectedTech.includes(t.name));
  const hiddenCount = TECH_RANKED.length - shownTech.length;

  return (
    <section id="projects" data-section="projects" className="py-24 relative" aria-label="Projects and case studies">
      <div className="container px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <div className="flex items-center gap-3 text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase mb-4">
              <Terminal className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Module 02 // Engineering</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Production <span className="text-muted-foreground font-normal font-mono">Systems</span>
            </h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="text-muted-foreground max-w-md text-[13px] leading-relaxed font-light"
          >
            Real systems designed and built for scale — focusing on data pipelines, architectural decisions, and
            resilient infrastructure.
          </motion.p>
        </div>

        {spotlightProject && <FlagshipSpotlight project={spotlightProject} />}

        {/* Filter */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          className="flex flex-col gap-4 mb-4 pb-8 border-b border-border"
        >
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip label="All" active={selectedTech.length === 0} onClick={() => setSelectedTech([])} />
            {shownTech.map((tech) => (
              <FilterChip
                key={tech.name}
                label={tech.name}
                count={tech.count}
                active={selectedTech.includes(tech.name)}
                onClick={() => toggleTech(tech.name)}
              />
            ))}
            {(hiddenCount > 0 || showAllTech) && (
              <button
                type="button"
                onClick={() => setShowAllTech((v) => !v)}
                aria-expanded={showAllTech}
                className="text-[10px] font-mono uppercase tracking-widest text-primary hover:text-primary-hover px-3 py-1.5 transition-colors"
              >
                {showAllTech ? "− Show less" : `+ ${hiddenCount} more`}
              </button>
            )}
          </div>

          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest" aria-live="polite">
            Showing {visibleCount} of {filterablePool.length} systems
          </span>
        </motion.div>

        {/* TIER 1 */}
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

        {/* TIER 2 */}
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

        {/* TIER 3 */}
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

        {/* The empty state belongs with the filtered tiers above it, not
            after the unfiltered section below. */}
        {visibleCount === 0 && (
          <div className="py-16 text-center">
            <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest mb-4">
              No systems match this filter.
            </p>
            <button
              type="button"
              onClick={() => setSelectedTech([])}
              className="text-[11px] font-mono uppercase tracking-widest text-primary hover:text-primary-hover transition-colors"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* TIER 4 — always rendered. These sit outside the tech filter
            entirely, so they neither appear in the count above nor vanish
            when a filter is applied. */}
        {designs.length > 0 && (
          <div>
            <TierLabel num="04" label="Architecture Studies" />
            <p className="text-[12px] text-muted-foreground leading-relaxed font-light max-w-2xl -mt-4 mb-8">
              Design-stage work — reference architectures and blueprints produced ahead of implementation. Not
              built, and not running in production.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {designs.map((project, index) => (
                <DesignCard key={project.id} project={project} index={index} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Projects;
