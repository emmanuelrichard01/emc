import React from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ExternalLink, Github, LayoutGrid, List, Sparkles, Terminal } from "lucide-react";

import type { Project, ProjectMetric } from "@/types";
import { PROJECTS } from "@/data/projects";
import { STATUS_CLASS, STATUS_LABEL, projectStatus } from "@/lib/project";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import ProjectIndex from "@/components/projects/ProjectIndex";

/* ==========================================================================
   PROJECTS

   One spotlight, then an index. Cards are the alternate view, not the
   default.

   This section was four self-declared tiers of cards — "01 Flagship
   Architecture" through "04 Architecture Studies" — running 4,454px, half
   the page, for twelve projects. Every card carried a category, a year, a
   title, a subtitle, a metric row, a description paragraph, two architecture
   decisions and its full stack. All of that is written better, at length, on
   the case-study pages; repeating it here meant the section competed with
   the thing it exists to route people into.

   The four tier banners are gone, but the tier system is not. It survives
   as a group rule inside the index — a rank glyph (▍▍▍ down to ┆) and a
   hairline carrying the name — plus a filter. Grouping is preserved at one
   line per tier instead of a heading block, which is what makes the
   taxonomy available without it dominating the page.

   All text runs at full token opacity. Dimming muted-foreground to 40%
   measures 1.76:1 on this background where AA wants 4.5:1; only ≥ 0.9
   passes. Quiet is done with size and tracking here, never with alpha.

   Design-stage work stays visibly distinct wherever it appears — the status
   column reads DESIGN STAGE in amber, and the note below the controls says
   plainly that it is not built. That guarantee is the one thing the redesign
   was not allowed to cost.
   ========================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SHARED                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* One grammar for a metric, everywhere.

   Previously there were three: a giant animated percentage in the spotlight,
   `[Records: 1.5M+]` brackets on flagship cards, and the same brackets
   stacked on prototypes. Label above, figure below, mono and tabular. */
const Metric = ({ metric }: { metric: ProjectMetric }) => (
  <div className="flex flex-col gap-0.5 min-w-0">
    <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-muted-foreground truncate">
      {metric.label}
    </span>
    <span className="font-mono text-[12px] text-primary tabular-nums truncate">{metric.value}</span>
  </div>
);

const TechTag = ({ tech }: { tech: string }) => (
  <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider border border-border/70 px-1.5 py-0.5">
    {tech}
  </span>
);

const ExternalLinks = ({ project }: { project: Project }) => (
  <span className="flex items-center gap-3 shrink-0">
    {project.github && (
      <a
        href={project.github}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`${project.title} source code`}
      >
        <Github className="w-3.5 h-3.5" aria-hidden="true" />
      </a>
    )}
    {project.liveUrl && (
      <a
        href={project.liveUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`${project.title} live site`}
      >
        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
      </a>
    )}
  </span>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CARD                                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* One card, not four.

   The tiers used to each get their own component and layout, which is how a
   section ends up with three ways to draw a metric. Tier is expressed by the
   status line and a dashed border for design work — a difference in data,
   not in construction. */
