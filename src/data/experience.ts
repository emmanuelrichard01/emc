// Type-only, matching projects.ts: a value import here is kept by any
// consumer that strips types rather than bundling (Node's native TS support,
// or vite.config.ts importing this the way it imports PROJECTS), and
// src/types has no runtime exports to resolve.
import type { ExperienceItem } from "@/types";

export const EXPERIENCE: ExperienceItem[] = [
  {
    id: "mercor",
    company: "Mercor",
    role: "Software Engineer, AI Benchmarking",
    type: "Part-time",
    period: "Jul — Sep 2026",
    summary:
      "Built Codebase Atlas Q&A, a repository-level benchmark and evaluation environment for Mercor's RL platform, testing frontier models on codebase comprehension and architectural reasoning.",
    highlights: [
      "Designed adversarial multi-module tasks that make AI agents trace cross-file dependencies, lifecycle ordering, state transitions and asymmetric configuration defaults across complex repositories",
      "Engineered isolated container runtimes for executing AI-generated shell commands safely — controlled toolchains, reproducible environments, and isolated execution history",
      "Built deterministic evaluation harnesses and grading rubrics with RewardKit, verifying each model's tool use against live repository state",
      "Ran and analysed hundreds of evaluation trajectories to find recurring agent failure modes, validate reference solutions, and make the benchmark more reliable",
    ],
    stack: ["Python", "Docker", "Bash", "RewardKit", "LLM Evaluation"],
  },
  {
    id: "medvax",
    company: "MedVax Health",
    role: "Software & Data Engineer",
    type: "Contract",
    period: "Jan — Feb 2026",
    summary:
      "Architected a secure e-prescription portal supporting prescription management, authentication, and payment processing workflows for doctors and patients on a production health platform.",
    highlights: [
      "Designed and built the e-pharmacy backend with strict RBAC for doctors, patients, and admin roles",
      "Optimized data flow and state management for real-time updates, improving user engagement across the platform",
      "Implemented strict validation and error handling; investigated production issues via structured debugging and root cause analysis",
    ],
    stack: ["Python", "FastAPI", "NestJS", "Prisma", "TypeScript", "PostgreSQL", "Docker"],
  },
  {
    id: "setraco",
    company: "SETRACO Nigeria",
    role: "Data Operations & Systems Engineer",
    type: "Full-time",
    period: "Mar — Oct 2024",
    summary:
      "Designed centralized reporting solutions that replaced manual Excel workflows for a construction firm — reducing reporting effort by ~40% and standardizing tracking across site operations.",
    highlights: [
      "Built SQL-powered dashboards that improved operational visibility and accelerated management decision-making",
      "Diagnosed and resolved SQL pipeline failures and data inconsistencies, improving overall operational reliability",
      "Optimized SQL queries and backend processes to improve reporting performance and scalability",
    ],
    stack: ["Python", "SQL", "React", "Next.js", "PostgreSQL", "Data Analysis"],
    note: "Completed alongside the final year of the B.Eng.",
  },
  {
    id: "freelance",
    company: "Independent Consultant",
    role: "Freelance Software Engineer",
    type: "Freelance",
    period: "Oct 2020 — Mar 2024",
    summary:
      "Delivered web development and data solutions for independent and small-business clients, managing full project lifecycles from proposal through delivery — sustained throughout a full-time engineering degree.",
    highlights: [
      "Authored client-facing technical proposals and scoped project requirements end-to-end",
      "Designed and shipped a personal portfolio site (React, TypeScript, Tailwind CSS, Framer Motion)",
      "Maintained continuous hands-on engineering work throughout a full-time B.Eng. program",
    ],
    stack: ["Python", "TypeScript", "React", "SQL", "Tailwind CSS"],
    note: "Concurrent with the B.Eng. at Caritas University.",
  },
  {
    id: "tac-africa",
    company: "TAC AFRICA",
    role: "Full Stack Engineer",
    type: "Part-time",
    period: "Aug 2019 — Aug 2020",
    summary:
      "Developed and maintained web applications serving 50,000+ users. Optimized backend APIs and SQL queries, reducing response latency by ~45% through structured debugging, log analysis, and database optimization.",
    highlights: [
      "Collaborated with designers and product teams to implement new features and improve application performance",
      "Investigated and resolved production issues through log analysis and database query profiling",
    ],
    stack: ["Python", "JavaScript", "SQL", "REST APIs", "PostgreSQL"],
    note: "Concurrent with the AfriHUB ICT role below.",
  },
  {
    id: "afrihub",
    company: "AfriHUB ICT",
    role: "Software Engineer",
    type: "Part-time",
    period: "Oct 2018 — Oct 2020",
    summary:
      "Designed and implemented software solutions for academic and business clients using modern web technologies. Supported deployment, system integration, and maintenance of enterprise applications.",
    highlights: [
      "Diagnosed and resolved application, database, and integration issues in production environments",
      "Built secure database structures and backend business logic for client projects",
    ],
    stack: ["Python", "SQL", "JavaScript", "MySQL", "HTML/CSS"],
    note: "Undertaken alongside the National Innovative Diploma programme.",
  },
  {
    id: "notap",
    company: "NOTAP",
    role: "Junior IT Consultant",
    type: "Internship",
    period: "Oct 2018 — Mar 2019",
    summary:
      "IT infrastructure and technical consulting at the National Office for Technology Acquisition and Promotion — deployment planning for small businesses, network set-up, and support for the staff who used it.",
    highlights: [
      "Designed tailored IT deployment plans for SMEs, improving operational efficiency by ~15%",
      "Installed and configured secure network environments for stable connectivity across departments",
      "Ran system health audits with documented remediation plans, and onboarded staff to new tools — lifting adoption by ~30%",
    ],
    stack: ["PHP", "HTML/CSS", "Networking"],
    note: "Concurrent with the first months at AfriHUB ICT.",
  },
];
