import React, { useRef, useState, useEffect } from "react";
import { motion, useMotionTemplate, useMotionValue, AnimatePresence } from "framer-motion";
import {
  Code2,
  Database,
  Layout,
  Terminal,
  Cpu,
  Globe,
  GitBranch,
  Zap,
  Command,
  Server,
  Cloud,
  Box,
  Atom,
  Triangle,
  Wind,
  Workflow,
  Layers,
  Container,
  Hexagon
} from "lucide-react";
import avatar from "../assets/avatar.jpg";
// Fallback for missing local image
const emmanuelAvatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop";

/* -------------------------------------------------------------------------- */
/* UTILS                                                                      */
/* -------------------------------------------------------------------------- */

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

/* -------------------------------------------------------------------------- */
/* DATA & CONSTANTS                                                           */
/* -------------------------------------------------------------------------- */

// Centralized Tech Stack Data with specific icons
const TECH_STACK = [
  { name: "React", icon: Atom },
  { name: "Next.js", icon: Triangle },
  { name: "TypeScript", icon: Code2 },
  { name: "Python", icon: Terminal },
  { name: "Node.js", icon: Server },
  { name: "PostgreSQL", icon: Database },
  { name: "AWS", icon: Cloud },
  { name: "Docker", icon: Container },
  { name: "Kubernetes", icon: Hexagon },
  { name: "Tailwind", icon: Wind },
  { name: "Kafka", icon: Workflow },
  { name: "Terraform", icon: Layers },
];

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENTS                                                             */
/* -------------------------------------------------------------------------- */

// 1. Spotlight Card (The "Top 1%" Glow Effect)
const SpotlightCard = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      onMouseMove={handleMouseMove}
      className={classNames(
        "group relative overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 p-8",
        className
      )}
    >
      {/* Spotlight Gradient */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(14, 165, 233, 0.15),
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative h-full">{children}</div>
    </motion.div>
  );
};

// 2. Tech Badge (Refined)
const TechBadge = ({ label, icon: Icon }: { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }) => (
  <div className="flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-800/50 px-3 py-1 text-xs font-mono font-medium text-neutral-600 dark:text-neutral-300 transition-colors hover:border-primary/50 hover:text-primary">
    <Icon className="h-3.5 w-3.5" />
    <span>{label}</span>
  </div>
);

// 3. Contribution Graph (Simulated)
const ContributionGraph = () => {
  // Generate random activity levels
  const weeks = 14;
  const days = 7;
  const grid = Array.from({ length: weeks * days }, () => Math.random());

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-xs text-muted-foreground font-mono uppercase tracking-wider">
        <span>Git Activity</span>
        <span className="text-emerald-500">Live</span>
      </div>
      <div className="grid grid-cols-[repeat(14,1fr)] gap-1 w-full opacity-60 hover:opacity-100 transition-opacity duration-500">
        {grid.map((val, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.005 }}
            className={classNames(
              "aspect-square rounded-[2px]",
              val > 0.8 ? "bg-emerald-500" :
                val > 0.5 ? "bg-emerald-500/60" :
                  val > 0.2 ? "bg-emerald-500/30" :
                    "bg-neutral-200 dark:bg-neutral-800"
            )}
          />
        ))}
      </div>
    </div>
  );
};

// 4. Infinite Marquee (Updated Visuals)
const InfiniteMarquee = ({ items }: { items: typeof TECH_STACK }) => {
  return (
    <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <motion.div
        animate={{ x: "-50%" }}
        transition={{
          duration: 40, // Slower, smoother
          ease: "linear",
          repeat: Infinity,
        }}
        className="flex flex-none gap-6 pr-6"
      >
        {[...items, ...items].map((item, i) => (
          <div key={`${item.name}-${i}`} className="group flex items-center gap-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 px-5 py-2.5 shadow-sm backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-primary/5">
            <item.icon className="h-4 w-4 text-neutral-500 group-hover:text-primary transition-colors" />
            <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{item.name}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

// 5. Text Reveal Component (Kept)
const TextReveal = ({ text, className }: { text: string; className?: string }) => {
  const words = text.split(" ");
  return (
    <p className={classNames("leading-relaxed text-foreground/90", className || "")}>
      {words.map((word, i) => {
        const isBold = word.startsWith("*") && word.endsWith("*");
        const cleanWord = isBold ? word.slice(1, -1) : word;
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, filter: "blur(8px)", y: 5 }}
            whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.02 + 0.1, ease: "easeOut" }}
            viewport={{ once: true }}
            className={classNames(
              "inline-block mr-1.5",
              isBold ? "font-semibold text-primary" : ""
            )}
          >
            {cleanWord}
          </motion.span>
        );
      })}
    </p>
  );
};

