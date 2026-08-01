import React, { useState, useRef, useMemo } from 'react';
import {
  motion,
  useScroll,
  useMotionValueEvent,
} from 'framer-motion';
import {
  Home, User, Briefcase, Mail, FileText, Command, Palette
} from 'lucide-react';
import { useSectionObserver } from '../hooks/useSectionObserver';
import { useTheme } from './ThemeProvider';
import { LOGO_PATHS } from './ui/LogoMark';
import { scrollToSection } from '@/lib/scrollToSection';

/* -------------------------------------------------------------------------- */
/* LOGO (Terminal Icon as Logo)                                               */
/* -------------------------------------------------------------------------- */

const Logo = () => {
  const hasDrawn = useRef(false);
  const [drawn, setDrawn] = useState(false);

  React.useEffect(() => {
    if (!hasDrawn.current) {
      hasDrawn.current = true;
      const timer = setTimeout(() => setDrawn(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <motion.div
      className="relative w-6 h-6 cursor-pointer text-primary flex items-center justify-center"
      role="img"
      aria-label="E·MC Logo — Go to home"
      whileHover={{ scale: 1.1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <motion.svg
        viewBox="0 0 200 120"
        className="w-full h-full"
      >
        <motion.g
          fill="currentColor"
          initial={{ fillOpacity: drawn ? 1 : 0 }}
          animate={{ fillOpacity: 1 }}
          transition={{ duration: 0.5, delay: drawn ? 0 : 1.0 }}
        >
          {LOGO_PATHS.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: drawn ? 1 : 0, opacity: drawn ? 1 : 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={drawn ? { duration: 0 } : { duration: 1, ease: "easeInOut", delay: i * 0.15 }}
            />
          ))}
        </motion.g>
      </motion.svg>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/* NAV ITEM                                                                   */
/* -------------------------------------------------------------------------- */

const NavItem = ({
  children,
  isActive,
  onClick,
}: {
  children: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    aria-current={isActive ? "page" : undefined}
    className={`relative px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors duration-200 ${
      isActive
        ? 'text-foreground'
        : 'text-muted-foreground hover:text-foreground'
    }`}
  >
    <span className="relative z-10">{children}</span>
    {isActive && (
      <motion.div
        layoutId="nav-indicator-desktop"
        className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary z-0"
        style={{ boxShadow: '0 1px 6px hsl(var(--primary) / 0.4)' }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
    )}
  </button>
);

/* -------------------------------------------------------------------------- */
/* MAIN NAVBAR                                                                */
/* -------------------------------------------------------------------------- */

const NavbarContent = ({ onOpenCommandPalette }: { onOpenCommandPalette?: () => void }) => {
  const { theme, setTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const { scrollY } = useScroll();
  const lastScrollY = useRef(0);

  // Scroll direction detection + background toggle
  useMotionValueEvent(scrollY, "change", (latest) => {
    const direction = latest > lastScrollY.current ? 'down' : 'up';
    lastScrollY.current = latest;

    if (latest > 100 && !isScrolled) setIsScrolled(true);
    if (latest <= 100 && isScrolled) setIsScrolled(false);

    if (direction === 'down' && latest > 300) {
      setIsHidden(true);
    } else if (direction === 'up') {
      setIsHidden(false);
    }
  });

  const navItems = useMemo(() => [
    { href: 'home', label: 'Home', icon: Home },
    { href: 'about', label: 'About', icon: User },
    { href: 'projects', label: 'Work', icon: Briefcase },
    { href: 'experience', label: 'Exp', icon: FileText },
    { href: 'contact', label: 'Contact', icon: Mail },
  ], []);

  const activeSection = useSectionObserver();

  return (
    <>
      {/* --- DESKTOP NAV (Floating Structural Pill) --- */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{
          y: isHidden ? -100 : 0,
          opacity: isHidden ? 0 : 1,
        }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-6 left-0 right-0 z-50 hidden md:flex justify-center px-4"
        aria-label="Main navigation"
      >
        <div
          className={`flex items-center gap-4 px-3 py-2 border border-border transition-all duration-500 ${
            isScrolled
              ? 'bg-card/95 backdrop-blur-xl shadow-2xl'
              : 'bg-card/70 backdrop-blur-md'
          }`}
        >
          {/* Logo */}
          <button
            type="button"
            aria-label="Go to home"
            className="flex items-center cursor-pointer pl-1"
            onClick={() => scrollToSection('home')}
          >
            <Logo />
          </button>

          <div className="w-[1px] h-4 bg-border" />

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavItem
                key={item.label}
                isActive={activeSection === item.href}
                onClick={() => scrollToSection(item.href)}
              >
                {item.label}
              </NavItem>
            ))}
          </div>

          <div className="w-[1px] h-4 bg-border" />

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'amber' ? 'purple' : 'amber')}
            aria-label="Toggle theme color"
            className="flex items-center justify-center w-7 h-7 border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-primary transition-all cursor-pointer"
          >
            <Palette className="h-3.5 w-3.5" />
          </button>

          {/* ⌘K badge */}
          <button
            onClick={onOpenCommandPalette}
            aria-label="Open command palette"
            className="flex items-center gap-2 px-2.5 py-1 border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-primary transition-all cursor-pointer"
          >
            <Command className="h-3 w-3" />
            <kbd className="font-mono text-[9px] uppercase tracking-widest">CMD+K</kbd>
          </button>
        </div>
      </motion.nav>

      {/* --- MOBILE NAV (Floating Bottom Island) --- */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{
          y: isHidden ? 100 : 0,
          opacity: isHidden ? 0 : 1,
        }}
        transition={{ type: "tween", ease: "easeOut", duration: 0.3 }}
        className="fixed bottom-6 left-0 right-0 z-50 md:hidden flex justify-center px-4 pointer-events-none"
      >
        <div
          className="pointer-events-auto flex items-center gap-1 p-2 bg-card/95 backdrop-blur-xl border border-border shadow-2xl"
          role="navigation"
          aria-label="Mobile navigation"
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.href;
            return (
              <button
                key={item.label}
                onClick={() => scrollToSection(item.href)}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={`relative w-[44px] h-[44px] sm:w-[50px] sm:h-[50px] flex items-center justify-center transition-colors active:scale-95 ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-indicator"
                    className="absolute inset-0 bg-primary/10 border border-primary/30 z-0"
                    transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                  />
                )}
                <item.icon className="h-[18px] w-[18px] sm:h-5 sm:w-5 relative z-10" />
              </button>
            );
          })}

          <div className="w-[1px] h-8 bg-border mx-1" />

          {/* Mobile Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'amber' ? 'purple' : 'amber')}
            aria-label="Toggle theme color"
            className="relative min-w-[40px] min-h-[40px] flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all"
          >
            <Palette className="h-4 w-4" />
          </button>

          {/* Mobile Command Palette Button */}
          <button
            onClick={onOpenCommandPalette}
            aria-label="Open command palette"
            className="relative min-w-[40px] min-h-[40px] flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95 transition-all"
          >
            <Command className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </>
  );
};

export default function Navbar(props: { onOpenCommandPalette?: () => void }) {
  return <NavbarContent {...props} />;
}