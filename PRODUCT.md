# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, weighted equally (confirmed 2026-10-03):

- **Hiring teams** — engineering managers, staff engineers and recruiters filling data or backend roles. They arrive from a CV, LinkedIn or a referral, skim in minutes, and need to know what Emmanuel builds, how he reasons, and how to reach him or download the CV.
- **Clients and founders** — people commissioning contract or freelance data/backend work. They need evidence of shipped systems, the kind of problems he takes on, and a low-friction way to start a conversation.

A third, smaller audience is engineers who read deeply: they open case studies, read trade-offs and field notes, and try the terminal and the query layer.

## Product Purpose

A personal engineering portfolio for Emmanuel C. Moghalu, data and backend engineer in Abuja, Nigeria (UTC+1). It exists to turn a visit into a conversation — a role, a project, or a collaboration — by showing shipped systems with the reasoning behind them, not a list of skills. Success is a visitor who leaves knowing what he does, having read at least one case study, and either writing to him or downloading the CV.

## Positioning

The site proves rather than claims: figures are derived from the site's own data (and the query layer shows the query), project status is derived from the links a project actually has, case studies name the rejected alternative and the debugging wrong turns, and scope limits are stated up front. A grounded assistant answers questions about the work and cites sources. The hero is a real command prompt, not a decorative terminal.

## Operating Context

- Live at https://www.builtbyem.dev, deployed on Vercel (static build plus one edge function, `/api/ask`).
- Routes: `/` (Hero → About → Work → Experience → Contact), `/projects/:id` case studies, 404.
- Doors onto one assistant session: hero terminal `ai` mode, the dock (⌘J or `/`), case-study panel, command palette (⌘K), footer prompt, text selection, `/?ask=` links.
- Contact goes through Formspree; CV is `public/Emmanuel_Moghalu_CV.pdf`.

## Capabilities and Constraints

- React 19, Vite 7, TypeScript strict, Tailwind 3, Framer Motion 12, React Router 7. Fonts self-hosted; strict CSP with `script-src 'self'`, no third-party origins for scripts, styles or fonts.
- Content is typed data: `src/data/projects.ts`, `src/data/experience.ts`, `src/data/principles.ts`, `src/data/sections.ts`. The sitemap, JSON-LD and the assistant's context are generated from the same arrays (`scripts/build-ai-context.mjs` runs on prebuild).
- Must keep: the terminal prompt as the hero (confirmed), the WebGL event-horizon background, the assistant, command palette, case-study pages, contact form behaviour, reduced-motion support, WCAG 2.2 AA contrast.
- Power-user features stay but are disclosed progressively, not shown by default (confirmed): SQL query layer and Konami unlock, phosphor theme, web-vitals footer, compare dock, stack matrix, reading trail, career timeline detail.

## Evidence on Hand

- 13 projects in `src/data/projects.ts`, 10 with full case studies (problem, approach, outcome, trade-offs, field notes, architecture blocks). Screenshots in `public/images/`.
- MMR Engine is a frozen v1.0.0 reference implementation (https://github.com/emmanuelrichard01/mmr-engine): 276 tests (23 against real PostgreSQL), mypy strict, 16 reversible migrations, synthetic data only, never run on live merchant data.
- 7 roles in `src/data/experience.ts` (2018 to 2026), principles with receipts in `src/data/principles.ts`, avatar `public/images/avatar.jpg` and `public/profile.webp`.
- No testimonials, client logos or press exist. Do not fabricate any.

## Product Principles

1. Prove, don't claim: every figure on the page is derived or attributable, and limits are stated.
2. Depth on demand: the default view is quiet and legible in minutes; depth is one deliberate action away.
3. Two doors, equal weight: "hire" and "work with me" are both first-class actions.
4. Real behaviour over decoration: anything that looks interactive is interactive.

## Accessibility & Inclusion

WCAG 2.2 AA: 4.5:1 text contrast, visible focus, skip link, keyboard paths for every feature, 44px touch targets on coarse pointers, `prefers-reduced-motion` honoured everywhere including the WebGL hero.
