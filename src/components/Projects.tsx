import React, { useState, useEffect, useMemo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Github,
  ExternalLink,
  X,
  Layers,
  Cpu,
  Globe,
  Zap,
  ArrowUpRight,
  Database,
  BarChart3,
  Server
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* -------------------------------------------------------------------------- */
/* DATA & TYPES                                                               */
/* -------------------------------------------------------------------------- */

type ProjectMetric = {
  label: string;
  value: string;
};

type Project = {
  id: number;
  title: string;
  tagline: string;
  description: string;
  image: string;
  technologies: string[];
  category: string;
  github?: string;
  demo?: string;
  problemSolved?: string;
  impact?: string;
  year: string;
  // Visual identity
  color: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  // Quantitative stats for the "Metrics-First" approach
  metrics: ProjectMetric[];
};

const PLACEHOLDERS = {
  data: "https://images.unsplash.com/photo-1625296276703-3fbc924f07b5?q=80&w=870&auto=format&fit=crop",
  ai: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1000&auto=format&fit=crop",
  ecommerce: "https://images.unsplash.com/photo-1642132652860-471b4228023e?q=80&w=1460&auto=format&fit=crop",
  iot: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop"
};

const PROJECTS_DATA: Project[] = [
  {
    id: 1,
    title: 'DataFlow Analytics',
    tagline: 'Real-time Stream Processing Engine',
    description: 'A comprehensive data analytics platform that processes millions of records daily with real-time visualizations and anomaly detection.',
    image: PLACEHOLDERS.data,
    technologies: ['Kafka', 'React', 'Python', 'PostgreSQL', 'Docker'],
    category: 'Data Engineering',
    github: 'https://github.com/emmanuelmoghalu/dataflow-analytics',
    demo: 'https://dataflow-demo.vercel.app',
    year: "2024",
    color: "from-blue-600 to-cyan-500",
    icon: Database,
    problemSolved: 'Fragmented data sources and 24h+ reporting delays made real-time decision making impossible for enterprise clients.',
    impact: 'Unified 12+ data streams and reduced reporting latency from 24 hours to 300ms.',
    metrics: [
      { label: 'Daily Records', value: '10M+' },
      { label: 'Latency', value: '<300ms' },
      { label: 'Clients', value: '50+' }
    ]
  },
  {
    id: 2,
    title: 'Neural Code Reviewer',
    tagline: 'AI-Powered Static Analysis',
    description: 'Machine learning tool that automates code review processes, detecting bugs and suggesting optimizations using NLP.',
    image: PLACEHOLDERS.ai,
    technologies: ['TensorFlow', 'FastAPI', 'Python', 'AWS Lambda'],
    category: 'Machine Learning',
    github: '#',
    demo: '#',
    year: "2023",
    color: "from-emerald-600 to-teal-500",
    icon: Cpu,
    problemSolved: 'Manual code reviews were creating bottlenecks, with inconsistent quality checks across distributed teams.',
    impact: 'Automated 40% of trivial review tasks, freeing up senior engineer time by approx 15 hours/week.',
    metrics: [
      { label: 'Accuracy', value: '94%' },
      { label: 'Time Saved', value: '60%' },
      { label: 'Users', value: '500+' }
    ]
  },
  {
    id: 3,
    title: 'Nebula E-commerce',
    tagline: 'Headless High-Scale Retail',
    description: 'Modern microservices-based e-commerce solution architected for high-traffic flash sales and inventory synchronization.',
    image: PLACEHOLDERS.ecommerce,
    technologies: ['Next.js', 'GraphQL', 'Redis', 'Kubernetes'],
    category: 'Full-Stack',
    github: '#',
    demo: '#',
    year: "2023",
    color: "from-purple-600 to-pink-500",
    icon: Globe,
    problemSolved: 'Legacy monolithic architecture crashed during Black Friday spikes, resulting in $50k+ lost revenue per hour.',
    impact: 'Achieved 99.99% uptime during peak traffic of 10k concurrent users.',
    metrics: [
      { label: 'Uptime', value: '99.99%' },
      { label: 'Concurrent', value: '10k+' },
      { label: 'Conversion', value: '+35%' }
    ]
  },
  {
    id: 4,
    title: 'Urban Pulse IoT',
    tagline: 'Smart City Infrastructure',
    description: 'Real-time monitoring system for urban infrastructure using distributed IoT sensors and predictive maintenance analytics.',
    image: PLACEHOLDERS.iot,
    technologies: ['Vue.js', 'InfluxDB', 'MQTT', 'Grafana'],
    category: 'IoT',
    github: '#',
    demo: '#',
    year: "2022",
    color: "from-orange-600 to-amber-500",
    icon: Server,
    problemSolved: 'City planners lacked unified visibility into utility networks, leading to reactive and expensive maintenance.',
    impact: 'Enabled predictive maintenance that reduced emergency repair costs by 40%.',
    metrics: [
      { label: 'Sensors', value: '1,200+' },
      { label: 'Cost Cut', value: '40%' },
      { label: 'Response', value: '-25%' }
    ]
  }
];

const CATEGORIES = ['All', 'Data Engineering', 'Machine Learning', 'Full-Stack', 'IoT'];

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENTS                                                             */
/* -------------------------------------------------------------------------- */

// 1. Border Beam Animation Component
const BorderBeam = ({ duration = 12, borderWidth = 1.5 }: { duration?: number, borderWidth?: number }) => (
  <div className="absolute inset-0 pointer-events-none rounded-[inherit] z-0 overflow-hidden">
    <div
      className="absolute inset-0 rounded-[inherit]"
      style={{
        padding: borderWidth,
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        maskComposite: 'exclude',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
      }}
    >
      <div
        className="absolute inset-[-100%] w-auto h-auto bg-[conic-gradient(from_0deg,transparent_0_340deg,theme(colors.primary.DEFAULT)_360deg)] animate-[spin_var(--duration)_linear_infinite] opacity-100"
        style={{ '--duration': `${duration}s` } as React.CSSProperties}
      />
    </div>
  </div>
);

// 2. Filter Tabs with "Gliding Pill" Effect
const FilterTabs = ({
  active,
  onChange
}: {
  active: string;
  onChange: (c: string) => void
}) => (
  <div className="flex flex-wrap justify-center gap-2 mb-12">
    {CATEGORIES.map((category) => (
      <button
        key={category}
        onClick={() => onChange(category)}
        className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 z-10 ${active === category ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
      >
        {active === category && (
          <motion.div
            layoutId="activeFilter"
            className="absolute inset-0 bg-primary rounded-full -z-10"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        {category}
      </button>
    ))}
  </div>
);

// 3. Project Card (Refined with ForwardRef & Hybrid Design)
const ProjectCard = forwardRef<HTMLDivElement, { project: Project; onClick: (p: Project) => void }>(
  ({ project, onClick }, ref) => {
    return (
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        onClick={() => onClick(project)}
        className="group relative cursor-pointer rounded-3xl bg-card border border-border/50 overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500"
      >
        {/* Image Section with Gradient Overlay */}
        <div className="relative h-72 sm:h-80 overflow-hidden">
          {/* Dynamic Color Gradient Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br ${project.color} opacity-20 group-hover:opacity-30 transition-opacity duration-500 mix-blend-overlay z-10`} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 opacity-80" />

          <motion.img
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.6 }}
            src={project.image}
            alt={project.title}
            className="w-full h-full object-cover"
          />

          {/* Top Badges */}
          <div className="absolute top-4 left-4 z-20 flex gap-2">
            <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10">
              {project.category}
            </span>
          </div>

          {/* Icon Watermark - Themed Button */}
          <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-2 group-hover:translate-x-0">
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center border border-primary/20">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>

          {/* Quick Metrics Overlay (The "Hybrid" Feature) */}
          <div className="absolute bottom-4 left-4 right-4 z-20 flex gap-2">
            {project.metrics.slice(0, 2).map((metric, idx) => (
              <div key={idx} className="flex-1 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/10 shadow-lg">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{metric.label}</div>
                <div className="text-sm font-bold text-foreground">{metric.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 pt-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-bold group-hover:text-primary transition-colors text-foreground">
              {project.title}
            </h3>
            <span className="text-xs font-mono text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
              {project.year}
            </span>
          </div>

          <p className="text-sm text-muted-foreground font-medium mb-3 opacity-90">
            {project.tagline}
          </p>

          <p className="text-muted-foreground text-sm line-clamp-2 mb-5 leading-relaxed opacity-70">
            {project.description}
          </p>

          {/* Tech Stack Mini */}
          <div className="flex flex-wrap gap-2">
            {project.technologies.slice(0, 3).map(tech => (
              <span key={tech} className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground border border-border px-2 py-1 rounded-md">
                {tech}
              </span>
            ))}
            {project.technologies.length > 3 && (
              <span className="text-[10px] px-2 py-1 text-muted-foreground bg-secondary/30 rounded-md">
                +{project.technologies.length - 3}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);

ProjectCard.displayName = 'ProjectCard';

// 4. Project Details Modal
const ProjectModal = ({
  project,
  onClose
}: {
  project: Project;
  onClose: () => void
}) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const Icon = project.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div
        layoutId={`project-${project.id}`}
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-background border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/20 backdrop-blur-md hover:bg-black/40 text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto custom-scrollbar flex-1">
          <div className="relative h-64 sm:h-80 w-full overflow-hidden">
            <img
              src={project.image}
              alt={project.title}
              className="w-full h-full object-cover"
            />
            <div className={`absolute inset-0 bg-gradient-to-br ${project.color} mix-blend-multiply opacity-60`} />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />

            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-white bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                    {project.category}
                  </span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-bold text-white mb-2">
                  {project.title}
                </h2>
                <p className="text-white/80 text-lg font-medium">{project.tagline}</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-10">
            <div className="space-y-10">
              <div className="grid grid-cols-3 gap-4">
                {project.metrics.map((metric, idx) => (
                  <div key={idx} className="bg-secondary/20 border border-border/50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-primary mb-1">{metric.value}</div>
                    <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">{metric.label}</div>
                  </div>
                ))}
              </div>

              <section>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                  <Layers className="w-5 h-5 text-primary" /> Overview
                </h3>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  {project.description}
                </p>
              </section>

              {project.problemSolved && (
                <section>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                    <Zap className="w-5 h-5 text-yellow-500" /> The Challenge
                  </h3>
                  <div className="p-5 rounded-2xl bg-secondary/10 border border-border/50">
                    <p className="text-muted-foreground">
                      {project.problemSolved}
                    </p>
                  </div>
                </section>
              )}

              {project.impact && (
                <section>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                    <BarChart3 className="w-5 h-5 text-emerald-500" /> Business Impact
                  </h3>
                  <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                      {project.impact}
                    </p>
                  </div>
                </section>
              )}
            </div>

            <div className="space-y-8">
              <div className="flex flex-col gap-3 sticky top-6">
                {project.demo && (
                  <Button className="w-full justify-between group h-12 text-base shadow-lg shadow-primary/20" asChild>
                    <a href={project.demo} target="_blank" rel="noopener noreferrer">
                      View Live Demo <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </Button>
                )}
                {project.github && (
                  <Button variant="outline" className="w-full justify-between h-12 text-base hover:bg-secondary/80" asChild>
                    <a href={project.github} target="_blank" rel="noopener noreferrer">
                      Source Code <Github className="w-4 h-4" />
                    </a>
                  </Button>
                )}

                <div className="mt-8">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <Cpu className="w-4 h-4" /> Tech Stack
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary/50 text-foreground border border-border/50 hover:border-primary/50 transition-colors cursor-default"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

const Projects = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const filteredProjects = useMemo(() => {
    if (activeCategory === 'All') return PROJECTS_DATA;
    return PROJECTS_DATA.filter(p => p.category.includes(activeCategory) || (activeCategory === "Full-Stack" && p.category === "Full-Stack"));
  }, [activeCategory]);

  return (
    <section id="projects" className="py-24 bg-background relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Featured <span className="text-primary">Projects</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            A selection of engineering challenges I've solved, from scalable data pipelines to AI-driven applications.
          </p>
        </motion.div>

        {/* Filter */}
        <FilterTabs active={activeCategory} onChange={setActiveCategory} />

        {/* Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10"
        >
          <AnimatePresence mode='popLayout'>
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={setSelectedProject}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Show More Button (With Border Beam) */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <Button
            variant="outline"
            size="lg" className="group rounded-full px-8 border-primary/20 hover:border-primary/50 hover:bg-primary/5"
          >
            <span className="relative z-10 flex items-center gap-2">
              View All Projects
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </span>
          </Button>
        </motion.div>
      </div>

      {/* Modal Overlay */}
      <AnimatePresence>
        {selectedProject && (
          <ProjectModal
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
};

export default Projects;