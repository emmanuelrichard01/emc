import { motion } from 'framer-motion';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb = ({ items }: BreadcrumbProps) => {
  return (
    <motion.nav
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center space-x-2 text-sm text-muted-foreground mb-8"
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          {index > 0 && <ChevronRight className="h-4 w-4" />}
          
          {item.href ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 font-normal text-muted-foreground hover:text-foreground"
              onClick={() => window.location.href = item.href!}
            >
              {index === 0 && <Home className="h-4 w-4 mr-1" />}
              {item.label}
            </Button>
          ) : (
            <span className="text-foreground font-medium">
              {index === 0 && <Home className="h-4 w-4 mr-1 inline" />}
              {item.label}
            </span>
          )}
        </div>
      ))}
    </motion.nav>
  );
};

export default Breadcrumb;