// 6. Radar Animation (Location)
const Radar = () => (
  <div className="relative flex items-center justify-center h-16 w-16">
    <div className="absolute inset-0 animate-[ping_3s_linear_infinite] rounded-full border border-sky-500 opacity-20"></div>
    <div className="absolute inset-2 animate-[ping_3s_linear_infinite_1s] rounded-full border border-sky-500 opacity-20"></div>
    <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 ring-1 ring-sky-500/50 backdrop-blur-sm">
      <Globe className="h-4 w-4 text-sky-500" />
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

const About: React.FC = () => {
  return (
    <section id="about" className="py-24 relative overflow-hidden bg-background">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -z-10 h-[600px] w-[600px] bg-primary/5 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
      <div className="absolute bottom-0 left-0 -z-10 h-[500px] w-[500px] bg-purple-500/5 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />

      <div className="container px-4 md:px-6 max-w-6xl mx-auto">

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center md:text-left"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            About <span className="text-primary">Me</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl">
            A snapshot of my technical world. I build systems that are as beautiful internally as they are externally.
          </p>
        </motion.div>

        {/* BENTO GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">

          {/* CARD 1: BIO (Large, spans 2 cols) */}
          <SpotlightCard className="md:col-span-2 md:row-span-1 flex flex-col justify-center gap-8">
            <div className="flex items-center gap-4 pb-4">
              <div className="relative h-16 w-16 shrink-0 rounded-full overflow-hidden ring-2 ring-primary/10">
                <img src={avatar} alt="Emmanuel" className="h-full w-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold text-xl">Emmanuel Richard</h3>
                <p className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                  <Terminal className="w-3 h-3" /> Data & Software Engineer
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <TextReveal
                text="I build and operate data-driven products: *resilient* *ETL* *pipelines,* low-latency backends, and intuitive frontends that let teams act on data."
                className="text-lg"
              />
              <TextReveal
                text="My focus is reliability, cost-efficient scaling, and shipping software that measurably improves outcomes. I don't just write code; I *architect* *solutions.*"
                className="text-lg"
              />
            </div>

            <div className="flex gap-2 flex-wrap pt-2">
              <TechBadge label="System Architecture" icon={Cpu} />
              <TechBadge label="Data Engineering" icon={Database} />
              <TechBadge label="Full Stack" icon={Globe} />
            </div>
          </SpotlightCard>

          {/* CARD 2: GITHUB STATS (Tall) */}
          <SpotlightCard delay={0.1} className="flex flex-col justify-between gap-6">
            <div className="space-y-2">
              <h4 className="font-bold flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                Open Source
              </h4>
              <p className="text-sm text-muted-foreground">
                Consistent contribution and continuous learning.
              </p>
            </div>

            {/* The GitHub Graph Simulation */}
            <ContributionGraph />

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <div>
                <div className="text-2xl font-bold tracking-tight">20+</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Projects</div>
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight">4y</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Experience</div>
              </div>
            </div>
          </SpotlightCard>

          {/* CARD 3: TECH STACK SCROLLER (Wide) */}
          <SpotlightCard delay={0.2} className="md:col-span-3 flex flex-col justify-center py-10 gap-8 border-none bg-neutral-900 text--neutral-900 dark:bg-white dark:text-white !overflow-visible">
            <div className="text-center">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] opacity-60 mb-2 font-mono">Technical Arsenal</h3>
            </div>
            <InfiniteMarquee items={TECH_STACK} />
          </SpotlightCard>

          {/* CARD 4: PHILOSOPHY (Terminal Style) */}
          <SpotlightCard delay={0.3} className="md:col-span-2 !p-0 !bg-neutral-950 dark:!bg-black">
            {/* Terminal Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <div className="ml-2 text-xs text-neutral-500 font-mono">philosophy.ts</div>
            </div>
            {/* Terminal Content */}
            <div className="p-6 font-mono text-sm text-neutral-400 leading-relaxed">
              <div><span className="text-purple-400">const</span> <span className="text-blue-400">philosophy</span> = <span className="text-yellow-300">{"{"}</span></div>
              <div className="pl-4">
                <span className="text-neutral-500">// Simplicity is the ultimate sophistication</span>
              </div>
              <div className="pl-4">
                principle: <span className="text-green-400">"Idempotency & Resilience"</span>,
              </div>
              <div className="pl-4">
                approach: <span className="text-green-400">"Fail gracefully, recover automatically"</span>
              </div>
              <div><span className="text-yellow-300">{"}"}</span>;</div>
            </div>
          </SpotlightCard>

          {/* CARD 5: LOCATION (Radar) */}
          <SpotlightCard delay={0.4} className="flex flex-col items-center justify-center text-center gap-4">
            <Radar />
            <div>
              <div className="font-bold text-lg">Abuja, Nigeria</div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">UTC+1 &middot; Remote Ready</div>
            </div>
          </SpotlightCard>
        </div>
      </div>
    </section>
  );
};

export default About;