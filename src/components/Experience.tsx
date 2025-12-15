import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Briefcase, Calendar, GitCommit,
  ArrowRight, Terminal, Server,
  ShieldAlert, Activity, Code2,
  Database
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* 1. DATA: CREDIBILITY GRAPH                                                 */
/* -------------------------------------------------------------------------- */

const EXPERIENCE = [
  {
    id: "setraco",
    company: "SETRACO_NIG",
    role: "Data Operations & Systems Analyst",
    period: "Mar 2024 — Oct 2024",
    // Scope: What systems did you touch?
    scope: "Managed core data operations and IT infrastructure. Bridged the gap between raw engineering data and management decision-making through custom tooling.",
    // Impact: Reliability, Clarity, Scale
    impact: [
      "Engineered an internal Next.js visualization dashboard to replace static Excel reporting, accelerating decision cycles for management.",
      "Maintained 99.9% data accuracy across SQL systems via rigorous validation protocols and automated quality checks.",
      "Designed automated data entry macros that reduced repetitive manual processing load by ~40%."
    ],
    // Decision Ownership: The "Senior" Signal
    decision: {
      label: "Tooling Strategy",
      text: "Migrated reporting from legacy spreadsheet silos to a centralized web-based dashboard to enforce a single source of truth."
    },
    stack: ["SQL", "Next.js", "Data Warehousing", "Networking"]
  },
  {
    id: "afrihub",
    company: "AfriHUB ICT Institute",
    role: "Software Engineer — Full Stack & Data",
    period: "Oct 2018 — Oct 2020",
    scope: "Architected data-centric applications and automated pipelines. Handled full lifecycle development from database normalization to frontend integration.",
    impact: [
      "Designed and normalized relational schemas (MySQL/Oracle) supporting high-throughput applications with 20k+ daily queries.",
      "Built automated scraping pipelines using Beautiful Soup 4 to feed structured datasets into internal analytics engines.",
      "Reduced deployment friction by 35% through Linux automation scripts and CI/CD integration."
    ],
    decision: {
      label: "Pipeline Architecture",
      text: "Decoupled data extraction logic into standalone scripts to allow independent scaling of analytics ingestion vs user-facing APIs."
    },
    stack: ["Python", "Django", "React", "MySQL", "Linux"]
  },
  {
    id: "tac-africa",
    company: "TAC AFRICA",
    role: "Web Engineer — Cloud & Infrastructure",
    period: "Aug 2019 — Aug 2020",
    scope: "Lead developer for mission-critical web platforms serving 50k+ monthly users. Focused on performance optimization and cloud infrastructure.",
    impact: [
      "Provisioned and managed cloud environments (AWS/DigitalOcean), optimizing database queries to cut API latency by 45%.",
      "Architected modular microservices in Node.js and Python to support data-driven feature expansion.",
      "Delivered pixel-perfect mobile-first interfaces that drove a 20% increase in user engagement rates."
    ],
    decision: {
      label: "Infrastructure Optimization",
      text: "Shifted from default database configurations to tuned indexes and query optimization to resolve bottlenecks for the 50k+ user base."
    },
    stack: ["React", "Node.js", "AWS", "Python", "TypeScript"]
  },
  {
    id: "notap",
    company: "NOTAP",
    role: "IT Infrastructure Consultant",
    period: "Oct 2018 — Mar 2019",
    scope: "Consulted on enterprise-level IT deployment and network security. Focused on system health audits and remediation strategies.",
    impact: [
      "Executed system health audits and implemented remediation plans that significantly reduced downtime and enhanced reliability.",
      "Designed tailored IT deployment strategies for SMEs, improving operational efficiency metrics by ~15%.",
      "Hardened network environments to ensure stable, secure connectivity across departmental units."
    ],
    decision: {
      label: "Operational Rigor",
      text: "Established standardized system audit protocols to move from reactive troubleshooting to proactive reliability management."
    },
    stack: ["Network Admin", "System Security", "PHP"]
  }
];

