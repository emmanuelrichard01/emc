import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Trophy,
  Rocket,
  Code2,
  Coffee,
  Heart,
  Zap,
  Crown
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface EasterEggProps {
  isActive: boolean;
  onComplete: () => void;
}

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENTS                                                             */
/* -------------------------------------------------------------------------- */

// 1. Particle Explosion Engine
const ConfettiBurst = () => {
  // Generate particles with random physics trajectories
  const particles = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => {
      const angle = Math.random() * 360;
      const velocity = 100 + Math.random() * 300; // Random spread distance
      const size = 4 + Math.random() * 6;

      return {
        id: i,
        angle,
        velocity,
        size,
        color: ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'][Math.floor(Math.random() * 5)],
        delay: Math.random() * 0.2
      };
    });
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{
            x: Math.cos(p.angle * (Math.PI / 180)) * p.velocity,
            y: Math.sin(p.angle * (Math.PI / 180)) * p.velocity,
            scale: [0, 1, 0],
            opacity: [1, 1, 0],
            rotate: Math.random() * 360
          }}
          transition={{
            duration: 1.2,
            ease: "easeOut",
            delay: p.delay
          }}
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            position: 'absolute',
            borderRadius: Math.random() > 0.5 ? '50%' : '2px' // Mix of circles and squares
          }}
        />
      ))}
    </div>
  );
};

// 2. Floating Background Symbol
const FloatingSymbol = ({ delay, x, y, children }: { delay: number, x: string, y: string, children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{
      opacity: [0, 0.4, 0],
      y: -100,
      rotate: [0, 45, -45, 0]
    }}
    transition={{
      duration: 4,
      delay: delay,
      ease: "easeInOut",
      repeat: Infinity,
      repeatDelay: Math.random() * 2
    }}
    className="absolute text-primary/20 pointer-events-none"
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

  // Curated achievement messages
  const ACHIEVEMENTS = [
    { title: "Cheat Code Activated", subtitle: "You've unlocked developer mode!", icon: TerminalIcon },
    { title: "Konami Code Master", subtitle: "Old school gamer detected.", icon: Crown },
    { title: "System Overridden", subtitle: "Welcome to the matrix.", icon: Code2 },
    { title: "Super User Status", subtitle: "Sudo access granted.", icon: Zap },
  ];

  // Pick a random achievement on mount
  const achievement = useMemo(() => ACHIEVEMENTS[Math.floor(Math.random() * ACHIEVEMENTS.length)], [isActive]);
  const AchievementIcon = achievement.icon;

  useEffect(() => {
    if (isActive) {
      // Sequence: Animation Start -> Show Message -> Wait -> Close
      const showTimer = setTimeout(() => setShowMessage(true), 400); // Wait for burst to clear slightly
      const closeTimer = setTimeout(() => {
        setShowMessage(false);
        onComplete();
      }, 4500);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(closeTimer);
      };
    } else {
      setShowMessage(false);
    }
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        {/* 1. Background Atmosphere */}
        <div className="absolute inset-0 overflow-hidden">
          <FloatingSymbol delay={0} x="10%" y="10%"><Code2 size={48} /></FloatingSymbol>
          <FloatingSymbol delay={1.5} x="80%" y="20%"><Heart size={32} /></FloatingSymbol>
          <FloatingSymbol delay={0.8} x="20%" y="70%"><Coffee size={40} /></FloatingSymbol>
          <FloatingSymbol delay={2.2} x="70%" y="60%"><Rocket size={56} /></FloatingSymbol>
          <FloatingSymbol delay={1.2} x="50%" y="40%"><Sparkles size={24} /></FloatingSymbol>
        </div>

        {/* 2. Confetti Explosion */}
        <ConfettiBurst />

        {/* 3. The Achievement Card */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotateX: 45 }}
          animate={{ scale: 1, opacity: 1, rotateX: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 12, stiffness: 100 }}
          className="relative z-10"
        >
          {/* Rotating Border Beam Effect */}
          <div className="absolute -inset-[2px] rounded-3xl bg-gradient-to-r from-primary via-purple-500 to-primary opacity-75 blur-md animate-pulse" />

          <div className="relative bg-neutral-900/90 border border-white/10 rounded-3xl p-8 md:p-12 text-center shadow-2xl backdrop-blur-xl overflow-hidden min-w-[320px] max-w-sm">

            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50 pointer-events-none" />

            {/* Icon Container */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 1.5, bounce: 0.5 }}
              className="relative mx-auto w-24 h-24 mb-6 flex items-center justify-center rounded-full bg-gradient-to-tr from-primary/20 to-purple-500/20 border border-primary/50 shadow-[0_0_40px_-10px_var(--tw-shadow-color)] shadow-primary/50"
            >
              <AchievementIcon className="w-12 h-12 text-primary drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />

              {/* Spinning Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-t-2 border-r-2 border-primary/30"
              />
            </motion.div>

            {/* Text Reveal */}
            <AnimatePresence>
              {showMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.h2
                    className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-primary to-purple-400 mb-2"
                  >
                    {achievement.title}
                  </motion.h2>
                  <motion.p
                    className="text-neutral-400 text-sm font-medium tracking-wide uppercase"
                  >
                    {achievement.subtitle}
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Close Hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
              className="mt-8 pt-4 border-t border-white/5"
            >
              <p className="text-xs text-neutral-600">Press ESC to dismiss</p>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper Icon for default
const TerminalIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

export default EasterEgg;