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

/* Grouped by what each thing is for.

   This was a flat list scrolling past in a marquee — a logo wall, which
   tells a reader nothing they could not guess and was the busiest element
   on a page that is otherwise deliberately calm. Grouped and still, the
   same twelve entries say something: where the weight sits. */
const TECH_GROUPS = [
  {
    label: "Languages",
    items: [
      { name: "Python", icon: SiPython },
      { name: "TypeScript", icon: SiTypescript },
    ],
  },
  {
    label: "Data & Pipelines",
    items: [
      { name: "PostgreSQL", icon: SiPostgresql },
      { name: "Kafka", icon: SiApachekafka },
      { name: "Airflow", icon: SiApacheairflow },
      { name: "Spark", icon: SiApachespark },
      { name: "Snowflake", icon: SiSnowflake },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { name: "Docker", icon: SiDocker },
      { name: "AWS", icon: SiAmazonwebservices },
      { name: "Terraform", icon: SiTerraform },
      { name: "Redis", icon: SiRedis },
    ],
  },
  {
    label: "Interface",
    items: [{ name: "React", icon: SiReact }],
  },
];

const TECH_COUNT = TECH_GROUPS.reduce((sum, group) => sum + group.items.length, 0);

/* Each of these maps onto a shipped project rather than a generic capability
   list. "Cloud Infrastructure Automation (IaC)" was the previous outlier —
   nothing on this site demonstrates it at production scale. */
const DELIVERABLES = [
  "Event-driven pipelines and ETL",
  "Payment reconciliation across PSPs",
  "Real-time streaming and alerting",
  "Analytics warehouses and dashboards",
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
  // Each word's reveal occupies a 2-word-wide window of scroll progress, so
  // adjacent words overlap slightly and the line reads as a sweep rather
  // than a sequence of discrete pops.
  const start = index / total;
  const end = Math.min(start + 2 / total, 1);

  /* Blur carries the reveal; colour and a floored opacity carry the lift.

     The original faded 0.15 → 1 opacity, which put about a third of the
     paragraph near 1.16:1 where AA wants 4.5:1, and left the bio fully
     legible only at one exact scroll offset. Alpha alone cannot be rescued —
     nothing under 0.9 passes here, so an "accessible" fade is a 0.9 → 1
     sweep, which is invisible.

     Blur is what makes the sweep read, and it costs no contrast: a blurred
     glyph and a sharp one are the same colour. So the word can also brighten
     (muted grey → near-white) and lift from 0.9 → 1 opacity, and the worst
     point on the whole sweep still measures 4.75:1.

     Literal colours rather than tokens because framer cannot interpolate
     `hsl(var(--x))`; these two are theme-invariant — only --primary changes
     between the amber, purple and phosphor themes. */
  const blur = useTransform(progress, [start, end], ["blur(5px)", "blur(0px)"]);
  const color = useTransform(progress, [start, end], ["hsl(0 0% 53%)", "hsl(0 0% 93%)"]);
  const opacity = useTransform(progress, [start, end], [0.9, 1]);

  return (
    <motion.span style={{ filter: blur, color, opacity }} className="relative inline-block mr-1.5">
      {word}
    </motion.span>
  );
};

const RevealText = ({ text, className = "" }: { text: string; className?: string }) => {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: container, offset: ["start 0.95", "start 0.55"] });
  const words = useMemo(() => text.split(" "), [text]);
  const prefersReduced = useReducedMotion();

  /* Under reduced motion the paragraph is simply a paragraph. Scroll-linked
     blur is exactly the kind of movement the preference is asking us to drop,
     and a softened version of it would still be motion tied to scrolling. */
  if (prefersReduced) {
    return <p className={`text-foreground ${className}`}>{text}</p>;
  }

  return (
    <div ref={container} className={`flex flex-wrap ${className}`}>
      {words.map((word, i) => (
        <RevealWord key={i} word={word} index={i} total={words.length} progress={scrollYProgress} />
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* TECH STACK                                                                 */
/* -------------------------------------------------------------------------- */

const TechChip = ({ name, icon: Icon }: { name: string; icon: React.ElementType }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 border border-border text-muted-foreground whitespace-nowrap hover:text-foreground hover:border-foreground/30 transition-colors cursor-default">
    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
    <span className="text-[10px] font-mono tracking-widest uppercase">{name}</span>
  </div>
);

const TechGroups = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const prefersReduced = useReducedMotion();

  return (
    <div ref={ref} className="flex flex-col gap-4 border-t border-b border-border py-5 my-4">
      {TECH_GROUPS.map((group, groupIndex) => (
        <div key={group.label} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground sm:w-32 sm:shrink-0 sm:pt-1.5">
            {group.label}
          </span>
          <ul className="flex flex-wrap gap-2">
            {group.items.map((tech, i) => (
              <motion.li
                key={tech.name}
                initial={prefersReduced ? false : { opacity: 0, y: 4 }}
                animate={isInView || prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
                transition={{ duration: 0.35, delay: groupIndex * 0.08 + i * 0.03 }}
              >
                <TechChip name={tech.name} icon={tech.icon} />
              </motion.li>
            ))}
          </ul>
        </div>
      ))}
    </div>
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
        <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">What I Build</span>
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

/* "Tech Telemetry" collided with itself. Telemetry means something specific
   on this site now — the live fps/heap/uptime rail in the hero — and using
   it for a static list of logos made one of the two meaningless. "[12
   NODES]" was decorative jargon for a count of technologies. */
const StackModule = () => (
  <StructuralCard className="col-span-1 md:col-span-2 p-0 border-none bg-transparent">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-3">
        <Cpu className="w-4 h-4 text-primary" aria-hidden="true" />
        <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">Stack</span>
      </div>
      <span className="text-[10px] font-mono text-muted-foreground tracking-widest tabular-nums">
        {TECH_COUNT} tools
      </span>
    </div>
    <TechGroups />
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

              {/* Deliberately not a thesis.

                  Two headings came before this one. The first claimed systems
                  "powering millions of daily operations" — a number nothing on
                  the site could support. The second, "the happy path is the
                  easy half", swapped the unverifiable number for a trope every
                  backend engineer reaches for, which is its own kind of empty.

                  This states what the work was and stops. There is no claim
                  here to defend, because the case studies are the argument —
                  and on a site whose whole premise is that figures should be
                  attributable, a headline that asserts nothing is the one that
                  cannot overstate. */}
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-[1.15] mb-8">
                Four years of systems that had to stay correct.
              </h2>

              <RevealText
                text="Fintech, logistics, health and analytics. Most of my time goes to the parts nobody demos: Redis going down mid-traffic, a settlement webhook that never arrives, two instances spending the same token at once. What I ship comes with the tests that prove those paths hold."
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