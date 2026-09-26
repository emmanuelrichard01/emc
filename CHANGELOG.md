# Changelog

Notable changes to this project, and the reasoning behind them. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); entries are
grouped by engineering pass rather than strict SemVer releases, since this is
a personal portfolio site, not a versioned package.

## [Unreleased] — The Work section as a catalogue; case studies for skimmers and readers

### Added — Work
- **Flagship stage.** All four flagships in a keyboard-navigable tablist
  (roving focus, arrow keys, hover-intent on desktop — chosen, never
  auto-rotated) beside a wide stage: art, figures, how much the write-up
  documents (trade-offs, field notes, highlights), stack, and two ways in —
  read it or ask about it.
- **Spec sheets** (`projects/ProjectArt.tsx`). The eight projects with no
  front end to screenshot get their own measured figures over the drafting
  grid instead of a blank. Nothing on one is not in the data.
- **One-line toolbar** replacing ~25 chips: search, a stack popover (with
  usage bars), tier / sort / view as segmented controls with sliding
  indicators, and removable filter tokens.
- **Search into the case studies** (`projects/workModel.ts`): every word
  must match somewhere; a row found by its prose shows the field and a
  snippet with the words marked ("trade-offs: …Redpanda over Kafka…").
- **Sort by depth** — trade-offs, field notes and highlights documented.
- **Stack matrix view**: projects × technologies as a real `<table>`,
  crosshair hover, click a column to filter.
- **Compare**: tick up to three anywhere; a tray gathers them; a sheet sets
  them side by side with shared stack lit, and hands the comparison to the
  assistant (`compare_projects`).
- **Filter state in the URL** (`?q=&tier=&stack=&sort=&view=`), written with
  replaceState so filtering adds no history entries; unknown values dropped.
- Cursor-following preview on index rows (desktop), pointer light on cards,
  a depth column, and a totals ledger in the header.

### Added — case studies
- **Hero** with an at-a-glance ledger (status, tier, year, every figure,
  reading time) and art for every project; actions in one row: live,
  source, ask, copy link.
- **In 30 seconds** — problem, approach and outcome cut to their leads
  (`case/caseModel.leadOf`: extracted, never rewritten; a scene-setting
  first sentence takes the next one with it).
- **Reading progress**, a contents rail whose entries fill as each section
  is read with an estimate of the time left, and a sticky contents bar on
  phones.
- Section headings that copy a link to themselves; arriving on
  `/projects/x#tradeoffs` scrolls there.
- **Ask why** on every trade-off; highlights as a numbered two-column
  ledger; field notes folded to their symptoms (first one open).
- **Footer:** related projects by shared stack — weighted to rare
  technologies, never linking built work to design studies, saying what is
  shared — and previous / next with art; `[` and `]` step between them.

### Changed — screenshots
- **Captured by a scheduled workflow, reviewed as a pull request**
  (`.github/workflows/screenshots.yml`, weekly and on demand). Build-time
  capture refreshed images only when the portfolio itself deployed, shipped
  whatever the live site showed at that moment unreviewed, never updated
  `public/images/`, and spent quota on every preview. The build capture is now
  a production-only fallback (`SCREENSHOT_AT_BUILD=off` disables it).
- `fetch-screenshots.mjs` writes a run summary, tolerates a partial failure in
  CI (`SCREENSHOTS_ALLOW_PARTIAL=1`), and sets `exitCode` rather than calling
  `exit()`, which tripped a libuv assertion on Windows.

### Removed
- The module rail (left-edge section trace) — at the owner's request.
- `CaseStudyNav` and the old `FieldNotes`, superseded above.

## [Unreleased] — One assistant, many doors; modules that hand off

### Added
- **The assistant everywhere** (`components/ai/`). The session moved above the
  routes (`AskProvider`), and everything that can ask is a door onto the same
  conversation: a dock (⌘J / Ctrl+J, `/`, the nav, the mobile island), the
  hero terminal, the case-study panel, the palette, the footer, a text
  selection, and a link. A question asked in the terminal is still there on a
  case study three pages later, and survives a reload (sessionStorage).
