import React, { useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Terminal, Activity, ShieldCheck, Cpu, GitCommit, Workflow, Zap
} from "lucide-react";
import {
  SiPython, SiTypescript, SiReact, SiPostgresql,
  SiAmazonwebservices, SiDocker, SiApachekafka,
  SiTerraform, SiNextdotjs, SiRedis,
  SiSnowflake, SiDatabricks, SiApachespark,
  SiApacheairflow
} from "react-icons/si";

/* -------------------------------------------------------------------------- */
/* DATA & CONSTANTS                                                           */
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
  { name: "Next.js", icon: SiNextdotjs },
  { name: "Redis", icon: SiRedis },
  { name: "Snowflake", icon: SiSnowflake },
  { name: "Databricks", icon: SiDatabricks },
  { name: "Spark", icon: SiApachespark },
  { name: "Airflow", icon: SiApacheairflow },
  { name: "Dagster", icon: Workflow },
  { name: "Redpanda", icon: Zap },
];

/* -------------------------------------------------------------------------- */
/* SHARED COMPONENTS                                                          */
/* -------------------------------------------------------------------------- */

const RevealText = ({ text, className = "" }: { text: string; className?: string }) => {
  const container = React.useRef(null);
  const { scrollYProgress } = useScroll({ target: container, offset: ["start 0.9", "start 0.4"] });

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

const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -2 }}
      className={`rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-xl overflow-hidden relative hover:border-white/[0.1] transition-colors duration-700 ${className}`}
    >
      {/* Mouse tracking spotlight */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(500px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(168,85,247,0.04), transparent 40%)`
        }}
      />
      {/* Subtle top edge glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </motion.div>
  );
};

const TechMarquee = () => {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div
      className="relative flex overflow-hidden w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#080808] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#080808] to-transparent z-10" />

      <motion.div
        animate={{ x: "-50%" }}
        transition={{ duration: 40, ease: "linear", repeat: Infinity }}
        style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
        className="flex flex-none gap-2.5 pr-2.5 items-center"
      >
        {[...TECH_STACK, ...TECH_STACK].map((tech, i) => (
          <div
            key={`${tech.name}-${i}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-white/35 whitespace-nowrap transition-all duration-300 hover:border-white/[0.1] hover:text-white/60 hover:bg-white/[0.04]"
          >
            <tech.icon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono tracking-wider">{tech.name}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* BENTO BOX MODULES                                                          */
/* -------------------------------------------------------------------------- */

const PhilosophyTerminal = () => (
  <GlassCard className="col-span-1 md:col-span-2">
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
      <div className="flex items-center gap-2 text-white/25">
        <Terminal className="w-3 h-3" />
        <span className="text-[10px] font-mono tracking-widest">system_values.ts</span>
      </div>
      <div className="flex gap-1 opacity-40">
        <div className="w-2 h-2 rounded-full bg-white/20" />
        <div className="w-2 h-2 rounded-full bg-white/20" />
        <div className="w-2 h-2 rounded-full bg-white/20" />
      </div>
    </div>
    <div className="p-5 overflow-x-auto scrollbar-hide">
      <div className="min-w-[320px] font-mono text-[11px] leading-relaxed tracking-wide">
        <div className="flex text-white/50">
          <span className="w-6 text-right pr-4 text-white/15 select-none">1</span>
          <span>
            <span className="text-purple-400/80">const</span>{' '}
            <span className="text-blue-400/80">Engineering</span>{' '}
            ={' '}
            <span className="text-white/30">{'{'}</span>
          </span>
        </div>
        <div className="flex text-white/50">
          <span className="w-6 text-right pr-4 text-white/15 select-none">2</span>
          <span className="pl-4">
            <span className="text-sky-300/60">priority</span>:{' '}
            <span className="text-emerald-400/70">"Reliability {'>'} Features"</span>,
          </span>
        </div>
        <div className="flex text-white/50">
          <span className="w-6 text-right pr-4 text-white/15 select-none">3</span>
          <span className="pl-4">
            <span className="text-sky-300/60">approach</span>:{' '}
            <span className="text-emerald-400/70">"System over Syntax"</span>,
          </span>
        </div>
        <div className="flex text-white/50">
          <span className="w-6 text-right pr-4 text-white/15 select-none">4</span>
          <span className="pl-4">
            <span className="text-sky-300/60">goal</span>:{' '}
            <span className="text-emerald-400/70">"Predictable Scale"</span>
          </span>
        </div>
        <div className="flex text-white/50">
          <span className="w-6 text-right pr-4 text-white/15 select-none">5</span>
          <span className="text-white/30">{'}'}</span>;
        </div>
        <div className="flex mt-1.5">
          <span className="w-6 text-right pr-4 text-white/15 select-none">6</span>
          <span className="text-white/20 italic">// target: 99.9% uptime</span>
        </div>
      </div>
    </div>
  </GlassCard>
);

const MetricsModule = () => (
  <>
    <GlassCard className="col-span-1 p-5 flex flex-col justify-center min-h-[130px]">
      <div className="flex items-center gap-2 mb-3 text-white/30">
        <Activity className="w-3.5 h-3.5" />
        <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/40">Experience</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl lg:text-4xl font-light tracking-tight text-white/85">4+</span>
        <span className="text-xs font-light text-white/30">Years</span>
      </div>
    </GlassCard>

    <GlassCard className="col-span-1 p-5 flex flex-col justify-center min-h-[130px]">
      <div className="flex items-center gap-2 mb-3 text-white/30">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/40">Projects</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl lg:text-4xl font-light tracking-tight text-white/85">20+</span>
        <span className="text-xs font-light text-white/30">Deployed</span>
      </div>
    </GlassCard>
  </>
);

const GitActivity = () => {
  const rows = 5;
  const cols = 42;
  return (
    <GlassCard className="col-span-1 md:col-span-2 p-5 flex flex-col justify-center">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-white/30">
          <GitCommit className="w-3.5 h-3.5" />
          <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/40">Commit Activity</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/15 bg-emerald-500/[0.05]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[8px] font-mono font-medium text-emerald-400/80 tracking-widest">ACTIVE</span>
        </div>
      </div>

      <div className="flex flex-col gap-[2px]">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex gap-[2px]">
            {Array.from({ length: cols }).map((_, col) => {
              const i = row * cols + col;
              const pseudo = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
              const rand = pseudo - Math.floor(pseudo);
              const wave = Math.sin(col * 0.3 + row * 0.5) * 0.5 + 0.5;
              const level = wave * 0.6 + rand * 0.4;

              let bg = "bg-white/[0.03]";
              if (level > 0.75) bg = "bg-emerald-500/70";
              else if (level > 0.5) bg = "bg-emerald-500/40";
              else if (level > 0.3) bg = "bg-emerald-500/20";

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(col * 0.01 + row * 0.02, 1.5) }}
                  className={`w-[6px] h-[6px] sm:w-[7px] sm:h-[7px] rounded-[2px] ${bg} flex-shrink-0`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

const StackModule = () => (
  <GlassCard className="col-span-1 md:col-span-2 p-5 flex flex-col justify-center">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2 text-white/30">
        <Cpu className="w-3.5 h-3.5" />
        <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-white/40">Active Dependencies</span>
      </div>
      <span className="text-[9px] font-mono text-white/20 tracking-wide">{TECH_STACK.length} pkgs</span>
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
    <section id="about" data-section="about" className="pt-12 pb-24 md:pt-20 md:pb-32 relative">
      <div className="container px-4 md:px-6 max-w-6xl mx-auto">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">

          {/* LEFT COLUMN: IDENTITY / MANIFESTO (Sticky) */}
          <div className="relative z-10 lg:col-span-5 lg:sticky lg:top-32 h-fit">

            {/* Identity Header */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-5 mb-10"
            >
              <div className="relative shrink-0 group/avatar cursor-pointer">
                {/* Animated Status Rings */}
                <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500/20 via-primary/20 to-emerald-500/20 rounded-full blur-md opacity-0 group-hover/avatar:opacity-100 animate-[spin_4s_linear_infinite] transition-opacity duration-700" />
                <div className="absolute -inset-0.5 bg-gradient-to-tr from-emerald-500/30 via-transparent to-primary/30 rounded-full opacity-0 group-hover/avatar:opacity-100 animate-[spin_3s_linear_infinite] transition-opacity duration-500" />

                {/* Avatar */}
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
                    <span key={role} className="text-[9px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-white/[0.03] text-white/40 border border-white/[0.05]">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Positioning Statement */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="flex items-center gap-2 text-white/25 font-mono text-[9px] tracking-[0.2em] uppercase mb-5">
                <Terminal className="w-3 h-3 text-primary/50" />
                <span>Identity</span>
              </div>

              <h2 className="text-2xl md:text-3xl lg:text-[2.1rem] font-medium tracking-tight mb-8 leading-[1.25] text-white/80">
                I design systems that prioritize <span className="text-white/95">reliability</span>, <span className="text-white/95">performance</span>, and <span className="text-white/95">scale.</span>
              </h2>
            </motion.div>

            {/* Bio Paragraphs */}
            <div className="space-y-5 text-sm md:text-[15px] text-white/40 leading-relaxed max-w-lg mt-6 font-light">
              <RevealText text="I approach software as a system — optimizing not just for features, but for failure modes, scalability, and developer experience. I value boring, predictable architectures over clever abstractions that collapse under real-world load." />
              <RevealText text="I care deeply about correctness, clarity, and building things that remain understandable years after launch. Currently focused on building resilient data infrastructure and robust backend services." />
            </div>

          </div>

          {/* RIGHT COLUMN: BENTO BOX GRID */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative z-10 lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-3 auto-rows-max"
          >
            {/* Ambient Back Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/[0.03] blur-[120px] rounded-full pointer-events-none -z-10" />

            <PhilosophyTerminal />
            <MetricsModule />
            <GitActivity />
            <StackModule />
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default About;