import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Terminal, Activity } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();
  const [id] = useState(() => Math.random().toString(36).substring(2, 9));

  useEffect(() => {
    console.error(
      "[System Error] 404: Route resolution failed for path:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-background p-6 pt-20 font-mono selection:bg-red-500/20">
      <div className="max-w-xl w-full border border-neutral-200 dark:border-white/10 rounded-2xl bg-neutral-50/50 dark:bg-black/40 backdrop-blur-xl p-8 shadow-2xl relative overflow-hidden">

        {/* Decorative Noise */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-neutral-200 dark:border-white/5">
          <div className="w-3 h-3 rounded-full bg-red-500/80 animate-pulse" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-3 h-3" />
            Signal Lost
          </span>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2 tracking-tight">
              404
            </h1>
            <p className="text-muted-foreground text-sm uppercase tracking-wider">
              Resource Not Found
            </p>
          </motion.div>

          <div className="bg-neutral-900 rounded-lg p-4 text-xs text-neutral-400 overflow-x-auto border border-neutral-800">
            <code className="block mb-2 text-red-400">
              Error: Destination host unreachable
            </code>
            <code className="block mb-2">
              <span className="text-blue-400">GET</span> {location.pathname}
            </code>
            <code className="block opacity-50">
              at Router.resolve (apps/portfolio/routes.ts:404:12)<br />
              at Navigation.dispatch (kernel/events.ts:24:8)
            </code>
            <motion.div
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="mt-2 w-2 h-4 bg-primary"
            />
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-4">
            <Link
              to="/"
              className="group flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Return to Base
            </Link>

            <button
              onClick={() => window.location.reload()}
              className="group flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/5 text-sm font-medium transition-colors"
            >
              <Terminal className="w-4 h-4 text-muted-foreground" />
              Retry Connection
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 flex justify-between items-center text-[10px] text-muted-foreground border-t border-neutral-200 dark:border-white/5">
          <span>ID: {id}</span>
          <span>Sys_Err</span>
        </div>

      </div>
    </div>
  );
};

export default NotFound;