import React, { useState, useRef, useMemo } from 'react';
import {
  motion,
  useScroll,
  useMotionValueEvent,
} from 'framer-motion';
import {
  Home, User, Briefcase, Mail, FileText, Command,
} from 'lucide-react';
import { useSectionObserver } from '../hooks/useSectionObserver';

/* -------------------------------------------------------------------------- */
/* LOGO (draw-once, then static)                                              */
/* -------------------------------------------------------------------------- */

const LogoAnimated = () => {
  const hasDrawn = useRef(false);
  const [drawn, setDrawn] = useState(false);

  const paths = [
    "M154.2,43.5v69.4c0,1.4,1,2.5,2.4,2.5h34.1c1.4,0,2.5-1.1,2.5-2.5v-37.1c0-.7-.3-1.3-.7-1.8L120.2.8c-.5-.5-1.1-.7-1.8-.7H22.6c-1.4,0-2.5,1.1-2.5,2.5v33.1c0,1.4,1.1,2.5,2.5,2.5h65.4c0,.1,61,.2,61,.2,2.9,0,5.2,2.3,5.1,5.2h0Z",
    "M76,76.1c-.5.5-.8,1.1-.8,1.8v35.1c0,1.4,1.1,2.5,2.5,2.5h34.6c1.4,0,2.5-1.1,2.5-2.5V38.9c0-.2-.3-.4-.4-.2l-38.4,37.4h0Z",
    "M39.6,112.9V38.9c0-.2-.3-.4-.5-.2L.8,76.1c-.5.5-.8,1.1-.8,1.8v35.1c0,1.4,1.1,2.5,2.5,2.5h34.6c1.4,0,2.5-1.1,2.5-2.5h0Z",
  ];

  // After the first draw completes, lock to static
  React.useEffect(() => {
    if (!hasDrawn.current) {
      hasDrawn.current = true;
      const timer = setTimeout(() => setDrawn(true), 1200); // matches draw duration
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="relative w-7 h-7 cursor-pointer text-white/90" role="img" aria-label="E·MC Logo — Go to home">
      <motion.svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.g
          fill="currentColor"
          initial={{ fillOpacity: drawn ? 1 : 0 }}
          animate={{ fillOpacity: 1 }}
          transition={{ duration: 0.5, delay: drawn ? 0 : 1.0 }}
        >
          {paths.map((d, i) => (
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
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* NAV ITEM (single hover treatment — no extra div)                           */
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
    className={`relative px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-300 ${
      isActive
        ? 'text-white'
        : 'text-white/60 hover:text-white/90 hover:bg-white/[0.04]'
    }`}
  >
    {isActive && (
      <motion.div
        layoutId="nav-pill"
        className="absolute inset-0 rounded-full -z-10 bg-white/[0.08] border border-white/[0.08]"
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
    )}
    <span className="relative z-10">{children}</span>
  </button>
);

/* -------------------------------------------------------------------------- */
/* MAIN NAVBAR                                                                */
/* -------------------------------------------------------------------------- */

const NavbarContent = ({ onOpenCommandPalette }: { onOpenCommandPalette?: () => void }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const { scrollY } = useScroll();
  const lastScrollY = useRef(0);

  // Scroll direction detection + background toggle
  useMotionValueEvent(scrollY, "change", (latest) => {
    const direction = latest > lastScrollY.current ? 'down' : 'up';
    lastScrollY.current = latest;

    // Background: darken after 100px
    if (latest > 100 && !isScrolled) setIsScrolled(true);
    if (latest <= 100 && isScrolled) setIsScrolled(false);

    // Hide/show: hide when scrolling down past 300px, show when up
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
    { href: 'experience', label: 'Experience', icon: FileText },
    { href: 'contact', label: 'Contact', icon: Mail },
  ], []);

  const activeSection = useSectionObserver();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* --- DESKTOP NAV (Auto-sized floating pill, hides on scroll down) --- */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{
          y: isHidden ? -100 : 0,
          opacity: isHidden ? 0 : 1,
        }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-5 left-0 right-0 mx-auto z-50 hidden md:flex justify-center px-4"
        aria-label="Main navigation"
      >
        <div
          className={`flex items-center gap-1 px-2.5 py-2 rounded-[2rem] border border-white/[0.08] backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden transition-colors duration-500 ${
            isScrolled ? 'bg-[#050505]/60' : 'bg-white/[0.01]'
          }`}
        >
          {/* Inner top glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent pointer-events-none" />

          {/* Logo */}
          <div
            className="flex items-center px-2 cursor-pointer relative z-10"
            onClick={() => scrollToSection('home')}
          >
            <LogoAnimated />
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-white/[0.06] mx-1" />

          {/* Nav Links */}
          <div className="flex items-center gap-0.5 relative z-10">
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

          {/* Divider */}
          <div className="w-px h-4 bg-white/[0.06] mx-1" />

          {/* ⌘K badge — minimal */}
          <button
            onClick={onOpenCommandPalette}
            aria-label="Open command palette"
            className="flex items-center gap-1 rounded-lg px-2 py-1 bg-white/[0.03] border border-white/[0.04] text-white/55 hover:text-white/80 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300 relative z-10"
          >
            <Command className="h-3 w-3" />
            <kbd className="text-[9px] font-mono tracking-wide">K</kbd>
          </button>
        </div>
      </motion.nav>

      {/* --- MOBILE: Bottom Island --- */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 28, mass: 0.8, delay: 0.2 }}
        className="fixed inset-x-0 z-50 md:hidden flex justify-center px-4 pointer-events-none"
        style={{ bottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}
      >
        <div className="pointer-events-auto flex items-center gap-0.5 p-1.5 rounded-2xl bg-black/70 border border-white/[0.08] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]" role="navigation" aria-label="Mobile navigation">
          {navItems.map((item) => {
            const isActive = activeSection === item.href;
            return (
              <motion.button
                key={item.label}
                onClick={() => scrollToSection(item.href)}
                aria-label={item.label}
                whileTap={{ scale: 0.85 }}
                className={`relative p-2.5 rounded-xl transition-all duration-300 ${
                  isActive ? 'text-white' : 'text-white/55 hover:text-white/70'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-pill"
                    className="absolute inset-0 bg-white/[0.08] border border-white/[0.06] rounded-xl -z-10"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <item.icon className="h-[18px] w-[18px]" />
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </>
  );
};

export default function Navbar(props: { onOpenCommandPalette?: () => void }) {
  return <NavbarContent {...props} />;
}