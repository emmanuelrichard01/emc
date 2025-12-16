import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate } from 'framer-motion';
import {
  ArrowRight, Terminal, Activity,
  GitCommit, Cpu, Zap, Server,
  Database, Globe, Layers, Command,
  LayoutTemplate, CheckCircle2
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* 1. UTILITY COMPONENTS                                                      */
/* -------------------------------------------------------------------------- */

// Shared Background with Spotlight integration
const BackgroundGrid = () => (
  <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
    {/* Base background */}
    <div className="absolute inset-0 bg-background transition-colors duration-300" />

    {/* Grid */}
    <div
      className="
        absolute inset-0
        bg-[radial-gradient(rgba(0,0,0,0.08)_1px,transparent_1px)]
        dark:bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)]
        [background-size:22px_22px]
      "
    />

    {/* Ambient blobs */}
    <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[140px]" />
    <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[140px]" />
  </div>
);

const StatusBadge = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 backdrop-blur-md mb-6 cursor-default transition-colors duration-300"
  >
    <div className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 duration-1000"></span>
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
    </div>
    <span className="text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
      Systems Operational
    </span>
  </motion.div>
);

// Rolling Button Component for Text Cycling
interface RollingButtonProps {
  primary?: boolean;
  label: React.ReactNode;
  reveal?: React.ReactNode;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

const RollingButton: React.FC<RollingButtonProps> = ({ primary = false, label, reveal, icon: Icon, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`
        group/button relative px-8 py-3 rounded-xl font-medium text-sm
        transition-all duration-300 overflow-hidden
        ${primary
          ? 'bg-foreground text-background hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5'
          : 'border border-border/40 bg-background/50 hover:bg-muted/50 text-foreground hover:border-foreground/20'
        }
      `}
    >
      {/* Lock height to one line */}
      <div className="relative h-5 overflow-hidden">

        {/* Vertical roller */}
        <div
          className="
            flex flex-col
            transition-transform duration-500
            ease-[cubic-bezier(0.16,1,0.3,1)]
            group-hover/button:-translate-y-5
          "
        >
          {/* DEFAULT STATE — NO ICON */}
          <div className="flex items-center justify-center h-5">
            <span>{label}</span>
          </div>

          {/* REVEAL STATE — ICON APPEARS */}
          <div className="flex items-center justify-center gap-2 h-5">
            <span>{reveal}</span>
            {Icon && (
              <Icon
                className="
                  w-3.5 h-3.5
                  opacity-0 -translate-x-1
                  transition-all duration-300 delay-150
                  group-hover/button:opacity-100
                  group-hover/button:translate-x-0
                "
              />
            )}
          </div>
        </div>

      </div>
    </button>
  );
};



/* -------------------------------------------------------------------------- */
/* 2. DASHBOARD VISUALS                                                       */
/* -------------------------------------------------------------------------- */

const DataFlowLine = ({ delay = 0 }: { delay?: number }) => (
  <div className="flex-1 relative h-px mx-4">
    {/* Static Track */}
    <div className="absolute inset-0 border-t border-dashed border-muted-foreground/50" />
    {/* Moving Packet */}
    <motion.div
      className="absolute top-1/2 -translate-y-1/2 h-[2px] w-12 bg-gradient-to-r from-transparent via-primary/80 to-transparent rounded-full blur-[0.5px]"
      initial={{ left: "-20%", opacity: 0 }}
      animate={{ left: "120%", opacity: [0, 1, 1, 0] }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "linear",
        delay: delay
      }}
    />
  </div>
);

interface MetricItemProps {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color?: 'emerald' | 'blue';
}

