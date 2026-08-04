import React, { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  Github,
  Info,
  Layers,
  Target,
} from "lucide-react";

import { PROJECTS } from "@/data/projects";
import { STATUS_CLASS, STATUS_LABEL, projectStatus } from "@/lib/project";
import type { Project } from "@/types";

const SITE_URL = "https://www.builtbyem.dev";
const getOrigin = () => (typeof window !== "undefined" ? window.location.origin : SITE_URL);

/* Search engines truncate around 155 characters; cutting on a word boundary
   keeps the snippet from ending mid-word. */
function truncate(text: string, max = 155): string {
  if (text.length <= max) return text;
  const clipped = text.slice(0, max);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

/* ── Section heading ── */

const SectionHeading = ({
  num,
  label,
  icon: Icon,
}: {
  num: string;
  label: string;
  icon: React.ElementType;
}) => (
  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
    <Icon className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
    <h2 className="text-sm font-mono uppercase tracking-widest text-foreground">{label}</h2>
    <span className="ml-auto font-mono text-[10px] text-muted-foreground/40 tracking-widest">{num}</span>
  </div>
);

/* ── Sidebar ── */

const MetaSidebar = ({ project }: { project: Project }) => {
  const status = projectStatus(project);

  return (
    // Column placement is owned by the motion wrapper that renders this, so
    // no col-span here — it would be inert anyway, since this is not a direct
    // child of the grid.
    <aside>
      <div className="lg:sticky lg:top-28 flex flex-col gap-8">
        {/* Status */}
        <div>
          <span className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] mb-3 block">
            // Status
          </span>
          <div className="flex items-center gap-2 border border-border bg-card px-3 py-2">
            <span
              className={`w-1.5 h-1.5 shrink-0 ${
                status === "live" ? "bg-emerald-500 status-live" : "bg-muted-foreground"
              }`}
              aria-hidden="true"
            />
            <span className={`text-[11px] font-mono uppercase tracking-widest ${STATUS_CLASS[status]}`}>
              {STATUS_LABEL[status]}
            </span>
          </div>
        </div>

        {/* Metrics */}
        {project.metrics.length > 0 && (
          <div>
            <span className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] mb-3 block">
              // Key Figures
            </span>
            <dl className="border border-border bg-card divide-y divide-border">
              {project.metrics.map((metric) => (
                <div key={metric.label} className="flex items-baseline justify-between gap-4 px-3 py-2.5">
                  <dt className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    {metric.label}
                  </dt>
                  <dd className="text-[12px] font-mono text-primary text-right">{metric.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Stack */}
        <div>
          <span className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] mb-3 block">
            // Stack
          </span>
          <ul className="flex flex-wrap gap-2">
            {project.stack.map((tech) => (
              <li
                key={tech}
                className="px-2.5 py-1 border border-border bg-card/50 text-muted-foreground text-[10px] font-mono uppercase tracking-wider"
              >
                {tech}
              </li>
            ))}
          </ul>
        </div>

        {/* Links */}
        {(project.github || project.liveUrl) && (
          <div>
            <span className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] mb-3 block">
              // Links
            </span>
            <div className="flex flex-col gap-2">
              {project.github && (
                <a
                  href={project.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between border border-border bg-card px-3 py-2.5 hover:border-primary/40 transition-colors"
                >
                  <span className="flex items-center gap-2.5 text-muted-foreground group-hover:text-foreground transition-colors">
                    <Github className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="text-[11px] font-mono uppercase tracking-wider">Source Code</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </a>
              )}
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between border border-border bg-card px-3 py-2.5 hover:border-primary/40 transition-colors"
                >
                  <span className="flex items-center gap-2.5 text-muted-foreground group-hover:text-foreground transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="text-[11px] font-mono uppercase tracking-wider">Live Demo</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

/* ── Page ── */

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const project = PROJECTS.find((p) => p.id === id);
  const projectIndex = PROJECTS.findIndex((p) => p.id === id);

  // Wrap at both ends so navigation never dead-ends on the first or last project.
  const previousProject =
    projectIndex >= 0 ? PROJECTS[(projectIndex - 1 + PROJECTS.length) % PROJECTS.length] : null;
  const nextProject = projectIndex >= 0 ? PROJECTS[(projectIndex + 1) % PROJECTS.length] : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const seo = useMemo(() => {
    if (!project) return null;
    const origin = getOrigin();
    const canonical = `${origin}/projects/${project.id}`;
    const description = truncate(project.caseStudy?.problem ?? project.description);
    const image = project.image
      ? `${origin}${project.image}`
      : `${origin}/og-image.jpg`;

    /* SoftwareSourceCode is the accurate schema.org type for an engineering
       project page — more specific than CreativeWork, and it lets the stack
       be expressed as programmingLanguage rather than loose keywords. */
    const projectSchema = {
      "@context": "https://schema.org",
      "@type": "SoftwareSourceCode",
      name: project.title,
      alternateName: project.subtitle,
      description: project.caseStudy?.approach ?? project.description,
      url: canonical,
      ...(project.github ? { codeRepository: project.github } : {}),
      programmingLanguage: project.stack,
      applicationCategory: project.category,
      author: {
        "@type": "Person",
        name: "Emmanuel Moghalu",
        url: origin,
      },
      ...(project.image ? { image } : {}),
    };

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: origin },
        { "@type": "ListItem", position: 2, name: "Projects", item: `${origin}/#projects` },
        { "@type": "ListItem", position: 3, name: project.title, item: canonical },
      ],
    };

    return { canonical, description, image, projectSchema, breadcrumbSchema };
  }, [project]);

  if (!project || !seo) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 bg-background noise-overlay">
        <Helmet>
          <title>Project not found | Emmanuel Moghalu</title>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <h1 className="text-2xl text-foreground font-bold font-mono tracking-tighter">404 // NOT_FOUND</h1>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-primary hover:underline font-mono text-sm"
        >
          Return to root
        </button>
      </div>
    );
  }

  const { caseStudy } = project;
  const title = `${project.title} — ${project.subtitle} | Emmanuel Moghalu`;

  return (
    <div className="pt-32 pb-24 min-h-screen bg-background relative selection:bg-primary/20 selection:text-primary">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href={seo.canonical} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <meta name="author" content="Emmanuel C. Moghalu" />

        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Emmanuel C. Moghalu — Engineering Logs" />
        <meta property="og:title" content={`${project.title} — ${project.subtitle}`} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={seo.canonical} />
        <meta property="og:image" content={seo.image} />
        <meta property="og:image:alt" content={`${project.title} — ${project.subtitle}`} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@mrebr" />
        <meta name="twitter:creator" content="@mrebr" />
        <meta name="twitter:title" content={`${project.title} — ${project.subtitle}`} />
        <meta name="twitter:description" content={seo.description} />
        <meta name="twitter:image" content={seo.image} />

        <script type="application/ld+json">{JSON.stringify(seo.projectSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(seo.breadcrumbSchema)}</script>
      </Helmet>

      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none noise-overlay" />
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 50% at 50% 0%, #000 20%, transparent 90%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 50% at 50% 0%, #000 20%, transparent 90%)",
        }}
      />

      <div className="container px-6 md:px-12 max-w-6xl mx-auto relative z-10">
        {/* Breadcrumb */}
        <motion.nav
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap items-center gap-2 mb-12"
          aria-label="Breadcrumb"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-[11px] font-mono uppercase tracking-widest group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
            Home
          </Link>
          <span className="text-muted-foreground/30 font-mono text-[11px]" aria-hidden="true">
            /
          </span>
          {/* Now a real link — this was inert text before. */}
          <Link
            to="/#projects"
            className="text-muted-foreground/60 hover:text-foreground transition-colors font-mono text-[11px] uppercase tracking-widest"
          >
            Projects
          </Link>
          <span className="text-muted-foreground/30 font-mono text-[11px]" aria-hidden="true">
            /
          </span>
          <span className="text-primary font-mono text-[11px] uppercase tracking-widest" aria-current="page">
            {project.title}
          </span>
        </motion.nav>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-mono uppercase tracking-[0.2em] border border-primary/20">
              {project.category}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground border border-border px-3 py-1 uppercase tracking-widest">
              {project.timeline}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-5 leading-[1.1]">
            {project.title}
          </h1>
          <p className="text-xl text-muted-foreground font-light max-w-3xl leading-relaxed">
            {project.subtitle}
          </p>
        </motion.header>

        {/* Image */}
        {project.image && (
          <motion.figure
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="w-full border border-border bg-card p-1.5 md:p-2 relative group overflow-hidden mb-16 transition-colors duration-500 hover:border-primary/50"
            style={{ boxShadow: "var(--shadow-md), var(--shadow-glow)" }}
          >
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="w-full aspect-video overflow-hidden relative bg-muted">
              <img
                src={project.image}
                alt={`${project.title} interface`}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover object-top grayscale-[0.6] opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-image-reveal"
              />
            </div>
          </motion.figure>
        )}

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <motion.article
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-8 flex flex-col gap-16"
          >
            {/* Scope notice — stated up front, not buried. Being explicit about
                what is synthetic is a credibility gain, not a disclaimer. */}
            {caseStudy?.notice && (
              <div className="flex gap-4 border border-amber-500/25 bg-amber-500/5 p-5">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="block text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400 mb-2">
                    Scope Notice
                  </span>
                  <p className="text-[13px] text-muted-foreground leading-relaxed font-light">
                    {caseStudy.notice}
                  </p>
                </div>
              </div>
            )}

            {caseStudy ? (
              <>
                <section>
                  <SectionHeading num="01" label="The Problem" icon={AlertTriangle} />
                  <p className="text-[15px] text-muted-foreground leading-relaxed font-light">
                    {caseStudy.problem}
                  </p>
                </section>

                <section>
                  <SectionHeading num="02" label="The Approach" icon={Layers} />
                  <p className="text-[15px] text-muted-foreground leading-relaxed font-light">
                    {caseStudy.approach}
                  </p>
                </section>

                <section>
                  <SectionHeading num="03" label="The Outcome" icon={Target} />
                  <p className="text-[15px] text-muted-foreground leading-relaxed font-light">
                    {caseStudy.outcome}
                  </p>

                  {caseStudy.highlights && caseStudy.highlights.length > 0 && (
                    <ul className="mt-8 flex flex-col gap-3">
                      {caseStudy.highlights.map((item) => (
                        <li key={item} className="flex items-start gap-3">
                          <CheckCircle2
                            className="w-3.5 h-3.5 text-primary shrink-0 mt-1"
                            aria-hidden="true"
                          />
                          <span className="text-[13px] text-foreground/75 leading-relaxed font-light">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {caseStudy.tradeoffs && caseStudy.tradeoffs.length > 0 && (
                  <section>
                    <SectionHeading num="04" label="Trade-offs" icon={GitBranch} />
                    <div className="flex flex-col gap-px bg-border border border-border">
                      {caseStudy.tradeoffs.map((tradeoff) => (
                        <div key={tradeoff.decision} className="bg-card p-5">
                          <span className="block text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">
                            {tradeoff.decision}
                          </span>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
                            <span className="text-[12px] font-mono text-emerald-400 border border-emerald-500/25 bg-emerald-500/5 px-2 py-0.5">
                              {tradeoff.chose}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                              over
                            </span>
                            <span className="text-[12px] font-mono text-muted-foreground/70 border border-border px-2 py-0.5 line-through decoration-muted-foreground/40">
                              {tradeoff.rejected}
                            </span>
                          </div>
                          <p className="text-[13px] text-muted-foreground leading-relaxed font-light">
                            {tradeoff.why}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              /* No verified long-form source for this project — render the
                 short form rather than padding the template with invention. */
              <section>
                <SectionHeading num="01" label="Overview" icon={Layers} />
                <p className="text-[15px] text-muted-foreground leading-relaxed font-light">
                  {project.description}
                </p>
              </section>
            )}

            {/* Decisions are suppressed once trade-offs exist.

                Both describe the same choices, but a trade-off names the
                rejected alternative and a decision does not — so showing both
                meant reading the Redpanda rationale (or DuckDB, or semantic
                clustering) twice on one page, the second time with less
                information. The data is kept because the flagship listing
                cards still render it. */}
            {project.decisions.length > 0 && !caseStudy?.tradeoffs?.length && (
              <section>
                <SectionHeading
                  num={caseStudy ? "04" : "02"}
                  label="Architecture Decisions"
                  icon={GitBranch}
                />
                <div className="flex flex-col gap-6">
                  {project.decisions.map((decision, i) => (
                    <div key={decision.title} className="flex gap-4">
                      <span className="font-mono text-[11px] text-primary mt-1 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3 className="text-[13px] font-semibold text-foreground mb-2">{decision.title}</h3>
                        <p className="text-[13px] text-muted-foreground leading-relaxed font-light">
                          {decision.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </motion.article>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-4"
          >
            <MetaSidebar project={project} />
          </motion.div>
        </div>

        {/* Adjacent navigation */}
        {(previousProject || nextProject) && (
          <nav
            className="mt-24 pt-8 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4"
            aria-label="Adjacent projects"
          >
            {previousProject && (
              <Link
                to={`/projects/${previousProject.id}`}
                className="group flex items-center gap-4 p-6 border border-border bg-card/30 hover:border-primary/40 transition-colors"
              >
                <ArrowLeft
                  className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all shrink-0"
                  aria-hidden="true"
                />
                <span>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block mb-2">
                    Previous
                  </span>
                  <span className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {previousProject.title}
                  </span>
                </span>
              </Link>
            )}
            {nextProject && (
              <Link
                to={`/projects/${nextProject.id}`}
                className="group flex items-center justify-between gap-4 p-6 border border-border bg-card/30 hover:border-primary/40 transition-colors sm:col-start-2"
              >
                <span className="text-right sm:text-left ml-auto sm:ml-0">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block mb-2">
                    Next
                  </span>
                  <span className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {nextProject.title}
                  </span>
                </span>
                <ArrowRight
                  className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0"
                  aria-hidden="true"
                />
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;