- **The dock.** Non-modal side panel on desktop, so the page stays readable
  and clickable beside it; a bottom sheet on phones, dragged down by its
  handle to dismiss. It says what it is reading ("reading · Vega Studio").
  Lazy-loaded on first open.
- **Audience lens** — general / hiring / engineer. Sent as `context.audience`
  and appended to the system prompt as one line; the grounding rules and the
  audit are identical under every lens, and each lens is cached separately.
  An unknown lens is no lens, not a refusal.
- **Ask about a selection.** Highlight a passage in the page and a chip offers
  to ask about it; the quote travels inside the question, trimmed under the cap.
- **Question permalinks** — `/?ask=…` opens the dock and asks, then removes
  the parameter. The dock copies one for the last question.
- **Voice input** through the browser's own speech recognition, hidden where
  unsupported. `Permissions-Policy` now allows `microphone=(self)`; with
  `microphone=()` it fails instantly as "not-allowed" (Ultra News found this
  first). Recognition errors are explained.
- **Suggestion marquee.** Starter questions in the terminal, the footer and the
  case-study panel run as one slow, edge-faded ticker instead of a wall of
  chips: transform-only CSS, paused on hover and focus, the duplicate copy
  hidden from assistive tech, and a static wrapped row under reduced motion.
- **Command palette:** every case study by name, stack or category, with its
  status; fuzzy ranking (`lib/fuzzy.ts`); and "Ask: …" for anything typed —
  leading when it reads as a question, trailing when it reads as a place.
- **Section seams** — the join between modules drawn as a trace, scroll-linked
  with a lit head, labelled with the module it enters.
- **Nav:** an Ask control; the active-section underline is now a meter of
  progress through that section, driven by a motion value, not state.
- **Footer:** a last prompt ("still have a question?") and a shortcut legend.
- Tests: `fuzzy`, `aiStarters` (lenses, starters, selection quoting,
  permalinks), and three endpoint tests for the lens.

### Changed
- **Ultra News updated to the current repo:** 180 tests; the Briefing and Ask
  the Wire Room in the write-up; topics decided by one vote per publisher (the
  old 98% coverage claim removed — the repo now records 28% of live stories
  untagged under semantic similarity alone); an architecture diagram; and three
  field notes from the commits and the incident report — the Neon storage
  outage, the stream that arrived all at once, and the 400 health check that
  passed.
- The shell reads the project list through `data/useProjects.ts` (one
  dynamic import), and the keyless extractive answerer is loaded only on that
  path. A static import had put the dataset and the SQL engine on the critical
  path: +34 KB gzipped, measured. Net cost of everything above: +6 KB.

### Fixed
- **Palette navigation was dead on case studies.** It called scrollToSection
  unconditionally, which returns false when the section is not on the page —
  every Navigate entry did nothing and the palette stayed open.
- **Footer sitemap links were dead on case studies** — the same bare-fragment
  preventDefault the navbar was fixed for, left behind in the footer.

## [Unreleased] — Answers that audit themselves; case studies that show

### Added
- **Grounding check on every answer** (`lib/aiGrounding.ts`). Each figure in a
  finished answer must appear in the evidence the model was given; any that
  does not is returned as `unverified`, marked in place in the transcript and
  explained under it. Unverified answers are never cached.
- **Two tools.** `search_site` — ranked full-text search over every summary,
  write-up, highlight, trade-off, field note and role, with word-start matching
  and plural folding. `compare_projects` — the same facts for 2–5 projects as
  one table. `get_project` now carries field notes; tool results reach the
  model at up to 10k characters (was 3.8k, which cut the trade-offs off the
  largest case studies).
- **Ask AI on every case study**, told which project is on screen: its full
  detail is in the prompt from round one, and the starters are about it.