const MetricItem: React.FC<MetricItemProps> = ({ label, value, icon: Icon, color = 'blue' }) => (
  <div className="flex items-start justify-between p-3 rounded-lg bg-neutral-100/50 dark:bg-white/5 border border-neutral-200 dark:border-white/5 transition-colors duration-300">
    <div>
      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className="text-lg font-bold font-mono tracking-tight text-foreground">{value}</div>
    </div>
    <div className={`p-1.5 rounded-md ${color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
      <Icon className="w-3.5 h-3.5" />
    </div>
  </div>
);

const LiveLog = () => {
  const [logs, setLogs] = useState([
    { id: 1, text: "Initializing kernel...", status: "ok" },
    { id: 2, text: "Loading data pipelines...", status: "ok" },
  ]);

  useEffect(() => {
    const sequence = [
      { text: "Connecting to cluster...", status: "wait" },
      { text: "Cluster connected (us-east-1)", status: "ok" },
      { text: "Fetching graphics engine...", status: "ok" },
      { text: "Rendering viewport...", status: "ok" },
      { text: "System Ready.", status: "done" },
    ];
    let index = 0;

    const interval = setInterval(() => {
      if (index < sequence.length) {
        setLogs(prev => [...prev.slice(-3), { id: Date.now(), ...sequence[index] }]);
        index++;
      }
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono text-[10px] space-y-1.5 mt-4 opacity-80">
      {logs.map((log) => (
        <motion.div
          key={log.id}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <span className={`
            ${log.status === 'ok' || log.status === 'done' ? 'text-emerald-500' : 'text-amber-500'}
          `}>
            {log.status === 'ok' ? '✓' : log.status === 'done' ? '➜' : '⟳'}
          </span>
          <span className="text-muted-foreground">{log.text}</span>
        </motion.div>
      ))}
    </div>
  );
};

const SystemDashboard = () => {
  // Smooth, weighted tilt effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [5, -5]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-5, 5]), { stiffness: 150, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="relative w-full max-w-md mx-auto perspective-1000"
    >
      {/* Main Interface Card */}
      <div className="relative bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-neutral-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/50 p-6 overflow-hidden transition-colors duration-300">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold tracking-tight text-foreground">dashboard</span>
          </div>
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-neutral-200 dark:bg-white/10" />
            <div className="w-2 h-2 rounded-full bg-neutral-200 dark:bg-white/10" />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <MetricItem label="Uptime" value="99.99%" icon={Activity} color="emerald" />
          <MetricItem label="Latency" value="24ms" icon={Zap} color="blue" />
        </div>

        {/* Visualization Area */}
        <div className="relative h-32 bg-neutral-100/50 dark:bg-white/5 rounded-lg border border-neutral-200 dark:border-white/5 overflow-hidden mb-2 transition-colors duration-300">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full px-8 flex justify-between items-center relative z-10">
              <div className="flex flex-col items-center gap-2">
                <Database className="w-5 h-5 text-muted-foreground" />
              </div>

              <DataFlowLine delay={0} />

              <div className="flex flex-col items-center gap-2">
                <Server className="w-5 h-5 text-foreground" />
              </div>

              <DataFlowLine delay={1} />

              <div className="flex flex-col items-center gap-2">
                <Globe className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
            {/* Grid Lines */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49%,rgba(0,0,0,0.05)_50%,transparent_51%)] dark:bg-[linear-gradient(90deg,transparent_49%,rgba(255,255,255,0.05)_50%,transparent_51%)] bg-[size:20px_100%]" />
          </div>
        </div>

        <LiveLog />
      </div>

      {/* Decorative Elements (Behind) */}
      <div className="absolute -z-10 top-4 -right-4 w-full h-full bg-neutral-200/50 dark:bg-white/5 rounded-2xl border border-neutral-200 dark:border-white/5 blur-[1px] transition-colors duration-300" />
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. MAIN HERO LAYOUT                                                        */
/* -------------------------------------------------------------------------- */

export default function Hero() {
  const { scrollY } = useScroll();

  // Refined Scroll Animations for "Overlap" Effect
  // Extended range [0, 700] prevents premature vanishing (empty space)
  const yText = useTransform(scrollY, [0, 700], [0, 150]);
  const yGraphic = useTransform(scrollY, [0, 700], [0, 100]);
  const opacity = useTransform(scrollY, [0, 600], [1, 0]);
  const blur = useTransform(scrollY, [0, 600], ["blur(0px)", "blur(12px)"]);
  const scale = useTransform(scrollY, [0, 600], [1, 0.95]);

  // Spotlight Effect State
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <section
      id="home"
      className="relative min-h-[100vh] flex items-center pt-16 md:pt-24 pb-12 overflow-hidden group/section"
      onMouseMove={handleMouseMove}
    >
      <BackgroundGrid />

      {/* Interactive Spotlight Overlay */}
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-500 group-hover/section:opacity-100 z-0"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              450px circle at ${mouseX}px ${mouseY}px,
              rgba(14, 165, 233, 0.1),
              transparent 80%
            )
          `,
        }}
      />

      <div className="container px-4 md:px-6 max-w-7xl mx-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">

          {/* LEFT: Copy */}
          <motion.div
            style={{ y: yText, opacity, filter: blur, scale }}
            className="flex flex-col items-start max-w-2xl origin-left"
          >
            <StatusBadge />

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
              I architect <br />
              <span className="text-muted-foreground">data systems</span> that scale.
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              <span className="text-foreground font-medium">Data Engineer & Cloud Architect.</span>
              <br />
              Building the invisible pipelines that power decision engines, production infrastructure, and resilient software.
            </p>

            <div className="flex flex-wrap gap-4">
              <RollingButton
                primary
                label="View My Work"
                reveal="Engineering Logs"
                icon={ArrowRight}
                onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
              />

              <RollingButton
                label="Review CV"
                reveal="Analyze Stack"
                icon={Terminal}
                onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
              />
            </div>
          </motion.div>

          {/* RIGHT: Visual */}
          <motion.div
            style={{ y: yGraphic, opacity, filter: blur, scale }}
            className="relative hidden lg:block origin-center"
          >
            <SystemDashboard />
          </motion.div>

        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        style={{ opacity: useTransform(scrollY, [0, 200], [0.5, 0]) }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-80 pointer-events-none"
      >
        <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-foreground/50 to-transparent" />
      </motion.div>
    </section>
  );
}