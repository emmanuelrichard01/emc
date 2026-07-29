import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { ArrowUp, Terminal } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  DATA                                                                       */
/* -------------------------------------------------------------------------- */

const LINKS = [
  { label: "GitHub", href: "https://github.com/emmanuelrichard01" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/e-mc/" },
  { label: "X", href: "https://x.com/_mrebuka" },
  { label: "Email", href: "mailto:emma.moghalu@gmail.com" },
];

/* -------------------------------------------------------------------------- */
/*  SCROLL-TO-TOP                                                              */
/* -------------------------------------------------------------------------- */

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 30,
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
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 group flex items-center justify-center w-11 h-11 rounded-xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.06] transition-all duration-300"
          style={{
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.4)",
          }}
          aria-label="Scroll to top"
        >
          {/* Progress ring */}
          <svg
            className="absolute w-full h-full p-0.5"
            viewBox="0 0 44 44"
          >
            {/* Track */}
            <rect
              x="2"
              y="2"
              width="40"
              height="40"
              rx="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-white/[0.06]"
            />
            {/* Progress — using rounded rect path */}
            <motion.rect
              x="2"
              y="2"
              width="40"
              height="40"
              rx="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-primary"
              strokeDasharray="160"
              style={{
                strokeDashoffset: progress.get()
                  ? undefined
                  : 160,
                pathLength: progress,
              }}
            />
          </svg>
          <ArrowUp className="w-4 h-4 text-white/55 group-hover:text-white/80 group-hover:-translate-y-0.5 transition-all duration-300 relative z-10" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

/* -------------------------------------------------------------------------- */
/*  FOOTER                                                                     */
/* -------------------------------------------------------------------------- */

const Footer = () => {
  const year = new Date().getFullYear();
  const quarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
  const footerRef = useRef<HTMLElement>(null);

  return (
    <footer
      ref={footerRef}
      className="relative border-t border-white/[0.04] overflow-hidden"
    >
      {/* Ambient gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/[0.01] to-transparent pointer-events-none" />

      <div className="relative z-10 container px-4 md:px-6 max-w-7xl mx-auto py-10 md:py-14">
        {/* Main footer grid */}
        <div className="flex flex-col items-center gap-6 sm:gap-8 md:flex-row md:justify-between">
          {/* Identity */}
          <div className="flex flex-col items-center md:items-start gap-1.5">
            <span className="text-sm font-semibold text-white/80 tracking-tight">
              Emmanuel Moghalu
            </span>
            <span className="text-[11px] font-mono text-white/50">
              Software & Data Engineer
            </span>
          </div>

          {/* Navigation links */}
          <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6" aria-label="Footer navigation">
            {LINKS.map((link) => {
              const isExternal = link.href.startsWith("http");
              return (
                <a
                  key={link.label}
                  href={link.href}
                  {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="relative text-[11px] font-medium text-white/60 hover:text-white/90 transition-colors duration-300 group py-2"
                  aria-label={isExternal ? `${link.label} (opens in new tab)` : link.label}
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary/60 transition-all duration-300 group-hover:w-full" />
                </a>
              );
            })}
          </nav>

          {/* Build signal */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[10px] font-mono text-white/50">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3 h-3" />
              <span>© {year} · {quarter}</span>
            </div>
            <div className="w-px h-3 bg-white/[0.06]" />
            <span>Abuja, NG · UTC+1</span>
          </div>
        </div>

        {/* Bottom line — subtle signature */}
        <div className="mt-8 pt-5 border-t border-white/[0.03] flex justify-center">
          <span className="text-[9px] font-mono text-white/40 tracking-widest uppercase" aria-hidden="true">
            Designed & Engineered by E·MC
          </span>
        </div>
      </div>

      <ScrollToTop />
    </footer>
  );
};

export default Footer;