import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import {
  Home,
  User,
  Briefcase,
  Mail,
  Moon,
  Sun,
  Monitor,
  Command,
  FileText
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* THEME CONTEXT & HOOK                                                       */
/* -------------------------------------------------------------------------- */

type Theme = 'light' | 'dark' | 'system';
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  // 1. Initialize from localStorage or system
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  // 2. Handle System Changes & Resolution
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      const effectiveTheme = theme === 'system' ? systemTheme : theme;

      setResolvedTheme(effectiveTheme);

      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(effectiveTheme);

      localStorage.setItem('theme', theme);
    };

    applyTheme();

    // Listen for system changes if mode is 'system'
    const listener = () => {
      if (theme === 'system') applyTheme();
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to consume the context
function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/* -------------------------------------------------------------------------- */
/* HOOKS                                                                      */
/* -------------------------------------------------------------------------- */

function useMagnetic(ref: React.RefObject<HTMLElement>) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current!.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    x.set(middleX * 0.15);
    y.set(middleY * 0.15);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return { x, y, handleMouseMove, handleMouseLeave };
}

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENTS                                                             */
/* -------------------------------------------------------------------------- */

// 1. Magnetic Nav Item Wrapper
const MagneticNavItem = ({
  children,
  isActive,
  onClick
}: {
  children: React.ReactNode;
  isActive: boolean;
  onClick: () => void
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const { x, y, handleMouseMove, handleMouseLeave } = useMagnetic(ref);

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x, y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
    >
      {isActive && (
        <motion.div
          layoutId="nav-pill"
          className="absolute inset-0 bg-primary/10 rounded-full -z-10"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      {children}
    </motion.button>
  );
};

// 2. Animated Logo
const LogoAnimated = () => {
  const { resolvedTheme } = useTheme();

  // Use style2 as the base logo
  const paths = [
    "M154.2,43.5v69.4c0,1.4,1,2.5,2.4,2.5h34.1c1.4,0,2.5-1.1,2.5-2.5v-37.1c0-.7-.3-1.3-.7-1.8L120.2.8c-.5-.5-1.1-.7-1.8-.7H22.6c-1.4,0-2.5,1.1-2.5,2.5v33.1c0,1.4,1.1,2.5,2.5,2.5h65.4c0,.1,61,.2,61,.2,2.9,0,5.2,2.3,5.1,5.2h0Z",
    "M76,76.1c-.5.5-.8,1.1-.8,1.8v35.1c0,1.4,1.1,2.5,2.5,2.5h34.6c1.4,0,2.5-1.1,2.5-2.5V38.9c0-.2-.3-.4-.4-.2l-38.4,37.4h0Z",
    "M39.6,112.9V38.9c0-.2-.3-.4-.5-.2L.8,76.1c-.5.5-.8,1.1-.8,1.8v35.1c0,1.4,1.1,2.5,2.5,2.5h34.6c1.4,0,2.5-1.1,2.5-2.5h0Z"
  ];

  // Colors based on resolved theme
  const strokeColor = resolvedTheme === "dark" ? "#fefef5" : "#090908";
  const gradientStart = strokeColor;
  const glowColor = resolvedTheme === "dark" ? "#ffffff" : "#000000";

  return (
    <div className="p-2 rounded-2xl bg-transparent cursor-pointer">
      <motion.svg
        width="42"
        height="42"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        whileHover={{ scale: 1.05, rotate: -2 }}
        whileTap={{ scale: 0.95 }}
      >
        <defs>
          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="4"
              floodColor={glowColor}
              floodOpacity={resolvedTheme === 'dark' ? 0.6 : 0.3}
            />
          </filter>
          <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={gradientStart} stopOpacity="0.4" />
            <stop offset="100%" stopColor={gradientStart} stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <motion.g
          fill={strokeColor}
          initial={{ fillOpacity: 0 }}
          animate={{
            fillOpacity: [0, 0, 1, 1, 0, 0], // Staggered opacity
          }}
          transition={{
            duration: 8,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 1,
            // Timing Logic:
            // 0 - 0.2:  Waiting/Drawing Stroke
            // 0.2 - 0.35: Fill fades IN (delayed after stroke)
            // 0.35 - 0.75: Fill stays visible
            // 0.75 - 0.9: Fill fades OUT
            times: [0, 0.2, 0.35, 0.75, 0.9, 1]
          }}
        >
          {paths.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              stroke={strokeColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              // Only apply glow in dark mode for cleaner UI in light mode
              filter={resolvedTheme === 'dark' ? "url(#neon-glow)" : undefined}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 1, 1, 0],
                opacity: [0, 1, 1, 0]
              }}
              transition={{
                duration: 8,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 1,
                // Timing Logic:
                // 0 - 0.2: Draw Stroke (0 to 100%)
                // 0.2 - 0.8: Hold Stroke
                // 0.8 - 1: Erase Stroke
                times: [0, 0.2, 0.8, 1]
              }}
            />
          ))}
        </motion.g>
      </motion.svg>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* MAIN NAVBAR COMPONENT                                                      */
