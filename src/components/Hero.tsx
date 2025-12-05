import React, { useRef, useState, useEffect } from 'react';
import avatar from "../assets/avatar.jpg";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionTemplate,
  useMotionValue,
  Variants,
  AnimatePresence, // Added missing import
} from 'framer-motion';
import {
  Github,
  Linkedin,
  Mail,
  Terminal,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Fallback for missing local image
const emmanuelAvatar = avatar;

/* -------------------------------------------------------------------------- */
/* UTILS & HOOKS                                                              */
/* -------------------------------------------------------------------------- */

// Magnetic Button Effect Hook
function useMagnetic(ref: React.RefObject<HTMLElement>) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current!.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    x.set(middleX * 0.06); // Adjust pull strength
    y.set(middleY * 0.06);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return { x, y, handleMouseMove, handleMouseLeave };
}

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENTS                                                             */
/* -------------------------------------------------------------------------- */

const MagneticWrapper = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { x, y, handleMouseMove, handleMouseLeave } = useMagnetic(ref);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x, y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const TypingEffect = ({ words }: { words: string[] }) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [blink, setBlink] = useState(true);

  // Blinking cursor
  useEffect(() => {
    const timeout2 = setTimeout(() => { setBlink((prev) => !prev); }, 500);
    return () => clearTimeout(timeout2);
  }, [blink]);

  // Typing logic
  useEffect(() => {
    if (index === words.length) return;

    if (subIndex === words[index].length + 1 && !reverse) {
      const timeout = setTimeout(() => { setReverse(true); }, 2000);
      return () => clearTimeout(timeout);
    }

    if (subIndex === 0 && reverse) {
      setReverse(false);
      setIndex((prev) => (prev + 1) % words.length);
      return;
    }

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, reverse ? 50 : 100);

    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse, words]);

  return (
    <span className="text-primary font-semibold relative">
      {`${words[index].substring(0, subIndex)}`}
      <span className={`${blink ? "opacity-100" : "opacity-0"} absolute -right-3 top-0 text-primary transition-opacity`}>|</span>
    </span>
  );
};

const BackgroundGrid = () => (
  <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-neutral-950">
    {/* Grid Pattern */}
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
    {/* Ambient Glow */}
    <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]" />
  </div>
);

