// Portfolio Types - System Architecture Definitions 2026

import { LucideIcon } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* PROJECT SCHEMA                                                             */
/* -------------------------------------------------------------------------- */

export interface ArchitecturePoint {
  title: string;
  detail: string;
}

export interface DiagramStep {
  icon: LucideIcon;
  label: string;
}

export interface ProjectDiagram {
  steps: DiagramStep[];
}

export interface Project {
  id: string;
  title: string;
  subtitle: string;
  role: string;
  timeline: string;

  // 1. Narrative Core
  problem: string;
  system: string;

  // 2. Engineering Deep Dive
  architecture: ArchitecturePoint[];
  tradeoffs: string[];

  // 3. Technical Specs
  stack: string[];
  diagram: ProjectDiagram;

  // Optional / Legacy
  github?: string;
  demo?: string;
}

/* -------------------------------------------------------------------------- */
/* EXPERIENCE SCHEMA                                                          */
/* -------------------------------------------------------------------------- */

export interface Decision {
  label: string;
  text: string;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  period: string;

  // Operational Context
  scope: string;
  impact: string[];

  // Seniority Signal
  decision: Decision;
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
    // Added optional properties to support overrides
    title?: string;
    description?: string;
    image?: string;
  };
}