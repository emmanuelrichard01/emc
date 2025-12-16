import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database, Server, Globe, Cpu,
  GitBranch, AlertTriangle, CheckCircle2,
  ArrowRight, Terminal, Layers,
  Layout, Activity, Lock, Zap,
  MessageSquare, ShoppingCart, BarChart3
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* 1. DATA: ENGINEERING CASE STUDIES                                          */
/* -------------------------------------------------------------------------- */

const PROJECTS = [
  {
    id: "helix",
    title: "Helix",
    subtitle: "Distributed Event Streaming Platform",
    role: "Lead Data Engineer",
    timeline: "Q3 2024",
    // 1. Problem Framing
    problem: "Financial clients experienced 400ms+ latency in trade execution due to monolithic REST API bottlenecks and database locks during high-volume events.",
    // 2. System Overview
    system: "Ingests 50k+ events/sec via WebSocket edge nodes, buffers in Redpanda (Kafka), processes stateful aggregations in Flink, and pushes updates to client dashboards via SSE.",
    // 3. Architecture & Decisions
    architecture: [
      {
        title: "Why Redpanda?",
        detail: "Chosen over standard Kafka for its C++ architecture (no JVM pauses) and single-binary deployment, reducing tail latency by 40%."
      },
      {
        title: "Pattern: CQRS",
        detail: "Decoupled write (ingestion) and read (analytics) paths to ensure dashboard queries never block trade execution."
      }
    ],
    // 4. Tradeoffs
    tradeoffs: [
      "Sacrificed immediate consistency for eventual consistency (max 100ms lag).",
      "Increased operational complexity with Flink cluster management vs simple cron jobs."
    ],
    stack: ["Go", "Redpanda", "Flink", "TimescaleDB", "gRPC"],
    // Visualization Data (Abstract Schema)
    diagram: {
      steps: [
        { icon: Globe, label: "Edge Clients" },
        { icon: Server, label: "Go Ingest" },
        { icon: Layers, label: "Redpanda" },
        { icon: Database, label: "Timescale" },
      ]
    }
  },
  {
    id: "sentinel",
    title: "Sentinel",
    subtitle: "Infrastructure Observability Engine",
    role: "Backend Architect",
    timeline: "Q1 2025",
    problem: "Production incidents took 45+ mins to diagnose because logs, metrics, and traces were scattered across three different disjointed tools.",
    system: "A unified telemetry pipeline that correlates logs (Loki), metrics (Prometheus), and traces (Tempo) into a single 'Graph' view for instant root cause analysis.",
    architecture: [
      {
        title: "Columnar Storage",
        detail: "Utilized ClickHouse for log storage to enable sub-second aggregations over billions of rows, replacing expensive ElasticSearch clusters."
      },
      {
        title: "Sampling Strategy",
        detail: "Implemented dynamic tail-based sampling to capture 100% of error traces while discarding 95% of healthy traffic to manage costs."
      }
    ],
    tradeoffs: [
      "High storage requirements for raw trace data during peak hours.",
      "Custom query language learning curve for team members used to SQL."
    ],
    stack: ["Rust", "ClickHouse", "Grafana", "Kubernetes", "OpenTelemetry"],
    diagram: {
      steps: [
        { icon: Activity, label: "Services" },
        { icon: Cpu, label: "O-Tel Col" },
        { icon: GitBranch, label: "Router" },
        { icon: Lock, label: "Storage" },
      ]
    }
  },
  {
    id: "dataflow",
    title: "DataFlow Analytics",
    subtitle: "Real-time Stream Processing Engine",
    role: "Lead Data Engineer",
    timeline: "2024",
    // 1. Problem Framing
    problem: "Enterprise clients struggled with fragmented data sources and 24-hour reporting delays, making real-time fraud detection and operational decision-making impossible.",
    // 2. System Overview
    system: "A hybrid Kappa-architecture pipeline. Ingests 10M+ daily records via Kafka, processes stateful anomalies in Flink, and serves sub-second analytics via a materialized PostgreSQL view.",
    // 3. Architecture & Decisions
    architecture: [
      {
        title: "Stream-First Design",
        detail: "Moved from batch ETL to event-driven processing using Kafka Connect, reducing data latency from 24 hours to <300ms."
      },
      {
        title: "Deduplication Strategy",
        detail: "Implemented bloom filters within the ingestion layer to handle at-least-once delivery guarantees without corrupting downstream metrics."
      }
    ],
    // 4. Tradeoffs
    tradeoffs: [
      "Higher infrastructure cost for always-on stream processors compared to ephemeral batch jobs.",
      "Complexity in handling out-of-order events required strict watermark policies."
    ],
    stack: ["Kafka", "Python", "Flink", "PostgreSQL", "Docker"],
    // Visualization Data (Abstract Schema)
    diagram: {
      steps: [
        { icon: Globe, label: "Sources" },
        { icon: Layers, label: "Kafka" },
        { icon: Cpu, label: "Flink" },
        { icon: Database, label: "Postgres" },
      ]
    }
  },
  {
    id: "nebula",
    title: "Nebula E-commerce",
    subtitle: "High-Scale Headless Retail Platform",
    role: "System Architect",
    timeline: "2023",
    problem: "Legacy monolithic architecture suffered cascading failures during Black Friday traffic spikes (10k+ concurrent users), resulting in significant revenue loss.",
    system: "A decomposed microservices architecture. Decoupled the storefront (Next.js) from the inventory engine using an event bus (Redis/BullMQ) to handle bursty write loads.",
    architecture: [
      {
        title: "Async Inventory",
        detail: "Optimistic UI updates combined with an eventual consistency model for inventory reservations prevented database locks during flash sales."
      },
      {
        title: "Edge Caching",
        detail: "Aggressive Stale-While-Revalidate caching strategy at the CDN edge reduced origin server load by 85%."
      }
    ],
    tradeoffs: [
      "Strict consistency sacrificed for availability (AP over CP in CAP theorem) during peak load.",
      "Distributed tracing (OpenTelemetry) became mandatory to debug inter-service latency."
    ],
    stack: ["Next.js", "Redis", "Kubernetes", "GraphQL", "Node.js"],
    diagram: {
      steps: [
        { icon: ShoppingCart, label: "Store" },
        { icon: Globe, label: "CDN" },
        { icon: Zap, label: "Queue" },
        { icon: Server, label: "Inventory" },
      ]
    }
  },
  {
    id: "neural-code",
    title: "Neural Code Reviewer",
    subtitle: "LLM-Powered Static Analysis",
    role: "ML Engineer",
    timeline: "2023",
    problem: "Senior engineers spent 15+ hours/week on trivial code reviews. Existing linters caught syntax errors but missed semantic bugs and optimization opportunities.",
    system: "An automated PR agent that combines AST parsing with a fine-tuned LLM. It generates context-aware suggestions and detects potential security vulnerabilities before human review.",
    architecture: [
      {
        title: "Context Window Optimization",
        detail: "Implemented RAG (Retrieval Augmented Generation) to fetch only relevant file dependencies, fitting large codebases into limited token windows."
      },
      {
        title: "Hybrid Analysis",
        detail: "Uses deterministic static analysis for syntax (FastAPI) and probabilistic models (TensorFlow) for logic, reducing hallucination rates."
      }
    ],
    tradeoffs: [
      "Inference latency (~5s) is higher than traditional linters.",
      "Requires constant model fine-tuning to adapt to team-specific coding styles."
    ],
    stack: ["Python", "TensorFlow", "FastAPI", "AWS Lambda", "LangChain"],
    diagram: {
      steps: [
        { icon: GitBranch, label: "Pull Req" },
        { icon: Terminal, label: "Parser" },
        { icon: Cpu, label: "LLM" },
        { icon: MessageSquare, label: "Comment" },
      ]
    }
  }
];

