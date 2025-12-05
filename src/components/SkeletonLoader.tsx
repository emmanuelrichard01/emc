import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

const Skeleton = ({ className = '', variant = 'rectangular' }: SkeletonProps) => {
  const baseClasses = "bg-muted animate-pulse";
  
  const variantClasses = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-md"
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      aria-label="Loading..."
      role="progressbar"
    />
  );
};

// Project Card Skeleton
export const ProjectCardSkeleton = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="card-feature p-6 sm:p-8"
  >
    <Skeleton className="aspect-video mb-6" />
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton variant="text" className="h-6 w-3/4" />
        <Skeleton variant="text" className="h-6 w-16" />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" className="w-full" />
        <Skeleton variant="text" className="w-4/5" />
        <Skeleton variant="text" className="w-2/3" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} variant="text" className="h-6 w-16" />
        ))}
      </div>
    </div>
  </motion.div>
);

// Section Skeleton
export const SectionSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`py-20 lg:py-32 ${className}`}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <Skeleton variant="text" className="h-12 w-1/2 mx-auto mb-6" />
        <Skeleton variant="text" className="h-6 w-3/4 mx-auto mb-2" />
        <Skeleton variant="text" className="h-6 w-1/2 mx-auto" />
      </div>
      <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card-elegant p-6">
            <Skeleton variant="circular" className="w-12 h-12 mb-4" />
            <Skeleton variant="text" className="h-6 w-3/4 mb-2" />
            <Skeleton variant="text" className="h-4 w-full mb-1" />
            <Skeleton variant="text" className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Hero Skeleton
export const HeroSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <Skeleton variant="circular" className="w-32 h-32 mx-auto mb-8" />
      <div className="space-y-4 mb-12">
        <Skeleton variant="text" className="h-16 w-3/4 mx-auto" />
        <Skeleton variant="text" className="h-8 w-1/2 mx-auto" />
      </div>
      <div className="space-y-4 mb-12">
        <Skeleton variant="text" className="h-6 w-full max-w-3xl mx-auto" />
        <Skeleton variant="text" className="h-6 w-5/6 max-w-3xl mx-auto" />
        <Skeleton variant="text" className="h-6 w-4/5 max-w-3xl mx-auto" />
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-12 w-48" />
      </div>
    </div>
  </div>
);

export default Skeleton;