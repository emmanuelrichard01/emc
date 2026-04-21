import React, { useState, useEffect } from "react";
// FIX: Removed useTransform — it was imported but never referenced in this file.
// Dead imports increase bundle size and create noise for anyone reading the code.
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { ArrowUp } from "lucide-react";

const LINKS = [
  { label: "GitHub", href: "https://github.com/emmanuelrichard01" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/e-mc/" },
  { label: "Twitter", href: "https://x.com/_mrebuka" },
  { label: "Email", href: "mailto:emma.moghalu@gmail.com" },
];

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { scrollYProgress } = useScroll();
  const pathLength = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > 100);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 group flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-background/80 backdrop-blur-md border border-border shadow-lg hover:shadow-xl transition-all duration-300"
          aria-label="Scroll to top"
        >
          <svg className="absolute w-full h-full -rotate-90 p-0.5" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/20" />
            <motion.circle
              cx="50" cy="50" r="48"
              fill="none" stroke="currentColor" strokeWidth="2"
              className="text-primary"
              style={{ pathLength }}
            />
          </svg>
          <ArrowUp className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

  return (
    <footer className="py-12 border-t border-border/40 bg-background relative overflow-hidden">
      <div className="container px-4 md:px-6 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-medium text-muted-foreground">

        {/* Identity */}
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="text-foreground font-semibold tracking-tight">Emmanuel (Richard) Moghalu</span>
          <span className="opacity-80">Software & Data Engineer</span>
        </div>

        {/* Links */}
        <nav className="flex items-center gap-6">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors relative group"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full opacity-50" />
            </a>
          ))}
        </nav>

        {/* Build signal — location lives here as the single canonical source.
            It was removed from Contact.tsx to avoid duplication. */}
        <div className="flex flex-col items-center md:items-end gap-1 text-right opacity-60 font-mono">
          <span>© {currentYear} · Updated {currentQuarter}</span>
          <span>Abuja, NG · UTC+1</span>
        </div>

      </div>

      <ScrollToTop />
    </footer>
  );
};

export default Footer;