import React, { useRef, useMemo } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Code2, Database, Terminal, Globe,
  Cloud, Workflow, Layers, Container,
  Command, ArrowRight, ShieldCheck, Activity,
  Cpu, Zap, GitCommit
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* 1. DATA & CONSTANTS                                                        */
/* -------------------------------------------------------------------------- */

// Using reliable remote image to prevent build errors in this environment
const AVATAR_URL = "https://i.ibb.co/Nzy2pvp/avatar.jpg";

const ROLES = ["Data Engineer", "Software Developer", "Cloud Architect"];

const TECH_STACK = [
  { name: "Python", icon: Terminal },
  { name: "TypeScript", icon: Code2 },
  { name: "React", icon: Globe },
  { name: "PostgreSQL", icon: Database },
  { name: "AWS", icon: Cloud },
  { name: "Docker", icon: Container },
  { name: "Kafka", icon: Workflow },
  { name: "Terraform", icon: Layers },
  { name: "Next.js", icon: Zap },
  { name: "Redis", icon: Database },
];

/* -------------------------------------------------------------------------- */
/* 2. UTILITY COMPONENTS                                                      */
/* -------------------------------------------------------------------------- */

// Consistent Background Grid (Matches Hero)
const BackgroundGrid = () => (
  <div className="absolute inset-0 -z-10 h-full w-full pointer-events-none overflow-hidden select-none">
    <div className="absolute inset-0 bg-background transition-colors duration-300" />
    <div className="absolute inset-0 bg-[radial-gradient(#00000015_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff10_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
    {/* Ambient Glows positioned to continue the flow */}
    <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
  </div>
);

