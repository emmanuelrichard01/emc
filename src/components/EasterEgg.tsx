import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface EasterEggProps {
  isActive: boolean;
  onComplete: () => void;
}

/* -------------------------------------------------------------------------- */
/* DATA — Classified Dossier                                                  */
/* -------------------------------------------------------------------------- */

const BOOT_SEQUENCE = [
  { text: "$ sudo auth --override --konami",     type: "cmd" as const, delay: 0 },
  { text: "[AUTH] Verifying sequence integrity…", type: "log" as const, delay: 0.3 },
  { text: "[AUTH] Biometric hash ██████ MATCH",   type: "log" as const, delay: 0.7 },
  { text: "[SYS] Decrypting hidden sector…",      type: "log" as const, delay: 1.1 },
  { text: "[SYS] ████████████████████ 100%",       type: "bar" as const, delay: 1.4 },
  { text: "ACCESS GRANTED — CLEARANCE LEVEL Ω",   type: "success" as const, delay: 2.0 },
];

interface DossierField {
  label: string;
  value: string;
  classified?: boolean;
}

const DOSSIER_FIELDS: DossierField[] = [
  { label: "Designation",   value: "Emmanuel C. Moghalu" },
  { label: "Codename",      value: "E·MC" },
  { label: "Callsign",      value: "E = mc²" },
  { label: "Status",        value: "ACTIVE" },
  { label: "Clearance",     value: "LEVEL Ω" },
  { label: "Base",          value: "Abuja, NG // UTC+1" },
  { label: "First Commit",  value: "2016 — a PHP contact form" },
  { label: "Peak Pipeline", value: "1.5M+ records in a single run" },
  { label: "Keyboard",      value: "Mechanical · Cherry MX Brown" },
  { label: "IDE",           value: "VS Code · Catppuccin Mocha" },
  { label: "Coffee",        value: "Black · No sugar · Strong" },
  { label: "Design System", value: "shadcn/ui" },
];

const TRIVIA = [
  "'E·MC' is a play on Einstein's E=mc²",
  "The ⌘K palette took 3 iterations to feel right",
  "This site has zero border-radius by design",
  "The terminal boot sequence is 100% client-side — no server needed",
  "Every animation respects prefers-reduced-motion",
  "The color system supports runtime theme switching",
];

/* -------------------------------------------------------------------------- */
/* SUBCOMPONENTS                                                              */
/* -------------------------------------------------------------------------- */

const TypewriterLine = ({ text, onComplete, speed = 20 }: { text: string; onComplete?: () => void; speed?: number }) => {
  const [displayed, setDisplayed] = useState("");
  const completed = useRef(false);

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(iv);
        if (!completed.current) {
          completed.current = true;
          onComplete?.();
        }
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, onComplete]);

  return <span>{displayed}</span>;
};

/* Glitch text effect for the "ACCESS GRANTED" header */
const GlitchText = ({ text, className = "" }: { text: string; className?: string }) => {
  const prefersReduced = useReducedMotion();
  const [glitching, setGlitching] = useState(!prefersReduced);
  const [display, setDisplay] = useState(text);
  const chars = "!@#$%^&*()_+{}|:<>?ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  useEffect(() => {
    if (prefersReduced || !glitching) return;

    let iteration = 0;
    const iv = setInterval(() => {
      setDisplay(
        text.split("").map((char, i) => {
          if (char === " ") return " ";
          if (i < iteration) return text[i];
          return chars[Math.floor(Math.random() * chars.length)];
        }).join("")
      );

      iteration += 0.5;
      if (iteration >= text.length) {
        clearInterval(iv);
        setDisplay(text);
        setGlitching(false);
      }
    }, 30);

    return () => clearInterval(iv);
  }, [text, glitching, prefersReduced]);

  return <span className={className}>{display}</span>;
};

