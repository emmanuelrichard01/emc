# E·MC — Engineering Portfolio

A performance-first, dark-mode portfolio built as a system interface rather than a traditional resume site. Every section is designed to demonstrate architectural judgment, not just list skills — the hero is a real command terminal, the footer reports real build metadata, and the project cards read like ops dashboards.

**[Live →](https://www.builtbyem.dev)**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 + Vite 7 |
| **Language** | TypeScript 5.9 (strict) |
| **Styling** | Tailwind CSS 3 + CSS custom properties (runtime accent theming — two public, one unlockable) |
| **Animation** | Framer Motion 12, plus hand-rolled `<canvas>` + `requestAnimationFrame` for the Hero circuit background |
| **Routing** | React Router 7 |
| **Icons** | Lucide React, react-icons (Simple Icons) |
| **SEO** | react-helmet-async + hand-authored JSON-LD structured data |
| **Analytics** | Vercel Analytics + Speed Insights |
| **Deployment** | Vercel (static build + one Edge Function) |

## Architecture

```
src/
├── pages/
│   ├── Index.tsx               # Route: "/" — composes all sections
│   ├── ProjectDetail.tsx       # Route: "/projects/:id" — full case study
│   └── NotFound.tsx
├── components/
│   ├── Hero.tsx                  # Composition only — copy, CTAs, socials
│   ├── hero/
│   │   ├── CircuitCanvas.tsx     # Source → hub → sink data path on <canvas>
│   │   ├── OpsConsole.tsx        # Terminal UI + async, cancellable execution
│   │   ├── useConsoleCommands.tsx # The command registry (single source)
│   │   └── useSystemTelemetry.ts # Measured FPS / uptime / heap
│   ├── About.tsx                 # Bento grid: competencies, metrics, tech stack
│   ├── Projects.tsx              # Tiered cards + tech filter + flagship spotlight
│   ├── Experience.tsx            # Career ledger with highlights + stack tags
│   ├── Contact.tsx               # Formspree contact form + honeypot spam guard
│   ├── Footer.tsx                # Systems-status footer — live clock, build metadata
│   ├── DynamicNavigation.tsx     # Auto-hiding navbar + mobile bottom island
│   ├── CommandPalette.tsx        # ⌘K / Ctrl+K keyboard-first navigation
│   ├── CommandPaletteProvider.tsx # Palette open state + the ⌘K binding
│   ├── SEOHead.tsx               # Per-page meta tags + OG/Twitter cards
│   ├── StructuredData.tsx        # JSON-LD (Person, ProfilePage, WebSite, FAQ, ItemList)
│   ├── ThemeProvider.tsx         # Runtime accent theme (context + hook)
│   ├── EasterEggProvider.tsx     # Clearance state, persisted (context + hook)
│   ├── ErrorBoundary.tsx
│   └── ui/                       # AnimatedCounter, CVDownloadButton, StructuralCard, LogoMark, XLogo, toast/tooltip primitives
├── hooks/
│   ├── useKonamiCode.ts          # Physical Konami-sequence key detector
│   └── useSectionObserver.ts     # Geometry-based active-section tracking
├── lib/
│   ├── utils.ts                  # `cn` class-merge helper
│   ├── scrollToSection.ts        # Shared smooth-scroll-with-offset helper
│   ├── platform.ts               # ⌘ vs Ctrl detection for shortcut hints
│   ├── project.ts                # Project status derived from its actual links
│   ├── circuitBus.ts             # One-way page → canvas signal channel
│   ├── portfolioQuery.ts         # SQL subset evaluated over the site's own data
│   └── portfolioQuestions.ts     # Curated prepared queries behind `ask`
├── data/
│   ├── projects.ts               # Typed project entries — single source of truth
│   ├── experience.ts             # Typed career ledger entries
│   └── sections.ts               # Single source for nav, mobile island, footer sitemap
├── types/index.ts                # Project / Experience / SEO schemas
└── index.css                     # Design system: CSS variables, animations, a11y utilities

api/
└── screenshot.ts                 # Vercel Edge Function — allowlisted screenshot proxy

scripts/
└── fetch-screenshots.mjs         # Local tool: refreshes public/images/*.png previews
```

### Data model

Projects and experience entries are typed structured data (`src/types/index.ts`), not inline HTML. This buys three things:

- **Structured SEO** — `StructuredData.tsx`'s `ItemList` schema is generated directly from `PROJECTS`, so it can never drift out of sync with what's actually rendered.
- **Consistency** — every project is forced to carry `metrics`, `decisions`, and `stack` fields; there's no way to ship a card missing its architecture rationale.
- **Portability** — trivial migration to a headless CMS later without touching any component.

## Key systems

### Hero — live ops console
A short scripted boot log that hands off to a **real command prompt** in under six seconds, skippable at any point. Commands live in one registry (`useConsoleCommands.tsx`) from which dispatch, `help`, `man`, aliases and tab completion are all derived — so a command can't end up runnable-but-undocumented.

The execution model is asynchronous and cancellable: a command may return a value, a promise, or stream output over time through an `emit` callback and an `AbortSignal`. `watch` streams live telemetry until you stop it; `ping` issues four real same-origin requests and reports each round trip. Ctrl+C aborts — and so does tapping the running indicator, since phones have no Ctrl key.

Other niceties: fish-style inline ghost completion (Tab or → to accept), Levenshtein typo suggestions, command history persisted across visits, and `ls` rows that are clickable rather than merely printed.

The status bar is **measured, not simulated** — real render FPS from a frame counter, uptime from `performance.timeOrigin`, JS heap where the browser exposes it. It shows `--` until the first genuine sample rather than seeding a plausible-looking number.

### Hero — the circuit background
A `<canvas>` data path rather than a particle field. Nodes carry roles — ingest **sources** on the left, routing **hubs** through the middle, **sinks** on the right — and streams are Manhattan-routed from a source to a sink, flaring as they cross hubs and being absorbed on arrival. Motion is directional and purposeful rather than random drift.

Implementation notes: the substrate (grid, routed traces, pads) is rasterised once to an offscreen canvas and blitted as a single `drawImage`; trails are `Float32Array` ring buffers; the head glow is a pre-rendered sprite rather than `shadowBlur`; the edge falloff is a CSS mask, not a per-frame composite. Nothing in the hot loop allocates. It self-tunes downward across three quality tiers, pauses off-screen and on hidden tabs, and is replaced by a static grid under `prefers-reduced-motion`.

It also listens to the page: running any terminal command fires a packet across the board, and a streaming command raises sustained throughput — routed through `circuitBus.ts`, a plain module rather than React context, because the canvas consumes these inside its animation frame and shouldn't re-render anything to receive them.

### The query layer
The site keeps its projects and roles in two tables, and you can read them.

`ask` — **available to everyone** — offers ten prepared questions (*"what's actually live right now?"*, *"what ships without Docker?"*). Each answer shows the question, the SQL that produced it, the result table, and a plain-language summary, so it reads for a non-technical visitor while remaining visibly derived rather than hardcoded.

`schema` and `sql` are the raw layer, unlocked by the easter egg. `portfolioQuery.ts` implements a deliberately bounded SQL subset — `SELECT` with `WHERE`/`AND`, `ORDER BY`, `LIMIT`, and `= != <> > < >= <= LIKE NOT LIKE IN NOT IN` — evaluated against the same arrays that render the page, so a result can never disagree with what you see. No `JOIN`, `GROUP BY`, `OR` or subqueries, and it says so rather than mis-evaluating them. A bare `SELECT` typed at the prompt is treated as a query; the `sql` prefix is optional.

### The easter egg
The Konami code (`↑ ↑ ↓ ↓ ← → ← → b a`), the `konami` command, or `__emc.unlock()` from DevTools grants clearance — persisted across visits, and revocable with `lock`. It unlocks the raw query layer plus a hidden **phosphor** accent theme that is deliberately absent from the visible toggle.

Gating the *raw* layer while leaving `ask` open is the deliberate split: a recruiter is never going to type a `SELECT`, but seeing real SQL run and produce a real answer is what makes discovering the query layer feel like a promotion rather than a novelty.

### Footer — systems status
Real data instead of filler: a live Abuja/Lagos (UTC+1) clock that only re-renders on the minute boundary, and a build-metadata line (`# a1b2c3d // deployed 4 minutes ago`) sourced from the actual deployed git commit SHA and build timestamp, injected at build time via Vite's `define` config.

### Projects — tiered systems
Four tiers — Flagship (full-width narrative), Production (half-width, with interface screenshots), System (compact grid), and Architecture Studies (dashed border, explicitly marked *design stage — not built*). A fixed flagship spotlight stays visible regardless of the active tech filter, and a terminal-styled status strip is revealed on hover **and** keyboard focus.

Project status is **derived** from the links each project actually has — `LIVE`, `SOURCE OPEN`, `PRIVATE BUILD`, `DESIGN STAGE` — rather than hand-written, so a card can't claim to be online while carrying neither a live URL nor a repository.

Case studies carry an optional `problem` / `approach` / `outcome` narrative with explicit trade-offs (what was chosen, what was rejected, and why) and, where relevant, a scope notice stating limits up front — synthetic demo data, single points of failure, deliberate scope cuts.

### Command Palette
`⌘K` / `Ctrl+K` opens keyboard-first navigation to any section, action (copy email, download CV), external link, or theme — plus the hidden easter-egg entry, surfaced only when searched for.

## Security

- **Strict CSP + security headers** (`vercel.json`) applied to every response: `Content-Security-Policy`, `X-Frame-Options: DENY`, `Strict-Transport-Security` (HSTS, preload), `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options: nosniff`.
- **No inline script, anywhere.** `script-src 'self'` with no `'unsafe-inline'` and no nonce. Fonts are self-hosted specifically so nothing needs an inline `onload` to apply them — the previous font loader used exactly that and was silently blocked in production, leaving every page rendering in system fallbacks.
- **No third-party origins in the CSP.** `style-src` and `font-src` are `'self'` only; the site loads no external stylesheet, font or script.
- **No secrets in the client bundle.** `SCREENSHOT_API_KEY` is read from `process.env` at *build* time by `vite.config.ts` and by `scripts/fetch-screenshots.mjs` — never hardcoded, never shipped to the browser, and no longer exposed by any runtime endpoint.
- **No public API surface.** The site is fully static. A `api/screenshot.ts` Edge Function previously proxied screenshot requests behind a host allowlist; it was removed because nothing called it, so it was an unauthenticated endpoint spending a metered quota for a feature already served by static assets.
- **Spam-guarded contact form** — honeypot field + timing check in `Contact.tsx`, no third-party CAPTCHA required.

## Performance & Accessibility

- **WCAG 2.2 AA** — all text meets 4.5:1 contrast on the `#050505` background.
- **Skip navigation** — keyboard users can bypass straight to main content.
- **Visible focus rings** on every interactive element.
- **`prefers-reduced-motion`** respected throughout — CSS animations inherit a global media-query rule automatically; the Hero canvas and terminal typing loop check it explicitly and fall back to static equivalents.
- **Safe areas** — respects `env(safe-area-inset-*)` for notched devices.
- **Semantic HTML** — `<section>`, `<nav>`, `<main>` landmarks with ARIA labels throughout.
- **Self-hosted fonts** — Inter and JetBrains Mono are vendored into `src/assets/fonts/` by `scripts/fetch-fonts.mjs`, so there is no cross-origin round trip before first paint and no external origin in the CSP. Each `@font-face` keeps its `unicode-range`, so a browser downloads only the subsets it renders (~80 KB for Latin text), and the files land in `/assets/` where they inherit the immutable cache header.
- **Manual chunk splitting** (`vite.config.ts`) — `vendor-react`, `vendor-motion`, `vendor-icons` isolated for better long-term caching.
- **Route-level code splitting** — pages are lazy-loaded behind a fallback that is itself **held back 250ms**, so a warm-cache navigation never flashes a loading screen it can't finish animating.
- **Generated sitemap** — `vite.config.ts` emits `sitemap.xml` at build time from the same `PROJECTS` array the site renders, so it cannot drift from what actually exists.
- **Real links** — nav, mobile island and footer items are anchors with `#section` hrefs, so middle-click, ⌘-click and "copy link address" all behave as expected.
- **Platform-correct shortcut hints** — the palette badge reads `⌘K` or `Ctrl+K` based on the actual platform rather than always claiming ⌘.

## Getting Started

```bash
# Clone
git clone https://github.com/emmanuelrichard01/emc.git
cd emc

# Install
npm install

# Dev server → http://localhost:8080
npm run dev

# Production build
npm run build
```

**Requirements:** Node.js 20+ (Vite 7 no longer supports Node 18).

## Environment Variables

Copy `.env.example` to `.env` and fill in your own value — never commit the real key.

| Variable | Purpose |
|----------|---------|
| `SCREENSHOT_API_KEY` | Read at **build** time. `vite.config.ts` recaptures every live project screenshot into `dist/images/`, so each deploy ships current previews; `scripts/fetch-screenshots.mjs` refreshes the committed fallbacks in `public/images/`. **Set this in the Vercel project's Environment Variables dashboard** — without it the build skips capture and serves the committed images instead, which degrades to slightly stale previews but never fails the build. |
| `VITE_FORMSPREE_ENDPOINT` *(optional)* | Overrides the contact form's submission target. Falls back to a hardcoded Formspree endpoint in `Contact.tsx` if unset. |

One other value is hardcoded intentionally rather than env-configured, since it changes rarely and benefits from being visible in source review:

| Value | Location | Purpose |
|-------|----------|---------|
| Canonical URL | `index.html`, `StructuredData.tsx` | Update if the custom domain changes |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run build:dev` | Development-mode build (unminified, for debugging build output) |
| `npm run lint` | ESLint across the repo |
| `npm run test` | Vitest suite (watch mode: `npm run test:watch`) |
| `npm run preview` | Serve the production build locally |
| `npm run update-screenshots` | Refresh the committed `public/images/*.png` fallbacks via the screenshot API |
| `npm run update-fonts` | Re-vendor Inter + JetBrains Mono into `src/assets/fonts/` and regenerate `src/fonts.css` |

## Deployment

Deployed on Vercel. `vercel.json` handles SPA rewrites (`/(.*) → /index.html`), the security headers listed above, immutable long-term caching for `/assets/*`, and a `Content-Disposition` header so the CV link downloads rather than opens inline. `vite.config.ts` inlines the deployed commit SHA (`VERCEL_GIT_COMMIT_SHA`, Vercel's unprefixed build-time env var) and build timestamp at build time so the footer can display real, non-decorative build metadata without exposing any server env var to the client at runtime.

---

## Project history

See [`CHANGELOG.md`](./CHANGELOG.md) for a detailed log of engineering passes and the reasoning behind major decisions (security hardening, the Hero terminal/circuit-canvas rebuild, the Projects tiering system, and the easter-egg-into-terminal merge).

---

© 2026 Emmanuel C. Moghalu — Engineered in Abuja, Nigeria.
