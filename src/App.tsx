import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AnimatePresence, motion } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";

// Components with relative paths to avoid alias resolution issues
import { ThemeProvider } from "./components/ThemeProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/DynamicNavigation";
import Footer from "./components/Footer";
import CommandPalette from "./components/CommandPalette";

// Lazy Load Pages for Performance
const Index = lazy(() => import("./pages/Index"));
// const ProjectsArchive = lazy(() => import("./pages/ProjectsArchive"));
// const Blog = lazy(() => import("./pages/Blog"));
// const BlogPost = lazy(() => import("./pages/BlogPost"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Bootloader for route code-splitting
const BootLoader = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050505]">
    <div className="flex flex-col items-center gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-5 h-5 border-2 border-white/10 border-t-purple-500 rounded-full"
      />
      <div className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest flex items-center gap-2">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-500 opacity-50" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500" />
        </span>
        Initializing system...
      </div>
    </div>
  </div>
);

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
      <Navbar onOpenCommandPalette={() => setIsCmdOpen(true)} />
      <CommandPalette isOpen={isCmdOpen} onClose={() => setIsCmdOpen(false)} />

      <main className="flex-1 relative">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <ThemeProvider>
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
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </MainLayout>
            </BrowserRouter>
            <Analytics />
          </ErrorBoundary>
        </TooltipProvider>
      </ThemeProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;