import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useScroll, useSpring, useInView } from "framer-motion";
import { ArrowUp, Terminal } from "lucide-react";
import { scrollToSection } from "@/lib/scrollToSection";

/* -------------------------------------------------------------------------- */
/*  DATA                                                                       */
/* -------------------------------------------------------------------------- */

const SITEMAP = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "projects", label: "Work" },
  { id: "experience", label: "Experience" },
  { id: "contact", label: "Contact" },
];

const CONNECT_LINKS = [
  { label: "GitHub", href: "https://github.com/emmanuelrichard01" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/e-mc/" },
  { label: "X", href: "https://x.com/mrebr" },
  { label: "Email", href: "mailto:emma.moghalu@gmail.com" },
];

/* -------------------------------------------------------------------------- */
/*  LIVE LAGOS CLOCK — ticks on the minute boundary, not every second, so it   */
/*  stays a quiet ambient detail rather than a distracting countdown.         */
/* -------------------------------------------------------------------------- */

function useLagosClock() {
  const formatter = useMemo(
    () => new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      hour: "2-digit",
      minute: "2-digit",
    }),
    []
  );
  // Lazy initializer — runs once on mount only, so reading the clock here
  // isn't the "impure render" pattern that a bare `useState(formatter.format(new Date()))`
  // (re-evaluated every render) or a Date.now() effect body would be.
  const [time, setTime] = useState(() => formatter.format(new Date()));

  useEffect(() => {
    const msUntilNextMinute = 60000 - (Date.now() % 60000);
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const alignTimeout = setTimeout(() => {
      setTime(formatter.format(new Date()));
      intervalId = setInterval(() => setTime(formatter.format(new Date())), 60000);
    }, msUntilNextMinute);

    return () => {
      clearTimeout(alignTimeout);
      if (intervalId) clearInterval(intervalId);
    };
  }, [formatter]);

  return time;
}

/* -------------------------------------------------------------------------- */
/*  BUILD METADATA — real commit SHA + relative deploy time, injected at      */
/*  build time via vite.config.ts (see __COMMIT_SHA__ / __BUILD_TIME__).      */
/* -------------------------------------------------------------------------- */

function formatRelativeBuildTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diffMin = Math.round((then - Date.now()) / 60000);

  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");
  return rtf.format(Math.round(diffHr / 24), "day");
}

/* -------------------------------------------------------------------------- */
/*  SCROLL-TO-TOP                                                              */
/* -------------------------------------------------------------------------- */

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 25,
    restDelta: 0.001,
  });

  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 group flex items-center justify-center w-10 h-10 bg-card border border-border hover:border-primary transition-all cursor-pointer"
          style={{ boxShadow: 'var(--shadow-md)' }}
          aria-label="Scroll to top"
        >
          {/* Progress ring */}
          <svg className="absolute inset-0 w-full h-full p-1 -rotate-90" viewBox="0 0 44 44">
            <rect
              x="2"
              y="2"
              width="40"
              height="40"
              fill="none"
              stroke="transparent"
              strokeWidth="1.5"
            />
            <motion.rect
              x="2"
              y="2"
              width="40"
              height="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-primary"
              strokeDasharray="160"
              style={{
                strokeDashoffset: progress.get() ? undefined : 160,
                pathLength: progress,
              }}
            />
          </svg>
          <ArrowUp className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors relative z-10" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

/* -------------------------------------------------------------------------- */
/*  FOOTER                                                                     */
/* -------------------------------------------------------------------------- */

const FooterColumnLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] mb-4 block">
    {children}
  </span>
);

const Footer = () => {
  const year = new Date().getFullYear();
  const quarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
  const footerRef = useRef<HTMLElement>(null);
  const isInView = useInView(footerRef, { once: true, amount: 0.3 });
  const lagosTime = useLagosClock();

  return (
    <footer
      ref={footerRef}
      className="relative border-t border-border bg-card/20 overflow-hidden"
    >
      {/* Top gradient accent */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 container px-6 md:px-12 lg:px-24 max-w-7xl mx-auto py-12 md:py-16"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 text-center sm:text-left">

          {/* Identity */}
          <div className="flex flex-col items-center sm:items-start gap-2">
            <span className="text-[13px] font-bold text-foreground tracking-widest uppercase">
              Emmanuel Moghalu
            </span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Software & Data Engineer
            </span>
          </div>

          {/* Sitemap */}
          <div className="flex flex-col items-center sm:items-start">
            <FooterColumnLabel>Sitemap</FooterColumnLabel>
            <nav className="flex flex-col items-center sm:items-start gap-2.5" aria-label="Footer section links">
              {SITEMAP.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Connect */}
          <div className="flex flex-col items-center sm:items-start">
            <FooterColumnLabel>Connect</FooterColumnLabel>
            <nav className="flex flex-col items-center sm:items-start gap-2.5" aria-label="External profiles and contact">
              {CONNECT_LINKS.map((link) => {
                const isExternal = link.href.startsWith("http");
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="relative text-[11px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors group"
                    aria-label={isExternal ? `${link.label} (opens in new tab)` : link.label}
                  >
                    {link.label}
                    <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-primary transition-all duration-300 group-hover:w-full" />
                  </a>
                );
              })}
            </nav>
          </div>

          {/* Status */}
          <div className="flex flex-col items-center sm:items-start">
            <FooterColumnLabel>Status</FooterColumnLabel>
            <div className="flex flex-col items-center sm:items-start gap-2.5 text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 status-live shrink-0" />
                <span>Abuja, NG — {lagosTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3 text-primary shrink-0" />
                <span>© {year} // {quarter}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom line — real build metadata, not decorative text */}
        <div className="mt-12 pt-6 border-t border-border flex justify-center">
          <span className="text-[9px] font-mono text-muted-foreground/60 tracking-[0.3em] uppercase" aria-hidden="true">
            # {__COMMIT_SHA__} // deployed {formatRelativeBuildTime(__BUILD_TIME__)}
          </span>
        </div>
      </motion.div>

      <ScrollToTop />
    </footer>
  );
};

export default Footer;