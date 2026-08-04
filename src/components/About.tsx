import React, { useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { ArrowRight, Cpu, Terminal } from "lucide-react";
import {
  SiPython, SiTypescript, SiReact, SiPostgresql,
  SiAmazonwebservices, SiDocker, SiApachekafka,
  SiTerraform, SiRedis,
  SiSnowflake, SiApachespark,
  SiApacheairflow
} from "react-icons/si";
import { StructuralCard } from "@/components/ui/StructuralCard";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

/* -------------------------------------------------------------------------- */
/* DATA                                                                       */
/* -------------------------------------------------------------------------- */

/* Narrowed to what the work actually demonstrates. "Cloud Infrastructure"
   was the weakest of the three — the projects run on Docker and local
   stacks, with Terraform appearing once, in design-stage work. */
const ROLES = ["Data Engineering", "Backend Systems", "Fintech Infrastructure"];

const TECH_STACK = [
  { name: "Python", icon: SiPython },
  { name: "TypeScript", icon: SiTypescript },
  { name: "React", icon: SiReact },
  { name: "PostgreSQL", icon: SiPostgresql },
  { name: "AWS", icon: SiAmazonwebservices },
  { name: "Docker", icon: SiDocker },
  { name: "Kafka", icon: SiApachekafka },
  { name: "Terraform", icon: SiTerraform },
  { name: "Redis", icon: SiRedis },
  { name: "Snowflake", icon: SiSnowflake },
  { name: "Spark", icon: SiApachespark },
  { name: "Airflow", icon: SiApacheairflow },
];

/* Each of these maps onto a shipped project rather than a generic capability
   list. "Cloud Infrastructure Automation (IaC)" was the previous outlier —
   nothing on this site demonstrates it at production scale. */
const DELIVERABLES = [
  "Event-Driven Pipelines & ETL/ELT",
  "Payment Reconciliation & Multi-PSP Integration",
  "Real-Time Streaming & Alerting",
  "Analytics Warehouses & Dashboards",
];

/* Every figure is countable, and every figure states where it came from.

   Two rounds of correction got here. The originals ("12M+ Events/Day",
   "99.9% Uptime") matched nothing in the data. The replacement kept "99.9%
   Data Accuracy", which had the same defect as the old "99.5% Match Rate" on
   MMR Engine: accuracy of what, measured against what denominator? A round
   self-reported percentage with no definition is the kind of number a
   technical reader discounts on sight — and discounting one invites
   discounting the rest.

   These three can each be checked. The test count is the sum across shipped
   systems: 160+ (MMR Engine) + 36 (Rate Limiter) + 21 dbt schema tests and 9
   pipeline checks (Modern Warehouse). */
const METRICS = [
  { value: 1.5, suffix: "M+", label: "Records Processed", source: "Olist warehouse, one run" },
  { value: 220, suffix: "+", label: "Automated Tests", source: "across shipped systems" },
  { value: 50, suffix: "K+", label: "Users Served", source: "TAC Africa platform" },
];

/* -------------------------------------------------------------------------- */
/* SHARED COMPONENTS                                                          */
/* -------------------------------------------------------------------------- */

/* One word of the scroll-driven reveal.

   This lives at module scope on purpose. It used to be declared inside
   RevealText's render body, which meant React saw a brand-new component
   *type* on every parent render and tore down + remounted every word —
   discarding each word's motion state mid-animation. Hoisting it keeps the
   type stable, so the words just re-render. */
const RevealWord = ({
  word,
  index,
  total,
  progress,
}: {
  word: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) => {
  // Each word's fade occupies a 2-word-wide window of scroll progress, so
  // adjacent words overlap slightly and the line reads as a sweep rather
  // than a sequence of discrete pops.
  const start = index / total;
  const end = Math.min(start + 2 / total, 1);
  const opacity = useTransform(progress, [start, end], [0.15, 1]);
  const blur = useTransform(progress, [start, end], ["blur(4px)", "blur(0px)"]);

  return (
    <motion.span style={{ opacity, filter: blur }} className="relative inline-block mr-1.5">
      {word}
    </motion.span>
  );
};

const RevealText = ({ text, className = "" }: { text: string; className?: string }) => {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: container, offset: ["start 0.95", "start 0.55"] });
  const words = useMemo(() => text.split(" "), [text]);

  return (
    <div ref={container} className={`flex flex-wrap ${className}`}>
      {words.map((word, i) => (
        <RevealWord key={i} word={word} index={i} total={words.length} progress={scrollYProgress} />
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* TECH MARQUEE                                                               */
/* -------------------------------------------------------------------------- */

const TechChip = ({ name, icon: Icon }: { name: string; icon: React.ElementType }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 border border-border text-muted-foreground whitespace-nowrap hover:text-foreground hover:border-foreground/30 transition-colors cursor-default">
    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
    <span className="text-[10px] font-mono tracking-widest uppercase">{name}</span>
  </div>
);

const TechMarquee = () => {
  const [isPaused, setIsPaused] = useState(false);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(marqueeRef, { once: true, amount: 0.3 });
  const prefersReduced = useReducedMotion();

  /* Under reduced motion this becomes a plain wrapped list rather than a
     paused marquee. The global `prefers-reduced-motion` rule clamps every
     animation to 0.01ms, which would otherwise snap the strip to its end
     position and simply hide half the stack off-screen. */
  if (prefersReduced) {
    return (
      <div ref={marqueeRef} className="w-full border-t border-b border-border py-4 my-6">
        <ul className="flex flex-wrap gap-3">
          {TECH_STACK.map((tech) => (
            <li key={tech.name}>
              <TechChip name={tech.name} icon={tech.icon} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <motion.div
      ref={marqueeRef}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="relative flex overflow-hidden w-full border-t border-b border-border py-4 my-6"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Fades match the page background, not the card. This module renders on
          a transparent card, so `from-card` painted a visibly lighter band
          against the darker section behind it. */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      <div
        className="flex flex-none gap-4 pr-4 items-center marquee-strip"
        style={{ animationPlayState: isPaused ? "paused" : "running" }}
      >
        {/* Duplicated so the -50% translate loops seamlessly. The copy is
            hidden from assistive tech so the stack is announced once. */}
        {[...TECH_STACK, ...TECH_STACK].map((tech, i) => (
          <div key={`${tech.name}-${i}`} aria-hidden={i >= TECH_STACK.length ? "true" : undefined}>
            <TechChip name={tech.name} icon={tech.icon} />
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/* BENTO MODULES                                                              */
/* -------------------------------------------------------------------------- */

const DeliverablesModule = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <StructuralCard className="col-span-1 md:col-span-2">
      <div ref={ref} className="flex items-center gap-3 mb-6">
        <Terminal className="w-4 h-4 text-primary" aria-hidden="true" />
        <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">Core Competencies</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DELIVERABLES.map((item, i) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, x: -8 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="flex items-start gap-3 group"
          >
            <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5 group-hover:translate-x-1 transition-transform" />
            <span className="text-[13px] text-foreground/80 leading-snug">{item}</span>
          </motion.div>
        ))}
      </div>
    </StructuralCard>
  );
};

const MetricsModule = () => (
  <StructuralCard className="col-span-1 md:col-span-2">
    {/* Accent gradient line */}
    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    <div className="grid grid-cols-3 divide-x divide-border">
      {METRICS.map((m) => (
        <div key={m.label} className="flex flex-col items-center justify-center py-4 px-2 text-center">
          <div className="text-2xl md:text-3xl font-mono text-foreground mb-1">
            <AnimatedCounter target={m.value} suffix={m.suffix} />
          </div>
          <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
            {m.label}
          </span>
          {/* Attribution, not decoration. A number a reader can trace is worth
              more than a larger one they can't. */}
          <span className="text-[8px] font-mono text-muted-foreground/40 mt-1.5 leading-tight">
            {m.source}
          </span>
        </div>
      ))}
    </div>
  </StructuralCard>
);

const StackModule = () => (
  <StructuralCard className="col-span-1 md:col-span-2 p-0 border-none bg-transparent">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-3">
        <Cpu className="w-4 h-4 text-primary" aria-hidden="true" />
        <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">Tech Telemetry</span>
      </div>
      <span className="text-[10px] font-mono text-primary tracking-widest">[{TECH_STACK.length} NODES]</span>
    </div>
    <TechMarquee />
  </StructuralCard>
);

/* -------------------------------------------------------------------------- */
/* MAIN SECTION                                                               */
/* -------------------------------------------------------------------------- */

const About: React.FC = () => {
  const [avatarFailed, setAvatarFailed] = useState(false);

  return (
    <section id="about" data-section="about" className="py-24 relative border-t border-border" aria-label="About">
      <div className="container px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-5 h-fit">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              {/* Identity Header */}
              <div className="flex items-center gap-6 mb-12">
                <div className="w-16 h-16 shrink-0 aspect-square border border-border overflow-hidden bg-muted relative group">
                  {avatarFailed ? (
                    <div className="w-full h-full flex items-center justify-center font-mono text-sm text-muted-foreground">EM</div>
                  ) : (
                    <img
                      src="/images/avatar.jpg"
                      alt="Emmanuel Moghalu"
                      width={64}
                      height={64}
                      loading="eager"
                      decoding="async"
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      onError={() => setAvatarFailed(true)}
                    />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Emmanuel Moghalu</h3>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map((role) => (
                      <span key={role} className="text-[9px] font-mono uppercase tracking-widest text-primary border border-border px-2 py-0.5">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Heading */}
              <div className="flex items-center gap-3 text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase mb-6">
                <Terminal className="w-4 h-4 text-primary" aria-hidden="true" />
                <span>Module 01 // Overview</span>
              </div>

              {/* The previous heading claimed systems "that power millions of
                  daily operations" — another round, unverifiable number. This
                  one makes a claim about approach that every project on the
                  page actually backs up: circuit breakers, idempotency
                  guards, gap detection, reconciliation loops. */}
              <h2 className="text-3xl font-bold text-foreground leading-tight mb-8">
                Most systems work on the happy path. I build for what happens after that.
              </h2>

              <RevealText
                text="Four years in, across fintech, logistics, health and analytics. I spend most of my time on the parts nobody demos — what happens when Redis goes down mid-traffic, when a settlement webhook never arrives, when two instances try to spend the same token at once. The systems I ship come with the tests that prove those paths work, not just the happy ones."
                className="text-[14px] text-muted-foreground leading-relaxed font-light"
              />
            </motion.div>
          </div>

          {/* RIGHT COLUMN */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <DeliverablesModule />
            <MetricsModule />
            <StackModule />
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default About;