import { Project } from "@/types";

export const PROJECTS: Project[] = [
  /* ── TIER 1: FLAGSHIP ─────────────────────────────────────────────────── */
  {
    id: "mmr-engine",
    tier: "flagship",
    title: "MMR Engine",
    subtitle: "Cross-Border Mobile Money Reconciliation",
    category: "Fintech Core System",
    timeline: "2026",
    github: "https://github.com/emmanuelrichard01/mmr-engine",
    liveUrl: null,
    metrics: [
      { label: "Match Rate", value: "99.5%" },
      { label: "Latency", value: "<10s" },
      { label: "Data Pipeline", value: "Medallion" },
    ],
    description:
      "A production-grade reconciliation engine that bridges the gap between disparate PSPs (Paystack, Flutterwave, M-Pesa). It ingests webhooks and polls APIs via HMAC-authenticated endpoints, normalises data into a canonical financial ledger, and matches transactions using a two-tier engine (exact primary + probabilistic secondary with trigram similarity). It detects anomalies like missing settlements, FX variance, and duplicate credits while maintaining a 99.5% match rate.",
    decisions: [
      {
        title: "Medallion Data Architecture",
        detail:
          "Bronze (raw immutable Parquet) → Silver (canonical ACID in PostgreSQL) → Gold (business logic via dbt). This guarantees exactly-once processing semantics and full auditability for regulatory compliance.",
      },
      {
        title: "Redpanda for Event Streaming",
        detail:
          "Provides Kafka-level durability and API compatibility but with 10x lower RAM usage, acting as the idempotent event queue between ingestion and storage.",
      },
    ],
    stack: ["Python", "FastAPI", "Next.js", "PostgreSQL", "Redpanda", "Prefect", "dbt", "MinIO"],
  },
  {
    id: "logistics-watchtower",
    tier: "flagship",
    title: "Logistics Watchtower",
    subtitle: "Real-Time Cold Chain Fleet Monitoring",
    category: "Real-Time Systems",
    timeline: "2026",
    github: "https://github.com/emmanuelrichard01/logistics-watchtower",
    liveUrl: null,
    metrics: [
      { label: "Latency", value: "<200ms" },
      { label: "Sensors", value: "15+/truck" },
      { label: "Alert Rules", value: "8" },
    ],
    description:
      "Most logistics systems rely on post-trip data dumps — by the time a temperature spike shows up, the cargo is already lost. I built an end-to-end event-driven streaming pipeline: 15+ IoT sensors per truck simulated with physics-based GPS (real Nigerian highway waypoints), streamed through Redpanda, processed by Quix Streams for 8 real-time alert rules (temperature breach, door violation, speed, fuel), with severity-aware notifications pushed to a live operations dashboard via WebSocket.",
    decisions: [
      {
        title: "Redpanda over Kafka",
        detail:
          "C++ core eliminates JVM pauses. Single-binary deployment with full Kafka API compatibility — reduced tail latency by 40%.",
      },
      {
        title: "Observability as First-Class",
        detail:
          "Prometheus metrics, structured logging, and a demo mode with deterministic failure scenarios for reproducible integration testing.",
      },
    ],
    stack: ["Python", "FastAPI", "Redpanda", "Quix Streams", "Docker", "Prometheus"],
  },
  {
    id: "modern-warehouse",
    tier: "flagship",
    title: "Modern Data Warehouse",
    subtitle: "1.5M+ Record Analytics Platform",
    category: "Analytics Engineering",
    timeline: "2025",
    github: "https://github.com/emmanuelrichard01/modern-warehouse",
    liveUrl: null,
    metrics: [
      { label: "Records", value: "1.5M+" },
      { label: "dbt Tests", value: "21" },
      { label: "Coverage", value: "80%+" },
    ],
    description:
      "Processing the complete Olist Brazilian E-Commerce dataset — 99k orders, 103k payments, 99k reviews, and 1M+ geospatial coordinates across 9 sources. Full Medallion Architecture (Bronze→Silver→Gold) orchestrated by Dagster, transformed via dbt with 21 schema tests, stored in DuckDB, and served through 9 interactive Plotly visualizations. V2.1 achieved 8× faster ingestion via connection pooling and 60% faster CI.",
    decisions: [
      {
        title: "DuckDB over Postgres",
        detail:
          "Billing data is analytical (SUMs, GROUP BYs), not transactional. DuckDB is orders of magnitude faster for aggregations with zero management overhead.",
      },
      {
        title: "Production Engineering",
        detail:
          "Full mypy compliance, centralized logging, non-root Docker containers with resource limits, and incremental models for 1M+ geolocation records.",
      },
    ],
    stack: ["Python", "Dagster", "dbt", "DuckDB", "Docker", "Plotly"],
  },

  /* ── TIER 2: PRODUCTION ───────────────────────────────────────────────── */
  {
    id: "medvax",
    tier: "production",
    title: "MedVax",
    subtitle: "Health-Tech Telemedicine & E-Commerce",
    category: "Health-Tech Platform",
    timeline: "2025 — Present",
    github: null,
    liveUrl: "https://medvaxhealth.com",
    image: "/images/medvax.png",
    metrics: [
      { label: "Stack", value: "NestJS + Next.js" },
      { label: "Auth", value: "JWT + RBAC" },
      { label: "Status", value: "Production" },
    ],
    description:
      "A production platform bridging telemedicine with pharmacy logistics in West Africa. JWT authentication with role-based access (Client/Consultant/Admin), Paystack payments, Dyte video conferencing, ledger-based inventory with optimistic locking, and BullMQ background processing.",
    decisions: [
      {
        title: "Ledger-Based Inventory",
        detail:
          "Stock movements tracked as an append-only ledger with optimistic locking — prevents race conditions during concurrent orders on the same SKU.",
      },
    ],
    stack: ["NestJS", "Next.js", "PostgreSQL", "Redis", "BullMQ", "Paystack"],
  },
  {
    id: "ultra-news",
    tier: "production",
    title: "ULTRA-NEWS V3",
    subtitle: "The Wire Room",
    category: "News Intelligence",
    timeline: "2025 — Present",
    github: "https://github.com/emmanuelrichard01/ULTRA-NEWS",
    liveUrl: "https://ultra-news.vercel.app/",
    image: "/images/ultra-news.png",
    metrics: [
      { label: "Clustering", value: "pgvector" },
      { label: "Ingestion", value: "35+ Feeds" },
      { label: "Verification", value: "3-Tier" },
    ],
    description:
      "A story-centric news aggregation platform where multiple outlets covering the same event are semantically clustered into one 'Story' object. It features a three-tier verification lifecycle (Wire → Developing → Reporting) tracking how fast coverage accumulates, providing a consolidated intelligence feed without single-source bias.",
    decisions: [
      {
        title: "Semantic Vectors over Exact Match",
        detail:
          "Three outlets write three different headlines for the same event. We use cosine similarity (≥ 0.80) with local bge-small-en-v1.5 embeddings to cluster stories, avoiding permanent single-source silos while eliminating API costs.",
      },
      {
        title: "Django Ninja + Next.js App Router",
        detail:
          "Django Ninja provides typed, fast, auto-documented APIs for the backend, while Next.js handles server-side data fetching and ISR for edge caching.",
      },
    ],
    stack: ["Python", "Django", "Next.js", "PostgreSQL", "pgvector", "Celery", "Redis"],
  },

  /* ── TIER 3: SYSTEMS ──────────────────────────────────────────────────── */
  {
    id: "global-rate-limiter",
    tier: "system",
    title: "Global Rate Limiter as a Service",
    subtitle: "High-availability API quota management",
    category: "API Infrastructure",
    timeline: "2026",
    github: null,
    liveUrl: null,
    metrics: [
      { label: "Concurrency", value: "Race-proof (Lua)" },
      { label: "Fail-safe", value: "Local Fallback" },
    ],
    description:
      "A high-availability rate limiter for outbound calls to quota-constrained third-party APIs. It uses a token bucket algorithm stored in Redis and checked atomically via Lua scripts. Features include a circuit breaker that falls back to a local in-memory token bucket during Redis outages (deliberate fail-open), and a fully decoupled background logging queue to Postgres to keep the hot path fast.",
    decisions: [
      {
        title: "Atomic Redis Lua Script",
        detail:
          "Checked and consumed atomically in a single Lua script run via EVALSHA. Concurrent callers from different instances can never race each other because Redis executes Lua single-threaded.",
      },
      {
        title: "Decoupled Hot Path Logging",
        detail:
          "The limit check never awaits a database write. It fires an in-memory enqueue and returns immediately. A background timer batches and flushes to Postgres, followed by a separate rollup job for dashboard trends.",
      },
    ],
    stack: ["TypeScript", "Node.js", "Redis", "Lua", "PostgreSQL", "Docker"],
  },
  {
    id: "cloud-bill-hunter",
    tier: "system",
    title: "Cloud Bill Hunter",
    subtitle: "FinOps Intelligence Platform",
    category: "FinOps",
    timeline: "2025",
    github: "https://github.com/emmanuelrichard01/cloud-bill-hunter",
    liveUrl: null,
    metrics: [
      { label: "Detection", value: "Real-time" },
      { label: "Storage", value: "DuckDB" },
    ],
    description:
      "Event-driven platform ingesting AWS CUR files through Medallion ETL, surfacing zombie infrastructure via Streamlit dashboard and headless API.",
    decisions: [],
    stack: ["Python", "FastAPI", "DuckDB", "Docker", "Streamlit"],
  },
  {
    id: "crypto-pipeline",
    tier: "system",
    title: "Crypto Data Pipeline",
    subtitle: "Market Analytics Engine",
    category: "Data Pipeline",
    timeline: "2025",
    github: "https://github.com/emmanuelrichard01/crypto-data-pipeline",
    liveUrl: null,
    metrics: [
      { label: "Quality", value: "dbt tested" },
      { label: "Retry", value: "Exponential" },
    ],
    description:
      "Containerized ETL ingesting CoinGecko data with exponential backoff, validating via dbt schema tests, and serving trusted analytics through Streamlit and Grafana.",
    decisions: [],
    stack: ["Python", "dbt", "PostgreSQL", "Docker", "Streamlit", "Grafana"],
  },
  {
    id: "caritas-scholar",
    tier: "system",
    title: "CARITAS AI Scholar",
    subtitle: "Intelligent Academic Platform",
    category: "AI / RAG",
    timeline: "2025",
    github: "https://github.com/emmanuelrichard01/caritas-ai-scholar",
    liveUrl: "https://caritas-ai-scholar.vercel.app/",
    image: "/images/caritas-scholar.png",
    metrics: [
      { label: "AI", value: "RAG Pipeline" },
      { label: "Demo", value: "Live" },
    ],
    description:
      "React/Supabase platform combining RAG-based document analysis (PDF→Quiz), multi-model AI tutoring, and dynamic study scheduling. Edge Functions for LLM processing.",
    decisions: [],
    stack: ["TypeScript", "React", "Supabase", "OpenAI", "Tailwind"],
  },
  {
    id: "evanty",
    tier: "system",
    title: "Evanty",
    subtitle: "Event Management Platform",
    category: "Full-Stack",
    timeline: "2025",
    github: "https://github.com/emmanuelrichard01/Evanty",
    liveUrl: "https://evanty.vercel.app/",
    image: "/images/evanty.png",
    metrics: [
      { label: "Payments", value: "Stripe" },
      { label: "Auth", value: "Clerk" },
    ],
    description:
      "Next.js 14 event platform with Server Actions, Stripe checkout, Clerk auth, MongoDB, and Zod-validated forms. Webhook-synced user and payment state.",
    decisions: [],
    stack: ["Next.js", "TypeScript", "MongoDB", "Stripe", "Clerk"],
  },
];
