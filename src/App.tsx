import React, { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AnimatePresence, motion } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

import { ThemeProvider } from "./components/ThemeProvider";
import { LOGO_PATHS } from "./components/ui/LogoMark";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/DynamicNavigation";
import Footer from "./components/Footer";
import CommandPalette from "./components/CommandPalette";

// Lazy Load Pages for Performance
const Index = lazy(() => import("./pages/Index"));
// const ProjectsArchive = lazy(() => import("./pages/ProjectsArchive"));
// const Blog = lazy(() => import("./pages/Blog"));
// const BlogPost = lazy(() => import("./pages/BlogPost"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));


// Bootloader for route code-splitting — sequenced boot screen
const BootLoader = () => {
  const bootLines = [
    { text: "Mounting core modules...", delay: 0 },
    { text: "Establishing secure connection...", delay: 0.15 },
    { text: "Resolving dependencies...", delay: 0.3 },
  ];

  return (
    <div className="h-[100svh] w-full flex flex-col items-center justify-center bg-background relative overflow-hidden font-mono selection:bg-primary/20">
      {/* Background grid overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none noise-overlay" />
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-[280px]">
        {/* Logo mark */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center w-12 h-12 border border-border bg-card/50 relative"
          style={{ boxShadow: 'var(--shadow-md), var(--shadow-glow)' }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-primary" />
          
          <svg viewBox="0 0 200 200" className="w-6 h-6 text-primary">
            {LOGO_PATHS.map((d, i) => (
              <motion.path
                key={i}
                d={d}
                fill="currentColor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.1 }}
              />
            ))}
          </svg>
        </motion.div>

        {/* Boot sequence lines */}
        <div className="flex flex-col gap-2.5 w-full">
          {bootLines.map((line, i) => (
            <div key={i} className="flex items-center justify-between text-[10px] uppercase tracking-widest w-full">
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: line.delay, duration: 0.2 }}
                className="text-muted-foreground"
              >
                {line.text}
              </motion.span>
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: line.delay + 0.25, duration: 0.2 }}
                className="text-primary font-bold"
              >
                OK
              </motion.span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full h-px bg-border mt-2 relative overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        
        <div className="flex items-center justify-between w-full mt-[-16px]">
          <span className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.2em]">SYS.BOOT</span>
          <div className="flex gap-1 items-center">
            <motion.div 
              animate={{ opacity: [1, 0.4, 1] }} 
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-1.5 h-1.5 bg-primary"
            />
            <span className="text-[9px] text-primary uppercase tracking-[0.2em]">LIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Layout Wrapper to handle persistent UI elements
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const [isCmdOpen, setIsCmdOpen] = React.useState(false);
  const location = useLocation();

  // Handle Command Palette Shortcut (Cmd+K)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCmdOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col bg-background font-sans antialiased selection:bg-primary/20 selection:text-primary">
      {/* Skip navigation — WCAG 2.4.1 Bypass Blocks */}
      <a href="#main-content" className="skip-nav">
        Skip to main content
      </a>

      <Navbar onOpenCommandPalette={() => setIsCmdOpen(true)} />
      <CommandPalette isOpen={isCmdOpen} onClose={() => setIsCmdOpen(false)} />

      <main id="main-content" className="flex-1 relative" aria-label="Portfolio content">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

const App = () => (
    <HelmetProvider>
        <TooltipProvider delayDuration={0}>
          <ThemeProvider defaultTheme="amber">
          <ErrorBoundary showDetails={import.meta.env.DEV}>
            <Sonner position="top-center" />

            <BrowserRouter>
              <MainLayout>
                <Suspense fallback={<BootLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    {/* <Route path="/work" element={<ProjectsArchive />} />
                    <Route path="/projects" element={<ProjectsArchive />} /> Redirect/Alias */}
                    {/* <Route path="/blog" element={<Blog />} /> */}
                    {/* <Route path="/blog/:slug" element={<BlogPost />} /> */}
                    <Route path="/projects/:id" element={<ProjectDetail />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </MainLayout>
            </BrowserRouter>
            <Analytics />
            <SpeedInsights />
          </ErrorBoundary>
          </ThemeProvider>
        </TooltipProvider>
    </HelmetProvider>
);

export default App;