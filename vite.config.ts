import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "fs";
import path from "path";

import { PROJECTS } from "./src/data/projects";

const SITE_URL = "https://www.builtbyem.dev";

/**
 * Mounts api/ask.ts at /api/ask during `npm run dev`.
 *
 * Vercel runs that file as an Edge Function in preview and production, but
 * the Vite dev server knows nothing about it: every request fell through to
 * the SPA fallback and 404'd with an empty body, so the client's
 * `response.json()` threw and the terminal reported a flat "bad response".
 * The AI was not broken — it was unreachable, and only when developing
 * locally, which is the one place you would notice.
 *
 * The handler is a standard Fetch handler (Request in, Response out), so
 * bridging it to Node's req/res is mechanical. Loading it through
 * ssrLoadModule rather than a static import keeps HMR: editing the prompt or
 * the tool schema takes effect on the next request, with no server restart.
 *
 * Provider keys are read from .env into process.env for the dev server
 * process only. They are never passed through `define`, so nothing here can
 * leak a key into the client bundle — the reason this endpoint exists.
 */
function devApiPlugin(mode: string): Plugin {
  return {
    name: "dev-api",
    apply: "serve",
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), "");
      for (const key of ["GEMINI_API_KEY", "GROQ_API_KEY"]) {
        if (!process.env[key] && env[key]) process.env[key] = env[key];
      }

      server.middlewares.use("/api/ask", async (req, res) => {
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);

          const { default: handler } = await server.ssrLoadModule("/api/ask.ts");

          const response: Response = await handler(
            new Request(`http://localhost${req.url ?? "/"}`, {
              method: req.method,
              headers: req.headers as Record<string, string>,
              body: chunks.length ? Buffer.concat(chunks) : undefined,
            }),
          );

          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          // Answer in the shape the client parses, so a dev-server fault
          // surfaces as a readable message instead of another empty 404.
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              type: "error",
              error: `dev api: ${error instanceof Error ? error.message : String(error)}`,
            }),
          );
        }
      });
    },
  };
}

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

/**
 * Recaptures project screenshots into the build output.
 *
 * Runs only when SCREENSHOT_API_KEY is present, which on Vercel it is — so
 * every deploy ships current screenshots of the live sites, and a project
 * whose UI has moved on stops being represented by a stale image.
 *
 * Writes into dist/ rather than public/. Vite copies public/ into dist/
 * before writeBundle, so these land on top of the committed images without
 * touching the working tree, and the repo keeps a known-good fallback.
 *
 * Deliberately cannot fail the build: a screenshot service having a bad
 * afternoon must not block a deployment, so a failed capture logs and leaves
 * the committed image in place.
 */
function screenshotPlugin(): Plugin {
  return {
    name: "capture-screenshots",
    apply: "build",
    async writeBundle(options) {
      if (!process.env.SCREENSHOT_API_KEY) return;

      const { captureAll } = await import("./scripts/screenshots.mjs");
      const outDir = path.join(options.dir ?? path.resolve(__dirname, "dist"), "images");

      console.log("\ncapturing project screenshots...");
      const { ok, failed } = await captureAll(outDir, {
        log: { info: console.log, warn: console.warn },
      });
      console.log(`screenshots: ${ok} captured, ${failed} kept from repo\n`);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), devApiPlugin(mode), sitemapPlugin(), screenshotPlugin()],
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