- **Degraded answers.** When no model answers, the site's own search answers
  instead — labelled, with the reason (quota spent, overloaded, unreachable)
  and a retry — rather than "the answering service is unavailable".
- **Model health.** A model that fails with 429/5xx or times out goes to the
  back of the chain for 60s, so an outage is paid for once, not per question.
- **Shared limits and answer cache** when `UPSTASH_REDIS_REST_*` or
  `KV_REST_API_*` is set; per-instance memory otherwise. IPs are hashed.
  Opening questions are cached per deploy (keyed on the data version).
- **`npm run eval:ai`** — opt-in live evals against the real model: grounded
  counts, prose-only facts, page context, injection refusal, off-topic refusal.
- **Case-study blocks and field notes.** Architecture diagrams with measured
  connectors, code excerpts linked to source, figures, callouts; and a Field
  Notes section of debugging stories (symptom, wrong turns, root cause, fix,
  guard). Vega Studio carries a diagram and four.
- **Card → case study view transitions**, a fast lane of flagships under the
  terminal, and full-colour project images at rest.

### Changed
- `api/ask.ts` split into `api/_lib/` (providers, limits, health, cache, store).
- TypeScript `strict` on, with unused-code checks; cost fifteen unused imports.
- Case-study prose set for reading (16–17px, regular weight, higher contrast);
  no text below 11px outside the status rail and mobile nav (10px there).

### Fixed
- **Reduced motion crashed the home page.** `RevealText` returned an element
  without the ref `useScroll` was targeting; framer threw, and every visitor
  whose OS asks for reduced motion got the error screen.

## [Unreleased] — Ask AI runs server-side and streams; Vega Studio added

### Changed
- **The agent loop moved into `/api/ask`, and answers stream.** The browser
  used to run the loop — receive tool calls, execute them, post results back
  — which cost a full round trip per tool round, counted each round against
  the rate limit, and let any client post a fabricated `tool` message for the
  model to repeat. The endpoint now accepts only user/assistant text, runs the
  tools itself (importing the same data modules the page renders), and
  streams NDJSON: each query as it runs, then the answer token by token.
- **Groq default is `openai/gpt-oss-120b`.** `llama-3.3-70b-versatile` reached
  end of life on 2026-08-16. gpt-oss is a reasoning model, so it is sent
  `reasoning_effort: low`, `include_reasoning: false` and a larger completion
  ceiling (its hidden reasoning is billed against it).
- **Gemini is two models deep before Groq.** The `-latest` aliases were seen
  answering 503 for minutes while a pinned model on the same key answered;
  `GEMINI_FALLBACK_MODEL` (default `gemini-3.5-flash`) is tried next, and a
  503 gets one short retry. Versioned Gemini 3 models get
  `thinkingLevel: low`, since thought tokens count against the output cap.

### Added
- **Live step trace, sources and follow-ups in the transcript.** Queries appear
  as they run with their row counts; answers cite the case studies they rely
  on as links; the next question is offered from what was cited; answers copy
  with their links.
- **Vega Studio** (vega-canva) as the lead flagship, with its share card as
  artwork (`captureScreenshot: false` keeps the build from replacing it with
  a screenshot of the sign-in screen).
- **Per-project HTML heads at build time.** `dist/projects/<id>/index.html`
  carries that project's title, description and image, so a case study shared
  on LinkedIn, X or Slack unfurls as itself instead of as the homepage.
- Endpoint tests with providers faked at the fetch boundary: tool loop, final
  round without tools, Gemini → Gemini → Groq fallback, fragmented Groq tool
  calls, mid-stream failure, 503 retry, and the refusal of client tool turns.

### Fixed
- Spotlight counters parse thousands separators ("4,076" counted to 4).

## [Unreleased] — Correctness pass: fonts, head tags, and the first tests

A follow-up pass driven by an end-to-end review. Two production bugs, both
silent: the fonts were never applying, and every route was emitting duplicate
head tags. Plus the first test suite, which this repo had gone without while
the site's own copy sold "shipped with the test suites that prove them".

