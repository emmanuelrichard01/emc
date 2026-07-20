import { ExperienceItem } from "@/types";

export const EXPERIENCE: ExperienceItem[] = [
  {
    id: "medvax",
    company: "MedVax Health",
    role: "Software & Data Engineer",
    type: "Contract",
    period: "Jan — Feb 2026",
    summary:
      "Built core e-pharmacy and telemedicine features for a production health platform — prescription lifecycle management, role-based access, and real-time data flow across patient-facing UI.",
    highlights: [
      "E-prescription portal with RBAC for doctors, patients, and admin",
      "Dry-run validation for session booking — separates payment intent from creation",
    ],
    stack: ["NestJS", "PostgreSQL", "Redis", "BullMQ", "Paystack"],
  },
  {
    id: "setraco",
    company: "SETRACO",
    role: "Data Operations & Systems Engineer",
    type: "Full-time",
    period: "Mar — Oct 2024",
    summary:
      "Bridged raw engineering data and management decision-making for a construction firm. Built internal tooling that replaced manual Excel workflows with a centralized web dashboard and maintained 99.9% data accuracy across SQL systems.",
    highlights: [
      "Built a Next.js dashboard to replace Excel reporting — accelerated manager decision cycles",
      "Automated data entry reduced repetitive processing by ~40%",
    ],
    stack: ["SQL", "Next.js", "Excel VBA", "Networking"],
  },
  {
    id: "tac-africa",
    company: "TAC AFRICA",
    role: "Full-Stack Engineer",
    type: "Part-time",
    period: "Aug 2019 — Aug 2020",
    summary:
      "Lead developer for production platforms serving 50k+ monthly active users. Provisioned AWS/DigitalOcean infrastructure, optimized database queries to cut API latency by ~45%, and drove a 20% engagement increase through mobile-first UI.",
    highlights: [
      "React/TypeScript frontend + Node.js/Python microservices for modular feature expansion",
      "Tuned indexes and query profiling to resolve bottlenecks at the 50k+ MAU scale",
    ],
    stack: ["React", "Node.js", "AWS", "Python", "TypeScript"],
  },
  {
    id: "afrihub",
    company: "AfriHUB ICT",
    role: "Software Engineer",
    type: "Part-time",
    period: "Oct 2018 — Oct 2020",
    summary:
      "Full-stack development from database normalization to frontend integration. Designed relational schemas handling 20k+ daily queries, built mobile-first interfaces, and managed Git-based CI workflows.",
    highlights: [
      "Normalized MySQL/Oracle schemas supporting 20k+ queries/day",
      "Structured code review process and Git-based CI integration for team collaboration",
    ],
    stack: ["Python", "Django", "React", "MySQL", "Linux"],
  },
  {
    id: "notap",
    company: "NOTAP",
    role: "IT Infrastructure Consultant",
    type: "Internship",
    period: "Oct 2018 — Mar 2019",
    summary:
      "Enterprise IT consulting — designed deployment plans for SMEs, established proactive audit protocols, and trained staff on tooling. Shifted the organization's approach from reactive troubleshooting to scheduled preventive maintenance.",
    highlights: [
      "IT deployment plans improved operational efficiency by ~15%",
      "Standardized audit protocols reduced system downtime across departments",
    ],
    stack: ["Network Admin", "System Security", "PHP"],
  },
];