// Enhanced Text Reveal
const RevealText = ({ text, className = "" }: { text: string; className?: string }) => {
  const container = useRef(null);

  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start 0.85", "end 0.6"]
  });

  const words = text.split(" ");

  // Child component so hooks (useTransform) are called in a component body rather than inside a callback
  const Word = ({ word, index, total }: { word: string; index: number; total: number }) => {
    const start = index / total;
    const end = start + (1 / total);
    const opacity = useTransform(scrollYProgress, [start, end], [0.15, 1]);
    const blur = useTransform(scrollYProgress, [start, end], [3, 0]);
    const y = useTransform(scrollYProgress, [start, end], [4, 0]);
    const filter = useTransform(blur, (v) => `blur(${v}px)`);

    return (
      <motion.span
        style={{ opacity, filter, y }}
        className="relative will-change-transform inline-block mr-1.5"
      >
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

// Animated Marquee
const TechMarquee = () => {
  return (
    <div className="relative flex overflow-hidden w-full mask-linear-fade">
      <div className="absolute left-0 top-0 bottom-0 w-8 md:w-12 bg-gradient-to-r from-white dark:from-neutral-950 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 md:w-12 bg-gradient-to-l from-white dark:from-neutral-950 to-transparent z-10" />

      <motion.div
        animate={{ x: "-50%" }}
        transition={{ duration: 30, ease: "linear", repeat: Infinity }}
        className="flex flex-none gap-3 md:gap-4 pr-3 md:pr-4 items-center"
      >
        {[...TECH_STACK, ...TECH_STACK].map((tech, i) => (
          <div
            key={`${tech.name}-${i}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100/80 dark:bg-white/5 border border-neutral-200 dark:border-white/5 backdrop-blur-sm text-muted-foreground whitespace-nowrap transition-colors hover:border-primary/20 hover:text-primary"
          >
            <tech.icon className="w-3.5 h-3.5" />
            <span className="text-xs font-mono font-medium">{tech.name}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. SYSTEM MODULES (RIGHT COLUMN)                                           */
/* -------------------------------------------------------------------------- */

const PhilosophyTerminal = () => (
  <motion.div
    whileHover={{ y: -2 }}
    className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-md overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 group"
  >
    <div className="flex items-center justify-between px-4 py-3 bg-neutral-50/50 dark:bg-white/5 border-b border-neutral-200 dark:border-white/5">
      <div className="flex gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
      </div>
      <div className="text-[10px] text-muted-foreground font-mono tracking-widest uppercase flex items-center gap-2 opacity-70">
        <Terminal className="w-3 h-3" />
        system_values.ts
      </div>
      <div className="w-3" />
    </div>
    <div className="p-4 md:p-6 font-mono text-[10px] md:text-xs leading-relaxed text-muted-foreground selection:bg-primary/20 selection:text-primary overflow-x-auto">
      <div className="min-w-[300px]">
        <div className="flex group/line hover:bg-white/5 -mx-4 px-4">
          <span className="w-6 select-none text-right pr-4 opacity-20 group-hover/line:opacity-50">1</span>
          <span>
            <span className="text-purple-600 dark:text-purple-400">const</span>{' '}
            <span className="text-blue-600 dark:text-blue-400">Engineering</span>{' '}
            ={' '}
            <span className="text-amber-600 dark:text-yellow-200">{'{'}</span>
          </span>
        </div>
        <div className="flex group/line hover:bg-white/5 -mx-4 px-4">
          <span className="w-6 select-none text-right pr-4 opacity-20 group-hover/line:opacity-50">2</span>
          <span className="pl-4">
            <span className="text-blue-500 dark:text-blue-300">priority</span>:{' '}
            <span className="text-emerald-600 dark:text-emerald-400">"Reliability {'>'} Features"</span>,
          </span>
        </div>
        <div className="flex group/line hover:bg-white/5 -mx-4 px-4">
          <span className="w-6 select-none text-right pr-4 opacity-20 group-hover/line:opacity-50">3</span>
          <span className="pl-4">
            <span className="text-blue-500 dark:text-blue-300">approach</span>:{' '}
            <span className="text-emerald-600 dark:text-emerald-400">"System over Syntax"</span>,
          </span>
        </div>
        <div className="flex group/line hover:bg-white/5 -mx-4 px-4">
          <span className="w-6 select-none text-right pr-4 opacity-20 group-hover/line:opacity-50">4</span>
          <span className="pl-4">
            <span className="text-blue-500 dark:text-blue-300">goal</span>:{' '}
            <span className="text-emerald-600 dark:text-emerald-400">"Predictable Scale"</span>
          </span>
        </div>
        <div className="flex group/line hover:bg-white/5 -mx-4 px-4">
          <span className="w-6 select-none text-right pr-4 opacity-20 group-hover/line:opacity-50">5</span>
          <span className="text-amber-600 dark:text-yellow-200">{'}'}</span>;
        </div>
        <div className="flex mt-2 group/line hover:bg-white/5 -mx-4 px-4">
          <span className="w-6 select-none text-right pr-4 opacity-20 group-hover/line:opacity-50">6</span>
          <span className="text-neutral-400 dark:text-neutral-500 italic">// Optimization target: 99.9% Uptime</span>
        </div>
      </div>
    </div>
  </motion.div>
);

const MetricsModule = () => (
  <div className="grid grid-cols-2 gap-4">
    <motion.div
      whileHover={{ y: -2 }}
      className="p-5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm hover:border-primary/20 transition-all duration-300"
    >
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        <Activity className="w-4 h-4" />
        <span className="text-[10px] font-mono uppercase tracking-widest">Experience</span>
      </div>
      <div className="text-3xl font-bold tracking-tight text-foreground">
        4+ <span className="text-sm font-normal text-muted-foreground">Years</span>
      </div>
    </motion.div>
    <motion.div
      whileHover={{ y: -2 }}
      className="p-5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm hover:border-primary/20 transition-all duration-300"
    >
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        <ShieldCheck className="w-4 h-4" />
        <span className="text-[10px] font-mono uppercase tracking-widest">Projects</span>
      </div>
      <div className="text-3xl font-bold tracking-tight text-foreground">
        20+ <span className="text-sm font-normal text-muted-foreground">Deployed</span>
      </div>
    </motion.div>
  </div>
);

const GitActivity = () => {
  // Config for responsive grid
  const days = 7;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm p-5 hover:border-primary/20 transition-all duration-300 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <GitCommit className="w-4 h-4" />
          <span className="text-[10px] font-mono uppercase tracking-widest">Commit Topology</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Responsive Container for the Grid - Mobile Friendly */}
      <div className="relative w-full overflow-hidden mask-linear-fade">
        {/* Scrollable Container */}
        <div className="overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
          <div className="flex flex-col gap-1 min-w-max opacity-80 hover:opacity-100 transition-opacity">
            <div className="flex gap-[3px]">
              {/* Generating data points - enough for horizontal scroll on mobile */}
              {Array.from({ length: 28 * days }).map((_, i) => {
                // deterministic pseudo-random based on index to avoid Math.random during render
                const pseudo = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
                const rand = pseudo - Math.floor(pseudo);
                const level = Math.sin(i * 0.5) * Math.cos(i * 0.2) + rand * 0.5;
                let bg = "bg-neutral-200 dark:bg-white/5";
                if (level > 0.8) bg = "bg-emerald-500";
                else if (level > 0.4) bg = "bg-emerald-500/60";
                else if (level > 0) bg = "bg-emerald-500/30";

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: Math.min(i * 0.002, 1) }}
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-[1px] ${bg} flex-shrink-0`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const StackModule = () => (
  <motion.div
    whileHover={{ y: -2 }}
    className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-md p-6 transition-all duration-300 hover:border-primary/20"
  >
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Active Dependencies
        </span>
      </div>
      <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
    </div>

    <div className="-mx-6">
      <TechMarquee />
    </div>
  </motion.div>
);

/* -------------------------------------------------------------------------- */
/* 4. MAIN COMPONENT                                                          */
/* -------------------------------------------------------------------------- */

const About: React.FC = () => {
  return (
    <section id="about" className="py-24 md:py-32 relative bg-background overflow-hidden selection:bg-primary/20 selection:text-primary">

      <BackgroundGrid />

      <div className="container px-4 md:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">

          {/* LEFT COLUMN: THE MANIFESTO (Sticky on Desktop) */}
          <div className="relative z-10 lg:sticky lg:top-24">

            {/* Identity Header - Responsive Profile Image */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-5 mb-10"
            >
              <div className="relative group cursor-default shrink-0">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-primary to-blue-500 rounded-full opacity-30 group-hover:opacity-60 blur transition duration-500"></div>
                {/* Enforcing consistent aspect ratio and circle shape with strict classes */}
                <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-background ring-2 ring-primary/10 transition-transform group-hover:scale-[1.02] aspect-square">
                  <img
                    src={AVATAR_URL}
                    alt="Emmanuel Moghalu"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">Emmanuel (Richard) Moghalu</h3>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {ROLES.map((role) => (
                    <span key={role} className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/10 whitespace-nowrap">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Positioning Statement */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-2 text-primary font-mono text-xs tracking-widest mb-6 opacity-80">
                <Terminal className="w-3.5 h-3.5" />
                <span>IDENTITY_SIGNAL</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-8 leading-[1.15] text-foreground/90">
                I design and engineer systems that prioritize <span className="text-muted-foreground/60">reliability</span>, <span className="text-muted-foreground/60">performance</span>, and <span className="text-muted-foreground/60">long-term maintainability.</span>
              </h2>
            </motion.div>

            {/* Scroll Reveal Manifesto */}
            <div className="space-y-8 text-lg text-muted-foreground leading-relaxed">
              <RevealText
                text="I approach software as a system — optimizing not just for features, but for failure modes, scale, and developer experience. I value boring, predictable architectures over clever abstractions that collapse under real-world load."
                className="font-light"
              />

              <RevealText
                text="I care deeply about correctness, clarity, and building things that remain understandable years after launch. Currently focused on building resilient data infrastructure and scalable frontend systems."
                className="font-light"
              />
            </div>
          </div>

          {/* RIGHT COLUMN: THE SYSTEM MODULES */}
          <div className="relative z-10 space-y-6 lg:pt-8">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <PhilosophyTerminal />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <MetricsModule />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.35 }}
            >
              <GitActivity />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <StackModule />
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default About;