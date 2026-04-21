import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  Sparkles,
  Code2,
  Coffee,
  Heart,
  Zap,
  Crown,
  Terminal,
  Rocket
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface EasterEggProps {
  isActive: boolean;
  onComplete: () => void;
}

interface FloatingSymbolProps {
  delay: number;
  repeatDelay: number;
  x: string;
  y: string;
  children: React.ReactNode;
}

/* -------------------------------------------------------------------------- */
/* STABLE RANDOM DATA — generated once per module, not per render            */
/* -------------------------------------------------------------------------- */

// FIX: Math.random() was called directly inside FloatingSymbol's render,
// causing repeatDelay to change on every re-render and reset the animation.
// These values are now stable constants generated at module load time.
const FLOATING_SYMBOLS = [
  { id: 0, delay: 0, repeatDelay: 1.2, x: '15%', y: '15%', icon: Code2, size: 64 },
  { id: 1, delay: 1, repeatDelay: 2.1, x: '85%', y: '25%', icon: Heart, size: 40 },
  { id: 2, delay: 0.5, repeatDelay: 0.8, x: '25%', y: '75%', icon: Coffee, size: 48 },
  { id: 3, delay: 2, repeatDelay: 1.7, x: '75%', y: '65%', icon: Rocket, size: 56 },
];

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENTS                                                             */
/* -------------------------------------------------------------------------- */

// 1. Particle Explosion Engine
const ConfettiBurst = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => {
      const angle = Math.random() * 360;
      const velocity = 150 + Math.random() * 250;
      const size = 3 + Math.random() * 5;
      const spin = Math.random() * 360;

      return {
        id: i,
        angle: angle * (Math.PI / 180),
        velocity,
        size,
        color: ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ffffff'][Math.floor(Math.random() * 6)],
        delay: Math.random() * 0.1,
        spin,
        isCircle: Math.random() > 0.6,
      };
    });
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: Math.cos(p.angle) * p.velocity,
            y: Math.sin(p.angle) * p.velocity,
            scale: [0, 1.5, 0],
            opacity: [1, 1, 0],
            rotate: p.spin,
          }}
          transition={{
            duration: 1.5,
            ease: [0.22, 1, 0.36, 1],
            delay: p.delay,
          }}
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            position: 'absolute',
            borderRadius: p.isCircle ? '50%' : '2px',
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
};

// 2. Floating Background Symbol
// FIX: repeatDelay is now received as a stable prop, not computed in render.
const FloatingSymbol = ({ delay, repeatDelay, x, y, children }: FloatingSymbolProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{
      opacity: [0, 0.3, 0],
      y: -60,
      rotate: [0, 20, -20, 0],
    }}
    transition={{
      duration: 5,
      delay,
      ease: 'easeInOut',
      repeat: Infinity,
      repeatDelay,
    }}
    className="absolute text-white/10 pointer-events-none z-0"
    style={{ left: x, bottom: y }}
  >
    {children}
  </motion.div>
);

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

const EasterEgg = ({ isActive, onComplete }: EasterEggProps) => {
  const [showMessage, setShowMessage] = useState(false);

  // Parallax tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - rect.left - rect.width / 2);
    y.set(e.clientY - rect.top - rect.height / 2);
  };

  // FIX: wrapped in useCallback so the reference is stable across renders,
  // preventing the useEffect cleanup/re-attach on every render cycle.
  const handleDismiss = useCallback(() => {
    setShowMessage(false);
    onComplete();
  }, [onComplete]);

  // FIX 1: ESC key listener — previously [ESC] to dismiss was shown in the UI
  // but no keydown handler existed. Now properly bound while isActive.
  // FIX 2: Timers are cancelled on cleanup to avoid stale state updates
  // after the component unmounts or isActive flips back to false.
  useEffect(() => {
    if (!isActive) {
      setShowMessage(false);
      return;
    }

    const t1 = setTimeout(() => setShowMessage(true), 300);
    const t2 = setTimeout(handleDismiss, 5000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, handleDismiss]);

  const achievements = useMemo(() => [
    { title: 'Developer Mode', subtitle: 'Cheat Code Activated', icon: Terminal },
    { title: 'Konami Code', subtitle: 'Retro Gamer Detected', icon: Crown },
    { title: 'System Override', subtitle: 'Access Granted', icon: Code2 },
    { title: 'God Mode', subtitle: 'Unlimited Power', icon: Zap },
  ], []);

  // Stable random pick — runs once per mount, not on every render.
  const activeAchievement = useMemo(
    () => achievements[Math.floor(Math.random() * achievements.length)],
    [achievements]
  );
  const Icon = activeAchievement.icon;

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // FIX: perspective-1000 is not a valid Tailwind v3 utility and silently
        // does nothing. Using the arbitrary-value syntax instead, or inline style.
        // FIX: Added onClick for backdrop-click-to-dismiss (standard modal UX).
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
        style={{ perspective: '1000px' }}
        onMouseMove={handleMouseMove}
        onClick={handleDismiss}
      >
        {/* Background floating symbols */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {FLOATING_SYMBOLS.map((s) => {
            const SIcon = s.icon;
            return (
              <FloatingSymbol key={s.id} delay={s.delay} repeatDelay={s.repeatDelay} x={s.x} y={s.y}>
                <SIcon size={s.size} />
              </FloatingSymbol>
            );
          })}
        </div>

        <ConfettiBurst />

        {/* FIX: stopPropagation prevents card clicks from bubbling to the
            backdrop dismiss handler — otherwise clicking inside the card closes it. */}
        <motion.div
          style={{ rotateX, rotateY, z: 100 }}
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 50 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="relative z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative w-[340px] bg-neutral-900 border border-white/10 rounded-3xl p-8 text-center shadow-2xl overflow-hidden group">

            {/* FIX: animate-shimmer was a non-existent Tailwind animation.
                Replaced with a framer-motion animate that achieves the same
                moving-gradient-border effect without needing a global keyframe. */}
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.3) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                transition: 'opacity 0.5s',
              }}
              animate={{ backgroundPosition: ['200% 0%', '-200% 0%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
            />

            {/* Glow blob */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/20 rounded-full blur-[60px]" />

            {/* Icon */}
            <div className="relative mb-6 mx-auto w-20 h-20 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)]">
              <Icon className="w-10 h-10 text-primary drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            </div>

            {/* Text */}
            <AnimatePresence mode="wait">
              {showMessage && (
                <motion.div
                  key="message"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                    {activeAchievement.title}
                  </h2>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/5 text-[10px] font-mono uppercase tracking-widest text-primary-foreground/80">
                    <Sparkles className="w-3 h-3" />
                    {activeAchievement.subtitle}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer — ESC now actually works */}
            <div className="mt-8 text-[10px] text-neutral-500 font-mono">
              [ESC] or click outside to dismiss
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EasterEgg;