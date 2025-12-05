import React, { useState, useMemo, useCallback } from 'react';
import { ExternalLink, Github, Code2, Database, Cpu, Globe, ArrowRight } from 'lucide-react';

// Project data should be in a separate file/CMS in production
const projectsData = [
    {
        id: 'dataflow',
        title: 'DataFlow Analytics',
        tagline: 'Real-time data processing platform',
        description: 'Processes 10M+ records daily with sub-second latency',
        category: 'data',
        metrics: {
            performance: '70% faster processing',
            scale: '10M+ records/day',
            impact: '50+ companies'
        },
        tech: ['Kafka', 'PostgreSQL', 'React', 'Docker'],
        color: 'from-blue-600 to-cyan-600',
        icon: Database,
        links: { github: '#', demo: '#' }
    },
    {
        id: 'ai-reviewer',
        title: 'AI Code Reviewer',
        tagline: 'ML-powered code analysis',
        description: 'Automated code quality analysis with NLP-based suggestions',
        category: 'ml',
        metrics: {
            efficiency: '60% review time saved',
            quality: '45% fewer bugs',
            adoption: '500+ developers'
        },
        tech: ['TensorFlow', 'FastAPI', 'React', 'MongoDB'],
        color: 'from-emerald-600 to-green-600',
        icon: Cpu,
        links: { github: '#', demo: '#' }
    },
    {
        id: 'ecommerce',
        title: 'Cloud Commerce',
        tagline: 'Scalable e-commerce platform',
        description: 'Microservices architecture handling 10k+ concurrent users',
        category: 'fullstack',
        metrics: {
            uptime: '99.9% availability',
            conversion: '35% higher conversion',
            concurrent: '10k+ users'
        },
        tech: ['Next.js', 'GraphQL', 'Kubernetes', 'Redis'],
        color: 'from-purple-600 to-pink-600',
        icon: Globe,
        links: { github: '#', demo: '#' }
    },
    {
        id: 'smart-city',
        title: 'Smart City IoT',
        tagline: 'Urban infrastructure monitoring',
        description: 'Real-time IoT dashboard with predictive analytics',
        category: 'iot',
        metrics: {
            savings: '40% maintenance cost reduction',
            response: '25% faster emergency response',
            sensors: '1000+ IoT devices'
        },
        tech: ['Vue.js', 'InfluxDB', 'MQTT', 'TensorFlow'],
        color: 'from-orange-600 to-red-600',
        icon: Code2,
        links: { github: '#' }
    }
];

const categories = [
    { id: 'all', label: 'All Projects', icon: '🚀' },
    { id: 'data', label: 'Data Engineering', icon: '📊' },
    { id: 'ml', label: 'Machine Learning', icon: '🤖' },
    { id: 'fullstack', label: 'Full-Stack', icon: '🌐' },
    { id: 'iot', label: 'IoT & Analytics', icon: '📡' }
];