/* Animated dossier field that decrypts from gibberish */
const DecryptField = ({ field, delay }: { field: DossierField; delay: number }) => {
  const prefersReduced = useReducedMotion();
  const [revealed, setRevealed] = useState(prefersReduced);
  const [display, setDisplay] = useState(() => prefersReduced ? field.value : "█".repeat(field.value.length));
  const chars = "░▒▓█▄▀■□●○◆◇";

  useEffect(() => {
    if (prefersReduced) return;
    const startTimer = setTimeout(() => {
      setRevealed(true);
      let iteration = 0;
      const iv = setInterval(() => {
        setDisplay(
          field.value.split("").map((char, i) => {
            if (char === " ") return " ";
            if (i < iteration) return field.value[i];
            return chars[Math.floor(Math.random() * chars.length)];
          }).join("")
        );
        iteration += 0.8;
        if (iteration >= field.value.length) {
          clearInterval(iv);
          setDisplay(field.value);
        }
      }, 25);
      return () => clearInterval(iv);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [field.value, delay, prefersReduced]);

  return (
    <div className="flex items-start gap-4 py-2 border-b border-border/30 last:border-0 group">
      <span className="text-[10px] font-mono text-primary uppercase tracking-widest w-28 shrink-0 pt-0.5">
        {field.label}
      </span>
      <span className={`text-[12px] font-mono transition-colors duration-300 ${
        revealed ? 'text-foreground' : 'text-muted-foreground/30'
      }`}>
        {display}
      </span>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

const EasterEgg = ({ isActive, onComplete }: EasterEggProps) => {
  const [phase, setPhase] = useState<"boot" | "dossier" | "trivia">("boot");
  const [bootLine, setBootLine] = useState(0);
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [showDossier, setShowDossier] = useState(false);
  const [showTrivia, setShowTrivia] = useState(false);

  const trivia = useMemo(
    () => TRIVIA[Math.floor(Math.random() * TRIVIA.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isActive]
  );

  const dismiss = useCallback(() => {
    setPhase("boot");
    setBootLine(0);
    setShowDossier(false);
    setShowTrivia(false);
    onComplete();
  }, [onComplete]);

  // Boot sequence progression
  useEffect(() => {
    if (!isActive || phase !== "boot") return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    BOOT_SEQUENCE.forEach((line, i) => {
      timers.push(setTimeout(() => setBootLine(i + 1), line.delay * 1000));
    });

    // Transition to dossier phase
    timers.push(setTimeout(() => {
      setPhase("dossier");
      setShowDossier(true);
    }, 2600));

    // Show trivia after dossier has decrypted
    timers.push(setTimeout(() => {
      setShowTrivia(true);
    }, 5500));

    return () => timers.forEach(clearTimeout);
  }, [isActive, phase]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
      // Cycle trivia with arrow keys or space
      if ((e.key === "ArrowRight" || e.key === " ") && showTrivia) {
        e.preventDefault();
        setTriviaIndex(prev => (prev + 1) % TRIVIA.length);
      }
      if (e.key === "ArrowLeft" && showTrivia) {
        e.preventDefault();
        setTriviaIndex(prev => (prev - 1 + TRIVIA.length) % TRIVIA.length);
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isActive, dismiss, showTrivia]);

  // Reset on activation
  useEffect(() => {
    if (isActive) {
      setPhase("boot");
      setBootLine(0);
      setShowDossier(false);
      setShowTrivia(false);
      setTriviaIndex(0);
    }
  }, [isActive]);

  // Focus trap
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isActive || !modalRef.current) return;
    const modal = modalRef.current;
    modal.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = modal.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) { e.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
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
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md"
        onClick={dismiss}
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={{ scale: 0.95, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 12 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-[560px] max-w-[92vw] border border-border bg-card overflow-hidden outline-none"
          style={{ boxShadow: 'var(--shadow-lg), var(--shadow-glow)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top accent */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          {/* CRT scan-line overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-20 opacity-[0.03]"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)',
              backgroundSize: '100% 4px',
            }}
          />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20 relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-primary/60 status-live" />
                <div className="w-1.5 h-1.5 bg-border" />
                <div className="w-1.5 h-1.5 bg-border" />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                SYS.OP // CLASSIFIED
              </span>
            </div>
            <button
              onClick={dismiss}
              className="text-[9px] font-mono text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors px-2 py-1 border border-border hover:border-primary"
            >
              [ESC]
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 min-h-[320px] max-h-[65vh] overflow-y-auto relative z-10">

            {/* Phase 1: Boot Sequence */}
            <AnimatePresence>
              {phase === "boot" && (
                <motion.div
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="font-mono text-[12px] leading-relaxed space-y-1"
                >
                  {BOOT_SEQUENCE.slice(0, bootLine).map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.12 }}
                      className={
                        line.type === "cmd"     ? "text-primary font-semibold" :
                        line.type === "success" ? "text-foreground font-bold text-[13px] tracking-widest uppercase mt-3" :
                        line.type === "bar"     ? "text-primary/30" :
                        "text-muted-foreground"
                      }
                    >
                      {line.text}
                    </motion.div>
                  ))}

                  {/* Blinking cursor while booting */}
                  {bootLine < BOOT_SEQUENCE.length && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="inline-block w-2 h-3.5 bg-primary mt-1"
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Phase 2: Classified Dossier */}
            <AnimatePresence>
              {showDossier && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Dossier header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-1.5 bg-primary status-live" />
                    <h2 className="text-[11px] font-mono text-primary uppercase tracking-[0.25em]">
                      <GlitchText text="CLASSIFIED DOSSIER" />
                    </h2>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
                  </div>

                  {/* Fields */}
                  <div className="space-y-0">
                    {DOSSIER_FIELDS.map((field, i) => (
                      <DecryptField
                        key={field.label}
                        field={field}
                        delay={i * 180}
                      />
                    ))}
                  </div>

                  {/* Trivia Section */}
                  <AnimatePresence>
                    {showTrivia && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="mt-6 pt-5 border-t border-border"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-mono text-primary uppercase tracking-[0.2em]">
                            // Intercepted Intel
                          </span>
                          <span className="text-[9px] font-mono text-muted-foreground/50">
                            {triviaIndex + 1}/{TRIVIA.length}
                          </span>
                        </div>

                        <AnimatePresence mode="wait">
                          <motion.p
                            key={triviaIndex}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="text-foreground/80 text-[13px] font-mono leading-relaxed"
                          >
                            "{TRIVIA[triviaIndex]}"
                          </motion.p>
                        </AnimatePresence>

                        {/* Navigation hint */}
                        <div className="flex items-center gap-4 mt-4 text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest">
                          <span className="flex items-center gap-1.5">
                            <kbd className="border border-border/50 px-1.5 py-0.5 text-muted-foreground/60">←</kbd>
                            <kbd className="border border-border/50 px-1.5 py-0.5 text-muted-foreground/60">→</kbd>
                            cycle
                          </span>
                          <span className="flex items-center gap-1.5">
                            <kbd className="border border-border/50 px-1.5 py-0.5 text-muted-foreground/60">SPACE</kbd>
                            next
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-[9px] font-mono text-muted-foreground/60 uppercase tracking-widest relative z-10">
            <span className="flex items-center gap-2">
              <div className="w-1 h-1 bg-primary" />
              Konami Sequence Verified
            </span>
            <span className="text-muted-foreground/30">ω-level access</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EasterEgg;