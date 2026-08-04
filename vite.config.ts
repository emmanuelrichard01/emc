import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "fs";
import path from "path";

import { PROJECTS } from "./src/data/projects";

const SITE_URL = "https://www.builtbyem.dev";

/**
 * Emits sitemap.xml from the same PROJECTS array the site renders.
 *
 * The sitemap used to be a hand-maintained file in public/, and it had
 * already drifted: global-rate-limiter and both architecture studies were
 * missing, so three real pages were invisible to crawlers. Generating it from
 * the data source means adding a project is the only step required.
 */
function sitemapPlugin(): Plugin {
  return {
    name: "generate-sitemap",
    apply: "build",
    writeBundle(options) {
      const lastmod = new Date().toISOString().slice(0, 10);

      const entry = (loc: string, priority: string) =>
        [
          "  <url>",
          `    <loc>${loc}</loc>`,
          `    <lastmod>${lastmod}</lastmod>`,
          "    <changefreq>monthly</changefreq>",
          `    <priority>${priority}</priority>`,
          "  </url>",
        ].join("\n");

      // Flagship case studies are the deepest content on the site, so they
      // outrank the prototypes; design studies rank lowest since they
      // describe work that has not been built.
      const priorityFor = (tier: string) =>
        tier === "flagship" ? "0.8" : tier === "production" ? "0.7" : tier === "system" ? "0.6" : "0.5";

      const urls = [
        entry(`${SITE_URL}/`, "1.0"),
        entry(`${SITE_URL}/#about`, "0.8"),
        entry(`${SITE_URL}/#projects`, "0.9"),
        entry(`${SITE_URL}/#experience`, "0.8"),
        entry(`${SITE_URL}/#contact`, "0.7"),
        ...PROJECTS.map((project) =>
          entry(`${SITE_URL}/projects/${project.id}`, priorityFor(project.tier))
        ),
      ];

      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls,
        "</urlset>",
        "",
      ].join("\n");

      const outDir = options.dir ?? path.resolve(__dirname, "dist");
      fs.writeFileSync(path.join(outDir, "sitemap.xml"), xml, "utf8");
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), sitemapPlugin()],
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