const Spotlight = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className="absolute inset-0 z-30 transition-opacity duration-300 opacity-0 group-hover:opacity-100 pointer-events-none"
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(100, 100, 100, 0.05),
              transparent 80%
            )
          `,
        }}
      />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

const SOCIALS = [
  { href: "https://github.com/emmanuelrichard01", icon: Github, label: "GitHub" },
  { href: "https://www.linkedin.com/in/e-mc/", icon: Linkedin, label: "LinkedIn" },
  { href: "mailto:emma.moghalu@gmail.com", icon: Mail, label: "Email" },
];

const ROLES = ['Software Developer', 'Data Engineer', 'Cloud Architect', 'Problem Solver'];

const Hero: React.FC = () => {
  const targetRef = useRef<HTMLDivElement>(null);
  const [showSocials, setShowSocials] = useState(true);

  // Scroll Parallax
  const { scrollYProgress } = useScroll({ target: targetRef, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Avatar Tilt Physics
  const x = useMotionValue(0);
  const yRotate = useMotionValue(0);
  const rotateX = useSpring(useTransform(yRotate, [-0.5, 0.5], [15, -15]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-15, 15]), { stiffness: 150, damping: 20 });

  const handleAvatarMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    yRotate.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleAvatarLeave = () => { x.set(0); yRotate.set(0); };

  // Scroll visibility logic for Sidebar
  useEffect(() => {
    const handleScroll = () => {
      const aboutSection = document.getElementById('about');
      if (aboutSection) {
        const rect = aboutSection.getBoundingClientRect();
        const threshold = -(rect.height * 0.3);
        setShowSocials(rect.top > threshold);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section
      id="home"
      ref={targetRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden group bg-background pt-32 md:pt-20" // Added pt-32 for visual clearance
    >
      <BackgroundGrid />
      <Spotlight />

      {/* Social Sidebar (Fixed) - Hidden on Mobile */}
      <AnimatePresence>
        {showSocials && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20, transition: { duration: 0.3 } }}
            transition={{ delay: 1, duration: 0.5 }}
            className="fixed left-6 top-1/2 -translate-y-1/2 z-50 hidden xl:flex flex-col gap-5"
          >
            {SOCIALS.map((social) => (
              <MagneticWrapper key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex items-center justify-center p-3 rounded-full bg-background/50 backdrop-blur-md border border-neutral-200 dark:border-white/10 shadow-sm transition-all duration-300 hover:scale-110 hover:border-primary/50 hover:text-primary"
                >
                  <social.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="absolute left-14 px-3 py-1.5 text-xs font-medium rounded-md bg-foreground/90 text-background backdrop-blur-sm shadow-lg opacity-0 -translate-x-4 scale-95 group-focus:opacity-100 group-hover:translate-x-0 group-hover:scale-100 transition-all duration-200 ease-out pointer-events-none whitespace-nowrap z-50">
                    {social.label}
                    <span className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-foreground/90" />
                  </span>
                </a>
              </MagneticWrapper>
            ))}
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 64 }}
              className="w-[1px] bg-gradient-to-b from-transparent via-neutral-300 dark:via-neutral-700 to-transparent mx-auto"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <motion.div
        style={{ y, opacity }}
        className="relative z-10 container px-4 md:px-6 flex flex-col items-center text-center space-y-10 pb-20" // Added pb-20 so buttons don't hit scroll indicator
      >

        {/* Avatar */}
        <motion.div
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          onMouseMove={handleAvatarMove}
          onMouseLeave={handleAvatarLeave}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, y: [0, -3, 0] }}
          transition={{
            scale: { duration: 0.5 },
            opacity: { duration: 0.5 },
            y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }}
          className="relative w-32 h-32 md:w-40 md:h-40 cursor-pointer perspective-1000"
        >
          <div className="absolute inset-0 rounded-full border border-primary/20 animate-[ping_3s_linear_infinite]" />
          <div className="absolute inset-2 rounded-full border border-primary/40 animate-[ping_3s_linear_infinite_1.5s]" />

          <div className="relative h-full w-full rounded-full overflow-hidden border-4 border-white dark:border-neutral-800 shadow-2xl">
            <img src={emmanuelAvatar} alt="Emmanuel Moghalu" className="h-full w-full object-cover" />
          </div>
        </motion.div>

        {/* Text Content */}
        <div className="space-y-6 max-w-4xl">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-neutral-900 via-neutral-700 to-neutral-400 dark:from-white dark:via-white/80 dark:to-neutral-400 pb-2"
          >
            Emmanuel Moghalu
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="h-8 flex items-center justify-center gap-3 text-lg md:text-2xl font-medium"
          >
            <span className="text-muted-foreground">I'm a</span>
            <TypingEffect words={ROLES} />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto"
          >
            Architecting <span className="text-foreground font-semibold">resilient data pipelines</span> and engineering modern web platforms.
            Merging system reliability with creative precision.
          </motion.p>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <MagneticWrapper>
            <Button
              size="lg"
              onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
              className="group rounded-full px-8 h-14 text-base bg-foreground text-background hover:bg-foreground/90"
            >
              <Terminal className="mr-2 h-4 w-4 transition-transform group-hover:-translate-y-1" />
              View Projects
              <ArrowRight className="ml-2 h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </Button>
          </MagneticWrapper>

          <MagneticWrapper>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="rounded-full px-8 h-14 text-base border-neutral-200 dark:border-neutral-800 backdrop-blur-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <a href="/Emmanuel-Richard-Resume.pdf" download>Download CV</a>
            </Button>
          </MagneticWrapper>
        </motion.div>
      </motion.div>

      {/* PRO SCROLL INDICATOR - Modern Track & Pill Style */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20 pointer-events-none"
      >
        <div className="relative w-[2px] h-12 bg-neutral-200 dark:bg-neutral-800 overflow-hidden rounded-full">
          <motion.div
            animate={{ top: ["0%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-0 w-full h-1/3 bg-primary rounded-full"
          />
        </div>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60">
          Scroll
        </span>
      </motion.div>
    </section>
  );
};

export default Hero;