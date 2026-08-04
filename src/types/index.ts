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

/** An explicitly considered alternative, and why it lost. */
export interface Tradeoff {
  /** What was being decided, e.g. "Message broker". */
  decision: string;
  chose: string;
  rejected: string;
  why: string;
}

/**
 * Long-form case study.
 *
 * Optional on purpose: only projects with verified written source material
 * carry one. A project without a case study renders the shorter layout rather
 * than having narrative invented to fill the template.
 */
export interface CaseStudy {
  /** Why this needed to exist — the situation before the work. */
  problem: string;
  /** What was actually built, in engineering terms. */
  approach: string;
  /** What it achieved. Numbers here must be real and attributable. */
  outcome: string;
  /** Short, individually verifiable engineering facts. */
  highlights?: string[];
  /** Decisions with a named rejected alternative. */
  tradeoffs?: Tradeoff[];
  /**
   * Scope caveat surfaced prominently — e.g. that a demo runs on synthetic
   * data. Stating limits up front is a credibility gain, not a cost.
   */
  notice?: string;
}

/** Derived from tier and the links a project actually has — never hand-written. */
export type ProjectStatus = "live" | "source-available" | "private" | "design";

export interface Project {
  id: string;
  /**
   * `design` is architecture work that has not been built. It is kept as a
   * distinct tier rather than mixed in with shipped systems so the page can
   * never imply a blueprint is running in production.
   */
  tier: "flagship" | "production" | "system" | "design";
  title: string;
  subtitle: string;
  category: string;
  timeline: string;
  github: string | null;
  liveUrl: string | null;
  image?: string;
  metrics: ProjectMetric[];
  description: string;
  decisions: Decision[];
  stack: string[];
  caseStudy?: CaseStudy;
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
  /**
   * Context for a role that overlapped another commitment.
   *
   * Several of these ran concurrently with each other or with study. Listed
   * as bare date ranges the overlaps look like a mistake on the CV; stated
   * plainly they read as capacity. Cheaper to answer the question before it
   * is asked.
   */
  note?: string;
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