### Added
- **Vitest, and 70 tests.** `portfolioQuery` (the parser — literal masking,
  operator complements, ordering, error paths), the ten prepared `ask`
  questions and the documented `sql` examples (both are hand-written strings
  executed against live data, so a data edit can break them with nothing
  failing at compile time), `projectStatus` derivation, and data integrity
  over `PROJECTS` / `EXPERIENCE`.
  Verified by mutation: making `ORDER BY` sort in place, and masking literals
  with whitespace, each fail the suite.
- **Self-hosted fonts.** `scripts/fetch-fonts.mjs` vendors Inter and
  JetBrains Mono into `src/assets/fonts/` and generates `src/fonts.css`.
  Deduplicated by source URL — Inter is a variable font, so Google returns
  one file per subset for all four weights, and naming per weight had written
  1.1 MB where 305 KB was needed.
- **Build-time screenshot capture.** `vite.config.ts` recaptures every live
  project into `dist/images/` when `SCREENSHOT_API_KEY` is set, with targets
  derived from `PROJECTS` rather than a second hardcoded list. Cannot fail a
  deploy: a failed capture keeps the committed image and logs it.
- `lib/cv.ts` — the CV's path, filename and size in one place, shared by the
  download button, the command palette and the terminal's `resume`.

### Fixed
- **Fonts never applied in production.** `index.html` loaded them via a
  `preload` swapped to a stylesheet by an inline `onload=""` handler. That
  handler is script, so `script-src 'self'` blocked it outright: the CSS was
  fetched and never applied, and every page silently rendered in `system-ui`
  / Consolas. Nothing surfaced it — a blocked inline handler is a console
  warning, not an error — on a site whose entire identity is typographic.
  Self-hosting removes the failure mode rather than working around it, and
  drops `fonts.googleapis.com` / `fonts.gstatic.com` from the CSP.
- **Duplicate and conflicting head tags on every route.** The static tags in
  `index.html` and Helmet's runtime tags both rendered, so a project page
  served two canonicals — one pointing at `/`, one at `/projects/x` — which
  search engines resolve by ignoring both. The static tags now carry
  `data-rh="true"` so Helmet adopts rather than duplicates them, and every
  route emits the complete set through `SEOHead` (adoption is only safe if it
  is total: Helmet clears what it owns before writing).
- **The 404 page emitted no head tags at all**, inheriting the previous
  page's title and canonical and inviting indexing under that identity. Now
  `noindex, follow` with its own title.
- **Canonical carried the query string** (`window.location.href`), so an
  inbound `?utm_source=…` link self-canonicalised to the tagged URL instead
  of consolidating — the exact split canonical exists to prevent.
- **A fabricated progress bar on the CV download.** An interval added
  `Math.random() * 25` next to a static anchor click that emits no progress
  events — the same invention this project removed everywhere else, and which
  `App.tsx` argues against in its own route loader. Now a real streamed
  `fetch` counting bytes, indeterminate when the response reports no length,
  falling back to the plain anchor if fetch is unavailable.