// Lightweight Project Card
const ProjectCard = ({ project, onClick }) => {
    const Icon = project.icon;
    const [imageLoaded, setImageLoaded] = useState(false);

    return (
        <article
            className="group relative bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 
                 dark:border-neutral-800 overflow-hidden hover:shadow-xl transition-all duration-300
                 hover:scale-[1.02] hover:border-neutral-300 dark:hover:border-neutral-700"
        >
            {/* Gradient Header */}
            <div className={`h-32 bg-gradient-to-br ${project.color} relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/20" />
                <Icon className="absolute bottom-4 right-4 w-8 h-8 text-white/20" />

                {/* Quick Stats Overlay */}
                <div className="absolute top-4 left-4 flex gap-2">
                    {Object.entries(project.metrics).slice(0, 1).map(([key, value]) => (
                        <span key={key} className="text-xs font-medium text-white/90 bg-white/20 
                                     backdrop-blur-sm px-2 py-1 rounded-full">
                            {value}
                        </span>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                <div className="mb-3">
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                        {project.title}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {project.tagline}
                    </p>
                </div>

                <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4 line-clamp-2">
                    {project.description}
                </p>

                {/* Tech Pills */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {project.tech.slice(0, 3).map(tech => (
                        <span key={tech} className="text-xs px-2 py-1 rounded-md bg-neutral-100 
                                       dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                            {tech}
                        </span>
                    ))}
                    {project.tech.length > 3 && (
                        <span className="text-xs px-2 py-1 text-neutral-500">
                            +{project.tech.length - 3}
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                        {project.links.github && (
                            <a
                                href={project.links.github}
                                onClick={(e) => e.stopPropagation()}
                                className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white 
                         transition-colors"
                                aria-label={`View ${project.title} source code`}
                            >
                                <Github className="w-4 h-4" />
                            </a>
                        )}
                        {project.links.demo && (
                            <a
                                href={project.links.demo}
                                onClick={(e) => e.stopPropagation()}
                                className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white 
                         transition-colors"
                                aria-label={`View ${project.title} demo`}
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        )}
                    </div>

                    <button
                        onClick={() => onClick(project)}
                        className="text-sm font-medium text-neutral-600 dark:text-neutral-400 
                     hover:text-neutral-900 dark:hover:text-white transition-colors 
                     flex items-center gap-1 group/btn"
                    >
                        View Details
                        <ArrowRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-1" />
                    </button>
                </div>
            </div>
        </article>
    );
};

// Simplified Modal using native dialog
const ProjectModal = ({ project, isOpen, onClose }) => {
    if (!project) return null;

    const Icon = project.icon;

    return (
        <dialog
            open={isOpen}
            className="fixed inset-0 z-50 m-0 h-full w-full bg-transparent p-0 
               backdrop:bg-black/60 backdrop:backdrop-blur-sm open:flex 
               open:items-center open:justify-center"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto 
                    bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl m-4">
                {/* Header */}
                <div className={`sticky top-0 z-10 bg-gradient-to-br ${project.color} p-6`}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 
                     backdrop-blur-sm flex items-center justify-center text-white 
                     hover:bg-white/30 transition-colors"
                        aria-label="Close modal"
                    >
                        ✕
                    </button>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm 
                          flex items-center justify-center">
                            <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">{project.title}</h2>
                            <p className="text-white/80">{project.tagline}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Metrics */}
                    <div>
                        <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 
                         uppercase tracking-wider mb-3">
                            Key Metrics
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            {Object.entries(project.metrics).map(([key, value]) => (
                                <div key={key} className="text-center p-3 rounded-lg bg-neutral-50 
                                        dark:bg-neutral-800">
                                    <div className="text-lg font-bold text-neutral-900 dark:text-white">
                                        {value}
                                    </div>
                                    <div className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                                        {key}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 
                         uppercase tracking-wider mb-3">
                            Overview
                        </h3>
                        <p className="text-neutral-600 dark:text-neutral-300">
                            {project.description}
                        </p>
                    </div>

                    {/* Tech Stack */}
                    <div>
                        <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 
                         uppercase tracking-wider mb-3">
                            Technology Stack
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {project.tech.map(tech => (
                                <span key={tech} className="px-3 py-1.5 rounded-lg bg-neutral-100 
                                          dark:bg-neutral-800 text-neutral-700 
                                          dark:text-neutral-300 font-medium">
                                    {tech}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        {project.links.github && (
                            <a
                                href={project.links.github}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 
                         rounded-lg bg-neutral-900 dark:bg-white text-white 
                         dark:text-neutral-900 font-medium hover:opacity-90 transition-opacity"
                            >
                                <Github className="w-4 h-4" />
                                View Source
                            </a>
                        )}
                        {project.links.demo && (
                            <a
                                href={project.links.demo}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 
                         rounded-lg border border-neutral-300 dark:border-neutral-700 
                         text-neutral-900 dark:text-white font-medium hover:bg-neutral-50 
                         dark:hover:bg-neutral-800 transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Live Demo
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </dialog>
    );
};

export default function Projects2() {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedProject, setSelectedProject] = useState(null);

    const filteredProjects = useMemo(() => {
        if (selectedCategory === 'all') return projectsData;
        return projectsData.filter(p => p.category === selectedCategory);
    }, [selectedCategory]);

    const projectCounts = useMemo(() => {
        const counts = { all: projectsData.length };
        projectsData.forEach(p => {
            counts[p.category] = (counts[p.category] || 0) + 1;
        });
        return counts;
    }, []);

    const handleProjectClick = useCallback((project) => {
        setSelectedProject(project);
    }, []);

    const handleCloseModal = useCallback(() => {
        setSelectedProject(null);
    }, []);

    return (
        <section id="projects" className="py-20 px-6 md:px-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold mb-4">
                    Featured <span className="bg-gradient-to-r from-blue-600 to-purple-600 
                                   bg-clip-text text-transparent">Projects</span>
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
                    Production-grade solutions with measurable impact. Each project demonstrates
                    expertise in modern tech stacks and problem-solving at scale.
                </p>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap justify-center gap-2 mb-12">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 rounded-full font-medium transition-all duration-200 
                      flex items-center gap-2 ${selectedCategory === cat.id
                                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                            }`}
                    >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                        <span className="text-xs opacity-60">({projectCounts[cat.id] || 0})</span>
                    </button>
                ))}
            </div>

            {/* Projects Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-12">
                {filteredProjects.map((project, i) => (
                    <div
                        key={project.id}
                        style={{
                            animation: `fadeIn 0.5s ease-out ${i * 0.1}s both`
                        }}
                    >
                        <ProjectCard project={project} onClick={handleProjectClick} />
                    </div>
                ))}
            </div>

            {/* CTA */}
            <div className="text-center">
                <a
                    href="https://github.com/yourusername"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg 
                   bg-neutral-100 dark:bg-neutral-800 text-neutral-700 
                   dark:text-neutral-300 font-medium hover:bg-neutral-200 
                   dark:hover:bg-neutral-700 transition-colors"
                >
                    <Github className="w-4 h-4" />
                    View All Projects on GitHub
                </a>
            </div>

            {/* Modal */}
            <ProjectModal
                project={selectedProject}
                isOpen={!!selectedProject}
                onClose={handleCloseModal}
            />

            <style>{`
        @keyframes fadeIn {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
        </section>
    );
}