/* -------------------------------------------------------------------------- */
/* 2. UI COMPONENTS                                                           */
/* -------------------------------------------------------------------------- */

// Refined Animated Schematic - SUBTLE & RESPONSIVE
type SchematicStep = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
};
const Schematic = ({ steps }: { steps: SchematicStep[] }) => {
  return (
    <div className="relative flex items-center justify-between w-full h-24 md:h-32 px-4 md:px-8 bg-neutral-100/50 dark:bg-white/5 rounded-xl border border-neutral-200 dark:border-white/10 overflow-hidden select-none group/schematic">
      {/* Technical Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49%,rgba(0,0,0,0.03)_50%,transparent_51%)] dark:bg-[linear-gradient(90deg,transparent_49%,rgba(255,255,255,0.03)_50%,transparent_51%)] bg-[size:20px_100%]" />

      {/* Connecting Line Container */}
      <div className="absolute top-1/2 left-8 right-8 md:left-10 md:right-10 h-px -translate-y-1/2 z-0">
        {/* Static Path */}
        <div className="absolute inset-0 border-t border-dashed border-muted-foreground/20" />

        {/* Animated Data Packets - Ultra Subtle */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 h-[1.5px] w-12 bg-gradient-to-r from-transparent via-primary/40 to-transparent blur-[0.5px]"
          animate={{ left: ["-20%", "120%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Nodes */}
      {steps.map((step, i) => (
        <div key={i} className="relative z-10 flex flex-col items-center gap-2 md:gap-3 group/node">
          <div className="relative">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-background border border-border flex items-center justify-center shadow-sm transition-all duration-500 group-hover/schematic:border-primary/20 group-hover/schematic:shadow-[0_0_15px_-3px_rgba(var(--primary-rgb),0.1)]">
              <step.icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground transition-colors duration-500 group-hover/schematic:text-primary" />
            </div>
          </div>
          <span className="hidden md:block text-[9px] font-mono font-medium text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded border border-transparent group-hover/schematic:border-border/30 transition-colors">
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. PROJECT CARD COMPONENT                                                  */
/* -------------------------------------------------------------------------- */

const ProjectCard = ({ project, index }: { project: typeof PROJECTS[0], index: number }) => {
  const [activeTab, setActiveTab] = useState<"problem" | "architecture" | "tradeoffs">("problem");

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 p-5 md:p-8 rounded-2xl md:rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-sm overflow-hidden"
    >
      {/* Spotlight Hover Effect - Desktop Only */}
      <div className="absolute -inset-px bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 lg:group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl" />

      {/* LEFT COLUMN: Header & Visuals (Col Span 5) */}
      <div className="lg:col-span-5 flex flex-col h-full gap-6 md:gap-8 order-1">
        <div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 md:mb-5">
            <span className="px-2 py-1 rounded bg-primary/10 text-primary text-[9px] md:text-[10px] font-mono font-bold uppercase tracking-widest border border-primary/20">
              {project.role}
            </span>
            <span className="text-[9px] md:text-[10px] font-mono text-muted-foreground border border-border px-2 py-1 rounded">
              {project.timeline}
            </span>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2 leading-tight">
            {project.title}
          </h3>
          <p className="text-base md:text-lg text-muted-foreground font-light leading-relaxed">
            {project.subtitle}
          </p>
        </div>

        {/* Visual Artifact (Diagram) */}
        <div className="mt-auto">
          <div className="text-[9px] md:text-[10px] font-mono text-muted-foreground mb-2 md:mb-3 flex items-center gap-2 uppercase tracking-wider">
            <Activity className="w-3 h-3" /> System Architecture
          </div>
          <Schematic steps={project.diagram.steps} />
        </div>

        {/* Tech Stack Footer */}
        <div className="flex flex-wrap gap-1.5 md:gap-2 pt-4 md:pt-6 border-t border-border/40">
          {project.stack.map(tech => (
            <span key={tech} className="text-[10px] md:text-[11px] font-mono text-muted-foreground bg-neutral-100/80 dark:bg-white/5 px-2 py-1 rounded cursor-default hover:text-primary hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/20">
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: Narrative Deep Dive (Col Span 7) */}
      <div className="lg:col-span-7 flex flex-col bg-neutral-50/50 dark:bg-black/20 rounded-xl md:rounded-2xl border border-neutral-200 dark:border-white/5 overflow-hidden order-2">

        {/* Tabs - Scrollable on mobile */}
        <div className="flex border-b border-neutral-200 dark:border-white/5 bg-neutral-50/80 dark:bg-white/5 overflow-x-auto scrollbar-hide">
          {(() => {
            const tabs = [
              { id: "problem", label: "01. Problem", icon: AlertTriangle },
              { id: "architecture", label: "02. Architecture", icon: Layout },
              { id: "tradeoffs", label: "03. Tradeoffs", icon: GitBranch },
            ] as const;

            return tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-3 md:py-3.5 text-xs font-mono font-medium tracking-wide transition-all border-b-2
                  ${activeTab === tab.id
                    ? "bg-white dark:bg-white/5 text-primary border-primary"
                    : "text-muted-foreground hover:bg-white/50 dark:hover:bg-white/5 border-transparent"
                  }
                `}
              >
                <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="hidden sm:inline">{tab.label.split(' ')[1]}</span>
                <span className="sm:hidden">{tab.label.split(' ')[1]}</span> {/* Show label on mobile too for clarity */}
              </button>
            ));
          })()}
        </div>

        {/* Tab Content */}
        <div className="p-5 md:p-8 flex-1 relative bg-white/40 dark:bg-transparent min-h-[200px]">
          <AnimatePresence mode="wait">
            {activeTab === "problem" && (
              <motion.div
                key="problem"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
              >
                <h4 className="text-xs md:text-sm font-bold text-foreground mb-3 md:mb-4 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500" />
                  Context & Challenge
                </h4>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-6">
                  {project.problem}
                </p>
                <div className="pl-4 border-l-2 border-primary/30">
                  <div className="text-[10px] md:text-xs font-mono text-muted-foreground mb-1 uppercase tracking-wider">System Overview</div>
                  <p className="text-sm text-foreground italic leading-relaxed">
                    "{project.system}"
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === "architecture" && (
              <motion.div
                key="architecture"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {project.architecture.map((item, i) => (
                  <div key={i}>
                    <h4 className="text-xs md:text-sm font-bold text-foreground mb-1.5 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />
                      {item.title}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed pl-5 md:pl-6 border-l border-border/50 ml-1.5 md:ml-2">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === "tradeoffs" && (
              <motion.div
                key="tradeoffs"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
              >
                <h4 className="text-xs md:text-sm font-bold text-foreground mb-3 md:mb-4 uppercase tracking-widest flex items-center gap-2">
                  <GitBranch className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-500" />
                  Constraints & Reality
                </h4>
                <ul className="space-y-3 md:space-y-4">
                  {project.tradeoffs.map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                      <span className="text-purple-500 font-mono mt-0.5 opacity-70">0{i + 1}.</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/* 4. MAIN COMPONENT                                                          */
/* -------------------------------------------------------------------------- */

const Projects: React.FC = () => {
  return (
    <section id="projects" className="py-24 md:py-32 bg-neutral-50/50 dark:bg-black/20 relative">
      {/* Background Noise */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />

      <div className="container px-4 md:px-6 max-w-7xl mx-auto">

        {/* Section Header */}
        <div className="mb-12 md:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-primary font-mono text-xs tracking-widest mb-3 md:mb-4">
              <Terminal className="w-4 h-4" />
              <span>ENGINEERING_LOGS</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
              Selected <span className="text-muted-foreground">Systems</span>
            </h2>
          </div>
          <p className="text-muted-foreground max-w-sm text-sm md:text-base leading-relaxed">
            A look at how I solve problems. Focusing on architecture, tradeoffs, and system design over syntax.
          </p>
        </div>

        {/* Projects Stack */}
        <div className="flex flex-col gap-12 lg:gap-24">
          {PROJECTS.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>

        {/* Footer Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <a href="https://github.com/emmanuelrichard01">
            <button
              className="group inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="border-b border-foreground/0 group-hover:border-primary font-mono">View Full Archive on GitHub</span>
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
            </button>
          </a>
        </motion.div>

      </div>
    </section>
  );
};

export default Projects;