- **The command palette kept its own copy of the section list**, which is
  precisely the drift `data/sections.ts` was created to prevent — and the two
  had already diverged ("Projects" against the nav's "Work"). It reads from
  `SECTIONS` now.
- **The palette's exit animations were unreachable.** `if (!isOpen) return
  null` sat *above* `AnimatePresence`, unmounting the boundary and its child
  together, so every `exit` prop was inert. Also added focus restoration on
  close and index clamping when the result set shrinks.
- **Query denominators counted unbuilt work.** "7 of 12 systems run without
  containers" included two design studies with empty stacks, which satisfy
  `NOT LIKE '%Docker%'` vacuously while running nowhere. Now "5 of 10 built
  systems", with the design tier excluded from stack questions.
- **Double-quoted string literals returned a confident `0 rows`.** Standard
  SQL reads them as identifiers, but nobody typing into this terminal means
  that; it now explains the problem instead of silently matching nothing.
- `data/experience.ts` used a value import for a type, unlike `projects.ts`
  which documents why it must be `import type`.

### Removed
- **`api/screenshot.ts`.** An unauthenticated public Edge Function spending a
  metered third-party quota — with nothing in the app calling it, the feature
  having already moved to static assets. The key it held now does more, more
  safely, at build time.

### Changed
- **Ultra News rewritten for V3**: 41 feeds, 123 tests, corroboration counted
  in independent publishers via the Public Suffix List, the three-editions
  model (and why the earlier static-count split left two of three near-empty),
  momentum as a materialised column (251 ms → 7.6 ms), the measured 0.80
  clustering threshold, and the $0 deployment topology. Known limits stated in
  a `notice`, including that a corroboration count is not a truth score.

---

## [Unreleased] — Hero rebuild, query layer, and an honesty pass over every number

A long pass across the whole site. The through-line: **every figure on the
page should be either measured or attributable**, and anything decorative
that implied otherwise was removed rather than dressed up.

### Added
- **Query layer.** `lib/portfolioQuery.ts` implements a bounded SQL subset
  (`SELECT`, `WHERE`/`AND`, `ORDER BY`, `LIMIT`, and
  `= != <> > < >= <= LIKE NOT LIKE IN NOT IN`) evaluated against the same
  `PROJECTS` / `EXPERIENCE` arrays the site renders, so a result can never
  disagree with the page. `JOIN`, `GROUP BY`, `OR` and subqueries are
  refused explicitly rather than mis-evaluated.
- **`ask` — curated questions, ungated.** Ten prepared queries phrased as
  questions a visitor actually has, each showing the SQL that produced it
  plus a plain-language answer. Deliberately available without clearance: a
  recruiter is never going to type a `SELECT`, and hiding the answer behind
  a Konami code means almost nobody sees it.
- **Async, cancellable commands.** The terminal's execution model now
  supports streaming: commands receive an `emit` callback and an
  `AbortSignal`. `watch` streams live telemetry, `ping` measures four real
  same-origin round trips. Ctrl+C aborts — and so does tapping the running
  indicator, since phones have no Ctrl key.
- **Circuit bus** (`lib/circuitBus.ts`) — a plain module, not context, so
  terminal activity can drive the background canvas without re-rendering
  anything to deliver a number.
- **Architecture Studies tier** — design-stage work (CBN data residency
  reference architecture, smart meter telemetry blueprint) rendered with a
  dashed border and an explicit *not built* label, excluded from the tech
  filter since it has no implementation stack to filter on.
- **Generated sitemap** — emitted at build time from `PROJECTS`. The
  hand-maintained file had already drifted, omitting three real pages.
- `data/sections.ts` — one section list for the nav, mobile island and
  footer, which previously kept three separate copies.
- `lib/platform.ts` — ⌘ vs Ctrl detection. The palette badge read `CMD+K`
  on every platform, naming a key most visitors do not have.
- Case-study narrative fields (`problem` / `approach` / `outcome` /
  `highlights` / `tradeoffs` / `notice`) on `Project`, plus per-project SEO
  and `SoftwareSourceCode` + `BreadcrumbList` JSON-LD on detail pages.
- Concurrency notes on overlapping roles — listed as bare date ranges the
  overlaps read as a CV error; stated plainly they read as capacity.

### Changed
- **Telemetry is measured, not invented.** The status bar reported a
  fabricated 143K evt/s and 99.97% uptime; it now reports real render FPS,
  real session uptime and real JS heap, and shows `--` until the first
  genuine sample rather than seeding a plausible number.
- **The circuit background depicts a pipeline.** Nodes carry roles —
  ingest sources, routing hubs, sinks — and streams are Manhattan-routed
  from source to sink. Previously pulses spawned at random edges and turned
  on a coin flip: pleasant motion that depicted nothing.
- **Project status is derived** from the links a project actually has.
  Every card previously printed `→ ONLINE`, including projects with neither
  a live URL nor a repository.
- **About metrics are attributable.** "12M+ Events/Day" and "99.9% Uptime"
  matched nothing in the data; each figure is now countable and states its
  source. Same correction applied to MMR Engine's headline metric, which
  presented a design *target* as an achieved result.
- Hero copy cut to two lines of plain English — the previous version
  front-loaded domain jargon a recruiter cannot parse in three seconds.
- Nav items are anchors with real `#section` hrefs; hide-on-scroll gained
  hysteresis and no longer retracts while keyboard focus is inside it.
- Route fallback held back 250ms so a warm-cache navigation never flashes a
  loading screen it cannot finish animating.
- Easter egg reward replaced: `dossier`/`trivia` text dumps became the raw
  query layer plus a hidden `phosphor` accent. Clearance now persists
  across visits and is revocable with `lock`.

### Fixed
- `useKonamiCode` held its buffer in `useState` inside an app-wide provider,
  so **every keypress anywhere re-rendered the entire tree** — including
  every character typed into the contact form.
- `useSectionObserver` picked whichever intersecting entry arrived first in
  the callback batch, and never re-scanned on navigation, so the nav
  highlighted Home on every case-study page.
- `AnimatePresence` wrapped an unkeyed `<Suspense>`; route exit animations
  could never fire.
- `About`'s `RevealText` declared a component inside its render body,
  remounting every word on every parent render.
- `CircuitCanvas` spawned its initial pulses before the `ResizeObserver`
  fired, so every pulse started at `(0,0)`.
- Absorbing a stream fired a shockwave *and* immediately spawned a
  replacement that fired another, concentrated behind the console — a
  self-sustaining strobe.
- `ThemeProvider` cast `localStorage` values straight into its union; a
  stale value applied a `theme-null` class and left the site accentless.
- Contact form errors were visually adjacent to their fields but not
  programmatically linked (no `aria-invalid`, no `aria-describedby`), and
  an invalid submit left focus on the button.
- Column-aligned terminal output rendered in `whitespace-pre-wrap`, which
  soft-wrapped and destroyed the alignment it depended on.
- A bare `SELECT` typed at the prompt reported `command not found: select`.
- Twitter card metadata named a different account than every visible link.

### Removed
- Fabricated boot-screen status lines (`Mounting core modules... OK`) — the
  same theatre removed from the telemetry, describing a chunk download.
- `downlinkMbps`, sampled once a second and displayed nowhere.
- Commented-out lazy imports for routes that do not exist.

---

## [Previous] — Easter egg merged into the Hero terminal

The Konami-code easter egg previously opened a standalone modal
(`EasterEgg.tsx`) with its own boot sequence, dossier reveal, and trivia
carousel — a second, disconnected interactive surface on top of the Hero's
already-interactive terminal. Merged the two so there's exactly one living
console instead of two separate easter-egg mechanics.

### Added
- `EasterEggProvider.tsx` — shared unlock context (`useEasterEgg()`), follows
  the same context/hook pattern as `ThemeProvider.tsx`. Owns the physical
  Konami-key detection via the existing `useKonamiCode` hook.
- Two hidden terminal commands, gated on unlock state: `dossier` (formatted
  personal/system facts) and `trivia` (random fact per run). Both report
  "command not found" when locked, so they stay genuinely secret.
- Auto-announcement: once unlocked, the terminal prints an
  `ACCESS GRANTED — CLEARANCE LEVEL Ω` banner the next time the interactive
  prompt is live — fires once per unlock, deferred so it never interrupts
  the scripted boot animation.

### Changed
- `konami` terminal command now unlocks silently (no toast/scroll — the
  visitor is already looking at the terminal) and prints the same banner
  text used by the physical-key-sequence path, so both feel identical.
- The Command Palette's hidden `???` entry now calls `unlock()` directly
  instead of dispatching ten synthetic `keydown` events to fake the Konami
  sequence — that hack only existed because there was no shared unlock
  state before.

### Removed
- `EasterEgg.tsx` (~450 lines) — the standalone modal, including its focus
  trap, ESC/backdrop dismiss, and `role="dialog"` accessibility plumbing.
  Removing the modal removes that whole concern rather than adding to it.
- Local `isEasterEggActive` state and `useKonamiCode` call in `Index.tsx`
  (superseded by the provider).

### Decision
- **Merge into the terminal, not deepen the modal.** Considered three
  options: deepen the modal (more spectacle), add a persistence layer so
  the modal remembers it was unlocked, or fold the reveal into the Hero
  terminal. Chose the merge — the terminal was already the site's one
  interactive surface; a second, disconnected easter-egg mechanic read as
  redundant. Trade-off: the reveal is quieter (a toast + inline terminal
  text vs. a full-screen cinematic takeover), but it's persistent for the
  rest of the session instead of disposable once dismissed.

---

## 2026-08-01 — Hero, Footer & Projects creative pass

Follow-up to the hardening pass below. Goal: make the Hero terminal, footer,
and project cards feel senior-level and distinctive rather than generic
portfolio-template polish.

### Hero
- Replaced the scripted-only typing terminal with `OpsConsole`: a boot log
  (`terraform plan`, `kubectl rollout status`, `dbt run`, JSON-syntax-
  highlighted data lines) that hands off to a **live command prompt** once
  boot completes. Commands: `help`, `whoami`, `about`/`projects`/
  `experience`/`contact` (scrolls to section), `stack`, `resume`/`cv`
  (downloads the CV), `theme <amber|purple>`, `sudo`, `clear`, plus the
  konami/dossier/trivia set added later (see Unreleased).
- Added `LiveMetrics` — an events/sec sparkline, p99 latency, and uptime,
  ticking on a `setInterval` for ambient "this is a real system" texture.
- Replaced the static CSS grid background with `CircuitCanvas`: a
  `<canvas>`-rendered PCB-style circuit board — grid nodes that light up as
  simulated data pulses pass through, hub nodes that emit shockwaves and
  spawn relay signals, a mouse-reactive telemetry probe, all running on a
  single `requestAnimationFrame` loop with zero per-frame allocations
  (object-pooled pulses/sparks/shockwaves). Paused via `IntersectionObserver`
  when off-screen. Falls back to a static grid under
  `prefers-reduced-motion`.
- Typing animation switched from `setInterval` to a `requestAnimationFrame`
  loop paced by elapsed real time — `data`-severity lines type at 2ms/char,
  well under the ~4ms floor browsers clamp `setInterval` to, so the old
  approach was firing far more often than the visible result needed.

### Footer
- Rebuilt as a 4-column systems-status footer (Identity / Sitemap / Connect
  / Status) instead of a plain link list.
- **Real data, not decorative text**: a live Lagos (UTC+1) clock that only
  re-renders on the minute boundary (not every second — stays an ambient
  detail rather than a distracting countdown), and real build metadata
  (`# a1b2c3d // deployed 4 minutes ago`) sourced from the actual deployed
  git commit SHA and build timestamp, injected at build time via Vite's
  `define` (see `vite.config.ts` — Vercel exposes `VERCEL_GIT_COMMIT_SHA`
  unprefixed, which the client bundle can't see directly; only
  `VITE_`-prefixed vars are auto-exposed, so it's inlined explicitly at
  build time instead of shipped to the client at runtime).
- Scroll-to-top control gained an animated SVG progress ring tied to
  `scrollYProgress`.

### Projects
- Restructured into three tiers (`flagship` / `production` / `system`) with
  purpose-built card layouts per tier instead of one generic card repeated.
- **Flagship spotlight** — the top flagship project is pulled out of the
  filterable pool entirely and rendered as a fixed narrative anchor
  (`FlagshipSpotlight`) with an animated counter on its headline metric, so
  it can't vanish mid-browse when a filter is applied.
- **Tech filter** — clickable stack chips (`FilterChip`) filter the
  remaining flagship/production/system cards in place, with `layout` +
  `AnimatePresence mode="popLayout"` for smooth grid reflow.
- **Terminal-status hover strip** — a slide-up `$ status --check <id> →
  ONLINE` line on hover, driven by the project's own first metric (not
  filler text), revealed on `group-hover` **and** `group-focus-within` —
  the prior corner-accent hover treatment was mouse-only.
