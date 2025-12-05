import { lazy, Suspense, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

// Lazy load heavy components
const LazyTechStackRadar = lazy(() => import('./TechStackRadar'));

// Loading components
const ComponentLoader = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const SkeletonCard = () => (
  <motion.div 
    className="card-elegant p-6 animate-pulse"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
    <div className="h-3 bg-muted rounded w-full mb-2"></div>
    <div className="h-3 bg-muted rounded w-2/3"></div>
  </motion.div>
);

// Optimized component wrappers
export const OptimizedTechStackRadar = () => (
  <Suspense fallback={<ComponentLoader />}>
    <LazyTechStackRadar />
  </Suspense>
);

// Utility for intersection observer
export const useIntersectionObserver = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible] as const;
};

export { SkeletonCard };