import React, { useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ArrowRight, ExternalLink, Github, Activity, Database, GitBranch } from "lucide-react";
import { motion } from "framer-motion";
import { PROJECTS } from "@/data/projects";
import { StructuralCard } from "@/components/ui/StructuralCard";

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = PROJECTS.find((p) => p.id === id);
  const projectIndex = PROJECTS.findIndex((p) => p.id === id);
  // Wrap around at both ends so navigation never dead-ends on the first/last project.
  const previousProject = projectIndex >= 0
    ? PROJECTS[(projectIndex - 1 + PROJECTS.length) % PROJECTS.length]
    : null;
  const nextProject = projectIndex >= 0
    ? PROJECTS[(projectIndex + 1) % PROJECTS.length]
    : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 bg-background noise-overlay">
        <h1 className="text-2xl text-foreground font-bold font-mono tracking-tighter">404 // NOT_FOUND</h1>
        <button onClick={() => navigate(-1)} className="text-primary hover:underline font-mono text-sm">
          Return to root
        </button>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 min-h-screen bg-background relative selection:bg-primary/20 selection:text-primary">
      {/* Background Grids */}
      <div className="absolute inset-0 z-0 pointer-events-none noise-overlay" />
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
           style={{
             backgroundImage: 'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)',
             backgroundSize: '48px 48px'
           }}
      />

      <Helmet>
        <title>{project.title} | Case Study</title>
      </Helmet>

      <div className="container px-4 md:px-6 max-w-5xl mx-auto relative z-10">
        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 mb-12"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-[11px] font-mono uppercase tracking-widest group">
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            Home
          </Link>
          <span className="text-muted-foreground/30 font-mono text-[11px]">/</span>
          <span className="text-muted-foreground/30 font-mono text-[11px] uppercase tracking-widest">Projects</span>
          <span className="text-muted-foreground/30 font-mono text-[11px]">/</span>
          <span className="text-primary font-mono text-[11px] uppercase tracking-widest truncate max-w-[200px]">{project.title}</span>
        </motion.div>

        {/* Header & Image Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-12 mb-16 items-start">
          
          {/* Header Text & Metrics (Left) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`flex flex-col ${project.image ? 'lg:col-span-7' : 'lg:col-span-12'}`}
          >
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-mono uppercase tracking-[0.2em] border border-primary/20">
                {project.category}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground border border-border px-3 py-1 uppercase tracking-widest">
                {project.timeline}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight">
              {project.title}
            </h1>
            <p className="text-xl text-muted-foreground font-light max-w-2xl leading-relaxed mb-10">
              {project.subtitle}
            </p>

            {/* Metrics & Links */}
            <div className="flex flex-col gap-6 pb-8 border-b border-border/50">
              {/* Metrics */}
              <div className="flex flex-wrap items-center gap-8">
                {project.metrics.map(m => (
                  <div key={m.label} className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{m.label}</span>
                    <span className="text-primary font-mono text-sm tracking-tight">{m.value}</span>
                  </div>
                ))}
              </div>

              {/* Links */}
              <div className="flex items-center gap-4 mt-2">
                {project.github && (
                  <a href={project.github} target="_blank" rel="noopener noreferrer" className="btn-structural flex items-center gap-2 text-xs">
                    <Github className="w-3.5 h-3.5" /> Source Code
                  </a>
                )}
                {project.liveUrl && (
                  <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost-structural flex items-center gap-2 text-xs border-primary/50 text-primary hover:bg-primary/10">
                    <ExternalLink className="w-3.5 h-3.5" /> Live Demo
                  </a>
                )}
              </div>
            </div>
          </motion.div>

          {/* Project Image (Right) */}
          {project.image && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 w-full border border-border bg-card p-1.5 md:p-2 relative group overflow-hidden mt-2 lg:mt-0 transition-colors duration-500 hover:border-primary/50"
              style={{ boxShadow: 'var(--shadow-md), var(--shadow-glow)' }}
            >
              {/* Structural corner accents (appear on hover) */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Scanline overlay */}
              <div className="absolute inset-0 pointer-events-none z-10 mix-blend-overlay opacity-30"
                   style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.5) 2px, rgba(0,0,0,0.5) 4px)' }} 
              />

              <div className="w-full aspect-video overflow-hidden relative bg-muted">
                {/* Primary tint overlay that fades on hover */}
                <div className="absolute inset-0 bg-primary/20 mix-blend-overlay z-10 group-hover:opacity-0 transition-opacity duration-700" />
                <img
                  src={project.image}
                  alt={`${project.title} dashboard overview`}
                  loading="eager"
                  decoding="async"
                  className="w-full h-full object-contain object-center grayscale-[0.8] opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-image-reveal"
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Description & Decisions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-7"
          >
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border/50">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-mono uppercase tracking-widest text-foreground">
                Overview
              </h2>
            </div>
            <div className="prose prose-invert prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:font-light max-w-none text-[15px]">
              <p>{project.description}</p>
            </div>

            <div className="flex items-center gap-3 mt-16 mb-8 pb-4 border-b border-border/50">
              <Database className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-mono uppercase tracking-widest text-foreground">
                Tech Stack
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {project.stack.map(tech => (
                <span key={tech} className="px-3 py-1.5 border border-border bg-card/50 text-muted-foreground text-[11px] font-mono uppercase tracking-wider hover:border-primary/40 hover:text-primary transition-all cursor-default">
                  {tech}
                </span>
              ))}
            </div>
          </motion.div>

          {project.decisions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="lg:col-span-5 space-y-6"
            >
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border/50">
                <GitBranch className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-mono uppercase tracking-widest text-foreground">
                  Architecture Decisions
                </h2>
              </div>
              <div className="flex flex-col gap-6">
                {project.decisions.map((d, i) => (
                  <StructuralCard key={i} className="p-6">
                    <h3 className="text-[13px] font-mono uppercase tracking-wider text-foreground mb-3">{d.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-light">{d.detail}</p>
                  </StructuralCard>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Adjacent Project Navigation */}
        {(previousProject || nextProject) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-24 pt-8 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {previousProject && (
              <Link
                to={`/projects/${previousProject.id}`}
                className="group flex items-center gap-4 p-6 border border-border bg-card/30 hover:border-primary/40 transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all shrink-0" />
                <div>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block mb-2">
                    Previous Project
                  </span>
                  <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {previousProject.title}
                  </span>
                </div>
              </Link>
            )}
            {nextProject && (
              <Link
                to={`/projects/${nextProject.id}`}
                className="group flex items-center justify-between gap-4 p-6 border border-border bg-card/30 hover:border-primary/40 transition-all sm:col-start-2"
              >
                <div className="text-right sm:text-left ml-auto sm:ml-0">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block mb-2">
                    Next Project
                  </span>
                  <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {nextProject.title}
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
              </Link>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;