/* -------------------------------------------------------------------------- */
/* 2. UI COMPONENTS                                                           */
/* -------------------------------------------------------------------------- */

const ExperienceCard = ({ role, index }: { role: typeof EXPERIENCE[0], index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative pl-8 md:pl-0"
    >
      {/* Timeline Dot (Mobile) */}
      <div className="absolute left-[-5px] top-0 h-3 w-3 rounded-full bg-primary border-4 border-background md:hidden" />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">

        {/* LEFT: Context (Period & Company) */}
        <div className="md:col-span-4 text-left md:text-right relative">
          <div className="md:sticky md:top-32">
            <h3 className="text-xl font-bold text-foreground flex items-center md:justify-end gap-2">
              {role.company}
              <Briefcase className="w-4 h-4 text-primary hidden md:block" />
            </h3>
            <div className="flex items-center md:justify-end gap-2 text-sm font-mono text-muted-foreground mt-1 mb-4 md:mb-0">
              <Calendar className="w-3.5 h-3.5" />
              <span>{role.period}</span>
            </div>
          </div>
        </div>

        {/* CENTER: Timeline Node (Desktop) */}
        <div className="hidden md:flex flex-col items-center relative">
          <div className="w-px h-full bg-border absolute top-0 bottom-0" />
          <div className="sticky top-32 z-10">
            <div className="h-4 w-4 rounded-full bg-primary border-4 border-background shadow-sm" />
          </div>
        </div>

        {/* RIGHT: The Narrative (Card) */}
        <div className="md:col-span-7 pb-16 md:pb-24">
          <div className="group relative bg-white/50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm hover:border-primary/20 transition-colors">

            {/* Role Title */}
            <div className="mb-6">
              <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
                {role.role}
              </h4>
              <p className="text-base text-muted-foreground mt-2 leading-relaxed">
                {role.scope}
              </p>
            </div>

            {/* Impact List */}
            <div className="space-y-4 mb-8">
              <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" /> Engineering Impact
              </div>
              <ul className="space-y-3">
                {role.impact.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm text-muted-foreground/90 leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Decision Artifact */}
            <div className="bg-neutral-100 dark:bg-black/20 rounded-xl p-4 border border-neutral-200 dark:border-white/5 mb-6">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                <GitCommit className="w-3.5 h-3.5" />
                {role.decision.label}
              </div>
              <p className="text-sm text-muted-foreground italic">
                "{role.decision.text}"
              </p>
            </div>

            {/* Tech Stack Footer */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-border/50">
              {role.stack.map(tech => (
                <span key={tech} className="text-[10px] font-mono text-muted-foreground px-2 py-1 rounded bg-background border border-border">
                  {tech}
                </span>
              ))}
            </div>

          </div>
        </div>

      </div>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. MAIN COMPONENT                                                          */
/* -------------------------------------------------------------------------- */

const Experience: React.FC = () => {
  return (
    <section id="experience" className="py-24 md:py-32 bg-background relative overflow-hidden">

      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(#00000010_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="container px-4 md:px-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-20 md:mb-32 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-primary font-mono text-xs tracking-widest mb-4">
              <Server className="w-4 h-4" />
              <span>OPERATIONAL_HISTORY</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Experience <span className="text-muted-foreground">Log</span>
            </h2>
          </div>
          <p className="text-muted-foreground max-w-sm text-sm md:text-base leading-relaxed">
            A timeline of systems built, constraints navigated, and decisions owned. Not just a list of dates.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical Line (Mobile Only - Desktop uses grid) */}
          <div className="absolute left-[5px] top-4 bottom-0 w-px bg-gradient-to-b from-primary via-border to-transparent md:hidden" />

          <div className="flex flex-col">
            {EXPERIENCE.map((role, index) => (
              <ExperienceCard key={role.id} role={role} index={index} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center md:hidden">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <ArrowRight className="w-3 h-3" /> End of Log
          </div>
        </div>

      </div>
    </section>
  );
};

export default Experience;