// Type-only, matching projects.ts: a value import here is kept by any
// consumer that strips types rather than bundling (Node's native TS support,
// or vite.config.ts importing this the way it imports PROJECTS), and
// src/types has no runtime exports to resolve. Relative with an extension,
// not `@/types`: api/ask.ts reaches it (see src/lib/aiTools.ts).
import type { ExperienceItem } from "../types/index.js";

export const EXPERIENCE: ExperienceItem[] = [
  {
    id: "mercor",
    company: "Mercor",
    role: "Software Engineer, AI Benchmarking",
    type: "Part-time",
    period: "Jul – Sep 2026",
    summary:
      "Built Codebase Atlas Q&A, a benchmark for Mercor's reinforcement learning (RL) platform that tests how well leading AI models understand whole codebases and reason about how they are designed.",
    highlights: [
      "Designed hard, multi-part tasks that make AI agents follow how code connects across files, the order things start up and shut down, how state changes, and settings whose defaults differ from place to place",
      "Built isolated containers where AI-written shell commands run safely, with controlled tools, environments that can be reproduced exactly, and a separate history for every run",
      "Built repeatable test harnesses and grading rubrics with RewardKit that check each model's use of tools against the real state of the repository",
      "Ran and studied hundreds of test runs to find the ways AI agents keep failing, confirm the reference answers were right, and make the benchmark more reliable",
    ],
    stack: ["Python", "Docker", "Bash", "RewardKit", "LLM Evaluation"],
  },
  {
    id: "medvax",
    company: "MedVax Health",
    role: "Software & Data Engineer",
    type: "Contract",
    period: "Jan – Feb 2026",
    summary:
      "Designed a secure online prescription portal for doctors and patients on a live health platform, covering prescriptions, sign-in and payments.",
    highlights: [
      "Designed and built the online pharmacy's backend, with strict, separate permissions for doctors, patients and admins (RBAC)",
      "Improved how data moves through the app so updates appear in real time, which raised engagement across the platform",
      "Added strict input checks and error handling, and tracked live issues down to their root cause",
    ],
    stack: ["Python", "FastAPI", "NestJS", "Prisma", "TypeScript", "PostgreSQL", "Docker"],
  },
  {
    id: "setraco",
    company: "SETRACO Nigeria",
    role: "Data Operations & Systems Engineer",
    type: "Full-time",
    period: "Mar – Oct 2024",
    summary:
      "Replaced a construction firm's manual Excel reporting with central, shared reports, cutting reporting effort by ~40% and giving every site the same way of tracking work.",
    highlights: [
      "Built SQL dashboards that showed managers what was happening on site and helped them decide faster",
      "Found and fixed failing SQL data pipelines and mismatched data, making day-to-day operations more reliable",
      "Sped up SQL queries and backend jobs so reports ran faster and could handle more data",
    ],
    stack: ["Python", "SQL", "React", "Next.js", "PostgreSQL", "Data Analysis"],
    note: "Completed alongside the final year of the B.Eng.",
  },
  {
    id: "freelance",
    company: "Independent Consultant",
    role: "Freelance Software Engineer",
    type: "Freelance",
    period: "Oct 2020 – Mar 2024",
    summary:
      "Built websites and data tools for independent and small-business clients, running each project from proposal to delivery, all while studying full-time for an engineering degree.",
    highlights: [
      "Wrote technical proposals for clients and worked out each project's requirements from start to finish",
      "Designed and launched a personal portfolio site (React, TypeScript, Tailwind CSS, Framer Motion)",
      "Kept building real software throughout a full-time B.Eng. degree",
    ],
    stack: ["Python", "TypeScript", "React", "SQL", "Tailwind CSS"],
    note: "Concurrent with the B.Eng. at Caritas University.",
  },
  {
    id: "tac-africa",
    company: "TAC AFRICA",
    role: "Full Stack Engineer",
    type: "Part-time",
    period: "Aug 2019 – Aug 2020",
    summary:
      "Built and maintained web apps used by 50,000+ people. Made the backend APIs and SQL queries ~45% faster to respond by digging through logs, finding the slow spots and tuning the database.",
    highlights: [
      "Worked with designers and product teams to build new features and make the apps faster",
      "Tracked down and fixed live issues by reading logs and measuring slow database queries",
    ],
    stack: ["Python", "JavaScript", "SQL", "REST APIs", "PostgreSQL"],
    note: "Concurrent with the AfriHUB ICT role below.",
  },
  {
    id: "afrihub",
    company: "AfriHUB ICT",
    role: "Software Engineer",
    type: "Part-time",
    period: "Oct 2018 – Oct 2020",
    summary:
      "Designed and built software for schools and businesses using modern web tools, and helped deploy, connect and maintain their larger business systems.",
    highlights: [
      "Found and fixed problems in live apps, databases and the connections between systems",
      "Built secure databases and the backend logic behind client projects",
    ],
    stack: ["Python", "SQL", "JavaScript", "MySQL", "HTML/CSS"],
    note: "Done alongside the National Innovative Diploma programme.",
  },
  {
    id: "notap",
    company: "NOTAP",
    role: "Junior IT Consultant",
    type: "Internship",
    period: "Oct 2018 – Mar 2019",
    summary:
      "IT and technical consulting at the National Office for Technology Acquisition and Promotion: planning IT set-ups for small businesses, setting up networks, and supporting the staff who used them.",
    highlights: [
      "Wrote IT set-up plans tailored to small businesses, making their operations ~15% more efficient",
      "Installed and set up secure networks so every department stayed reliably connected",
      "Ran system health checks with written plans to fix what they found, and trained staff on new tools, raising uptake by ~30%",
    ],
    stack: ["PHP", "HTML/CSS", "Networking"],
    note: "Concurrent with the first months at AfriHUB ICT.",
  },
];
