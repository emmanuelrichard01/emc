import React, { useState, useEffect, useRef, createContext, useContext, useMemo } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useScroll,
  useMotionValueEvent
} from 'framer-motion';
import {
  Home, User, Briefcase, Mail, Moon, Sun,
  Monitor, Command, FileText
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* 1. THEME ARCHITECTURE                                                      */
/* -------------------------------------------------------------------------- */

type Theme = 'light' | 'dark' | 'system';
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved) setTheme(saved);
  }, []);

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
    const listener = () => { if (theme === 'system') applyTheme(); };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}

/* -------------------------------------------------------------------------- */
/* 2. OPTIMIZED HOOKS                                                         */
/* -------------------------------------------------------------------------- */

// Performance Optimized Magnetic Hook
function useMagnetic(ref: React.RefObject<HTMLElement>) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth out the movement with a spring
  const smoothX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
  const smoothY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

  // Cache the bounding rect to avoid reflows on every mouse move
  const rectRef = useRef<DOMRect | null>(null);

  const handleMouseEnter = () => {
    if (ref.current) rectRef.current = ref.current.getBoundingClientRect();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!rectRef.current) return;
    const { clientX, clientY } = e;
    const { width, height, left, top } = rectRef.current;

    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);

    x.set(middleX * 0.15);
    y.set(middleY * 0.15);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    rectRef.current = null; // Clear cache
  };

  return { x: smoothX, y: smoothY, handleMouseMove, handleMouseLeave, handleMouseEnter };
}

// Intersection Observer for Active Section (High Performance)
function useActiveSection(sectionIds: string[]) {
  const [activeSection, setActiveSection] = useState<string>('home');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-40% 0px -40% 0px' } // Detect when section is in middle of viewport
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeSection;
}

/* -------------------------------------------------------------------------- */
/* 3. SUB-COMPONENTS                                                          */
/* -------------------------------------------------------------------------- */

