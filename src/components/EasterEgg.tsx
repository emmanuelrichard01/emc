import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  Sparkles,
  Trophy,
  Rocket,
  Code2,
  Coffee,
  Heart,
  Zap,
  Crown,
  Terminal
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

// 1. Particle Explosion Engine (Optimized Physics)
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
        spin
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
            rotate: p.spin
          }}
          transition={{
            duration: 1.5,
            ease: [0.22, 1, 0.36, 1], // Custom Ease Out Quart
            delay: p.delay
          }}
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            position: 'absolute',
            borderRadius: Math.random() > 0.6 ? '50%' : '2px',
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`
          }}
        />
      ))}
    </div>
  );
};

// 2. Floating Background Symbol
const FloatingSymbol = ({ delay, x, y, children }: { delay: number, x: string, y: string, children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{
      opacity: [0, 0.3, 0],
      y: -60,
      rotate: [0, 20, -20, 0]
    }}
    transition={{
      duration: 5,
      delay: delay,
      ease: "easeInOut",
      repeat: Infinity,
      repeatDelay: Math.random() * 3
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

  // Parallax Tilt Logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const achievements = useMemo(() => [
    { title: "Developer Mode", subtitle: "Cheat Code Activated", icon: Terminal },
    { title: "Konami Code", subtitle: "Retro Gamer Detected", icon: Crown },
    { title: "System Override", subtitle: "Access Granted", icon: Code2 },
    { title: "God Mode", subtitle: "Unlimited Power", icon: Zap },
  ], []);

  const activeAchievement = useMemo(() => achievements[Math.floor(Math.random() * achievements.length)], [achievements]);
  const Icon = activeAchievement.icon;

  useEffect(() => {
    if (isActive) {
      const timer1 = setTimeout(() => setShowMessage(true), 300);
      const timer2 = setTimeout(() => {
        setShowMessage(false);
        onComplete();
      }, 5000);
      return () => { clearTimeout(timer1); clearTimeout(timer2); };
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
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md perspective-1000"
        onMouseMove={handleMouseMove}
      >
        {/* Background Ambience */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <FloatingSymbol delay={0} x="15%" y="15%"><Code2 size={64} /></FloatingSymbol>
          <FloatingSymbol delay={1} x="85%" y="25%"><Heart size={40} /></FloatingSymbol>
          <FloatingSymbol delay={0.5} x="25%" y="75%"><Coffee size={48} /></FloatingSymbol>
          <FloatingSymbol delay={2} x="75%" y="65%"><Rocket size={56} /></FloatingSymbol>
        </div>

        <ConfettiBurst />

        {/* The Card */}
        <motion.div
          style={{ rotateX, rotateY, z: 100 }}
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 20, stiffness: 200 }}
          className="relative z-10"
        >
          <div className="relative w-[340px] bg-neutral-900 border border-white/10 rounded-3xl p-8 text-center shadow-2xl overflow-hidden group">

            {/* Moving Gradient Border */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />

            {/* Glow Blob */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/20 rounded-full blur-[60px]" />

            {/* Icon */}
            <div className="relative mb-6 mx-auto w-20 h-20 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_30px_-5px_rgba(var(--primary-rgb),0.3)]">
              <Icon className="w-10 h-10 text-primary drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            </div>

            {/* Text */}
            <AnimatePresence mode='wait'>
              {showMessage && (
                <motion.div
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

            {/* Footer */}
            <div className="mt-8 text-[10px] text-neutral-500 font-mono">
              [ESC] to dismiss
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EasterEgg;