- Extracted `AnimatedCounter` into `ui/AnimatedCounter.tsx` (used by both
  the Projects spotlight and About's stat blocks) and `scrollToSection`
  into `lib/scrollToSection.ts` (used by Hero, Footer, and the Command
  Palette) — both were duplicated inline before.

---

## 2026-08-01 — Hardening pass

Full pass across every page/section: security, performance, dead-code
cleanup, accessibility, and SEO correctness.

### Security
- **Fixed two leaked API key exposures** (same `screenshotapi.to` key,
  hardcoded in two places): `scripts/fetch-screenshots.mjs` and
  `api/screenshot.ts` now read `process.env.SCREENSHOT_API_KEY` and exit /
  error if it's unset, instead of embedding the literal key. Added
  `.env` / `.env.*` (with a `!.env.example` exception) to `.gitignore` and
  created `.env.example` documenting the variable and both consumers.
  Verified via full-repo grep that the literal key string no longer
  appears anywhere in the codebase.
- **Hardened `api/screenshot.ts`** (a Vercel Edge Function that proxies
  screenshot requests) with an `ALLOWED_HOSTS` allowlist restricting the
  target-URL parameter to known project domains — closing what was
  otherwise an open proxy / SSRF-adjacent endpoint that would fetch
  whatever URL a caller supplied.
- Security headers (CSP, `X-Frame-Options: DENY`, HSTS,
  `Permissions-Policy`, etc.) formalised in `vercel.json`, applied
  site-wide.

### Changed / Removed
- Removed the legacy CV-download modal in favor of a single direct-download
  flow (`CVDownloadButton.tsx`) — one fewer interaction step, one fewer
  component to keep accessible.
- Deleted unused light-theme CSS custom properties — the site is dark-mode
  only by design; the tokens were dead weight, not a real toggle.
- Project preview screenshots (`public/images/*.png`) are now self-hosted
  static assets, refreshed on demand via `scripts/fetch-screenshots.mjs`,
  rather than hotlinked through the live screenshot API on every page load.

### Fixed
- Assorted `react-hooks/set-state-in-effect` and `react-hooks/purity`
  lint violations surfaced by an updated `eslint-plugin-react-hooks`
  (e.g. `useRef(Date.now())` as an impure hook argument in Contact's
  honeypot field) — resolved via lazy `useState` initializers, deriving
  values at render time instead of syncing through an effect, or moving
  the `setState` call inside an async callback (timer/rAF) rather than the
  synchronous effect body. This pattern recurs throughout the codebase and
  is the standing fix whenever this rule fires.
- A Tailwind "ambiguous class" build warning caused by a CSS comment in
  `index.css` that happened to contain bracket-syntax text Tailwind's
  content scanner mistook for a class name — reworded the comment.

### Accessibility & SEO
- Verified WCAG 2.2 AA contrast, skip-navigation link, visible focus
  rings, `prefers-reduced-motion` compliance, and semantic landmark
  structure across all sections.
- JSON-LD structured data (`StructuredData.tsx`) generates its `ItemList`
  schema directly from `src/data/projects.ts`, so search/AI engines can
  never see a project list that's drifted out of sync with what's
  actually rendered.

---

## Notes for future passes
- `EasterEgg.tsx` is gone; if a future "unlock" feature is added, extend
  `EasterEggProvider` rather than reintroducing a standalone modal.
- The `react-hooks/set-state-in-effect` rule will keep firing on any new
  effect that calls `setState` synchronously — default to a lazy state
  initializer or an async callback (timer/rAF/event handler) instead of
  reaching for `// eslint-disable`.
