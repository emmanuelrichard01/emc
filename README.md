# E·MC — Engineering Portfolio

A performance-first, dark-mode portfolio built as a system interface rather than a traditional resume site. Engineered to demonstrate architectural judgment, not just list skills.

**[Live →](https://www.builtbyem.dev)**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 + Vite |
| **Language** | TypeScript (strict) |
| **Styling** | Tailwind CSS + CSS custom properties |
| **Animation** | Framer Motion |
| **Icons** | Lucide React |
| **SEO** | react-helmet-async + JSON-LD structured data |
| **Deployment** | Vercel (CI/CD) |

## Architecture

```
src/
├── pages/           # Route-level components (Index, NotFound)
├── components/      # Feature components
│   ├── Hero.tsx          # Animated terminal + rotating headline
│   ├── About.tsx         # Bento grid: deliverables, metrics, tech stack
│   ├── Projects.tsx      # 3-tier project cards (flagship → production → system)
│   ├── Experience.tsx    # Career timeline with highlights + stack tags
│   ├── Contact.tsx       # Formspree contact form + social links
│   ├── DynamicNavigation.tsx  # Auto-hiding navbar + mobile bottom island
│   ├── CommandPalette.tsx     # ⌘K keyboard-first navigation
│   ├── SEOHead.tsx            # Dynamic meta tags + OG/Twitter cards
│   ├── StructuredData.tsx     # JSON-LD (Person, FAQ, ProfilePage, ItemList)
│   ├── Footer.tsx
│   ├── EasterEgg.tsx          # Konami code terminal sequence
│   ├── ErrorBoundary.tsx
│   └── ThemeProvider.tsx
├── hooks/           # Custom React hooks
│   ├── useKonamiCode.ts       # Konami code detection
│   └── useSectionObserver.ts  # Intersection-based active section tracking
├── types/           # TypeScript type definitions
├── lib/             # Utilities (cn helper)
└── index.css        # Design system: CSS variables, animations, a11y utilities
```

### Data Model

Projects and experience entries are typed as structured data entities — not inline HTML. This enables:

- **Structured SEO** — auto-generated JSON-LD schemas (Person, FAQ, ItemList)
- **Consistency** — every project enforces `metrics`, `decisions`, and `stack` fields
- **Portability** — trivial migration to a headless CMS

## Features

| Feature | Details |
|---------|---------|
| **Command Palette** | `⌘K` / `Ctrl+K` — keyboard navigation to any section, action, or link |
| **Terminal Hero** | Simulated terminal with typing animation, replacing the traditional hero image |
| **Scroll-Linked Text** | About section uses scrub-to-reveal opacity tied to scroll position |
| **3-Tier Projects** | Flagship (full-width narrative) → Production (half-width) → System (compact grid) |
| **Easter Egg** | Konami code (↑↑↓↓←→←→BA) unlocks a terminal boot sequence with random facts |
| **Search Everywhere SEO** | robots.txt, sitemap.xml, FAQ schema, Speakable markup, AI crawler directives |

## Performance & Accessibility

- **WCAG 2.2 AA** — all text meets 4.5:1 contrast ratio on `#050505` background
- **Skip navigation** — keyboard users can bypass to main content
- **Focus indicators** — visible 2px purple ring on all interactive elements
- **Reduced motion** — all animations respect `prefers-reduced-motion`
- **Safe areas** — respects `env(safe-area-inset-*)` for notched devices
- **Semantic HTML** — proper `<section>`, `<nav>`, `<main>` landmarks with ARIA labels

## Getting Started

```bash
# Clone
git clone https://github.com/emmanuelrichard01/emc.git
cd emc

# Install
npm install

# Dev server (localhost:8080)
npm run dev

# Production build
npm run build
```

**Requirements:** Node.js 18+

## Project Structure

```
public/
├── og-image.jpg           # Social share preview (1200×630)
├── robots.txt             # Crawler directives (incl. AI bots)
├── sitemap.xml            # Static sitemap with section anchors
├── site.webmanifest       # PWA manifest
└── favicon-96x96.png      # Favicons + touch icons

dist/                      # Production build output (gitignored)
```

## Environment

| Variable | Purpose |
|----------|---------|
| Formspree endpoint | Hardcoded in `Contact.tsx` — update the form action URL |
| Canonical URL | Set in `index.html` and `StructuredData.tsx` — update for custom domain |

---

© 2026 Emmanuel C. Moghalu — Engineered in Abuja, Nigeria.
