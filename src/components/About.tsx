import React, { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Terminal, Activity, GitCommit, Cpu, ArrowUpRight, Gauge, Database,
} from "lucide-react";
import {
  SiPython, SiTypescript, SiReact, SiPostgresql,
  SiAmazonwebservices, SiDocker, SiApachekafka,
  SiTerraform, SiRedis,
  SiSnowflake, SiApachespark,
  SiApacheairflow
} from "react-icons/si";

/* -------------------------------------------------------------------------- */
/* DATA                                                                       */
/* -------------------------------------------------------------------------- */

const AVATAR_URL = "https://i.ibb.co/Nzy2pvp/avatar.jpg";
const ROLES = ["Data Engineer", "Software Developer", "Cloud Architect"];

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

const DELIVERABLES = [
  "ETL pipelines & data warehouses",
  "Cloud infrastructure (IaC)",
  "Stream processing systems",
  "Backend APIs & microservices",
];

const METRICS = [
  { value: 12, suffix: "M+", label: "Events processed daily", icon: Activity, barWidth: '80%', gradient: 'linear-gradient(90deg, rgba(139,92,246,0.5), rgba(139,92,246,0.15))' },
  { value: 99, suffix: ".9%", label: "Pipeline uptime", icon: Gauge, barWidth: '95%', gradient: 'linear-gradient(90deg, rgba(52,211,153,0.5), rgba(52,211,153,0.15))' },
  { value: 3, suffix: "", label: "Data platforms built", icon: Database, barWidth: '60%', gradient: 'linear-gradient(90deg, rgba(56,189,248,0.5), rgba(56,189,248,0.15))' },
];

/* -------------------------------------------------------------------------- */
/* SHARED COMPONENTS                                                          */
/* -------------------------------------------------------------------------- */

const RevealText = ({ text, className = "" }: { text: string; className?: string }) => {
  const container = React.useRef(null);
  const { scrollYProgress } = useScroll({ target: container, offset: ["start 0.95", "start 0.55"] });

  const words = text.split(" ");
  const Word = ({ word, index, total }: { word: string; index: number; total: number }) => {
    const start = index / total;
    const end = Math.min(start + (2 / total), 1);
    const opacity = useTransform(scrollYProgress, [start, end], [0.15, 1]);
    const blur = useTransform(scrollYProgress, [start, end], ["blur(4px)", "blur(0px)"]);
    return (
      <motion.span style={{ opacity, filter: blur }} className="relative inline-block mr-1.5">
        {word}
      </motion.span>
    );
  };

  return (
    <p ref={container} className={`flex flex-wrap ${className}`}>
      {words.map((word, i) => (
        <Word key={i} word={word} index={i} total={words.length} />
      ))}
    </p>
  );
};

const GlassCard = ({
  children,
  className = "",
  spotlight = false,
}: {
  children: React.ReactNode;
  className?: string;
  spotlight?: boolean;
}) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!spotlight || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-xl overflow-hidden relative hover:border-white/[0.1] transition-colors duration-500 ${className}`}
    >
      {spotlight && (
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-500"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(168,85,247,0.05), transparent 40%)`,
          }}
        />
      )}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="relative z-10 h-full w-full">{children}</div>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/* ANIMATED COUNTER                                                           */
/* -------------------------------------------------------------------------- */

const AnimatedCounter = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1400;
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count}{suffix}</span>;
};

/* -------------------------------------------------------------------------- */
/* TECH MARQUEE                                                               */
/* -------------------------------------------------------------------------- */

