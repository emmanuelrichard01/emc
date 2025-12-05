/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ArrowRight, Tag, Search, ChevronLeft, Share2, Heart, Eye, Loader2, Filter, X } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Types
interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  date: string;
  readTime: string;
  tags: string[];
  featured?: boolean;
  slug: string;
  image: string;
  category: string;
  author?: string;
  views?: number;
  likes?: number;
}

interface BlogFilters {
  search: string;
  tags: string[];
  categories: string[];
  sortBy: 'date' | 'views' | 'readTime';
  sortOrder: 'asc' | 'desc';
}

// Custom hooks
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const useIntersectionObserver = (callback: () => void, deps: any[] = []) => {
  const observer = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) callback();
    });

    if (elementRef.current) observer.current.observe(elementRef.current);

    return () => observer.current?.disconnect();
  }, deps);

  return elementRef;
};

// Optimized Image Component with lazy loading
const LazyImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 animate-pulse" />
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
        />
      )}
    </div>
  );
};

// Blog Card Component
const BlogCard: React.FC<{ post: BlogPost; index: number }> = React.memo(({ post, index }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    navigate(`/blog/${post.slug}`);
  }, [post.slug, navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`/blog/${post.slug}`);
    }
  }, [post.slug, navigate]);

  const formatDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(post.date));
  }, [post.date]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
      whileHover={{ y: -4 }}
      className="group relative bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer focus-within:ring-2 focus-within:ring-primary"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      tabIndex={0}
      aria-label={`Read article: ${post.title}`}
    >
      <div className="aspect-[16/9] overflow-hidden bg-muted">
        <LazyImage
          src={post.image}
          alt={post.title}
          className="w-full h-full transform transition-transform duration-700 group-hover:scale-110"
        />
      </div>

      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary" className="text-xs">
            {post.category}
          </Badge>
          {post.featured && (
            <Badge variant="default" className="text-xs">
              Featured
            </Badge>
          )}
        </div>

        <h3 className="text-xl font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {post.title}
        </h3>

        <p className="text-muted-foreground mb-4 line-clamp-2">
          {post.excerpt}
        </p>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <time dateTime={post.date}>{formatDate}</time>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {post.readTime}
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
            className="flex items-center gap-1 text-primary"
          >
            Read
            <ArrowRight className="h-4 w-4" />
          </motion.div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-4">
          {post.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {post.tags.length > 3 && (
            <Badge variant="outline" className="text-xs opacity-60">
              +{post.tags.length - 3}
            </Badge>
          )}
        </div>
      </div>
    </motion.article>
  );
});

BlogCard.displayName = 'BlogCard';