/* -------------------------------------------------------------------------- */

const NavbarContent = ({ onOpenCommandPalette }: { onOpenCommandPalette?: () => void }) => {
  const [activeSection, setActiveSection] = useState('home');
  const [isScrolled, setIsScrolled] = useState(false);
  const [showMobileBubble, setShowMobileBubble] = useState(true);
  const lastYRef = useRef(0);
  const { theme, setTheme } = useTheme();

  const navItems = [
    { href: '#home', label: 'Home', icon: Home },
    { href: '#about', label: 'About', icon: User },
    { href: '#projects', label: 'Projects', icon: Briefcase },
    { href: '#experience', label: 'Experience', icon: FileText },
    { href: '#contact', label: 'Contact', icon: Mail },
  ];

  // Scroll Logic
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setIsScrolled(currentY > 50);

      if (currentY > lastYRef.current && currentY > 200) {
        setShowMobileBubble(false);
      } else if (currentY < lastYRef.current) {
        setShowMobileBubble(true);
      }
      lastYRef.current = currentY;

      // Active Section Logic
      const sections = navItems.map(item => item.href.substring(1));
      let currentSection = 'home';
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 200) {
            currentSection = section;
          }
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="h-4 w-4" />;
    if (theme === 'dark') return <Moon className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  return (
    <>
      {/* ------------------ DESKTOP: TOP GLASS BAR ------------------ */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 hidden md:block transition-all duration-300 ${isScrolled
          ? 'bg-background/70 backdrop-blur-xl border-b border-border/40 py-2'
          : 'bg-transparent py-4'
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">

          {/* 1. Logo */}
          <div onClick={() => scrollToSection('#home')}>
            <LogoAnimated />
          </div>

          {/* 2. Center Nav Items (Magnetic + Gliding Pill) */}
          <div className="flex items-center gap-1 bg-background/50 backdrop-blur-sm border border-border/40 rounded-full px-2 py-1 shadow-sm">
            {navItems.map((item) => (
              <MagneticNavItem
                key={item.label}
                isActive={activeSection === item.href.substring(1)}
                onClick={() => scrollToSection(item.href)}
              >
                {item.label}
              </MagneticNavItem>
            ))}
          </div>

          {/* 3. Right Actions (Search + Theme) */}
          <div className="flex items-center gap-3">
            <button
              onClick={cycleTheme}
              className="rounded-full w-9 h-9 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            >
              {getThemeIcon()}
            </button>

            <button
              onClick={() => onOpenCommandPalette?.()}
              className="hidden lg:flex items-center gap-2 rounded-full h-9 px-3 border border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80 text-muted-foreground transition-colors"
            >
              <Command className="h-3.5 w-3.5" />
              <span className="text-xs">Search</span>
              <span className="ml-1 text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border">⌘K</span>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ------------------ MOBILE: FLOATING DYNAMIC ISLAND ------------------ */}
      <AnimatePresence>
        {showMobileBubble && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="fixed bottom-6 inset-x-0 z-50 md:hidden flex justify-center px-4"
          >
            <div className="flex items-center gap-1 p-1.5 bg-background/80 backdrop-blur-xl border border-white/10 dark:border-white/10 rounded-full shadow-2xl shadow-black/20 ring-1 ring-black/5 overflow-x-auto max-w-full">

              {navItems.map((item) => {
                const isActive = activeSection === item.href.substring(1);
                return (
                  <button
                    key={item.label}
                    onClick={() => scrollToSection(item.href)}
                    className={`relative p-3 rounded-full transition-all duration-300 flex-shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="mobile-pill"
                        className="absolute inset-0 bg-primary rounded-full -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <item.icon className="h-5 w-5" />
                  </button>
                );
              })}

              {/* Divider */}
              <div className="w-px h-6 bg-border mx-1 flex-shrink-0" />

              {/* Theme Toggle Mobile */}
              <button
                onClick={cycleTheme}
                className="p-3 rounded-full text-muted-foreground hover:bg-muted/50 transition-colors flex-shrink-0"
              >
                {getThemeIcon()}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Export wrapped component
const Navbar = (props: { onOpenCommandPalette?: () => void }) => (
  <ThemeProvider>
    <NavbarContent {...props} />
  </ThemeProvider>
);

export default Navbar;