const MagneticNavItem = ({ children, isActive, onClick, href }: any) => {
  const ref = useRef<HTMLButtonElement>(null);
  const { x, y, handleMouseMove, handleMouseLeave, handleMouseEnter } = useMagnetic(ref);

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x, y }}
      aria-label={`Maps to ${href}`}
      className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 z-10 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        }`}
    >
      {isActive && (
        <motion.div
          layoutId="nav-pill"
          className="absolute inset-0 bg-primary/10 rounded-full -z-10 shadow-[0_0_10px_-2px_rgba(var(--primary-rgb),0.2)]"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      {children}
    </motion.button>
  );
};

// --------------------------------------------------------------------------
// LOGO ANIMATED (Updated with user specific implementation)
// --------------------------------------------------------------------------
const LogoAnimated = () => {
  const paths = [
    "M154.2,43.5v69.4c0,1.4,1,2.5,2.4,2.5h34.1c1.4,0,2.5-1.1,2.5-2.5v-37.1c0-.7-.3-1.3-.7-1.8L120.2.8c-.5-.5-1.1-.7-1.8-.7H22.6c-1.4,0-2.5,1.1-2.5,2.5v33.1c0,1.4,1.1,2.5,2.5,2.5h65.4c0,.1,61,.2,61,.2,2.9,0,5.2,2.3,5.1,5.2h0Z",
    "M76,76.1c-.5.5-.8,1.1-.8,1.8v35.1c0,1.4,1.1,2.5,2.5,2.5h34.6c1.4,0,2.5-1.1,2.5-2.5V38.9c0-.2-.3-.4-.4-.2l-38.4,37.4h0Z",
    "M39.6,112.9V38.9c0-.2-.3-.4-.5-.2L.8,76.1c-.5.5-.8,1.1-.8,1.8v35.1c0,1.4,1.1,2.5,2.5,2.5h34.6c1.4,0,2.5-1.1,2.5-2.5h0Z"
  ];

  return (
    <div
      className="
        relative w-9 h-9 cursor-pointer
        text-foreground
        dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]
      "
      aria-label="Home Logo"
    >
      <motion.svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        whileHover={{ scale: 1.05, rotate: -2 }}
        whileTap={{ scale: 0.95 }}
      >
        <defs>
          {/* Enhancement-only glow */}
          <filter id="logo-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="3"
              floodColor="currentColor"
              floodOpacity="0.35"
            />
          </filter>
        </defs>

        <motion.g
          fill="currentColor"
          initial={{ fillOpacity: 0 }}
          animate={{ fillOpacity: [0, 0, 1, 1, 0, 0] }}
          transition={{
            duration: 8,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 1,
            times: [0, 0.3, 0.4, 0.7, 0.85, 1],
          }}
        >
          {paths.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#logo-glow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: [0, 1, 1, 1, 0, 0],
                opacity: [0, 1, 1, 1, 0, 0],
              }}
              transition={{
                duration: 8,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 1,
                times: [0, 0.3, 0.4, 0.7, 0.9, 1],
              }}
            />
          ))}
        </motion.g>
      </motion.svg>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 4. MAIN NAVBAR                                                             */
/* -------------------------------------------------------------------------- */

const NavbarContent = ({ onOpenCommandPalette }: { onOpenCommandPalette?: () => void }) => {
  const { theme, setTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Scroll Handling via Framer Motion (Optimized)
  const { scrollY } = useScroll();
  const lastYRef = useRef(0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const diff = latest - lastYRef.current;

    // Toggle glass effect
    if (latest > 50 && !isScrolled) setIsScrolled(true);
    if (latest <= 50 && isScrolled) setIsScrolled(false);

    // Toggle hide/show (Smart Island logic)
    if (Math.abs(diff) > 20) { // Threshold to prevent jitter
      setIsHidden(diff > 0 && latest > 200);
      lastYRef.current = latest;
    }
  });

  const navItems = useMemo(() => [
    { href: 'home', label: 'Home', icon: Home },
    { href: 'about', label: 'About', icon: User },
    { href: 'projects', label: 'Work', icon: Briefcase }, // Renamed to "Work" per 2026 standard
    { href: 'experience', label: 'Experience', icon: FileText },
    { href: 'contact', label: 'Contact', icon: Mail },
  ], []);

  const activeSection = useActiveSection(navItems.map(n => n.href));

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      // Offset for the fixed header
      const y = element.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const ThemeIcon = useMemo(() => {
    if (theme === 'light') return Sun;
    if (theme === 'dark') return Moon;
    return Monitor;
  }, [theme]);

  return (
    <>
      {/* --- DESKTOP --- */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 hidden md:block transition-all duration-500 ${isScrolled
          ? 'bg-background/70 backdrop-blur-2xl border-0 border-border/10 py-2 supports-[backdrop-filter]:bg-background/60 shadow-sm'
          : 'bg-transparent py-5'
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <div onClick={() => scrollToSection('home')}>
            <LogoAnimated />
          </div>

          <nav className="flex items-center gap-1 bg-background/50 backdrop-blur-xl border border-white/10 rounded-full px-2 py-1 shadow-sm ring-1 ring-black/5 dark:ring-white/5">
            {navItems.map((item) => (
              <MagneticNavItem
                key={item.label}
                href={item.href}
                isActive={activeSection === item.href}
                onClick={() => scrollToSection(item.href)}
              >
                {item.label}
              </MagneticNavItem>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={cycleTheme}
              aria-label="Toggle theme"
              className="rounded-full w-9 h-9 flex items-center justify-center text-muted-foreground hover:bg-accent/50 transition-colors"
            >
              <ThemeIcon className="h-4 w-4" />
            </button>

            <button
              onClick={onOpenCommandPalette}
              aria-label="Search"
              className="hidden lg:flex items-center gap-2 rounded-full h-9 px-3 border border-border/40 bg-background/40 hover:bg-background/60 text-muted-foreground transition-all duration-200 group"
            >
              <Command className="h-3.5 w-3.5 group-hover:text-primary transition-colors" />
              <span className="text-xs">Search</span>
              <kbd className="ml-1 text-[10px] bg-muted/50 px-1.5 py-0.5 rounded border border-border/50 font-sans">⌘K</kbd>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* --- MOBILE: DYNAMIC ISLAND --- */}
      <AnimatePresence>
        {!isHidden && (
          <motion.div
            initial={{ y: 150 }}
            animate={{ y: 0 }}
            exit={{ y: 150 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.8 }}
            className="fixed bottom-6 inset-x-0 z-50 md:hidden flex justify-center px-4 pointer-events-none"
          >
            <div className="pointer-events-auto flex items-center gap-1 p-1.5 bg-background/80 backdrop-blur-3xl border border-white/10 rounded-full shadow-2xl shadow-black/20 ring-1 ring-black/5">
              {navItems.map((item) => {
                const isActive = activeSection === item.href;
                return (
                  <button
                    key={item.label}
                    onClick={() => scrollToSection(item.href)}
                    aria-label={item.label}
                    className={`relative p-3 rounded-full transition-all duration-300 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="mobile-pill"
                        className="absolute inset-0 bg-primary rounded-full -z-10 shadow-lg shadow-primary/20"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                      />
                    )}
                    <item.icon className="h-5 w-5" />
                  </button>
                );
              })}

              <div className="w-px h-6 bg-border/50 mx-1" />

              <button
                onClick={cycleTheme}
                className="p-3 rounded-full text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <ThemeIcon className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default function Navbar(props: { onOpenCommandPalette?: () => void }) {
  return (
    <ThemeProvider>
      <NavbarContent {...props} />
    </ThemeProvider>
  );
}