const ProjectCard = ({ project, index }: { project: Project; index: number }) => {
  const status = projectStatus(project);
  const isDesign = project.tier === "design";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.2), ease: EASE }}
      className={`group relative flex flex-col p-5 bg-card/25 hover:border-primary/40 transition-colors ${
        isDesign ? "border border-dashed border-border" : "border border-border/70"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary truncate">
          {project.category}
        </span>
        <span className={`font-mono text-[9px] uppercase tracking-wider shrink-0 ${STATUS_CLASS[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* Stretched link, rather than wrapping the card in one.

          The repo links below are anchors, and an anchor cannot contain
          another anchor — the browser force-closes the outer one and the DOM
          comes out mangled. Pinning a pseudo-element from the title covers
          the whole card for pointer users while leaving exactly one link in
          the accessibility tree for the card itself. */}
      <h3 className="font-mono text-[15px] leading-tight">
        <Link
          to={`/projects/${project.id}`}
          className="text-foreground group-hover:text-primary transition-colors before:absolute before:inset-0 before:content-['']"
        >
          {project.title}
        </Link>
      </h3>
      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{project.subtitle}</p>

      {project.metrics.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-border/50">
          {project.metrics.slice(0, 3).map((metric) => (
            <Metric key={metric.label} metric={metric} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1 mt-4">
        {project.stack.slice(0, 5).map((tech) => (
          <TechTag key={tech} tech={tech} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 mt-auto pt-4">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-primary group-hover:text-primary transition-colors">
          case study
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
        </span>
        {/* Above the stretched link, so these stay individually clickable. */}
        <span className="relative z-10">
          <ExternalLinks project={project} />
        </span>
      </div>
    </motion.article>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SPOTLIGHT                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

/** Parses "99.5%" or "1.5M+" into a target plus suffix; null for "<10s". */
function parseMetricForCounter(value: string): { target: number; suffix: string } | null {
  const match = value.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  return { target: parseFloat(match[1]), suffix: match[2] };
}

const Spotlight = ({ project }: { project: Project }) => {
  const heroMetric = project.metrics[0];
  const parsed = heroMetric ? parseMetricForCounter(heroMetric.value) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative border border-primary/25 bg-card/40 p-6 md:p-8 mb-10"
    >
      <span className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-primary/70 via-primary/20 to-transparent" />

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="min-w-0">
          <span className="flex flex-wrap items-center gap-3 mb-4">
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-primary border border-primary/30 bg-primary/5 px-2 py-1">
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              featured
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              {project.category} · {project.timeline}
            </span>
          </span>

          <h3 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{project.title}</h3>
          <p className="font-mono text-[12px] text-muted-foreground mt-2">{project.subtitle}</p>

          <Link to={`/projects/${project.id}`} className="btn-structural inline-flex items-center gap-3 w-fit mt-6">
            View Case Study
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        {heroMetric && (
          <div className="flex flex-col items-start lg:items-end shrink-0">
            <span className="font-mono text-4xl md:text-5xl font-bold text-primary tabular-nums leading-none">
              {parsed ? <AnimatedCounter target={parsed.target} suffix={parsed.suffix} /> : heroMetric.value}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mt-2">
              {heroMetric.label}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONTROLS                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

const Chip = ({
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
    className={`inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest border px-2.5 py-1 transition-colors ${
      active
        ? "border-primary bg-primary/10 text-primary"
        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
    }`}
  >
    {label}
    {count !== undefined && <span className="text-muted-foreground tabular-nums">{count}</span>}
  </button>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SECTION                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

const TIERS = ["flagship", "production", "system", "design"] as const;

// Ranked by real usage, so the common technologies — the ones that say
// something about what this person builds — lead.
const TECH_RANKED: { name: string; count: number }[] = Object.entries(
  PROJECTS.reduce<Record<string, number>>((acc, project) => {
    for (const tech of project.stack) acc[tech] = (acc[tech] ?? 0) + 1;
    return acc;
  }, {})
)
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

const PRIMARY_TECH_COUNT = 10;

const spotlightProject: Project | undefined = PROJECTS.find((p) => p.tier === "flagship");
// Nullable by design: an unconditional [0].id would throw at *import* time,
// turning a data edit that retiers the last flagship into a blank page.
const pool = spotlightProject ? PROJECTS.filter((p) => p.id !== spotlightProject.id) : PROJECTS;

const Projects: React.FC = () => {
  const [view, setView] = React.useState<"index" | "cards">("index");
  const [tier, setTier] = React.useState<string | null>(null);
  const [selectedTech, setSelectedTech] = React.useState<string[]>([]);
  const [showAllTech, setShowAllTech] = React.useState(false);

  const toggleTech = (tech: string) =>
    setSelectedTech((prev) => (prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]));

  const visible = React.useMemo(
    () =>
      pool.filter(
        (project) =>
          (tier === null || project.tier === tier) &&
          (selectedTech.length === 0 || project.stack.some((t) => selectedTech.includes(t)))
      ),
    [tier, selectedTech]
  );

  // A selected technology stays visible even if it lives in the long tail, so
  // collapsing the list can never hide an active filter.
  const shownTech = showAllTech
    ? TECH_RANKED
    : TECH_RANKED.filter((t, i) => i < PRIMARY_TECH_COUNT || selectedTech.includes(t.name));
  const hiddenCount = TECH_RANKED.length - shownTech.length;

  const showsDesign = visible.some((p) => p.tier === "design");

  return (
    <section id="projects" data-section="projects" className="py-24 relative" aria-label="Projects and case studies">
      <div className="container px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-10"
        >
          <span className="flex items-center gap-3 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
            <Terminal className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            Module 02 // Engineering
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Systems <span className="text-muted-foreground font-mono font-normal">/ {PROJECTS.length}</span>
          </h2>
        </motion.div>

        {spotlightProject && <Spotlight project={spotlightProject} />}

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-3 mb-5"
        >
          <div className="flex flex-wrap items-center gap-2">
            {/* View toggle */}
            <span className="flex items-center border border-border" role="group" aria-label="View">
              {(
                [
                  { key: "index", icon: List, label: "Index" },
                  { key: "cards", icon: LayoutGrid, label: "Cards" },
                ] as const
              ).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  aria-pressed={view === key}
                  aria-label={`${label} view`}
                  className={`flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest px-2.5 py-1 transition-colors ${
                    view === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3 h-3" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </span>

            <span className="w-px h-5 bg-border mx-1" aria-hidden="true" />

            {/* Tier — a filter now, not four headings down the page */}
            <Chip label="All" active={tier === null} onClick={() => setTier(null)} />
            {TIERS.map((name) => {
              const count = pool.filter((p) => p.tier === name).length;
              if (!count) return null;
              return (
                <Chip
                  key={name}
                  label={name}
                  count={count}
                  active={tier === name}
                  onClick={() => setTier(tier === name ? null : name)}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {shownTech.map((tech) => (
              <Chip
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
                className="font-mono text-[9px] uppercase tracking-widest text-primary hover:text-primary px-2 py-1 transition-colors"
              >
                {showAllTech ? "− less" : `+ ${hiddenCount} more`}
              </button>
            )}
            {(selectedTech.length > 0 || tier !== null) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTech([]);
                  setTier(null);
                }}
                className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground px-2 py-1 transition-colors"
              >
                reset
              </button>
            )}
          </div>

          <span
            className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground"
            aria-live="polite"
          >
            showing {visible.length} of {pool.length}
            {spotlightProject ? " · 1 featured above" : ""}
          </span>
        </motion.div>

        {/* Design-stage caveat, shown only when such a row is actually on
            screen — the one guarantee this redesign was not allowed to cost. */}
        {showsDesign && (
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-5 max-w-2xl">
            Rows marked <span className="text-amber-400 font-mono">DESIGN STAGE</span> are reference
            architectures produced ahead of implementation — specified, not built, and not running in
            production.
          </p>
        )}

        {/* Results */}
        {visible.length === 0 ? (
          <div className="py-16 text-center border border-border/60">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
              nothing matches this filter
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedTech([]);
                setTier(null);
              }}
              className="font-mono text-[10px] uppercase tracking-widest text-primary hover:text-primary-hover transition-colors"
            >
              reset filters
            </button>
          </div>
        ) : view === "index" ? (
          <ProjectIndex projects={visible} grouped={tier === null} />
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {visible.map((project, index) => (
                <ProjectCard key={project.id} project={project} index={index} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default Projects;
