import React, { memo, useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useSpring, AnimatePresence } from "framer-motion";
import {
  Github,
  Linkedin,
  Mail,
  Instagram,
  ArrowUp,
  ExternalLink,
  ArrowRight,
  Clock,
  Twitter
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* UTILS & CONSTANTS                                                          */
/* -------------------------------------------------------------------------- */

const MAGNETIC_CONFIG = { stiffness: 150, damping: 15, mass: 0.1 };

// Base64 Noise Texture (Optimized)
const NOISE_SVG = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E`;

// Robust Theme Detector Hook (No external dependencies)
const useThemeDetector = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const checkTheme = () => {
      // Check for 'dark' class on html/body or system preference
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isClassDark = document.documentElement.classList.contains('dark');
      setTheme(isClassDark || isSystemDark ? 'dark' : 'light');
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // Also listen to system changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkTheme);
    };
  }, []);

  return theme;
};

// Custom hook for local time
const useLocalTime = () => {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return time;
};

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENTS                                                             */
/* -------------------------------------------------------------------------- */

// Navigation & Social links (moved outside component to avoid recreation)
const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Experience", href: "#experience" },
  { label: "Contact", href: "#contact" },
];

const SOCIAL_LINKS = [
  { icon: Github, href: "https://github.com/emmanuelrichard01", label: "GitHub" },
  { icon: Linkedin, href: "https://www.linkedin.com/in/e-mc/", label: "LinkedIn" },
  { icon: Twitter, href: "https://x.com/_mrebuka", label: "X (Twitter)" },
  { icon: Instagram, href: "https://www.instagram.com/officialemmanuelrichard/", label: "Instagram" },
  { icon: Mail, href: "mailto:emma.moghalu@gmail.com", label: "Email" },
];

// 1. Logo Animated Component (Refined Timing & Solid Fill)
const LogoAnimated = memo(() => {

  const paths = [
    "M154.2,43.5v69.4c0,1.4,1,2.5,2.4,2.5h34.1c1.4,0,2.5-1.1,2.5-2.5v-37.1c0-.7-.3-1.3-.7-1.8L120.2.8c-.5-.5-1.1-.7-1.8-.7H22.6c-1.4,0-2.5,1.1-2.5,2.5v33.1c0,1.4,1.1,2.5,2.5,2.5h65.4c0,.1,61,.2,61,.2,2.9,0,5.2,2.3,5.1,5.2h0Z",
    "M76,76.1c-.5.5-.8,1.1-.8,1.8v35.1c0,1.4,1.1,2.5,2.5,2.5h34.6c1.4,0,2.5-1.1,2.5-2.5V38.9c0-.2-.3-.4-.4-.2l-38.4,37.4h0Z",
    "M39.6,112.9V38.9c0-.2-.3-.4-.5-.2L.8,76.1c-.5.5-.8,1.1-.8,1.8v35.1c0,1.4,1.1,2.5,2.5,2.5h34.6c1.4,0,2.5-1.1,2.5-2.5h0Z"
  ];

  return (
    <div
      className="
        relative w-10 h-10 cursor-pointer
        text-foreground
        dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]
      "
    >
      <motion.svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        whileHover={{ scale: 1.05, rotate: -2 }}
        whileTap={{ scale: 0.95 }}
      >
        <defs>
          {/* Enhancement-only glow */}
          <filter id="logo-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="3"
              floodColor="currentColor"
              floodOpacity="0.35"
            />
          </filter>
        </defs>

        <motion.g
          fill="currentColor"
          initial={{ fillOpacity: 0 }}
          animate={{ fillOpacity: [0, 0, 1, 1, 0, 0] }}
          transition={{
            duration: 8,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 1,
            times: [0, 0.3, 0.4, 0.7, 0.85, 1],
          }}
        >
          {paths.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#logo-glow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 1, 1, 1, 0, 0],
                opacity: [0, 1, 1, 1, 0, 0],
              }}
              transition={{
                duration: 8,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 1,
                times: [0, 0.3, 0.4, 0.7, 0.9, 1],
              }}
            />
          ))}
        </motion.g>
      </motion.svg>
    </div>
  );
});

// 2. Magnetic Icon
const MagneticIcon = memo(({ children, href, label }: { children: React.ReactNode; href: string; label: string }) => {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, MAGNETIC_CONFIG);
  const springY = useSpring(y, MAGNETIC_CONFIG);

  // Use RAF to batch pointer updates and avoid flooding renders
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ cx: number; cy: number } | null>(null);

  const setFromPending = () => {
    const p = pendingRef.current;
    if (!p) return;
    pendingRef.current = null;
    x.set(p.cx);
    y.set(p.cy);
    rafRef.current = null;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const r = ref.current.getBoundingClientRect();
    const middleX = clientX - (r.left + r.width / 2);
    const middleY = clientY - (r.top + r.height / 2);
    pendingRef.current = { cx: middleX * 0.2, cy: middleY * 0.2 };
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(setFromPending);
  };

  const handlePointerLeave = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      pendingRef.current = null;
    }
    x.set(0);
    y.set(0);
  };

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <motion.a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{ x: springX, y: springY }}
      className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/50 text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background"
    >
      <div className="relative z-10">{children}</div>
    </motion.a>
  );
});
MagneticIcon.displayName = "MagneticIcon";

// 3. Footer Link
const FooterLink = ({ href, label, external }: { href: string; label: string; external?: boolean }) => (
  <a
    href={href}
    target={external ? "_blank" : undefined}
    rel={external ? "noopener noreferrer" : undefined}
    className="group flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
  >
    <span className="relative overflow-hidden">
      <span className="inline-block transition-transform duration-300 group-hover:-translate-y-full">
        {label}
      </span>
      <span className="absolute left-0 top-0 inline-block translate-y-full transition-transform duration-300 group-hover:translate-y-0">
        {label}
      </span>
    </span>
    {external ? (
      <ExternalLink className="h-3 w-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    ) : (
      <ArrowRight className="h-3 w-3 -translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
    )}
  </a>
);

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

const Footer = () => {
  const [year, setYear] = useState<number | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const time = useLocalTime();

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Use pre-defined NAV_LINKS and SOCIAL_LINKS to avoid re-creating arrays on each render

  return (
    <footer className="relative border-t border-border/40 overflow-hidden bg-background">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
        style={{ backgroundImage: `url("${NOISE_SVG}")` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background z-0" />
      <div className="absolute -top-[200px] -left-[200px] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-[200px] -right-[200px] w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[128px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">

          {/* Brand Column */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <LogoAnimated />
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Emmanuel M.
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Architecting scalable systems and resilient data pipelines. Building the future, one commit at a time.
            </p>

            {/* Status Widget */}
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full w-fit border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                All systems operational
              </div>
              {time && (
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-3 py-1">
                  <Clock className="h-3 w-3" />
                  {time}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Column */}
          <div className="space-y-6">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-foreground/80">
              Navigation
            </h3>
            <ul className="space-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href} label={link.label} />
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div className="space-y-6">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-foreground/80">
              Legal
            </h3>
            <ul className="space-y-3">
              <li><FooterLink href="#" label="Privacy Policy" /></li>
              <li><FooterLink href="#" label="Terms of Service" /></li>
              <li><FooterLink href="#" label="Cookie Policy" /></li>
            </ul>
          </div>

          {/* Connect Column */}
          <div className="space-y-6">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-foreground/80">
              Connect
            </h3>
            <div className="flex flex-wrap gap-3">
              {SOCIAL_LINKS.map((link) => (
                <MagneticIcon key={link.label} href={link.href} label={link.label}>
                  <link.icon className="h-4 w-4" />
                </MagneticIcon>
              ))}
            </div>
            <p className="text-xs text-muted-foreground pt-4">
              Feel free to reach out for collaborations or just a friendly hello.
            </p>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="mt-16 pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>
            &copy; {year} Emmanuel C. Moghalu. All rights reserved.
          </p>
          <p className="flex items-center gap-1">
            Built with <span className="text-red-500">♥</span> and <span className="text-foreground font-medium">React</span>
          </p>
        </div>
      </div>

      {/* Back To Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-50 hidden md:flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 border border-primary/20 backdrop-blur-sm"
            aria-label="Back to top"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </footer>
  );
};

export default memo(Footer);