const TechMarquee = () => {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div
      className="relative flex overflow-hidden w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-background to-transparent z-10" />
      <div
        className="flex flex-none gap-2.5 pr-2.5 items-center marquee-strip"
        style={{ animationPlayState: isPaused ? "paused" : "running" }}
      >
        {[...TECH_STACK, ...TECH_STACK].map((tech, i) => (
          <div
            key={`${tech.name}-${i}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-white/55 whitespace-nowrap transition-all duration-300 hover:border-white/[0.12] hover:text-white/70 hover:bg-white/[0.04] cursor-default"
          >
            <tech.icon className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="text-[10px] font-mono tracking-wider">{tech.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* BENTO MODULES (3 total — narrative: What I do → Proof → Tools)             */
/* -------------------------------------------------------------------------- */

/**
 * 1. What I Deliver — concrete, hirable outcomes.
 */
const DeliverablesModule = () => (
  <GlassCard className="col-span-1 md:col-span-2" spotlight>
    <div className="p-5">
      <div className="flex items-center gap-2 text-white/50 mb-4">
        <Terminal className="w-3.5 h-3.5 text-primary/50" aria-hidden="true" />
        <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/55">What I Build</span>
      </div>
      <div className="space-y-2">
        {DELIVERABLES.map((item) => (
          <div
            key={item}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.04] group cursor-default"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary/70 transition-colors shrink-0" />
            <span className="text-[13px] text-white/60 group-hover:text-white/80 tracking-wide transition-colors">{item}</span>
          </div>
        ))}
      </div>
    </div>
  </GlassCard>
);

/**
 * 2. Metrics — three specific stats side-by-side.
 */
const MetricsModule = () => (
  <GlassCard className="col-span-1 md:col-span-2 p-0">
    <div className="grid grid-cols-3 divide-x divide-white/[0.04]">
      {METRICS.map((m) => (
        <div key={m.label} className="p-3 sm:p-4 md:p-5 flex flex-col justify-between min-h-[100px] sm:min-h-[120px]">
          <div className="flex items-center gap-1.5 text-white/50 mb-auto">
            <m.icon className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span className="text-[8px] md:text-[9px] font-mono tracking-[0.15em] uppercase text-white/50 truncate">
              {m.label.split(" ").slice(0, 2).join(" ")}
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light tracking-tight text-white/90">
                <AnimatedCounter target={m.value} suffix={m.suffix} />
              </span>
            </div>
            <span className="text-[9px] md:text-[10px] font-light text-white/50 leading-tight mt-0.5 block">
              {m.label.split(" ").slice(2).join(" ")}
            </span>
            <div className="mt-2 h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: m.gradient }}
                initial={{ width: 0 }}
                whileInView={{ width: m.barWidth }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  </GlassCard>
);

/**
 * 3. Core Stack — curated 12-tool marquee.
 */
const StackModule = () => (
  <GlassCard className="col-span-1 md:col-span-2 p-5 flex flex-col justify-center">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2 text-white/50">
        <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/55">Core Stack</span>
      </div>
      <span className="text-[9px] font-mono text-white/50 tracking-wide">{TECH_STACK.length} tools</span>
    </div>
    <div className="-mx-5">
      <TechMarquee />
    </div>
  </GlassCard>
);

/* -------------------------------------------------------------------------- */
/* MAIN SECTION                                                               */
/* -------------------------------------------------------------------------- */

const About: React.FC = () => {
  return (
    <section id="about" data-section="about" className="pt-12 pb-24 md:pt-20 md:pb-32 relative" aria-label="About Emmanuel Moghalu">
      <div className="container px-4 md:px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">

          {/* LEFT COLUMN */}
          <div className="relative z-10 lg:col-span-5 lg:sticky lg:top-32 h-fit">

            {/* Identity Header */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-5 mb-10"
            >
              <div className="relative shrink-0 group/avatar cursor-pointer">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500/20 via-primary/20 to-emerald-500/20 rounded-full blur-md opacity-0 group-hover/avatar:opacity-100 animate-[spin_4s_linear_infinite] transition-opacity duration-700" />
                <div className="absolute -inset-0.5 bg-gradient-to-tr from-emerald-500/30 via-transparent to-primary/30 rounded-full opacity-0 group-hover/avatar:opacity-100 animate-[spin_3s_linear_infinite] transition-opacity duration-500" />
                <div className="relative z-10 w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border border-white/[0.08] bg-[#050505] transition-transform duration-500 group-hover/avatar:scale-[1.03]">
                  <img
                    src={AVATAR_URL}
                    alt="Emmanuel Moghalu"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-white/[0.02] text-xl font-bold text-white/50">EM</div>';
                    }}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-base md:text-lg font-medium tracking-tight text-white/85">Emmanuel Moghalu</h3>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {ROLES.map((role) => (
                    <span key={role} className="text-[9px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-white/[0.03] text-white/55 border border-white/[0.05]">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Heading — personal, not philosophical */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="flex items-center gap-2 text-white/50 font-mono text-[9px] tracking-[0.2em] uppercase mb-5">
                <Terminal className="w-3 h-3 text-primary/50" aria-hidden="true" />
                <span>About</span>
              </div>

              <h2 className="text-2xl md:text-3xl lg:text-[2.1rem] font-medium tracking-tight mb-8 leading-[1.25] text-white/80">
                Obsessed with the <span className="text-white/95">boring stuff;</span> correctness, clarity, and things that work at <span className="text-white/95">3 AM.</span>
              </h2>
            </motion.div>

            {/* Bio — one paragraph, personal and specific */}
            <div className="text-sm md:text-[15px] text-white/60 leading-relaxed max-w-lg mt-6 font-light">
              <RevealText text="I've spent 4 years building the infrastructure nobody sees — the pipelines, the deployment configs, the monitoring that pages you before users notice. I care about correctness over cleverness and systems that stay boring in production." />
            </div>
          </div>

          {/* RIGHT COLUMN: 3 modules — What I do → Proof → Tools */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative z-10 lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-3 auto-rows-max"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/[0.03] blur-[120px] rounded-full pointer-events-none -z-10" />

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