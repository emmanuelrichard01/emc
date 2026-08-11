import React, { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

import { ThemeProvider } from "./components/ThemeProvider";
import { EasterEggProvider } from "./components/EasterEggProvider";
import { CommandPaletteProvider, useCommandPalette } from "./components/CommandPaletteProvider";
import { LOGO_PATHS } from "./components/ui/LogoMark";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/DynamicNavigation";
import Footer from "./components/Footer";
import CommandPalette from "./components/CommandPalette";
import { BootProvider, RouteReadyBeacon } from "./components/hero/BootOverlay";

// Lazy Load Pages for Performance
const loadIndex = () => import("./pages/Index");

const Index = lazy(loadIndex);
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));

/* Warm the home chunk while this module is still evaluating.

   Splitting the landing route out of the entry bundle buys nothing on the
   landing route itself: React does not reach the Suspense boundary — and so
   does not start the fetch — until the entry bundle has parsed and rendered,
   which puts a second round trip in series on the one page every visitor
   sees first. Kicking the import off here overlaps it with React mounting
   instead, so the chunk is usually in flight before the boot overlay has
   finished its first frame.

   Only on "/" — a direct link to a case study should not pay for the home
   page's 160KB it will never render. Navigating there *from* home is free
   either way, since the chunk is cached by then. */
if (typeof window !== "undefined" && window.location.pathname === "/") {
  void loadIndex();
}


/* Route-chunk loader.

   Deliberately minimal. The previous version printed "Mounting core
   modules... OK", "Establishing secure connection... OK" and similar — none
   of which described anything happening. What is actually happening is a
   JavaScript chunk downloading, and inventing a boot sequence around it is
   the same fabricated theatre we removed from the console telemetry. The
   hero already runs a real boot animation seconds later, so a second one
   here was redundant as well as untrue. */
const BootLoader = () => (
  <div
    className="h-[100svh] w-full flex items-center justify-center bg-background relative overflow-hidden"
    role="status"
    aria-label="Loading"
  >
    <div className="absolute inset-0 z-0 pointer-events-none noise-overlay" />

    <div className="relative z-10 flex flex-col items-center gap-7 w-full max-w-[180px] px-6">
      <div
        className="flex items-center justify-center w-12 h-12 border border-border bg-card/50 relative"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        <div className="absolute top-0 left-0 w-full h-[2px] bg-primary" />
        <svg viewBox="0 0 200 200" className="w-6 h-6 text-primary" aria-hidden="true">
          {LOGO_PATHS.map((d, i) => (
            <path key={i} d={d} fill="currentColor" />
          ))}
        </svg>
      </div>

      {/* Indeterminate by necessity: a dynamic import emits no progress
          events, so any percentage shown here would be made up. */}
      <div className="w-full h-px bg-border relative overflow-hidden">
        <motion.div
          className="absolute inset-y-0 w-1/3 bg-primary"
          animate={{ x: ['-120%', '320%'] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  </div>
);

/* Held back briefly so a fast load never sees it.

   A Suspense fallback renders the instant the boundary suspends. On a warm
   cache the chunk resolves in tens of milliseconds, which meant a full-screen
   takeover appeared and vanished before it could finish its own entrance
   animation — a flash that reads as a glitch. Below this threshold the
   transition is simply instant, which is the honest presentation of a load
   that fast. */
const FALLBACK_DELAY_MS = 250;

const DeferredBootLoader = () => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setVisible(true), FALLBACK_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  /* Before the threshold this held no space at all, which is not the same
     thing as showing nothing. <main> is the only flexible row in the layout,
     so an empty one collapses and pulls the footer up under the navbar —
     measured at y=287 on a 800px viewport, i.e. the colophon sitting in the
     middle of the screen for a quarter of a second on every cold load.

     Reserving the viewport keeps the footer below the fold, so a load fast
     enough to skip the loader shows the page background and nothing else. */
  return visible ? <BootLoader /> : <div className="h-[100svh]" aria-hidden="true" />;
};

/* Route transitions.

   Two details make this work, and the previous version had neither:

   1. AnimatePresence only animates when the *key* of its child changes.
      Wrapping an unkeyed <Suspense> meant it never saw a swap, so no exit
      animation could ever run — the whole wrapper was inert.
   2. <Routes> must be pinned to the captured `location`. Without that, the
      outgoing subtree re-matches against the new URL the instant navigation
      happens and renders the *incoming* page throughout its own exit — you
      get the new page fading out, then fading in again. */
const AnimatedRoutes = () => {
  const location = useLocation();
  const prefersReduced = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: prefersReduced ? 0 : 0.18, ease: "easeOut" }}
      >
        <Suspense fallback={<DeferredBootLoader />}>
          {/* Inside the boundary on purpose — see RouteReadyBeacon. This
              mounting *is* the signal that the route chunk has committed,
              which is what lets the boot overlay hold the screen until there
              is something behind it worth revealing. */}
          <RouteReadyBeacon />
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
};

// Layout Wrapper to handle persistent UI elements
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  // Open/close state and the Cmd+K binding both live in CommandPaletteProvider
  // so that any component — the hero hint, the nav badge — can open the
  // palette directly instead of faking a keystroke.
  const { isOpen, open, close } = useCommandPalette();

  return (
    <div className="relative flex min-h-screen flex-col bg-background font-sans antialiased selection:bg-primary/20 selection:text-primary">
      {/* Skip navigation — WCAG 2.4.1 Bypass Blocks */}
      <a href="#main-content" className="skip-nav">
        Skip to main content
      </a>

      <Navbar onOpenCommandPalette={open} />
      <CommandPalette isOpen={isOpen} onClose={close} />

      <main id="main-content" className="flex-1 relative" aria-label="Portfolio content">
        {children}
      </main>

      <Footer />
    </div>
  );
};

const App = () => (
    <HelmetProvider>
        <TooltipProvider delayDuration={0}>
          <ThemeProvider defaultTheme="amber">
          <EasterEggProvider>
          <ErrorBoundary showDetails={import.meta.env.DEV}>
            <Sonner position="top-center" />

            {/* Outermost of the app's own UI, so the cold open is part of the
                first commit rather than something a route chunk brings with
                it several hundred milliseconds later. */}
            <BootProvider>
              <BrowserRouter>
                <CommandPaletteProvider>
                  <MainLayout>
                    <AnimatedRoutes />
                  </MainLayout>
                </CommandPaletteProvider>
              </BrowserRouter>
            </BootProvider>
            <Analytics />
            <SpeedInsights />
          </ErrorBoundary>
          </EasterEggProvider>
          </ThemeProvider>
        </TooltipProvider>
    </HelmetProvider>
);

export default App;