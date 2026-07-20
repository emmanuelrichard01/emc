// Portfolio Types - System Architecture Definitions 2026

/* -------------------------------------------------------------------------- */
/* PROJECT SCHEMA                                                             */
/* -------------------------------------------------------------------------- */

export interface ProjectMetric {
  label: string;
  value: string;
}

export interface Decision {
  title: string;
  detail: string;
}

export interface Project {
  id: string;
  tier: "flagship" | "production" | "system";
  title: string;
  subtitle: string;
  category: string;
  timeline: string;
  github: string | null;
  liveUrl: string | null;
  metrics: ProjectMetric[];
  description: string;
  decisions: Decision[];
  stack: string[];
}

/* -------------------------------------------------------------------------- */
/* EXPERIENCE SCHEMA                                                          */
/* -------------------------------------------------------------------------- */

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  type: string;
  period: string;
  summary: string;
  highlights: string[];
  stack: string[];
}

/* -------------------------------------------------------------------------- */
/* SEO & META                                                                 */
/* -------------------------------------------------------------------------- */

export interface SEOMetadata {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  openGraph?: {
    title: string;
    description: string;
    image: string;
    url: string;
    type: string;
  };
  twitter?: {
    card: string;
    site: string;
    creator: string;
    title?: string;
    description?: string;
    image?: string;
  };
}