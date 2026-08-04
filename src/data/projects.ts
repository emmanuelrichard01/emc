// Type-only import: this module is also loaded by vite.config.ts to generate
// the sitemap, and an explicit `import type` guarantees esbuild elides it
// rather than trying to resolve the "@" alias outside the app build.
import type { Project } from "@/types";

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
      // "Match rate" alone doesn't say what is being matched, and the README
      // frames it as a target rather than a measured result — so the label
      // carries both facts.
      { label: "Auto-Match Target", value: "99.5%" },
      { label: "End-to-End Latency", value: "<10s" },
      { label: "Pipeline", value: "Medallion" },
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
    caseStudy: {
      problem:
        "Every Nigerian business taking payments across multiple PSPs — Paystack, Flutterwave, M-Pesa — carries a reconciliation gap. Settlement is asynchronous, reference IDs are not shared between providers, FX rates move between initiation and settlement, and webhooks arrive out of order, duplicated, or not at all. Finance teams spend 30–40% of their time reconciling by hand, against industry error rates of 3–8% of transaction volume.",
      approach:
        "A reconciliation engine that ingests PSP webhooks over HMAC-authenticated endpoints and polls their REST APIs as a fallback, normalises every provider's format into one canonical ledger with PII masked and FX normalised, then matches transactions through a two-tier engine — exact matching first, probabilistic trigram similarity second. It classifies five discrepancy types (missing settlements, amount mismatches, FX variance, duplicate credits, late settlements), generates CBN-compliant daily returns, and alerts when open exposure crosses a configured threshold. A third ingestion path cross-checks received webhooks against PSP records every six hours and auto-backfills whatever was missed.",
      outcome:
        "The design targets are a 99.5% auto-match rate — the share of ingested transactions the engine pairs to their counterpart without human review — sub-10-second end-to-end latency, and exactly-once processing semantics. Shipped alongside them: 160+ tests across 9 suites, 14 tables and a materialised view over 15 migrations, 23 Prometheus metrics feeding a 9-panel Grafana dashboard, an 11-service Docker stack, a 7-screen operator dashboard, and 12 specification documents written before the code.",
      highlights: [
        "Medallion layering: immutable Parquet in MinIO → canonical ACID ledger in PostgreSQL → dbt business logic",
        "PII masking enforced by the database itself via CHECK (has_pii_masked = TRUE), not by application convention",
        "Immutable audit trail enforced by trigger — no UPDATE or DELETE permitted on state history",
        "Four database roles on least-privilege grants; API keys stored as SHA-256 hashes, unrecoverable at rest",
        "CI security scanner with 9 rules covering disabled TLS, hardcoded secrets, and PII reaching logs",
        "Three deployment models, including self-hosted where credentials never leave the client's infrastructure",
      ],
      tradeoffs: [
        {
          decision: "Event queue",
          chose: "Redpanda",
          rejected: "Apache Kafka",
          why: "Kafka-compatible API at roughly 10x lower RAM, and no ZooKeeper to operate.",
        },
        {
          decision: "Matching strategy",
          chose: "Two-tier — exact, then probabilistic",
          rejected: "Exact reference matching only",
          why: "PSPs do not share reference IDs, so exact-only matching leaves every cross-provider pair permanently unmatched. pg_trgm similarity recovers them.",
        },
        {
          decision: "PSP credential scope",
          chose: "Read-only",
          rejected: "Full API access",
          why: "The engine never needs write access to a PSP account. Narrowing the credential removes the worst-case blast radius rather than mitigating it.",
        },
      ],
      notice:
        "The demo environment runs on synthetic transaction data calibrated to real Nigerian fintech patterns — multi-PSP settlement flows, WAT business-day windows, and NGN/USD/KES cross-border activity. Production deployment connects to live Paystack and Flutterwave merchant accounts through standard API credentials.",
    },
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
    caseStudy: {
      problem:
        "Cold chain logistics fail when cargo leaves its safe temperature window. Conventional monitoring relies on post-trip data dumps, so a temperature breach surfaces only after delivery — by which point the cargo is already lost. The information arrives accurate and useless.",
      approach:
        "An end-to-end streaming pipeline built for intervention rather than reporting. A producer simulates a fleet of refrigerated trucks moving along real Nigerian highway waypoints, emitting 15+ sensor readings per event from a physics model: waypoint interpolation for movement, road-type-dependent speed, trigonometric heading, Haversine distance, and fuel drawn down per kilometre. Telemetry streams through Redpanda into a Quix Streams processor evaluating 8 severity-classified alert rules, and alerts reach a live operations dashboard over WebSocket.",
      outcome:
        "Under 200ms end-to-end from sensor event to dashboard alert. Eight alert types span CRITICAL (temperature breach, door open in motion, compressor fault) through MEDIUM (speeding, low battery). Deterministic failure injection — a compressor that fails across a known waypoint range, a door that opens at a known stop — makes the whole alert path reproducibly testable instead of dependent on waiting for a real fault.",
      highlights: [
        "Real GPS waypoints along Nigerian highways (Lagos → Abuja, Port Harcourt → Makurdi, Benin → Abuja), not random coordinates",
        "Six Prometheus metric families: messages, alerts by type, alerts by severity, WebSocket connections, and uptime",
        "Fleet size scales through a single FLEET_SIZE variable, cycling trucks through the defined routes",
        "Ships with its own production gap analysis — Redis-backed state, JWT with RBAC, Kubernetes HPA over partitioned consumer groups, distributed tracing, and an S3 sink via Kafka Connect",
      ],
      tradeoffs: [
        {
          decision: "Message broker",
          chose: "Redpanda",
          rejected: "Apache Kafka",
          why: "A C++ core removes JVM pauses and dropping ZooKeeper removes an operational dependency. The cost is a younger ecosystem.",
        },
        {
          decision: "Stream processing",
          chose: "Quix Streams",
          rejected: "Spark / Flink",
          why: "Python-native and lightweight for a latency-sensitive, compute-light workload. Gives up horizontal scale this problem does not need.",
        },
        {
          decision: "Frontend transport",
          chose: "WebSocket",
          rejected: "REST polling",
          why: "A live fleet map needs sub-second updates. Polling adds latency and server load to arrive at a worse result.",
        },
        {
          decision: "Alert state",
          chose: "In-memory",
          rejected: "Persistent store",
          why: "Lost on restart, and named as a demo-scope choice rather than defended. Production would use Redis or Kafka Streams state stores.",
        },
      ],
    },
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
    caseStudy: {
      problem:
        "The Olist Brazilian e-commerce dataset arrives as nine separate files — orders, payments, reviews, sellers, geolocation and more — with no shared model between them. Most treatments load a convenient subset and stop there. Any question that crosses those files needs an actual warehouse behind it.",
      approach:
        "A full medallion warehouse over the complete dataset at 100% coverage. Dagster orchestrates asset-based ingestion into Bronze; dbt transforms Bronze → Silver → Gold with schema tests attached directly to the models; DuckDB stores it. Geolocation runs through incremental models, because a million-plus coordinate rows should not be rebuilt on every run. Portuguese category names are translated to English at the staging layer, and the Gold layer feeds nine interactive Plotly visualisations.",
      outcome:
        "1.5M+ records: 99,441 orders spanning Sep 2016 to Oct 2018, 99,441 customers, 32,951 products across 71 categories, 112,650 order items, 103k payments, 99k reviews, 3k+ sellers, and 1M+ geolocation coordinates. Quality is enforced by 21 dbt schema tests plus 9 automated Dagster checks, all passing, over 80%+ coverage with full mypy compliance. v2.1 cut ingestion 8× through connection pooling, shrank the Docker image 20%, and took CI from 5–8 minutes to 2–3.",
      highlights: [
        "Quality checks split by layer: Bronze validates row counts and null keys, Gold validates referential integrity, non-negative revenue, and duplicate customer IDs",
        "Incremental dbt models for the 1M+ row geolocation table",
        "Non-root containers with resource limits, health checks, and network isolation",
        "Bilingual Portuguese → English category translation at the staging layer",
      ],
      tradeoffs: [
        {
          decision: "Storage engine",
          chose: "DuckDB",
          rejected: "PostgreSQL",
          why: "The workload is analytical — SUMs and GROUP BYs across full tables — not transactional. An embedded OLAP engine is far faster here and leaves no server to operate.",
        },
      ],
    },
  },

  /* ── TIER 2: PRODUCTION ───────────────────────────────────────────────── */
  {
    id: "medvax",
    tier: "production",
    title: "MedVax",
    subtitle: "Health-Tech Telemedicine & E-Commerce",
    category: "Health-Tech Platform",
    // Matches the engagement recorded in EXPERIENCE and on the CV — a
    // Jan–Feb 2026 contract. This previously read "2025 — Present", which
    // contradicted both.
    timeline: "Jan — Feb 2026",
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
    stack: ["NestJS", "Next.js", "PostgreSQL", "Redis", "BullMQ", "Paystack", "WhatsApp API"],
    caseStudy: {
      problem:
        "Access to sexual and maternal reproductive health products in West Africa runs into two barriers at once: discretion and distribution. People who need contraceptives, prescription medication, or a frank consultation often will not walk into a pharmacy and ask for it — and the pharmacies that do stock what they need are fragmented across independent operators with no shared inventory or fulfilment layer.",
      approach:
        "A platform with two front doors into one backend: a web application and a WhatsApp assistant, both resolving to the same identity through phone-number OTP. The catalogue separates over-the-counter from prescription-only items, and checkout enforces that separation — a POM item cannot be fulfilled until a prescription is uploaded and approved by a pharmacist or clinician, or a consultation is booked. Orders route to partner pharmacies who accept or decline from their own dashboard. Payments run through Paystack, background work sits on a Redis-backed queue, and the assistant performs conversational triage while being barred by design from prescribing.",
      outcome:
        "In production at medvaxhealth.com. The system is specified before it is built: the governing SRS defines a permission matrix across six roles, the relational schema spanning users, pharmacies, products, per-pharmacy stock, orders, prescriptions, consultations and subscriptions, the order state machine, the REST surface, sequence diagrams for checkout and the WhatsApp add-to-cart path, and non-functional targets — a 5,000 daily-active-user baseline, p95 under 300ms on read endpoints, and 99.5% core availability.",
      highlights: [
        "Stock is modelled per pharmacy with a unique constraint on (product, pharmacy), so inventory is tracked per location rather than as one global number",
        "Ledger-based inventory with optimistic locking prevents race conditions when concurrent orders hit the same SKU",
        "The assistant never prescribes — anything requiring a prescription is routed into a consultation instead",
        "Idempotency keys on order creation stop rapid repeat clicks from producing duplicate orders",
        "Out-of-stock after checkout is a designed path — switch to an alternate pharmacy or trigger a refund — rather than an unhandled case",
        "Consent is captured at onboarding and stored; consultation records carry a 24-month default retention, transaction records five years",
      ],
      tradeoffs: [
        {
          decision: "Second channel",
          chose: "WhatsApp assistant",
          rejected: "A native mobile app",
          why: "The audience already has WhatsApp installed and already treats it as private. An app is another install and another icon on a home screen — and for discreet health access, that icon is itself a disclosure.",
        },
        {
          decision: "Assistant scope",
          chose: "Triage and routing only",
          rejected: "Letting the model answer clinical questions",
          why: "A model that names a medication has effectively prescribed it. The bot is kept off that path and books a consultation instead.",
        },
        {
          decision: "Delivery assignment",
          chose: "Manual or nearest-pharmacy",
          rejected: "Third-party logistics integration",
          why: "A named MVP scope cut. Logistics integration queues behind proving the order flow itself works.",
        },
      ],
    },
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
    caseStudy: {
      problem:
        "News aggregators treat the article as the primary entity, so one event covered by Reuters, the BBC and the Guardian shows up as three items. The reader gets volume without consolidation, and a single outlet's framing becomes indistinguishable from corroborated reporting.",
      approach:
        "Rebuilt from a legacy Django monolith around a single architectural bet: stories, not articles, are primary. 35+ RSS feeds are parsed by a Celery worker, deep-fetched for full text with trafilatura, sanitised with nh3, then vectorised locally with fastembed and clustered in pgvector by cosine similarity. Articles covering the same event collapse into one Story carrying a source count, an independent-domain count, and a velocity score. Each story then moves through a three-tier verification lifecycle — Wire (single source), Developing (two independent sources), Reporting (three or more independent domains). That lifecycle is the product.",
      outcome:
        "35+ sources across 4 tiers and 6 regions, sorted into 9 topic categories. Shipped: a coverage velocity leaderboard, an interactive story timeline with time deltas and cumulative counts, side-by-side headline framing comparison, an SSE breaking-news ticker, related-story lookup over pgvector similarity, per-source health monitoring, and a RAG endpoint for semantic queries across the corpus.",
      highlights: [
        "Article (display excerpt) is separated from RawDocument (internal full text powering embeddings), so aggregation never becomes republication",
        "Counts independent domains rather than raw sources — three feeds from one publisher is still one source",
        "nh3 (Rust) sanitisation closes the stored-XSS vector opened by dangerouslySetInnerHTML",
        "GitHub OIDC JWT for ingest auth, so credentials rotate without redeployment",
        "Django Ninja for typed, auto-documented APIs, with Next.js App Router handling server-side fetching and ISR caching",
      ],
      tradeoffs: [
        {
          decision: "Clustering",
          chose: "Semantic vectors, cosine ≥ 0.80",
          rejected: "Exact title matching",
          why: "Three outlets write three headlines for one event. Exact matching creates permanent single-source silos — precisely the failure the product exists to fix.",
        },
        {
          decision: "Embedding model",
          chose: "bge-small-en-v1.5, 384d, running locally",
          rejected: "OpenAI embedding API",
          why: "Zero API cost and runs inside Docker. Slightly lower quality, which the 72-hour clustering window absorbs.",
        },
        {
          decision: "Pagination",
          chose: "Cursor on (published_date, id)",
          rejected: "Offset",
          why: "Stable under a high insert rate. Offset pagination produces phantom and skipped rows whenever ingestion lands mid-scroll.",
        },
        {
          decision: "Display model",
          chose: "~40-word excerpt plus outbound link",
          rejected: "Full article rendering",
          why: "This is an aggregator, not a publisher. The outbound link is the obligation that comes with the content.",
        },
        {
          decision: "Search",
          chose: "PostgreSQL SearchVectorField with GIN",
          rejected: "Elasticsearch",
          why: "Postgres full-text is sufficient at this corpus size. A second datastore would be operational cost for no retrieval gain.",
        },
      ],
    },
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
      { label: "Admission", value: "Exactly 50/300" },
      { label: "Check Latency", value: "p99 <15ms" },
      { label: "Tests", value: "36 / 7 suites" },
    ],
    description:
      "A distributed rate limiter for outbound calls to quota-constrained third-party APIs. Token bucket state lives in Redis and is checked and consumed inside one atomic Lua script, so correctness holds across any number of instances. Ships with a bounded fail-open circuit breaker, crash-durable logging on Redis Streams that the request path never waits on, and an LRU config cache with pub/sub invalidation.",
    // Left empty deliberately: `tradeoffs` below covers the same decisions
    // with the rejected alternative named, which is strictly more useful.
    decisions: [],
    stack: ["TypeScript", "Node.js", "Express", "Redis", "Lua", "PostgreSQL", "nginx", "Docker"],
    caseStudy: {
      problem:
        "Outbound calls to quota-constrained third-party APIs — banking, logistics, AI providers — are metered by the provider, not by you, and exceeding the quota costs real money. The hard part is that the limit has to hold across a fleet of stateless instances: if each enforces its own local count, the cluster collectively overshoots. This is the inverse of the usual problem. Kong and Envoy protect your API from inbound callers; here the job is coordinating your own outbound calls against somebody else's budget, and a limiter that fails closed would take the whole fleet down with it.",
      approach:
        "A token bucket per client, held in Redis, with check-and-consume implemented as one atomic Lua script invoked via EVALSHA. That single decision carries the rest: Redis executes Lua single-threaded, so there is no window in which two instances double-spend the same tokens — correctness does not depend on locking, retries, or luck. The script reads Redis's own TIME rather than a caller-supplied timestamp, so clock drift between machines cannot skew refills. Around that core sit three things: a circuit breaker with a bounded local fallback, a logging pipeline on Redis Streams that the request path never waits on, and a usage dashboard.",
      outcome:
        "36 tests across 7 suites, run against real Redis and Postgres rather than mocks. The concurrency guarantee is proven, not asserted: 8 independent limiter instances fire 300 concurrent requests at one 50-capacity bucket, and exactly 50 are admitted, every run. Failure paths were exercised by hand against the compiled server — Redis killed mid-traffic (checks kept succeeding via fallback, /healthz reported the breaker OPEN, and it closed itself after cooldown with no intervention); a log worker killed mid-traffic (consumer-group lag grew rather than entries being lost, and drained to zero once a fresh worker started). Check latency holds at p50 under 5ms and p99 under 15ms against the test thresholds, measured as low as 0.3ms live after warmup. The whole system comes up on one command: Redis, Postgres, two API replicas behind nginx, and two log workers.",
      highlights: [
        "Reprocessing is idempotent by construction — every log row carries its originating Redis stream entry ID under a unique index with ON CONFLICT DO NOTHING, so a worker that dies after inserting but before acknowledging cannot produce a duplicate billing row",
        "The Lua script reads Redis's own TIME, so clock drift between instances cannot cause over- or under-admission",
        "Keys carry a {clientId} hash tag, so moving to Redis Cluster later requires no change to the rate-limiting logic",
        "The breaker fails fast rather than slow: after three consecutive failures calls skip Redis entirely instead of each burning the full 20ms timeout, and only one half-open probe is admitted per cooldown so recovery is not a thundering herd",
        "Config resolution is a bounded LRU with single-flight coalescing, so a cache-miss stampede on one client becomes one Postgres query rather than N",
        "Two separate API keys — a service key that only reaches /v1/check, and an admin key for anything that mutates config or breaker state",
        "Clients soft-delete via active = false, so billing history survives a deletion that a hard delete would either cascade away or block on a foreign key",
      ],
      tradeoffs: [
        {
          decision: "Limiting algorithm",
          chose: "Token bucket",
          rejected: "Fixed window, sliding window log, leaky bucket",
          why: "A fixed window admits 200 requests across a window boundary against a 100-per-window limit — disqualifying when the job is protecting a hard third-party quota. A sliding window log is accurate but stores a timestamp per request, so memory scales with volume rather than client count. A leaky bucket shapes to a constant output rate, but the requirement is a budget with burst tolerance, not a shaping target. Token bucket is two numbers per client and matches the semantics directly.",
        },
        {
          decision: "Atomicity",
          chose: "One Lua script via EVALSHA",
          rejected: "MULTI/EXEC with WATCH, or a distributed lock",
          why: "WATCH makes it an optimistic read-modify-write with a retry loop, so latency degrades exactly when contention is highest. Redlock's correctness is contested even inside the Redis ecosystem, and costs an extra round trip for what is a single-key operation. Lua is atomic by construction — which is why the race test can assert an exact number instead of an approximation.",
        },
        {
          decision: "Behaviour during a Redis outage",
          chose: "Bounded fail-open — each instance enforces the real limit locally",
          rejected: "Fail-closed, and pure fail-open",
          why: "Fail-closed violates the requirement not to block traffic. Pure fail-open satisfies it but abandons the point of the system: the motivation is avoiding financial penalties from quota violations, and an outage is the worst possible moment to stop enforcing a budget. Local buckets cap the worst case at N times the intended rate across N instances — over-admitting, deliberately, but bounded rather than unlimited.",
        },
        {
          decision: "Log transport",
          chose: "Redis Streams with consumer groups",
          rejected: "In-memory queue, and Kafka",
          why: "The first version used an in-memory queue and lost a batch on process crash — found in review and replaced, not designed correctly the first time. Streams give crash-durable at-least-once delivery, competing consumers, and XAUTOCLAIM recovery for entries a dead worker never acknowledged, without adding a broker to a 2.5-day build.",
        },
        {
          decision: "Config propagation",
          chose: "LRU cache, pub/sub invalidation, 60-second reconciliation",
          rejected: "Polling the full clients table",
          why: "Polling every row every few seconds holds every configured client in memory regardless of activity. Pub/sub alone is not enough either — Redis pub/sub is fire-and-forget, so a momentary subscriber blip loses that message permanently, and a cache that can go silently and permanently stale is worse than one occasionally 60 seconds behind. This was a real bug: a tier changed via direct SQL never reached already-cached clients, so the reconciliation loop went back in as a backstop.",
        },
      ],
      notice:
        "Built to a competition brief (Vega IT), which set the cluster-behind-a-load-balancer model and the requirement that traffic must never be fully blocked. Known limits, stated rather than left to be discovered: the single Redis instance is a SPOF for the exact-accuracy path — the fallback preserves availability, not exactness; the log stream is capped at roughly 200,000 entries, so a worker outage outlasting that cap would drop the oldest unconsumed rows; config changes made directly in SQL can take up to 60 seconds to propagate; and there is no mTLS between services, with auth a shared bearer token per tier and demo credentials inline in the compose file.",
    },
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
      { label: "Detection", value: "Z-score" },
      { label: "Contracts", value: "Pandera" },
      { label: "Storage", value: "DuckDB" },
    ],
    description:
      "Event-driven FinOps platform ingesting AWS Cost & Usage Reports through an Airflow-orchestrated Medallion pipeline, surfacing zombie infrastructure via statistical anomaly detection, a FastAPI gateway, and a React dashboard.",
    decisions: [],
    stack: ["Python", "FastAPI", "React", "Airflow", "DuckDB", "Terraform", "Pandera", "Docker"],
    caseStudy: {
      problem:
        "Cloud waste hides in plain sight: provisioned resources nobody uses, billing every hour. Static cost reports show the total but not which line items are zombies — and the naive detection heuristic, usage equals zero, misses everything that is merely near-idle or newly spiking.",
      approach:
        "An event-driven cost intelligence platform over AWS Cost & Usage Reports. Airflow orchestrates a medallion pipeline: Pandera contracts validate raw CUR before anything reaches Bronze, Silver reshapes it into a star schema of Fact_Usage and Dim_Resource, and Gold applies a statistical engine — Z-scores over rolling averages — to produce a zombie report and flag cost spikes. A decoupled FastAPI gateway serves it to a React dashboard.",
      outcome:
        "Detection moved from a boolean idle check to statistical anomaly detection with resource categorisation. Airflow replaced watchdog scripts, bringing retries, SLA monitoring and run history. Connectors sit behind an abstract base class with GCP and Azure stubbed to prove the abstraction holds, and Terraform modules define the S3, ECR and ECS deployment.",
      highlights: [
        "Pandera schema contracts run before ingestion — the pipeline does not trust its source",
        "Z-score detection over rolling averages replaces the usage == 0 heuristic",
        "Tests assert that malformed CUR files are rejected, not only that valid ones pass",
        "CI runs Ruff, mypy and pytest on every pull request",
      ],
      tradeoffs: [
        {
          decision: "Orchestration",
          chose: "Apache Airflow",
          rejected: "Filesystem watchdog scripts",
          why: "Retries, SLA monitoring and run history come with it. The watchdog approach had no answer for a run that failed halfway.",
        },
        {
          decision: "Dashboard",
          chose: "React + Vite with Recharts",
          rejected: "Streamlit",
          why: "Streamlit stood up fast but capped both the interaction model and the visual result. The rebuild bought full control of both.",
        },
        {
          decision: "Storage engine",
          chose: "DuckDB",
          rejected: "A hosted warehouse",
          why: "Embedded OLAP is fast enough for CUR-scale aggregation with no infrastructure to run or pay for.",
        },
      ],
    },
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
      { label: "Cadence", value: "Hourly" },
      { label: "Freshness SLA", value: "2h alert" },
      { label: "Coverage", value: "80%+" },
    ],
    description:
      "Containerized ETL ingesting CoinGecko data with exponential backoff, validating via dbt schema tests, and serving trusted analytics through Streamlit with operational monitoring in Grafana.",
    decisions: [],
    stack: ["Python", "dbt", "PostgreSQL", "Redis", "Docker", "Streamlit", "Grafana"],
    caseStudy: {
      problem:
        "Market data is easy to fetch and hard to trust. A public API will happily return a price; it will not tell you that the last three hours are missing, that a value moved 40% because of a bad tick rather than the market, or that the dashboard is quietly rendering yesterday's numbers. A chart built straight onto an API call inherits every one of those failures silently.",
      approach:
        "An hourly ETL that treats trustworthiness as the deliverable rather than a side effect. Extraction is asynchronous with exponential backoff against the CoinGecko API, loading runs through SQLAlchemy into PostgreSQL, and dbt handles modelling and schema testing so data quality is asserted in the warehouse instead of assumed downstream. Redis caches hot reads. Streamlit serves the analytical dashboard and Grafana carries operational monitoring — kept deliberately separate, because \"what is the market doing\" and \"is the pipeline healthy\" are different questions for different readers.",
      outcome:
        "The pipeline monitors itself. Alerts fire when no data has been extracted for over two hours, when a run fails, and when a price moves more than 20% in 24 hours. Test suites cover extraction, loading, orchestration, health monitoring and configuration validation against an 80%+ coverage bar, with type hints and PEP 8 enforced in CI. The stack is containerised end to end and driven by Make, with Alembic migrations and dbt runs as first-class commands.",
      highlights: [
        "Data freshness is an alert, not an assumption — silence from the extractor is itself a monitored condition",
        "Price anomaly detection flags moves above 20% in 24 hours, so a bad tick becomes visible rather than plotted",
        "The health monitor has its own test suite, so the component watching the pipeline is itself verified",
        "Exponential backoff means upstream rate limits degrade a run rather than failing it",
      ],
      tradeoffs: [
        {
          decision: "Where data quality is enforced",
          chose: "dbt schema tests in the warehouse",
          rejected: "Validation inside the extraction script",
          why: "Script-side validation only covers the path that script took. Tests attached to the models assert the shape of the data on every run, whatever produced it.",
        },
        {
          decision: "Dashboarding",
          chose: "Streamlit for analytics, Grafana for operations",
          rejected: "A single tool for both",
          why: "Market trends and pipeline health have different audiences and different refresh expectations. Collapsing them into one surface makes both worse.",
        },
        {
          decision: "Extraction cadence",
          chose: "Hourly batch",
          rejected: "Real-time streaming",
          why: "The questions being asked are trend-shaped, not tick-shaped. Hourly stays well inside free-tier API limits and removes an entire class of streaming infrastructure that would earn nothing here.",
        },
      ],
    },
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
      { label: "Workflows", value: "7" },
      { label: "Edge Functions", value: "6" },
      { label: "Access", value: "Row-level" },
    ],
    description:
      "React/Supabase study platform unifying seven student workflows — AI tutoring, course-material analysis (PDF→notes/quiz/flashcards), study planning, research, GPA, and a searchable interaction history — with all model calls isolated in Deno edge functions.",
    decisions: [],
    stack: ["TypeScript", "React", "Vite", "Supabase", "Deno", "PostgreSQL", "Gemini", "Tailwind"],
    caseStudy: {
      problem:
        "Students juggle a scattering of single-purpose tools — one for notes, another for flashcards, a calculator for GPA, a separate search for papers — and none of them share context. Ask a question on Monday and there is no record of it on Friday. For a cohort of roughly three thousand students at Caritas University, the friction was never any individual tool; it was that none of them knew about each other.",
      approach:
        "A single-page React application over Supabase, with seven workflows sharing one identity, one history and one design system: an AI tutor, a dashboard, a GPA calculator, a study planner, a course assistant, a research assistant, and a searchable archive of every interaction. All model calls run inside Deno edge functions rather than the browser, so no provider key is ever shipped to a visitor. Uploaded course material moves through a defined pipeline — storage, then parsing and segmentation, then generated notes, quizzes and flashcards — with each stage persisted so the expensive step is never repeated.",
      outcome:
        "Six edge functions carry the backend: a general AI router across Google Gemini, OpenRouter and OpenAI, a document parser, a study-aid generator, an upload handler, an academic search wrapping Serper, and a health endpoint. Row-level security is enabled on every user-scoped table with policies enforcing auth.uid() = user_id, uploads live in a private bucket reachable only through signed URLs, and a database trigger creates the profile row on signup so the application layer never has to.",
      highlights: [
        "Model output is repaired rather than trusted — jsonrepair recovers structured quiz data from malformed model JSON instead of failing the request",
        "The health endpoint probes all three AI providers in parallel with 5-second timeouts, caches for 30 seconds, and rate-limits to 60 requests per hour per IP",
        "The service role key never leaves the edge runtime; the browser only ever holds the anon key",
        "Parsed material persists as segments, summaries, quizzes and flashcards, so regenerating one study aid never re-parses the document",
        "Auth gating renders a modal over a blurred preview rather than a hard redirect, so the value of a page is visible before sign-up is demanded",
      ],
      tradeoffs: [
        {
          decision: "Where model calls run",
          chose: "Deno edge functions",
          rejected: "Direct calls from the browser",
          why: "A browser-side call means shipping a provider key to every visitor. The edge function keeps the key server-side and gives one place to enforce auth and route by category.",
        },
        {
          decision: "AI provider",
          chose: "Multi-provider router — Gemini, OpenRouter, OpenAI",
          rejected: "A single hardcoded provider",
          why: "Providers rate-limit, deprecate models and go down. Routing behind one edge function makes the provider a configuration detail rather than a rewrite.",
        },
        {
          decision: "Role storage",
          chose: "A dedicated user_roles table with a SECURITY DEFINER has_role() function",
          rejected: "A role column on the profiles table",
          why: "Users can write their own profile row. A role stored there is a privilege escalation waiting to be found.",
        },
        {
          decision: "Malformed model output",
          chose: "Repair with jsonrepair",
          rejected: "Reject and retry",
          why: "Models emit almost-valid JSON often enough that a retry is slower and more expensive than a repair. Retry stays as the fallback for when repair fails.",
        },
      ],
    },
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

  /* ── TIER 4: ARCHITECTURE STUDIES ──────────────────────────────────────
     Design-stage work. Not built, not running, and labelled as such
     everywhere it renders. `stack` is left empty where no technology was
     actually committed to, rather than filled in with plausible guesses. */
  {
    id: "cbn-data-residency",
    tier: "design",
    title: "CBN Data Residency Migration",
    subtitle: "Reference Architecture for Local Payment Data Storage",
    category: "Regulatory Architecture",
    timeline: "2026",
    github: null,
    liveUrl: null,
    metrics: [{ label: "Compliance Deadline", value: "Jan 2027" }],
    description:
      "A reference architecture for migrating Nigerian payment transaction data into local storage ahead of the Central Bank of Nigeria's January 2027 compliance deadline, set out in Circular PSS/DIR/PUB/CIR/001/004. Scopes the migration path, residency boundary, and the data classes the circular actually covers.",
    decisions: [],
    stack: [],
  },
  {
    id: "smart-meter-telemetry",
    tier: "design",
    title: "Smart Meter & Inverter Telemetry",
    subtitle: "Distributed IoT Telemetry Platform",
    category: "Streaming Architecture",
    timeline: "2026",
    github: null,
    liveUrl: null,
    metrics: [],
    description:
      "Blueprint-stage architecture for a real-time telemetry platform over distributed smart meters and inverters — Flink for stream processing, Iceberg as the table format, and TimescaleDB for time-series serving.",
    decisions: [],
    stack: ["Apache Flink", "Apache Iceberg", "TimescaleDB"],
  },
];
