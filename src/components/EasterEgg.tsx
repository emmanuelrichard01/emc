import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface EasterEggProps {
  isActive: boolean;
  onComplete: () => void;
}

/* -------------------------------------------------------------------------- */
/* TERMINAL LINES — the "boot sequence" the user sees                         */
/* -------------------------------------------------------------------------- */

const BOOT_LINES = [
  { text: "$ sudo access --override", type: "cmd" as const, delay: 0 },
  { text: "[AUTH] Verifying konami sequence...", type: "log" as const, delay: 0.3 },
  { text: "[AUTH] Sequence valid. Elevating privileges.", type: "log" as const, delay: 0.8 },
  { text: "[SYS] Loading hidden partition...", type: "log" as const, delay: 1.3 },
  { text: "██████████████████████████████ 100%", type: "bar" as const, delay: 1.6 },
  { text: "", type: "blank" as const, delay: 2.2 },
  { text: "ACCESS GRANTED", type: "success" as const, delay: 2.4 },
  { text: "", type: "blank" as const, delay: 2.7 },
];

const FACTS = [
  "First line of code written: 2016 — it was a PHP contact form.",
  "Favorite debugging tool: console.log (yes, really).",
  "Most rows processed in one pipeline: 1.5M+ records.",
  "Coffee preference: black, no sugar, strong.",
  "Keyboard: mechanical, cherry MX brown switches.",
  "IDE: VS Code with Catppuccin Mocha theme.",
  "Favorite design system: shadcn/ui.",
  "This portfolio has 0 dependencies on Tailwind — just vanilla CSS tokens.",
  "The ⌘K palette took 3 iterations to get right.",
  "Fun fact: 'E·MC' is a play on E=mc².",
];

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

const EasterEgg = ({ isActive, onComplete }: EasterEggProps) => {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showFact, setShowFact] = useState(false);

  const fact = useMemo(
    () => FACTS[Math.floor(Math.random() * FACTS.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isActive]
  );

  const dismiss = useCallback(() => {
    setVisibleLines(0);
    setShowFact(false);
    onComplete();
  }, [onComplete]);

  // Sequence the lines
  useEffect(() => {
    if (!isActive) {
      setVisibleLines(0);
      setShowFact(false);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    BOOT_LINES.forEach((line, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), line.delay * 1000));
    });

    // Show the fact after boot completes
    timers.push(setTimeout(() => setShowFact(true), 3000));

    // Auto-dismiss after 8s
    timers.push(setTimeout(dismiss, 8000));

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", handleKey);

    return () => {
      timers.forEach(clearTimeout);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isActive, dismiss]);

  // Focus trap
  const modalRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isActive || !modalRef.current) return;
    const modal = modalRef.current;
    
    // Focus the modal itself when opened
    modal.focus();
    
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = modal.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) {
        e.preventDefault();
        return;
      }
      
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
        onClick={dismiss}
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={{ scale: 0.95, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 12 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-[460px] max-w-[90vw] rounded-2xl border border-white/[0.08] bg-[#0a0a0a] shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent pointer-events-none" />

          {/* Terminal header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
            </div>
            <span className="ml-2 text-[10px] font-mono text-white/50">
              emc@portfolio ~ /secret
            </span>
          </div>

          {/* Terminal body */}
          <div className="px-5 py-5 font-mono text-[12px] leading-relaxed min-h-[200px]">
            {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className={`mb-1 ${
                  line.type === "cmd"
                    ? "text-emerald-400"
                    : line.type === "success"
                    ? "text-primary font-bold text-sm tracking-wider"
                    : line.type === "bar"
                    ? "text-primary/60"
                    : line.type === "blank"
                    ? "h-2"
                    : "text-white/55"
                }`}
              >
                {line.text}
              </motion.div>
            ))}

            {/* Cursor blink while loading */}
            {visibleLines < BOOT_LINES.length && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="inline-block w-2 h-3.5 bg-emerald-400/80 mt-1"
              />
            )}

            {/* Fun fact reveal */}
            <AnimatePresence>
              {showFact && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-4 pt-4 border-t border-white/[0.06]"
                >
                  <div className="text-[9px] text-white/40 uppercase tracking-[0.2em] mb-2">
                    // Random fact unlocked
                  </div>
                  <p className="text-white/60 text-[13px] font-sans leading-relaxed">
                    "{fact}"
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-5 py-2.5 border-t border-white/[0.04] flex items-center justify-between text-[9px] font-mono text-white/40">
            <span>↑ ↑ ↓ ↓ ← → ← → B A</span>
            <span>[ESC] dismiss</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EasterEgg;