// Portfolio Types - Professional Type Definitions

export interface Project {
  id: number;
  title: string;
  description: string;
  image: string;
  technologies: string[];
  category: string;
  github: string;
  demo: string | null;
  features: string[];
  problemSolved: string;
  impact: string;
  year?: string;
  status?: string;
  featured?: boolean;
  highlights?: string[];
}

export interface Experience {
  id: number;
  title: string;
  company: string;
  location: string;
  duration: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  description: string;
  technologies: string[];
  achievements: string[];
}

export interface Skill {
  icon: any; // LucideIcon type
  title: string;
  description: string;
}

export interface SocialLink {
  icon: any; // LucideIcon type
  href: string;
  label: string;
  color?: string;
}

export interface NavigationItem {
  href: string;
  label: string;
  icon: any; // LucideIcon type
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
  author: {
    name: string;
    avatar: string;
  };
}

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
  };
}

export interface StructuredDataPerson {
  "@context": string;
  "@type": string;
  name: string;
  jobTitle: string;
  description: string;
  url: string;
  sameAs: string[];
  worksFor: {
    "@type": string;
    name: string;
  };
  alumniOf?: {
    "@type": string;
    name: string;
  };
  knowsAbout: string[];
  email: string;
  telephone?: string;
  address?: {
    "@type": string;
    addressLocality: string;
    addressRegion: string;
    addressCountry: string;
  };
}