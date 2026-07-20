import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AnimatePresence, motion } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

// import { ThemeProvider } from "./components/ThemeProvider";
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
    { text: "Loading modules", delay: 0 },
    { text: "Initializing renderer", delay: 0.15 },
    { text: "System ready", delay: 0.3 },
  ];

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050505]">
      <div className="flex flex-col items-center gap-6">
        {/* Logo mark — draws in */}
        <motion.svg
          viewBox="0 0 200 200"
          className="w-8 h-8 text-white/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.path
            d="M154.2,43.5v69.4c0,1.4,1,2.5,2.4,2.5h34.1c1.4,0,2.5-1.1,2.5-2.5v-37.1c0-.7-.3-1.3-.7-1.8L120.2.8c-.5-.5-1.1-.7-1.8-.7H22.6c-1.4,0-2.5,1.1-2.5,2.5v33.1c0,1.4,1.1,2.5,2.5,2.5h65.4c0,.1,61,.2,61,.2,2.9,0,5.2,2.3,5.1,5.2h0Z"
            fill="currentColor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          />
          <motion.path
            d="M76,76.1c-.5.5-.8,1.1-.8,1.8v35.1c0,1.4,1.1,2.5,2.5,2.5h34.6c1.4,0,2.5-1.1,2.5-2.5V38.9c0-.2-.3-.4-.4-.2l-38.4,37.4h0Z"
            fill="currentColor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          />
          <motion.path
            d="M39.6,112.9V38.9c0-.2-.3-.4-.5-.2L.8,76.1c-.5.5-.8,1.1-.8,1.8v35.1c0,1.4,1.1,2.5,2.5,2.5h34.6c1.4,0,2.5-1.1,2.5-2.5h0Z"
            fill="currentColor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          />
        </motion.svg>

        {/* Boot sequence lines */}
        <div className="flex flex-col gap-2 min-w-[180px]">
          {bootLines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: line.delay, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2 text-[10px] font-mono"
            >
              <motion.span
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: line.delay + 0.4, duration: 0.2 }}
                className="text-emerald-500 text-[8px]"
              >
                ✓
              </motion.span>
              <span className="text-white/20">{line.text}</span>
            </motion.div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-32 h-px bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary/60 to-primary/20 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
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

      <main id="main-content" className="flex-1 relative" role="main" aria-label="Portfolio content">
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
          <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
            <Toaster />
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
        </TooltipProvider>
    </HelmetProvider>
);

export default App;