// Main Blog Component with advanced filtering
const Blog: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const POSTS_PER_PAGE = 9;

  const [filters, setFilters] = useState<BlogFilters>({
    search: '',
    tags: [],
    categories: [],
    sortBy: 'date',
    sortOrder: 'desc'
  });

  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearch = useDebounce(filters.search, 300);

  // Mock data - Replace with API call
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        const mockPosts: BlogPost[] = [
          {
            id: '1',
            title: 'Building Scalable Data Pipelines with Apache Kafka and Python',
            excerpt: 'A comprehensive guide to designing and implementing robust data processing pipelines that can handle millions of events per second.',
            date: '2024-01-15',
            readTime: '8 min',
            tags: ['Data Engineering', 'Apache Kafka', 'Python', 'Scalability'],
            featured: true,
            slug: 'building-scalable-data-pipelines',
            image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop',
            category: 'Engineering',
            views: 1247,
            likes: 89
          },
          {
            id: '2',
            title: 'Deploying Machine Learning Models to Production: A Complete Guide',
            excerpt: 'Learn how to take your ML models from development to production with confidence, covering containerization, monitoring, and CI/CD.',
            date: '2024-01-08',
            readTime: '12 min',
            tags: ['Machine Learning', 'MLOps', 'Docker', 'Production'],
            slug: 'machine-learning-production',
            image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=450&fit=crop',
            category: 'ML & AI',
            views: 2156,
            likes: 143
          },
          {
            id: '3',
            title: 'Microservices Architecture: Lessons from Building at Scale',
            excerpt: 'Key insights and practical advice from implementing microservices in production environments.',
            date: '2023-12-22',
            readTime: '10 min',
            tags: ['Microservices', 'Architecture', 'DevOps', 'Scalability'],
            slug: 'microservices-architecture',
            image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=450&fit=crop',
            category: 'Architecture',
            views: 1876,
            likes: 134
          }
        ];

        setPosts(mockPosts);
        setError(null);
      } catch (err) {
        setError('Failed to load blog posts. Please try again.');
        console.error('Error fetching posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Advanced filtering and sorting
  const filteredPosts = useMemo(() => {
    let filtered = [...posts];

    // Search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchLower) ||
        post.excerpt.toLowerCase().includes(searchLower) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Tag filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(post =>
        filters.tags.some(tag => post.tags.includes(tag))
      );
    }

    // Category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(post =>
        filters.categories.includes(post.category)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case 'date':
          comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
          break;
        case 'views':
          comparison = (b.views || 0) - (a.views || 0);
          break;
        case 'readTime':
          comparison = parseInt(a.readTime) - parseInt(b.readTime);
          break;
      }

      return filters.sortOrder === 'desc' ? comparison : -comparison;
    });

    return filtered;
  }, [posts, debouncedSearch, filters]);

  const paginatedPosts = useMemo(() => {
    return filteredPosts.slice(0, page * POSTS_PER_PAGE);
  }, [filteredPosts, page]);

  const allTags = useMemo(() =>
    Array.from(new Set(posts.flatMap(post => post.tags))),
    [posts]
  );

  const allCategories = useMemo(() =>
    Array.from(new Set(posts.map(post => post.category))),
    [posts]
  );

  const loadMoreRef = useIntersectionObserver(() => {
    if (!loading && hasMore && paginatedPosts.length < filteredPosts.length) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore, paginatedPosts.length, filteredPosts.length]);

  const handleTagToggle = useCallback((tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  }, []);

  const handleCategoryToggle = useCallback((category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      tags: [],
      categories: [],
      sortBy: 'date',
      sortOrder: 'desc'
    });
  }, []);

  // SEO Meta tags
  useEffect(() => {
    document.title = 'Blog - Emmanuel Moghalu | Technical Writings';

    // Clean up function to reset title
    return () => {
      document.title = 'Emmanuel Moghalu - Portfolio';
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Technical Writings
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            Deep dives into software development, data engineering, and modern technology trends.
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 space-y-4"
        >
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search articles..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
                aria-label="Search blog posts"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {(filters.tags.length > 0 || filters.categories.length > 0) && (
                <Badge variant="secondary" className="ml-1">
                  {filters.tags.length + filters.categories.length}
                </Badge>
              )}
            </Button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 bg-card rounded-lg border space-y-4">
                  {/* Categories */}
                  <div>
                    <h3 className="font-semibold mb-3">Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {allCategories.map(category => (
                        <Badge
                          key={category}
                          variant={filters.categories.includes(category) ? "default" : "outline"}
                          className="cursor-pointer transition-colors"
                          onClick={() => handleCategoryToggle(category)}
                        >
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <h3 className="font-semibold mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map(tag => (
                        <Badge
                          key={tag}
                          variant={filters.tags.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer transition-colors"
                          onClick={() => handleTagToggle(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Sort Options */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <select
                        value={filters.sortBy}
                        onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                        className="px-3 py-1 rounded-md border bg-background"
                      >
                        <option value="date">Date</option>
                        <option value="views">Views</option>
                        <option value="readTime">Read Time</option>
                      </select>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters(prev => ({
                          ...prev,
                          sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
                        }))}
                      >
                        {filters.sortOrder === 'asc' ? '↑' : '↓'}
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-muted-foreground"
                    >
                      Clear all
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-muted-foreground mb-6">
            Showing {paginatedPosts.length} of {filteredPosts.length} articles
          </p>
        )}

        {/* Blog Grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <p className="text-xl text-muted-foreground mb-4">
              No articles found matching your criteria.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </motion.div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginatedPosts.map((post, index) => (
                <BlogCard key={post.id} post={post} index={index} />
              ))}
            </div>

            {/* Infinite scroll trigger */}
            {paginatedPosts.length < filteredPosts.length && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Blog;