import React from 'react';
import { motion } from 'framer-motion';
import { Project } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Github, Eye } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onViewClick: (project: Project) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onViewClick }) => {
  const { title, description, technologies, category, featured, image } = project;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className="relative group overflow-hidden rounded-lg shadow-lg"
    >
      <img
        src={image || '/placeholder.svg'}
        alt={title}
        className="w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-300"
      />
      {featured && (
        <Badge className="absolute top-4 right-4" variant="default">
          Featured
        </Badge>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
      <div className="absolute bottom-0 left-0 p-6 text-white">
        <Badge variant="secondary" className="mb-2">
          {category}
        </Badge>
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
        <p className="text-sm text-gray-300 line-clamp-2">{description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {technologies.slice(0, 3).map((tech) => (
            <Badge key={tech} variant="outline" className="text-white border-gray-500">
              {tech}
            </Badge>
          ))}
          {technologies.length > 3 && (
            <Badge variant="outline" className="text-white border-gray-500">
              +{technologies.length - 3} more
            </Badge>
          )}
        </div>
      </div>
      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex gap-4">
          <Button variant="outline" size="lg" onClick={() => onViewClick(project)}>
            <Eye className="mr-2 h-4 w-4" />
            Quick View
          </Button>
          {project.demo && (
            <Button variant="default" size="lg" asChild>
              <a href={project.demo} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Demo
              </a>
            </Button>
          )}
          {project.github && (
            <Button variant="secondary" size="lg" asChild>
              <a href={project.github} target="_blank" rel="noopener noreferrer">
                <Github className="mr-2 h-4 w-4" />
                Code
              </a>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(ProjectCard);
