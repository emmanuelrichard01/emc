import { lazy } from 'react';

// Lazy load heavy components for better performance
export const LazyProjectModal = lazy(() => import('./ui/dialog').then(module => ({ default: module.Dialog })));
export const LazyBlogPost = lazy(() => import('../pages/BlogPost'));
export const LazyProjectsArchive = lazy(() => import('../pages/ProjectsArchive'));
export const LazyBlog = lazy(() => import('../pages/Blog'));

// Lazy load animation-heavy components
export const LazyTechStackRadar = lazy(() => import('./TechStackRadar'));
export const LazyCommandPalette = lazy(() => import('./CommandPalette'));