import React from "react";
import { motion } from "framer-motion";
import {
  Database, Globe, Cpu,
  ArrowRight, Terminal, Layers,
  Zap, BarChart3, Container,
  BookOpen, Brain, MessageSquare,
  ExternalLink, Github, Truck,
  Factory, DollarSign
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* DATA: REAL PROJECTS                                                        */
/* -------------------------------------------------------------------------- */

const PROJECTS = [
  {
    id: "logistics-watchtower",
    featured: true,
    title: "Logistics Watchtower",
    subtitle: "Real-Time Cold Chain Fleet Monitoring",
    role: "Data Engineer",
    timeline: "2026",
    github: "https://github.com/emmanuelrichard01/logistics-watchtower",
    demo: null,
    context:
      "Cold chain logistics fail when cargo exceeds safe temperature thresholds. Traditional monitoring identifies spoilage only after delivery — too late for intervention.",
    solution:
      "A real-time telemetry pipeline streaming IoT data from a simulated fleet through Redpanda (Kafka), processing 8 alert rules with sub-200ms latency, and pushing updates to a live dashboard via WebSocket.",
    decisions: [
      {
        title: "Redpanda over Kafka",
        detail:
          "C++ core eliminates JVM pauses. Single-binary deployment with full Kafka API compatibility — reduced tail latency by 40%.",
      },
      {
        title: "Physics-Based Simulation",
        detail:
          "Waypoint interpolation with Haversine distance, road-type speed limits, and deterministic failure injection for reproducible testing.",
      },
      {
        title: "Event-Driven over Polling",
        detail:
          "WebSocket transport for sub-second map updates. REST polling would add latency and server load for a real-time use case.",
      },
    ],
    stack: ["Python", "FastAPI", "Redpanda", "Docker", "WebSocket", "Prometheus"],
  },
  {
    id: "modern-warehouse",
    featured: true,
    title: "Modern Data Warehouse",
    subtitle: "1.5M+ Record Analytics Platform",
    role: "Data Engineer",
    timeline: "2025",
    github: "https://github.com/emmanuelrichard01/modern-warehouse",
    demo: null,
    context:
      "E-commerce analytics required processing 1.5M+ records across 9 datasets (orders, payments, reviews, geospatial) with full data quality guarantees and reproducible transformations.",
    solution:
      "A production-ready Medallion Architecture (Bronze→Silver→Gold) orchestrated by Dagster, transformed via dbt, stored in DuckDB, and served through an interactive Plotly dashboard with 9 visualizations.",
    decisions: [
      {
        title: "DuckDB over Postgres",
        detail:
          "Billing data is analytical (SUMs, GROUP BYs), not transactional. DuckDB is orders of magnitude faster for aggregations with zero management overhead.",
      },
      {
        title: "21 dbt Schema Tests",
        detail:
          "Primary keys, foreign keys, accepted values, and relationship tests ensure no orphan orders, no negative revenue, and complete dimensional integrity.",
      },
      {
        title: "Incremental Models",
        detail:
          "1M+ geolocation records processed incrementally — only new/changed rows are transformed on each run, cutting pipeline time significantly.",
      },
    ],
    stack: ["Python", "Dagster", "dbt", "DuckDB", "Docker", "Plotly"],
  },
  {
    id: "cloud-bill-hunter",
    featured: false,
    title: "Cloud Bill Hunter",
    subtitle: "FinOps Intelligence Platform",
    role: "Data Engineer",
    timeline: "2025",
    github: "https://github.com/emmanuelrichard01/cloud-bill-hunter",
    demo: null,
    context:
      "20–30% of cloud spend is waste from orphaned or idle resources. Detecting this requires joining billing data with usage metrics — typically siloed with different schemas and granularity.",
    solution:
      "An event-driven microservices platform that ingests AWS CUR files, applies Medallion ETL (Bronze→Silver→Gold), and surfaces 'Zombie Infrastructure' via a Streamlit dashboard and headless API.",
    decisions: [
      {
        title: "Watchdog over Cron",
        detail:
          "File-event listeners trigger the pipeline the millisecond a billing file arrives — zero polling latency, simulating AWS Lambda triggers.",
      },
      {
        title: "API-First Architecture",
        detail:
          "Logic lives in FastAPI, UI is just a consumer. Enables integration with Slack bots, Jira workflows, and CI/CD gates without refactoring core logic.",
      },
      {
        title: "Idempotent Ingestion",
        detail:
          "Each run is fingerprinted by file hash + billing period. Re-uploading the same bill never duplicates costs — critical for financial accuracy.",
      },
    ],
    stack: ["Python", "FastAPI", "DuckDB", "Docker", "Streamlit"],
  },
  {
    id: "ultra-news",
    featured: false,
    title: "ULTRA-NEWS V2",
    subtitle: "Production-Grade News Aggregation Platform",
    role: "Full Stack Engineer",
    timeline: "2025",
    github: "https://github.com/emmanuelrichard01/ULTRA-NEWS",
    demo: null,
    context:
      "Modern news aggregators suffer from information overload — cluttered card layouts, intrusive ads, and poor signal-to-noise ratios. Users want density without cognitive fatigue.",
    solution:
      "An 'Information Instrument' built with Django 5 + Next.js 16. RSS ingestion with deep content scraping (Trafilatura), ISR edge caching at 60s revalidation, and an editorial-grade UI optimized for rapid consumption.",
    decisions: [
      {
        title: "PostgreSQL TSVector over ElasticSearch",
        detail:
          "Database-level full-text search eliminates an entire infrastructure dependency while delivering sub-10ms query times with proper indexing.",
      },
      {
        title: "GitHub Actions over Celery",
        detail:
          "Free-tier compatible ingestion — Actions triggers authenticated API endpoint every 30 min, spawning a background thread. Zero worker cost.",
      },
      {
        title: "ISR with 60s Revalidation",
        detail:
          "Sub-100ms responses via edge caching without real-time complexity. News tolerance for 60s staleness makes this the right tradeoff.",
      },
    ],
    stack: ["Python", "Django", "Next.js", "PostgreSQL", "Redis", "Docker"],
  },
  {
    id: "crypto-pipeline",
    featured: false,
    title: "Crypto Data Pipeline",
    subtitle: "End-to-End Market Analytics Engine",
    role: "Data Engineer",
    timeline: "Q3 2025",
    github: "https://github.com/emmanuelrichard01/crypto-data-pipeline",
    demo: null,
    context:
      "Cryptocurrency market data is notoriously noisy and fragmented. Traders and analysts lacked a unified, trustworthy source of truth with rigorous data quality checks.",
    solution:
      "A containerized ETL pipeline orchestrated via Make/Docker. Ingests raw API data from CoinGecko, validates schema in PostgreSQL, transforms via dbt, and serves insights through Streamlit and Grafana.",
    decisions: [
      {
        title: "Resilient Extraction",
        detail:
          "Asynchronous extractor with exponential backoff retry logic to handle flaky public APIs without pipeline failure.",
      },
      {
        title: "Quality as Code",
        detail:
          "dbt for in-pipeline testing (schema validation, null checks) — downstream dashboards only display trusted data.",
      },
      {
        title: "Batch over Stream",
        detail:
          "Hourly batch extraction over streaming to respect free-tier API rate limits while maintaining sufficient granularity.",
      },
    ],
    stack: ["Python", "dbt", "PostgreSQL", "Docker", "Streamlit", "Grafana"],
  },
  {
    id: "caritas-scholar",
    featured: false,
    title: "CARITAS AI Scholar",
    subtitle: "Intelligent Academic Platform",
    role: "Full Stack Engineer",
    timeline: "Q2 2025",
    github: "https://github.com/emmanuelrichard01/caritas-ai-scholar",
    demo: "https://caritas-ai-scholar.vercel.app/",
    context:
      "Students struggle with disjointed study tools and hallucinating generic AI. They needed a unified platform providing context-aware assistance grounded in their actual course materials.",
    solution:
      "A holistic React/Supabase platform combining a dynamic study scheduler, RAG-based document analysis (PDF to Quiz), and multi-model AI tutoring in a single responsive interface.",
    decisions: [
      {
        title: "Edge-First AI",
        detail:
          "Offloaded heavy LLM processing to Supabase Edge Functions (Deno) to maintain UI responsiveness and secure API keys.",
      },
      {
        title: "Vector Context (RAG)",
        detail:
          "Course documents chunked, embedded via pgvector, and stored — allowing the AI to cite user-uploaded textbooks.",
      },
      {
        title: "Token Cost Control",
        detail:
          "Complex text chunking strategies for large PDF uploads to balance context window size against per-request token costs.",
      },
    ],
    stack: ["TypeScript", "React", "Supabase", "OpenAI", "Tailwind", "RAG"],
  },
];

/* -------------------------------------------------------------------------- */
/* PROJECT CARD — Inline Narrative (no tabs)                                  */
/* -------------------------------------------------------------------------- */

const ProjectCard = ({
  project,
  index,
}: {
  project: (typeof PROJECTS)[0];
  index: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className={`group relative w-full rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-xl overflow-hidden hover:border-white/[0.1] transition-all duration-500 ${
        project.featured ? "p-6 md:p-10" : "p-6 md:p-8"
      }`}
    >
      {/* Top edge glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />

      {/* Hover spotlight */}
      <div className="absolute -inset-px bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-mono font-semibold uppercase tracking-[0.15em] border border-primary/20">
              {project.role}
            </span>
            <span className="text-[9px] font-mono text-white/30 border border-white/[0.06] px-2.5 py-1 rounded-full">
              {project.timeline}
            </span>
          </div>
          <h3
            className={`font-bold text-white/90 leading-tight mb-1.5 ${
              project.featured
                ? "text-2xl md:text-3xl"
                : "text-xl md:text-2xl"
            }`}
          >
            {project.title}
          </h3>
          <p className="text-sm md:text-base text-white/35 font-light">
            {project.subtitle}
          </p>
        </div>

        {/* Links */}
        <div className="flex items-center gap-3 shrink-0">
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300 text-[12px] font-medium"
            >
              <Github className="w-3.5 h-3.5" />
              Source
            </a>
          )}
          {project.demo && (
            <a
              href={project.demo}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all duration-300 text-[12px] font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Live Demo
            </a>
          )}
        </div>
      </div>

      {/* Narrative Flow: Context → Solution → Decisions */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
        {/* Left: Context + Solution */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-1 h-1 rounded-full bg-amber-400/60" />
              <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/30">
                Context
              </span>
            </div>
            <p className="text-[13px] md:text-sm text-white/45 leading-relaxed font-light">
              {project.context}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-1 h-1 rounded-full bg-emerald-400/60" />
              <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/30">
                What I Built
              </span>
            </div>
            <p className="text-[13px] md:text-sm text-white/45 leading-relaxed font-light">
              {project.solution}
            </p>
          </div>
        </div>

        {/* Right: Key Decisions */}
        <div className="lg:col-span-7">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-1 rounded-full bg-primary/60" />
            <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/30">
              Key Decisions
            </span>
          </div>
          <div className="space-y-3">
            {project.decisions.map((d, i) => (
              <div
                key={i}
                className="px-4 py-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.03] transition-all duration-300"
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="text-[9px] font-mono text-primary/50">
                    0{i + 1}
                  </span>
                  <span className="text-[13px] font-medium text-white/70">
                    {d.title}
                  </span>
                </div>
                <p className="text-[12px] text-white/35 leading-relaxed pl-6 font-light">
                  {d.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tech Stack Footer */}
      <div className="relative z-10 flex flex-wrap gap-1.5 pt-6 mt-8 border-t border-white/[0.04]">
        {project.stack.map((tech) => (
          <span
            key={tech}
            className="text-[10px] font-mono text-white/35 bg-white/[0.02] px-2.5 py-1 rounded-lg border border-white/[0.04] cursor-default hover:text-white/55 hover:border-white/[0.1] transition-all duration-300"
          >
            {tech}
          </span>
        ))}
      </div>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/* MAIN SECTION                                                               */
/* -------------------------------------------------------------------------- */

const Projects: React.FC = () => {
  return (
    <section
      id="projects"
      data-section="projects"
      className="py-24 md:py-32 relative"
    >
      <div className="container px-4 md:px-6 max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="mb-14 md:mb-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 text-primary/60 font-mono text-[10px] tracking-[0.2em] uppercase mb-3">
              <Terminal className="w-3.5 h-3.5" />
              <span>Case Studies</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white/90">
              Recent{" "}
              <span className="text-white/40">Work</span>
            </h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-white/30 max-w-sm text-sm leading-relaxed font-light"
          >
            Real systems I've designed and built — focusing on
            architecture decisions and engineering tradeoffs.
          </motion.p>
        </div>

        {/* Projects */}
        <div className="flex flex-col gap-6 lg:gap-8">
          {PROJECTS.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-14 flex flex-col items-center gap-3"
        >
          <a
            href="https://github.com/emmanuelrichard01"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 text-[13px] font-medium text-white/40 hover:text-white/70 transition-colors"
          >
            <span>View more on GitHub</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default Projects;