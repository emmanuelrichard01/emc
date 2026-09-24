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

/* ── Case-study blocks ──────────────────────────────────────────────────────
   The prose fields on CaseStudy stay the canonical summary — they are what
   search snippets, share cards and the AI read. Blocks are what the page can
   *show* on top of them: a diagram of the system, the code that holds a
   decision in place, a picture of the result. A case study with none renders
   exactly as before. */

export interface ArchitectureNode {
  id: string;
  label: string;
  /** One line under the label: what this part is responsible for. */
  detail?: string;
}

export interface ArchitectureEdge {
  from: string;
  to: string;
  label?: string;
}

export type CaseBlock =
  | { kind: "architecture"; caption: string; columns: { label: string; nodes: ArchitectureNode[] }[]; edges: ArchitectureEdge[] }
  | { kind: "code"; lang: string; code: string; caption: string; /** The file on GitHub, so the excerpt can be checked. */ href?: string }
  | { kind: "figure"; src: string; alt: string; caption?: string }
  | { kind: "callout"; text: string };

/**
 * A debugging story: what was seen, what was tried, what it actually was.
 *
 * The rarest thing a portfolio shows is how someone reasons when the first
 * explanation is wrong. `wrongTurns` is the load-bearing field — a fix
 * without the attempts that failed reads as luck.
 */
export interface FieldNote {
  title: string;
  symptom: string;
  wrongTurns?: string[];
  rootCause: string;
  fix: string;
  /** What now fails if it comes back — a test, a check, an invariant. */
  guard?: string;
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
  /** Shown after the matching section's prose. */
  blocks?: Partial<Record<"problem" | "approach" | "outcome", CaseBlock[]>>;
  /** Debugging stories, in their own section after the trade-offs. */
  fieldNotes?: FieldNote[];
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
  /**
   * False when `image` is designed artwork rather than a UI screenshot, so
   * the build-time capture must not overwrite it. For an app whose front
   * door is a sign-in form, a capture of the live URL is a picture of the
   * sign-in form.
   */
  captureScreenshot?: boolean;
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
  /** Overrides the indexable default — e.g. "noindex, follow" for a 404. */
  robots?: string;
  openGraph?: {
    title: string;
    description: string;
    image: string;
    url: string;
    type: string;
    imageAlt?: string;
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