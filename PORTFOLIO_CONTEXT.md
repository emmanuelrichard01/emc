# Portfolio Redesign Context (Agent Handoff Document)

## Overview
This document serves as the master context for Emmanuel Moghalu's portfolio redesign project. The ongoing goal is to transform a standard developer portfolio into a **premium, system-first engineering showcase** featuring high-end typography, minimalist interactions, and dense, frictionless information architecture.

## 🎨 Design Philosophy & Aesthetics
- **System Over Syntax:** The site should feel like a high-end SaaS tool or CLI dashboard, not a traditional webpage. It focuses heavily on engineering exactness over flashy, distracting animations.
- **Dark Glassmorphism:** Deep blacks (`bg-[#050505]`), subtle white/purple gradient spotlights, and translucent borders. We have purged all light-mode specific CSS variables and hardcoded paths to ensure a cohesive dark-mode aesthetic.
- **70/30 Hybrid Rule:** 70% editorial authority (dense, clean typography like Wired), 30% calm utility (subtle interactions, no layout shifts).
- **Typography:** `Inter` for standard sans text, `JetBrains Mono` for code, terminal outputs, and metrics.

## ✅ Completed Milestones (What has been coded)

### 1. Navigation & Command Palette (`DynamicNavigation.tsx`, `CommandPalette.tsx`)
- Implemented a performant, `requestAnimationFrame`-throttled auto-sizing navbar that intelligently hides on downward scroll (past 300px) and reappears instantly on upward scroll.
- Stripped bulky search bars for a sleek `⌘K` badge.
- Cleaned and flattened `CommandPalette` shortcuts to kill dead links and debug labels.

### 2. Hero Section (`Hero.tsx`)
- Optimized DOM weight by shifting to a 4-word `RotatingWord` component. 
- The words cycle (*Scale. Ship. Last. Matter.*) with an animated CSS text gradient.
- Solved clipping and alignment issues: a hidden text-sizer ensures the `absolute` child elements don't collapse the layout to 0px, and the trailing period animates flawlessly with the words.

### 3. About Section (`About.tsx`)
- Moved away from generic philosophies. Restructured into: **What I Build**, **Proof of Work**, **What I Use**.
- Converted arbitrary, padded stats ("4+ years") into credible, specific engineering metrics ("12M+ events/day", "99.9% uptime", "3 data platforms").
- Styled via a 3-column layout featuring multi-colored, smoothly animated horizontal gradient progress bars.

### 4. Projects / Case Studies (`Projects.tsx`)
- **The Audit:** We executed a ruthless audit, removing 4 placeholder/fabricated projects to ensure the portfolio commands 100% absolute credibility.
- **Current Project List (6 Real Projects, Top 5 Displayed):**
  1. *Logistics Watchtower* (Featured - IoT, Redpanda, Sub-200ms)
  2. *Modern Data Warehouse* (Featured - 1.5M records, DuckDB, dbt, Dagster)
  3. *Cloud Bill Hunter* (Event-Driven FinOps, Medallion ETL)
  4. *ULTRA-NEWS V2* (Django, Next.js, Postgres TSVector)
  5. *Crypto Data Pipeline* (ETL, Quality as Code)
  6. *CARITAS AI Scholar* (Full-Stack RAG) *Available if needed*
- **UI Changes:** Swapped a click-heavy tabbed interface for a direct, scrollable **inline narrative** (*Context* → *What I Built* → *Key Decisions*). Displayed at a tight `max-w-5xl` constraint for optimal reading width within a dark glass card.

### 5. Global Theme & Typography (`index.css`, `index.html`, `tailwind.config.ts`)
- Removed redundant render-blocking `@import` fonts to boost initial load performance.
- Reconfigured `tailwind.config.ts` so `font-sans` maps to `Inter` and `font-mono` maps strictly to `JetBrains Mono`.

## 🚀 Pending Architecture Refinements (The Next Phase)
If continuing the `Projects.tsx` overhaul (which is where the current session paused), the agreed-upon direction is to adopt the following structural UI upgrades:

1. **Asymmetric Grid Layout:** Break the repetitive vertical stack. Keep the top 2 *Featured* projects full-width but split into a dual-column layout (Text left, Visuals right). Place the remaining 3 standard projects side-by-side in a classic 2-column grid to condense space.
2. **Abstract CSS Architecture Diagrams:** Since there are limited screenshot assets, implement pure CSS/`lucide-react` animated data flow diagrams for the top 2 featured projects. (Example: `[Ingestion Node] ---> [Pipeline Processing] ---> [Dashboard]`).
3. **Metric Badges:** Add instant-impact numeric badges below the titles before the long text blocks. (e.g., `Scale: 1.5M Rows` | `Latency: <200ms`).

*End of Document*
