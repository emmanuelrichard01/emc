import React, { useRef, useState, useEffect } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionTemplate,
  useMotionValue,
  AnimatePresence,
} from 'framer-motion';
import {
  Github,
  Linkedin,
  Mail,
  Terminal,
  ArrowRight,
  Mouse
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// FIXED: Using remote URL for preview stability. 
// In your local project, you can uncomment the import below and use 'localAvatar'
import localAvatar from "../assets/avatar.jpg";
const emmanuelAvatar = localAvatar;

/* -------------------------------------------------------------------------- */
/* UTILS & HOOKS                                                              */
/* -------------------------------------------------------------------------- */

function useMagnetic(ref: React.RefObject<HTMLElement>) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current!.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    x.set(middleX * 0.1);
    y.set(middleY * 0.1);
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

  useEffect(() => {
    const timeout2 = setTimeout(() => { setBlink((prev) => !prev); }, 500);
    return () => clearTimeout(timeout2);
  }, [blink]);

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
  <div className="absolute inset-0 -z-10 h-full w-full bg-background">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
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
      className="absolute inset-0 z-30 transition-opacity duration-500 opacity-0 group-hover:opacity-100 pointer-events-none"
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              600px circle at ${mouseX}px ${mouseY}px,
              rgba(255, 255, 255, 0.03),
              transparent 70%
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

  // Advanced Parallax: Separate layers move at different speeds
  const { scrollYProgress } = useScroll({ target: targetRef, offset: ["start start", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9]);
  const yAvatar = useTransform(scrollYProgress, [0, 1], [0, 100]); // Moves slower
  const yText = useTransform(scrollYProgress, [0, 1], [0, 200]);   // Moves faster (depth)

  // Avatar Physics
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

  // Scroll visibility logic
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
      // Adjusted padding: pt-16 for mobile (compact top), md:pt-40 for desktop (clear navbar)
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden group bg-background pt-12 md:pt-20"
    >
      <BackgroundGrid />
      <Spotlight />

      {/* Social Sidebar */}
      <AnimatePresence>
        {showSocials && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20, transition: { duration: 0.3 } }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="fixed left-6 top-1/2 -translate-y-1/2 z-50 hidden xl:flex flex-col gap-6"
          >
            {SOCIALS.map((social) => (
              <div
                key={social.label}
                className="relative group/sidebar"
              >
                <MagneticWrapper>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                flex items-center justify-center p-3 rounded-full 
                bg-background/60 backdrop-blur-md 
                border border-neutral-200 dark:border-white/10 
                shadow-sm transition-all duration-300 
                group-hover/sidebar:scale-[1.15]
                hover:border-primary/60 hover:text-primary
              "
                  >
                    <social.icon className="w-5 h-5 text-muted-foreground transition-colors group-hover/sidebar:text-primary" />
                  </a>
                </MagneticWrapper>

                {/* Tooltip */}
                <div
                  className="
              absolute left-full ml-4 top-1/2 -translate-y-1/2 
              opacity-0 scale-90 -translate-x-2 pointer-events-none 
              group-hover/sidebar:opacity-100 group-hover/sidebar:scale-100 group-hover/sidebar:translate-x-0 
              transition-all duration-200 ease-out
              px-3 py-1.5 rounded-md text-xs font-medium 
              bg-foreground text-background shadow-lg whitespace-nowrap
              z-[200]
            "
                >
                  {social.label}

                  {/* Tooltip arrow */}
                  <span className="
              absolute right-full top-1/2 -translate-y-1/2 
              border-4 border-transparent 
              border-r-foreground
            " />
                </div>
              </div>
            ))}

            {/* Vertical Line */}
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 60 }}
              className="w-[1px] bg-gradient-to-b from-transparent via-neutral-300 dark:via-neutral-700 to-transparent mx-auto opacity-50"
            />
          </motion.div>
        )}
      </AnimatePresence>


      {/* Main Content Container */}
      <motion.div
        style={{ opacity, scale }}
        // Increased bottom padding to prevent overlap with bottom nav/scroll indicator
        className="relative z-10 container px-4 md:px-6 flex flex-col items-center text-center space-y-10 pb-24 md:pb-16"
      >

        {/* Avatar with specific Parallax */}
        <motion.div
          style={{ y: yAvatar, rotateX, rotateY, transformStyle: "preserve-3d" }}
          onMouseMove={handleAvatarMove}
          onMouseLeave={handleAvatarLeave}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-32 h-32 md:w-40 md:h-40 cursor-pointer perspective-1000"
        >
          {/* Subtle Breathing Animation */}
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full"
          >
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-[ping_6s_linear_infinite]" />
            <div className="absolute inset-2 rounded-full border border-primary/40 animate-[ping_6s_linear_infinite_1.5s]" />
            <div className="relative h-full w-full rounded-full overflow-hidden border-4 border-background shadow-2xl">
              <img src={emmanuelAvatar} alt="Emmanuel Moghalu" className="h-full w-full object-cover" />
            </div>
          </motion.div>
        </motion.div>

        {/* Text Content with deeper Parallax */}
        <motion.div
          style={{ y: yText }}
          className="space-y-6 max-w-4xl"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-neutral-900 via-neutral-700 to-neutral-400 dark:from-white dark:via-white/80 dark:to-neutral-400 pb-2"
          >
            Emmanuel Moghalu
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="h-8 flex items-center justify-center gap-3 text-lg md:text-2xl font-medium"
          >
            <span className="text-muted-foreground">I'm a</span>
            <TypingEffect words={ROLES} />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto"
          >
            Architecting <span className="text-foreground font-semibold">resilient data pipelines</span> and engineering modern web platforms.
            Merging system reliability with creative precision.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
          >
            <MagneticWrapper>
              <Button
                size="lg"
                onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
                className="group rounded-full px-8 h-14 text-base bg-foreground text-background hover:bg-foreground/90 shadow-lg hover:shadow-xl transition-all"
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
      </motion.div>

      {/* Refined Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-12 right-1 -translate-x-1/2 flex-col items-center gap-3 z--20 pointer-events-none hidden md:flex"
      >
        <div className="relative w-[2px] h-16 bg-gradient-to-b from-transparent via-primary-300 dark:via-primary-700 to-transparent overflow-hidden rounded-full">
          <motion.div
            animate={{ top: ["-100%", "100%"] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
              delay: 1
            }}
            className="absolute left-0 w-full h-1/2 bg-gradient-to-b from-transparent to-primary opacity-100"
          />
        </div>
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground/50">
          Scroll
        </span>
      </motion.div>
    </section>
  );
};

export default Hero;