import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, LayoutGrid, LayoutList, Code, Database, Globe, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Breadcrumb from '@/components/Breadcrumb';
import { Project } from '@/types';
import { AccessibleModal } from '@/components/AccessibleModal';
import { allProjects as projectData } from '@/data/projects';
import ProjectCardSkeleton from '@/components/ProjectCardSkeleton';
import ProjectCard from '@/components/ProjectCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SortOption = 'featured' | 'year' | 'title';
type Layout = 'grid' | 'list';

const ProjectsArchive = () => {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortOption, setSortOption] = useState<SortOption>('featured');
  const [layout, setLayout] = useState<Layout>('grid');

  useEffect(() => {
    // Simulate fetching data from an API
    const timer = setTimeout(() => {
      setAllProjects(projectData);
      setIsLoading(false);
    }, 1500); // 1.5 second delay

    return () => clearTimeout(timer);
  }, []);

  const categories = useMemo(() => {
    const counts = projectData.reduce((acc, project) => {
      acc[project.category] = (acc[project.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryList = Object.keys(counts).map(name => {
      let icon = Code;
      if (name === 'Data Engineering') icon = Database;
      else if (name === 'Machine Learning') icon = Cpu;
      else if (name === 'Data Visualization') icon = Globe;
      
      return { name, icon, count: counts[name] };
    });

    return [
      { name: 'All', icon: Globe, count: projectData.length },
      ...categoryList
    ];
  }, []);

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = allProjects;

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.technologies.some(tech => tech.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedCategory && selectedCategory !== 'All') {
      filtered = filtered.filter(project => project.category === selectedCategory);
    }

    switch (sortOption) {
      case 'featured':
        filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
      case 'year':
        filtered.sort((a, b) => parseInt(b.year) - parseInt(a.year));
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return filtered;
  }, [allProjects, searchTerm, selectedCategory, sortOption]);

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Projects Archive' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb items={breadcrumbItems} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Project <span className="text-gradient">Archive</span></h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            A comprehensive collection of my projects, experiments, and contributions to the tech community.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                aria-label="Search projects by title, description, or technology"
              />
            </div>
            <div className="flex items-center gap-4">
              <Select onValueChange={(value: SortOption) => setSortOption(value)} defaultValue={sortOption}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="year">Newest</SelectItem>
                  <SelectItem value="title">A-Z</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Button variant={layout === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => setLayout('grid')}>
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button variant={layout === 'list' ? 'default' : 'outline'} size="icon" onClick={() => setLayout('list')}>
                  <LayoutList className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.name}
                variant={selectedCategory === category.name ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.name)}
                className="flex items-center gap-2"
              >
                <category.icon className="h-4 w-4" />
                {category.name}
                <Badge variant="secondary" className="ml-1 text-xs">{category.count}</Badge>
              </Button>
            ))}
          </div>
        </motion.div>

        <motion.div layout className={`grid gap-6 sm:gap-8 mb-12 ${layout === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          <AnimatePresence>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                  <ProjectCardSkeleton />
                </motion.div>
              ))
            ) : (
              filteredAndSortedProjects.map((project) => (
                <ProjectCard key={project.id} project={project} onViewClick={() => setSelectedProject(project)} />
              ))
            )}
          </AnimatePresence>
        </motion.div>

        {!isLoading && filteredAndSortedProjects.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <p className="text-muted-foreground text-lg">No projects found matching your criteria.</p>
          </motion.div>
        )}

        <AccessibleModal isOpen={!!selectedProject} onClose={() => setSelectedProject(null)} title={selectedProject?.title || "Project Details"} maxWidth="max-w-4xl">
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
             </div>
           </div>
          )}
        </AccessibleModal>
      </div>
    </div>
  );
};

export default ProjectsArchive;