import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Vercel sets VERCEL_GIT_COMMIT_SHA as an unprefixed build-time env var,
    // which Vite's client bundle can't see directly (only VITE_-prefixed
    // vars are exposed). Inlining it here at build time lets the footer show
    // the real deployed commit without shipping any server env var to the
    // client at runtime. Falls back to 'dev' for local builds outside Vercel.
    __COMMIT_SHA__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-motion": ["framer-motion"],
          "vendor-icons": ["lucide-react", "react-icons"],
        },
      },
    },
  },
}));
