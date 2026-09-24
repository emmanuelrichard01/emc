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
      for (const key of [
        "GEMINI_API_KEY",
        "GROQ_API_KEY",
        "GEMINI_MODEL",
        "GEMINI_FALLBACK_MODEL",
        "GROQ_MODEL",
        "UPSTASH_REDIS_REST_URL",
        "UPSTASH_REDIS_REST_TOKEN",
        "KV_REST_API_URL",
        "KV_REST_API_TOKEN",
        "ASK_ANSWER_CACHE",
      ]) {
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

          // Piped, not buffered: answers stream, and a dev server that
          // collected the whole body first would hide exactly the behaviour
          // being developed.
          if (!response.body) {
            res.end();
            return;
          }
          const reader = response.body.getReader();
          req.on("close", () => void reader.cancel());
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
          }
          res.end();
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
/**
 * Writes dist/projects/<id>/index.html with that project's own head tags.
 *
 * Every route was served the same index.html, and LinkedIn, X, Slack and
 * WhatsApp read only that file — none of them runs the bundle that would
 * have swapped the tags in. So a case study shared anywhere unfurled as the
 * homepage card, which is the one place a project page most needs to be
 * itself. The app is unchanged: the same shell, the same bundle, and
 * SEOHead still owns the tags once it renders. Vercel serves a real file
 * before applying the SPA rewrite, so these win for exactly these paths.
 */
function projectPagesPlugin(): Plugin {
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* Mirrors ProjectDetail's truncate(): search and unfurl snippets cut near
     155 characters, and a cut on a word boundary does not end mid-word. */
  const truncate = (text: string, max = 155) => {
    if (text.length <= max) return text;
    const clipped = text.slice(0, max);
    const lastSpace = clipped.lastIndexOf(" ");
    return `${clipped.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
  };

  const setMeta = (html: string, attr: "name" | "property", key: string, value: string) =>
    html.replace(
      // `\\s+`, not a space: index.html wraps the description tag onto a
      // second line, and a literal space silently left it unreplaced.
      new RegExp(`(<meta data-rh="true" ${attr}="${key}"\\s+content=")[^"]*(")`),
      (_m, open: string, close: string) => `${open}${escape(value)}${close}`,
    );

  const dropMeta = (html: string, key: string) =>
    html.replace(new RegExp(`\\s*<meta data-rh="true" property="${key}" content="[^"]*" />`), "");

  return {
    name: "project-pages",
    apply: "build",
    writeBundle(options) {
      const outDir = options.dir ?? path.resolve(__dirname, "dist");
      const shell = fs.readFileSync(path.join(outDir, "index.html"), "utf8");

      for (const project of PROJECTS) {
        const url = `${SITE_URL}/projects/${project.id}`;
        const headline = `${project.title} — ${project.subtitle}`;
        const title = `${headline} | Emmanuel Moghalu`;
        const description = truncate(project.caseStudy?.problem ?? project.description);
        const image = `${SITE_URL}${project.image ?? "/og-image.jpg"}`;

        let html = shell.replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`);
        html = setMeta(html, "name", "description", description);
        html = setMeta(html, "property", "og:type", "article");
        html = setMeta(html, "property", "og:url", url);
        html = setMeta(html, "property", "og:title", headline);
        html = setMeta(html, "property", "og:description", description);
        html = setMeta(html, "property", "og:image", image);
        html = setMeta(html, "property", "og:image:secure_url", image);
        html = setMeta(html, "property", "og:image:alt", headline);
        html = setMeta(html, "name", "twitter:url", url);
        html = setMeta(html, "name", "twitter:title", headline);
        html = setMeta(html, "name", "twitter:description", description);
        html = setMeta(html, "name", "twitter:image", image);
        html = html.replace(
          /(<link data-rh="true" rel="canonical" href=")[^"]*(")/,
          (_m, open: string, close: string) => `${open}${url}${close}`,
        );
        // The shell describes the site card: a 1200×630 JPEG. A project image
        // is neither, and a wrong declared size makes some unfurlers crop it.
        if (project.image) {
          html = setMeta(html, "property", "og:image:type", project.image.endsWith(".png") ? "image/png" : "image/jpeg");
          html = dropMeta(html, "og:image:width");
          html = dropMeta(html, "og:image:height");
        }

        const dir = path.join(outDir, "projects", project.id);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
      }
    },
  };
}

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
  plugins: [react(), devApiPlugin(mode), sitemapPlugin(), projectPagesPlugin(), screenshotPlugin()],
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
