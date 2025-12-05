import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Github, Search, Filter, Calendar, Code, Database, Globe, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Breadcrumb from '@/components/Breadcrumb';
import { Project } from '@/types';
import { AccessibleModal } from '@/components/AccessibleModal';

const ProjectsArchive = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const allProjects: Project[] = [
    // Featured projects
    {
      id: 1,
      title: 'DataFlow Analytics Platform',
      description: 'A comprehensive data analytics platform that processes millions of records daily with real-time visualizations.',
      image: '/project-dataflow.jpg',
      technologies: ['React', 'TypeScript', 'Python', 'Apache Kafka', 'PostgreSQL', 'Docker'],
      category: 'Data Engineering',
      year: '2024',
      status: 'Production',
      github: 'https://github.com/emmanuelmoghalu/dataflow-analytics',
      demo: 'https://dataflow-demo.vercel.app',
      featured: true,
      highlights: ['Real-time processing', 'Scalable architecture', '50+ companies'],
      features: [
        'Real-time data processing with Apache Kafka',
        'Interactive dashboards with custom visualizations',
        'Automated data quality monitoring',
        'Scalable microservices architecture',
        'Advanced user authentication and authorization'
      ],
      problemSolved: 'Organizations struggled with fragmented data sources and lack of real-time insights.',
      impact: 'Reduced data processing time by 70% and improved decision-making speed for over 50+ companies.'
    },
    {
      id: 2,
      title: 'AI-Powered Code Review Assistant',
      description: 'Machine learning tool that automates code review processes and suggests improvements using natural language processing.',
      image: '/project-ai-reviewer.jpg',
      technologies: ['Python', 'TensorFlow', 'FastAPI', 'React', 'MongoDB', 'AWS'],
      category: 'Machine Learning',
      year: '2024',
      status: 'Production',
      github: 'https://github.com/emmanuelmoghalu/ai-code-reviewer',
      demo: 'https://ai-reviewer-demo.com',
      featured: true,
      highlights: ['60% faster reviews', 'AI-powered', 'IDE integration'],
      features: [
        'Automated code quality analysis',
        'Smart suggestion generation',
        'Integration with popular IDEs',
        'Custom rule configuration',
        'Team collaboration features'
      ],
      problemSolved: 'Manual code reviews are time-consuming and inconsistent.',
      impact: 'Reduced code review time by 60% and improved code quality scores by 45%.'
    },
    // Additional projects
    {
      id: 5,
      title: 'Real-time Chat Application',
      description: 'High-performance chat app with WebSocket connections, end-to-end encryption, and multimedia support.',
      image: '/project-chat.jpg',
      technologies: ['Next.js', 'Socket.io', 'Redis', 'MongoDB', 'WebRTC'],
      category: 'Full-Stack Development',
      year: '2023',
      status: 'Production',
      github: 'https://github.com/emmanuelmoghalu/realtime-chat',
      demo: 'https://chat-app-demo.vercel.app',
      featured: false,
      highlights: ['10k+ concurrent users', 'E2E encryption', 'Video calls'],
      features: ['Real-time messaging', 'Video calls', 'File sharing', 'End-to-end encryption'],
      problemSolved: 'Need for secure, scalable real-time communication platform.',
      impact: 'Supports 10k+ concurrent users with 99.9% uptime.'
    },
    {
      id: 6,
      title: 'Personal Finance Tracker',
      description: 'Modern personal finance management app with AI-powered expense categorization and investment tracking.',
      image: '/project-finance.jpg',
      technologies: ['React Native', 'Node.js', 'PostgreSQL', 'Plaid API', 'Chart.js'],
      category: 'Mobile Development',
      year: '2023',
      status: 'Beta',
      github: 'https://github.com/emmanuelmoghalu/finance-tracker',
      demo: 'https://finance-app-demo.com',
      featured: false,
      highlights: ['AI categorization', 'Bank integration', 'Investment tracking'],
      features: ['AI expense categorization', 'Bank account integration', 'Investment portfolio tracking', 'Budget planning'],
      problemSolved: 'Difficulty managing personal finances across multiple accounts.',
      impact: 'Helped users save 20% more on average through better expense tracking.'
    },
    {
      id: 7,
      title: 'Distributed Task Queue System',
      description: 'Scalable task processing system built with microservices architecture for handling millions of jobs.',
      image: '/project-queue.jpg',
      technologies: ['Go', 'Redis', 'RabbitMQ', 'Docker', 'Kubernetes', 'Prometheus'],
      category: 'DevOps & Infrastructure',
      year: '2023',
      status: 'Production',
      github: 'https://github.com/emmanuelmoghalu/task-queue',
      demo: null,
      featured: false,
      highlights: ['1M+ jobs/day', 'Auto-scaling', 'Fault tolerant'],
      features: ['Auto-scaling workers', 'Job prioritization', 'Failure recovery', 'Monitoring dashboard'],
      problemSolved: 'Need for reliable, scalable background job processing.',
      impact: 'Processes 1M+ jobs daily with 99.95% success rate.'
    },
    {
      id: 8,
      title: 'Weather Data Visualization',
      description: 'Interactive weather dashboard using historical climate data with predictive modeling.',
      image: '/project-weather.jpg',
      technologies: ['D3.js', 'Python', 'FastAPI', 'TimescaleDB', 'Machine Learning'],
      category: 'Data Visualization',
      year: '2022',
      status: 'Production',
      github: 'https://github.com/emmanuelmoghalu/weather-viz',
      demo: 'https://weather-dashboard-demo.herokuapp.com',
      featured: false,
      highlights: ['Climate predictions', 'Interactive maps', 'Real-time data'],
      features: ['Interactive weather maps', 'Historical data analysis', 'Climate predictions', 'Real-time updates'],
      problemSolved: 'Need for accessible, visual weather data analysis tools.',
      impact: 'Used by meteorologists and researchers for climate analysis.'
    },
    {
      id: 9,
      title: 'Blockchain Voting System',
      description: 'Secure, transparent voting platform built on Ethereum with smart contracts and decentralized storage.',
      image: '/project-voting.jpg',
      technologies: ['Solidity', 'Web3.js', 'React', 'IPFS', 'Truffle', 'MetaMask'],
      category: 'Blockchain',
      year: '2022',
      status: 'Prototype',
      github: 'https://github.com/emmanuelmoghalu/blockchain-voting',
      demo: 'https://voting-demo.netlify.app',
      featured: false,
      highlights: ['Immutable records', 'Zero-knowledge proofs', 'Gas optimization'],
      features: ['Smart contract voting', 'Anonymous voting', 'Transparent results', 'Decentralized storage'],
      problemSolved: 'Need for transparent, tamper-proof voting systems.',
      impact: 'Demonstrated feasibility of blockchain-based democratic processes.'
    }
  ];

  const categories = [
    { name: 'All', icon: Globe, count: allProjects.length },
    { name: 'Data Engineering', icon: Database, count: allProjects.filter(p => p.category === 'Data Engineering').length },
    { name: 'Machine Learning', icon: Cpu, count: allProjects.filter(p => p.category === 'Machine Learning').length },
    { name: 'Full-Stack Development', icon: Code, count: allProjects.filter(p => p.category === 'Full-Stack Development').length },
    { name: 'Mobile Development', icon: Code, count: allProjects.filter(p => p.category === 'Mobile Development').length },
    { name: 'DevOps & Infrastructure', icon: Database, count: allProjects.filter(p => p.category === 'DevOps & Infrastructure').length },
    { name: 'Data Visualization', icon: Globe, count: allProjects.filter(p => p.category === 'Data Visualization').length },
    { name: 'Blockchain', icon: Cpu, count: allProjects.filter(p => p.category === 'Blockchain').length }
  ];

  const filteredProjects = allProjects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.technologies.some(tech => tech.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = !selectedCategory || selectedCategory === 'All' || project.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Projects Archive' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Project <span className="text-gradient">Archive</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            A comprehensive collection of my projects, experiments, and contributions to the tech community.
          </p>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 space-y-4"
        >
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            aria-label="Search projects by title, description, or technology"
          />
        </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.name}
                variant={selectedCategory === category.name ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(selectedCategory === category.name ? null : category.name)}
                className="flex items-center gap-2"
              >
                <category.icon className="h-4 w-4" />
                {category.name}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {category.count}
                </Badge>
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Projects Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 overflow-x-hidden p-5"
        >
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className={`card-elegant cursor-pointer relative p-5 sm:p-6 ${project.featured ? 'ring-2 ring-primary/20' : ''}`}
              onClick={() => setSelectedProject(project)}
            >
              {project.featured && (
                <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium">
                  Featured
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <Badge variant="outline" className="text-xs">
                  {project.category}
                </Badge>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {project.year}
                </div>
              </div>

              <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                {project.title}
              </h3>

              <p className="text-muted-foreground text-sm mb-4 line-clamp-4 md:line-clamp-3">
                {project.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {project.technologies.slice(0, 3).map((tech) => (
                  <span
                    key={tech}
                    className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md"
                  >
                    {tech}
                  </span>
                ))}
                {project.technologies.length > 3 && (
                  <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md">
                    +{project.technologies.length - 3}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {project.github && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(project.github, '_blank');
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Github className="h-4 w-4" />
                    </Button>
                  )}
                  {project.demo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(project.demo, '_blank');
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Badge
                  variant={project.status === 'Production' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {project.status}
                </Badge>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {filteredProjects.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-muted-foreground text-lg">No projects found matching your criteria.</p>
          </motion.div>
        )}

        {/* Project Modal */}
        <AccessibleModal
          isOpen={!!selectedProject}
          onClose={() => setSelectedProject(null)}
          title={selectedProject?.title || "Project Details"}
          maxWidth="max-w-4xl"
        >
          {selectedProject && (
            <div className="space-y-6">
              <div className="flex gap-2 mb-4">
                <Badge variant="outline">{selectedProject.category}</Badge>
                <Badge variant={selectedProject.status === 'Production' ? 'default' : 'secondary'}>
                  {selectedProject.status}
                </Badge>
              </div>

              <div className="space-y-4">
                <p className="text-muted-foreground">{selectedProject.description}</p>

                {selectedProject.highlights && selectedProject.highlights.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Key Highlights</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.highlights.map((highlight: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {highlight}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Technologies Used</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.technologies.map((tech: string) => (
                      <Badge key={tech} variant="outline">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  {selectedProject.github && (
                    <Button asChild>
                      <a 
                        href={selectedProject.github} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label={`View ${selectedProject.title} source code on GitHub`}
                      >
                        <Github className="mr-2 h-4 w-4" />
                        View Code
                      </a>
                    </Button>
                  )}
                  {selectedProject.demo && (
                    <Button asChild variant="outline">
                      <a 
                        href={selectedProject.demo} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label={`View ${selectedProject.title} live demo`}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Live Demo
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </AccessibleModal>
      </div>
    </div>
  );
};

export default ProjectsArchive;
