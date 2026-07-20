import React, { useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ExternalLink, Github, Terminal } from "lucide-react";
import { PROJECTS } from "@/data/projects";

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = PROJECTS.find((p) => p.id === id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <h1 className="text-2xl text-white/80 font-bold">Project Not Found</h1>
        <button onClick={() => navigate(-1)} className="text-primary hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 min-h-screen bg-background">
      <Helmet>
        <title>{project.title} | Case Study</title>
      </Helmet>
      
      <div className="container px-4 md:px-6 max-w-5xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Portfolio
        </Link>
        
        {/* Header */}
        <div className="mb-12">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-mono font-semibold uppercase tracking-wider border border-primary/20">
              {project.category}
            </span>
            <span className="text-[11px] font-mono text-white/50 border border-white/[0.05] px-2.5 py-1 rounded-full">
              {project.timeline}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white/90 mb-4 leading-tight">
            {project.title}
          </h1>
          <p className="text-xl text-white/60 font-light max-w-2xl">{project.subtitle}</p>
        </div>

        {/* Links & Metrics */}
        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-16 pb-8 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            {project.github && (
              <a href={project.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/70 hover:text-white hover:bg-white/[0.08] transition-all text-sm font-medium">
                <Github className="w-4 h-4" /> Source
              </a>
            )}
            {project.liveUrl && (
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-sm font-medium">
                <ExternalLink className="w-4 h-4" /> Live Demo
              </a>
            )}
          </div>
          <div className="hidden md:block w-px h-8 bg-white/[0.06]" />
          <div className="flex flex-wrap items-center gap-6">
            {project.metrics.map(m => (
              <div key={m.label} className="flex flex-col">
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">{m.label}</span>
                <span className="text-emerald-400 font-medium text-sm">{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Description & Decisions */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-7">
            <h2 className="text-xl font-medium text-white/80 mb-6 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" /> Overview
            </h2>
            <div className="prose prose-invert prose-p:text-white/60 prose-p:leading-relaxed prose-p:font-light max-w-none">
              <p>{project.description}</p>
            </div>
            
            <h2 className="text-xl font-medium text-white/80 mt-12 mb-6 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" /> Tech Stack
            </h2>
            <div className="flex flex-wrap gap-2">
              {project.stack.map(tech => (
                <span key={tech} className="px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-white/60 text-[13px]">
                  {tech}
                </span>
              ))}
            </div>
          </div>
          
          {project.decisions.length > 0 && (
            <div className="md:col-span-5 space-y-4">
              <h2 className="text-xl font-medium text-white/80 mb-6 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" /> Architecture
              </h2>
              {project.decisions.map((d, i) => (
                <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all">
                  <h3 className="text-[15px] font-medium text-white/80 mb-2">{d.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed font-light">{d.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
