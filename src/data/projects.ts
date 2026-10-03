// Type-only import: this module is also loaded by vite.config.ts to generate
// the sitemap, and an explicit `import type` guarantees esbuild elides it.
// Relative with an extension, not `@/types`, because api/ask.ts reaches it
// and Vercel type-checks that function as Node ESM (see src/lib/aiTools.ts).
import type { Project } from "../types/index.js";

/* Copy rules for everything below: plain, natural English a non-engineer can
   follow, with the precise term kept where an engineer would look for it.
   No em-dashes in any string. Facts and figures are attributable to the
   project's own repository; `code` excerpts are verbatim and never edited. */

export const PROJECTS: Project[] = [
  /* ── TIER 1: FLAGSHIP ─────────────────────────────────────────────────── */
  // First on purpose: the Spotlight is the first flagship, and this is the
  // only one a visitor can open, read the source of, and use.
  {
    id: "vega-canva",
    tier: "flagship",
    title: "Vega Studio",
    subtitle: "Real-Time Collaborative Infinite Canvas",
    category: "Realtime Collaboration",
    timeline: "2026",
    github: "https://github.com/emmanuelrichard01/vega-canva",
    liveUrl: "https://vscanva.vercel.app",
    image: "/images/vega-canva.png",
    captureScreenshot: false,
    metrics: [
      { label: "Automated Tests", value: "4,076" },
      { label: "Move @500 Objects", value: "~5.7ms" },
      { label: "Chart Kinds", value: "30" },
    ],
    description:
      "A shared whiteboard with no edges, where several people can draw, write, diagram and talk at the same time. Edits are synced with a CRDT (Yjs), so work done offline merges in when you reconnect instead of being thrown away. The board is drawn with Konva and only renders what is on screen. Mermaid text turns into real shapes and arrows you can move and edit, objects have physical materials and can collide, and SVG export is built from the document itself rather than from a screenshot.",
    // Left empty deliberately: `tradeoffs` below names the rejected option.
    decisions: [],
    stack: ["TypeScript", "React", "Konva", "Yjs", "Hocuspocus", "Node.js", "PostgreSQL", "Redis", "S3", "Docker"],
    caseStudy: {
      problem:
        "It started as a two-day Vega IT hackathon brief: a real-time shared canvas with no edges. Rooms are shared by link, the board has to stay smooth past 100 objects, it needs text, shapes, images, sticky notes and voice notes, and guests join without signing up. The harder problem sits underneath. On a board with no edges, people are rarely looking at the same spot, so the interface has to show where everyone is and what they are doing without getting in the way of the work. The network will also drop, so editing has to keep working without a server and come back together afterwards without anyone losing work. After the hackathon the project was rebuilt to a stricter standard than the brief asked for.",
      approach:
        "The board is a Yjs document, synced through Hocuspocus, saved in Postgres as snapshots plus a log of changes, and copied into the browser's own storage (IndexedDB) so it opens and edits offline. Every change goes through one module, which stamps the stacking order, the time and the author, so no tool can forget to. Everything read back is cleaned up in one place, and older documents are upgraded by versioned migrations. Drawing uses Konva. A spatial index (an R-tree) means only what is on screen gets drawn, each object listens only to its own data, and panning happens outside React so it re-renders nothing. Resizing moves an invisible stand-in, and objects are redrawn at their new size rather than stretched, so text stays sharp and lines keep their weight. Physics is a separate Matter.js module, and only one person's browser simulates a moving object at a time. Mermaid diagrams are converted into the canvas's own shapes and arrows (dagre lays out flowcharts, a timeline layout handles sequence diagrams, and pie charts are plain arithmetic) instead of being pasted in as a picture. The server adds media storage on S3, signed invite links for view, comment or edit access, Redis for fan-out and quotas, and link previews fetched behind a guard against server-side request forgery (SSRF).",
      outcome:
        "4,076 automated tests pass: 3,883 across 204 frontend files and 193 across 14 server files. Typecheck and lint are clean, and CI typechecks, tests and builds both halves of the project on every push. Measured in the repository on a 500-object board, moving one object takes about 5.7ms to commit and a spatial lookup about 0.004ms. Beyond the brief it has charts in 30 kinds and spreadsheet-style tables that share one editor, code blocks, link cards, threaded comments with mentions and per-person unread markers, a timeline for scrubbing back through a session, and export to PNG, SVG, PDF and JSON. It is live, and the source is public.",
      highlights: [
        "It understands Mermaid 11's named shapes (61 aliases), and a test checks that no two Mermaid shapes are drawn alike. That test exists because input and manual-step symbols were once drawn as decision diamonds",
        "Arrows remember which objects they connect and work out their route every time they are read, so a generated diagram survives being rearranged by hand",
        "Where the floating toolbar goes is decided by one pure function with 27 tests, which is what made its one real bug findable (see the field notes)",
        "A test fails the build if canvas code starts importing the export engine, which loads on demand. That is how it once ended up slowing down every page",
        "Live cursors have exactly one writer and one reader loop, and positions are written straight to the page each frame. A second writer had already caused ghost cursors",
        "Diagram colour palettes are checked by test for readable contrast (WCAG) against the surface they sit on, in both themes",
      ],
      tradeoffs: [
        {
          decision: "How edits are synced",
          chose: "A CRDT (Yjs) with no central server deciding the order",
          rejected: "A server that orders every edit (operational transform)",
          why: "With no central authority, every copy of the board settles on the same result by itself. That is exactly what makes offline editing work: changes made while disconnected merge in when you reconnect, instead of being rejected by a server that has moved on.",
        },
        {
          decision: "Diagrams written as text",
          chose: "Convert Mermaid into the canvas's own shapes",
          rejected: "Render it with the mermaid package",
          why: "The package produces one SVG picture, which can't be edited on a board where the whole point is that everything can be, and it weighs over a megabyte. Converting into the canvas's own shapes means every box and arrow can be moved, restyled and exported again.",
        },
        {
          decision: "Resizing",
          chose: "Resize an invisible stand-in, then redraw objects at the new size",
          rejected: "Stretch the objects themselves (Konva scaleX / scaleY)",
          why: "Stretching is the wrong action for almost everything here. A stretched sticky note has stretched padding and blurry text, and a stretched line has a thicker stroke. The gesture records the new size outside React, and each object draws itself at that size.",
        },
        {
          decision: "Who runs the physics",
          chose: "One person's browser owns each moving object",
          rejected: "Every browser simulates every object",
          why: "Two separate simulations land the same object in slightly different places and then fight over where it is. One owner runs the simulation and saves the result, and everyone else plays back the owner's path.",
        },
        {
          decision: "Gravity",
          chose: "Force as something you aim: pull, push, drop, wind, shockwave",
          rejected: "Constant gravity across the whole board",
          why: "A board with no edges has no floor. Constant gravity would pull everything off the board forever, and nothing would ever come to rest.",
        },
      ],
      blocks: {
        approach: [
          {
            kind: "architecture",
            caption:
              "Every change goes through one path into a CRDT document, which is the only owner of shared state. The browser keeps its own copy in IndexedDB, which is why the board opens and edits with no server at all. The server saves and shares changes, but never decides their order.",
            columns: [
              {
                label: "Browser",
                nodes: [
                  { id: "tools", label: "Tools & gestures", detail: "pen, shapes, text, drag, physics" },
                  { id: "mutations", label: "mutations.ts", detail: "the only way to change the board" },
                  { id: "doc", label: "Y.Doc", detail: "CRDT, owns all shared state" },
                  { id: "render", label: "Normalize → store → R-tree", detail: "draws only what is on screen" },
                ],
              },
              {
                label: "Persistence & sync",
                nodes: [
                  { id: "idb", label: "IndexedDB", detail: "the offline copy in the browser" },
                  { id: "hocus", label: "Hocuspocus server", detail: "sync, signed invites, roles" },
                  { id: "api", label: "Express API", detail: "media, link previews, history" },
                ],
              },
              {
                label: "Storage",
                nodes: [
                  { id: "pg", label: "PostgreSQL", detail: "snapshots + change log" },
                  { id: "s3", label: "S3 / MinIO", detail: "images and audio" },
                  { id: "redis", label: "Redis", detail: "fan-out, quotas (optional)" },
                ],
              },
            ],
            edges: [
              { from: "tools", to: "mutations" },
              { from: "mutations", to: "doc" },
              { from: "doc", to: "render", label: "observe" },
              { from: "doc", to: "idb", label: "persist" },
              { from: "doc", to: "hocus", label: "sync" },
              { from: "hocus", to: "pg" },
              { from: "api", to: "s3" },
              { from: "hocus", to: "redis" },
            ],
          },
        ],
      },
      fieldNotes: [
        {
          title: "The toolbar that sat 28px too low",
          symptom:
            "The toolbar that floats over a selection crowded the object whenever it was placed below it. Placed above, the spacing was fine.",
          wrongTurns: [
            "Add more space below, and retune the gap three times",
          ],
          rootCause:
            "A symmetric layout can't produce a lopsided error, so something else had to be off. The position was converted from board coordinates to canvas coordinates, then used to place a page element in window coordinates without adding the canvas's own offset, which is pushed in by the 28px ruler. That left exactly 28px too much space above and 28px too little below.",
          fix: "Three named coordinate spaces, converted once, in one place you can point to.",
          guard: "Placement is a pure function of the selection, its size, the window and the last side used, covered by 27 tests that run without a browser.",
        },
        {
          title: "The toolbar that vanished until reload",
          symptom:
            "Now and then the toolbar disappeared and never came back, whatever was selected. Only reloading the page brought it back.",
          wrongTurns: ["Find the gesture that sends a start without an end, and add the missing end"],
          rootCause:
            "One true/false flag was switched on and off by start and end events from six different places. Konva sends no drag-end event for an object that is removed mid-drag, and every handle is only drawn some of the time, so changing the selection during a drag ends the gesture with no event at all. A missing end isn't a bug you can finish hunting down; it is a pattern. A second cause needed no missing event: a toolbar that was redrawn had no position yet, and a write skipped as 'unchanged' left it at the corner of the page, off screen.",
          fix: "The flag now checks itself against reality: releasing the pointer while nothing is being edited ends any gesture, whatever the senders promised. The code that positions the toolbar remembers which element it last wrote to, so every new toolbar gets its first position.",
          guard: "12 tests on the flag's state machine.",
        },
        {
          title: "Copy as PNG and Copy as SVG disagreed",
          symptom:
            "Copying the same selection as SVG gave one sticky note. Copying it as PNG gave the note, the frame behind it, and corners of the notes overlapping it.",
          rootCause:
            "The PNG path framed the picture around the selection but captured the live canvas with everything else still drawn. Underneath that were two more gaps: the canvas only draws what is on screen, so a board wider than the window exported half blank, and a newly loaded image is an empty box until it finishes loading.",
          fix: "The capture now includes exactly what was asked for, an export says what it needs drawn and the canvas adds it, and export waits (with a time limit) until every image that should be visible has loaded.",
          guard: "Isolation, what gets drawn and image loading each have their own tests (6, 10 and 13).",
        },
        {
          title: "A 47-line file put the whole exporter on the critical path",
          symptom: "Every board and the dashboard downloaded the export engine, PDF writer included, before anything appeared on screen.",
          wrongTurns: ["The bundling rule was right: everything under engine/export/ goes into one chunk that loads on demand"],
          rootCause:
            "chrome.ts, 47 lines holding the name Konva uses to tag interface elements, lived under engine/export/ and was imported by twelve canvas components. That one constant made the entire exporter part of the first page load.",
          fix: "Seven small, pure modules the canvas genuinely shares are listed as exceptions, and everything else under export/ still loads on demand.",
          guard: "A test fails if anything outside the exporter imports a module not on that list, and checks the list matches the build config.",
        },
      ],
      notice:
        "Access is by link, on purpose: a board's address is its key, and there are no accounts. Signed view and comment invites stop a link from being upgraded, but they don't stop someone who has the plain board address from using it. That is a documented product decision, not an oversight. The list of your boards lives in your browser, so clearing site data forgets the addresses (the boards themselves survive, and the list can be exported). The two performance figures are the repository's own measurements on a 500-object board, not an independent benchmark.",
    },
  },
  {
    id: "mmr-engine",
    tier: "flagship",
    title: "MMR Engine",
    subtitle: "PSP-to-Ledger Payment Reconciliation",
    category: "Fintech Core System",
    timeline: "2026",
    github: "https://github.com/emmanuelrichard01/mmr-engine",
    liveUrl: null,
    // The operations console from the repo's own screenshot suite, in its
    // demo-fixture mode: there is no live deployment to capture.
    image: "/images/mmr-engine.png",
    captureScreenshot: false,
    metrics: [
      // The repository's own "verified against this repository" table at
      // v1.0.0. The earlier 99.5% auto-match and <10s latency were design
      // targets, never measurements, and went when the README stopped
      // claiming them.
      { label: "Automated Tests", value: "276" },
      { label: "Against Real Postgres", value: "23" },
      { label: "Reversible Migrations", value: "16" },
    ],
    description:
      "A business that takes payments through Paystack and Flutterwave gets a separate record of every payment from each one, and the records don't always agree. MMR finds the gaps automatically. It checks and collects every payment notification, stores each one once, pairs up the records that describe the same money (exact matches first, then on weighted evidence), and sends anything that doesn't add up to a review inbox with the evidence attached. Underneath are the unglamorous guarantees that decide whether the numbers can be trusted: duplicate-proof intake, nothing skipped in the queue, exact decimal money, one-to-one matching enforced by Postgres, and a history that can't be edited. Finished at v1.0.0 and kept as a reference implementation.",
    // Left empty deliberately: `tradeoffs` below names the rejected option.
    decisions: [],
    stack: ["Python", "FastAPI", "PostgreSQL", "Redpanda", "Prefect", "MinIO", "Next.js", "Prometheus", "Grafana", "Docker"],
    caseStudy: {
      problem:
        "A Nigerian business that collects money on Paystack and pays out on Flutterwave gets two records of every movement of money, and they don't always agree. Settlements go missing, amounts differ, the same event arrives twice, and notifications (webhooks) arrive out of order or not at all. Someone in finance then finds the gaps by hand in a spreadsheet. Automating that is easy to demo and hard to trust. A tool that drops a notification during an outage, matches one payment twice, or quietly guesses between two equally good candidates produces numbers that are worse than the spreadsheet's, because they look certain.",
      approach:
        "Each webhook is checked against its signature on the raw message (HMAC-SHA512 for Paystack, the secret hash for Flutterwave). The record that says 'we have seen this event' (the idempotency key) is saved in the same step that waits for the message queue, Redpanda, to confirm it has the event. If the queue doesn't confirm, nothing is saved, and the payment provider simply sends it again. A worker takes events off the queue one at a time and only marks one as done after it has been processed or safely set aside. Every raw event is kept in MinIO as Parquet files (Bronze), and only the event types the engine understands become clean rows in Postgres, with money stored as exact decimals (Silver). Every five minutes a Prefect-scheduled run pairs records in two rounds. Round 1 looks for the same amount on the other provider, going the opposite way, closest in time. Round 2 scores the evidence (amount 0.40, time 0.25, the other party's name 0.25, bank 0.10) and needs at least 0.75 to call it a match. Names are compared as keyed tokens, never as masked text. Every six hours it asks each provider for anything a webhook missed and fetches it. A Next.js console (a review inbox, the path each payment took, a view that explains each pair, and how long money has been unmatched) reaches the API only through its own server, so the API key never reaches the browser.",
      outcome:
        "v1.0.0, finished and frozen as a reference implementation. It has 276 tests. 23 of them run against a real PostgreSQL database and check that migrations can be undone, that two matching runs racing for the same payment can't both win, that the history really can't be edited, and that each database user can only touch what it should. Property-based tests check the matching rules hold for any input. Strict type checking (mypy --strict) is clean on src/. There are 16 migrations, every one reversible, 15 tables and a materialized view, and 19 documented endpoints. CI runs the linter, strict types, a security scanner, a dependency audit, the real-Postgres tests and the console's lint, types and build. Every promise in the README sits next to the test that proves it.",
      highlights: [
        "A webhook is never acknowledged unless it was recorded. The 'seen' record and the queue's confirmation are saved together, and any failure returns 503 so the provider tries again",
        "A payment can be matched at most once, even when two matching runs race. A database rule (the primary key on gold_matched_transactions) lets only one win, and the other quietly rolls back",
        "A tie is treated as an answer, not an error. When the second-best candidate scores within 0.05 of the best, the payment stays unmatched and both candidates are kept as evidence",
        "The history of each discrepancy can't be rewritten. A database trigger blocks every UPDATE, DELETE or TRUNCATE, even for the table's owner",
        "The API can only change the columns that record a resolution, so it can't rewrite money, and a test proves it",
        "It refuses to start unsafely. It assumes production unless told otherwise, rejects empty secrets at startup, and only lets you turn off API keys in development",
      ],
      tradeoffs: [
        {
          decision: "How each event is guaranteed to land once",
          chose: "Accept repeats and make them harmless: at-least-once delivery, 'seen' keys and a database uniqueness rule",
          rejected: "Relying on the queue's 'exactly-once' promise",
          why: "Exactly-once can't be guaranteed end to end across a web request, a queue and a database. Accepting that events may arrive twice, and making the second arrival do nothing, gets the result that matters (each event lands once) from promises each part can actually keep.",
        },
        {
          decision: "Matching people's names",
          chose: "Keyed tokens, one per word of the name",
          rejected: "Comparing masked names letter by letter (trigram similarity)",
          why: "Masking throws away exactly what matching needs. 'Chioma Okonkwo' and 'Chisom Onyekwe' both mask to 'C***** O******' and scored as a perfect match. Tokens still match when words are swapped, titles added or a middle name dropped, and no plain-text name is needed to match (ADR 0001).",
        },
        {
          decision: "Two equally good candidates",
          chose: "Leave the payment unmatched for review, with the evidence",
          rejected: "Take the first or highest-scoring candidate",
          why: "A wrong automatic match costs more than a manual review, because it hides a real problem behind a confident-looking pair.",
        },
        {
          decision: "Message queue",
          chose: "Redpanda",
          rejected: "Apache Kafka",
          why: "It speaks the Kafka API from a single program with no ZooKeeper to run, which matters for a reference stack meant to run on one machine.",
        },
        {
          decision: "How the console reaches the API",
          chose: "Through its own server, which only passes on an approved list of routes",
          rejected: "Calling the API from the browser with a key",
          why: "Any key the browser holds is a key every visitor holds. The console's server adds the key itself, only passes on read and resolve requests, and rejects writes from other websites.",
        },
      ],
      blocks: {
        approach: [
          {
            kind: "architecture",
            caption:
              "An event is only acknowledged once it is recorded, it is stored raw before it is interpreted, and it is matched by a database that allows one pair per payment. The console never holds the API key.",
            columns: [
              {
                label: "Intake",
                nodes: [
                  { id: "psp", label: "Paystack · Flutterwave", detail: "signed webhooks, regular polling" },
                  { id: "api", label: "FastAPI", detail: "check signature, then save + queue together" },
                  { id: "rp", label: "Redpanda", detail: "one-at-a-time progress, dead-letter topic" },
                ],
              },
              {
                label: "Layers",
                nodes: [
                  { id: "bronze", label: "Bronze · MinIO", detail: "every raw event, Parquet, never edited" },
                  { id: "silver", label: "Silver · PostgreSQL", detail: "clean rows, exact money, name tokens" },
                  { id: "gold", label: "Gold", detail: "one-to-one pairs, discrepancies, history" },
                ],
              },
              {
                label: "Operate",
                nodes: [
                  { id: "sched", label: "Scheduler · Prefect", detail: "match 5 min · FX 30 min · gaps 6 h" },
                  { id: "console", label: "Next.js console", detail: "through its own server" },
                  { id: "obs", label: "Prometheus · Grafana", detail: "metrics, alert rules, Slack" },
                ],
              },
            ],
            edges: [
              { from: "psp", to: "api" },
              { from: "api", to: "rp", label: "ack" },
              { from: "rp", to: "bronze" },
              { from: "rp", to: "silver" },
              { from: "silver", to: "gold" },
              { from: "sched", to: "gold", label: "match" },
              { from: "gold", to: "console" },
              { from: "sched", to: "psp", label: "gap poll" },
            ],
          },
          {
            kind: "code",
            lang: "python",
            caption:
              "The tie check in round 2. If the best score doesn't beat the runner-up by the margin, it isn't a match: the payment goes to review with both candidates attached.",
            href: "https://github.com/emmanuelrichard01/mmr-engine/blob/main/src/engine/matching.py",
            code: `scored.sort(key=lambda t: t[0], reverse=True)
if not scored or scored[0][0] < config.probabilistic_threshold:
    return _unmatched(source, MatchStrategy.PROBABILISTIC_SECONDARY)

best_score, best, ev = scored[0]
if len(scored) > 1 and best_score - scored[1][0] < config.ambiguity_margin:
    return _unmatched(
        source,
        MatchStrategy.PROBABILISTIC_SECONDARY,
        ambiguous=True,
        reason="runner-up within ambiguity margin",
        best_score=round(best_score, 4),
        runner_up_score=round(scored[1][0], 4),
        candidate_ids=[str(c.id) for _, c, _ in scored[:5]],
    )`,
          },
        ],
        outcome: [
          {
            kind: "figure",
            src: "/images/mmr-engine-pair.png",
            alt: "The MMR console's pair view: a Paystack credit and a Flutterwave debit side by side, above a table of the four signals (amount, time, name, bank) with each one's score, weight and contribution to a 77.4% confidence against the 75% threshold.",
            caption: "The pair view shows why two records were paired, one signal at a time. Synthetic demo data.",
          },
        ],
      },
      fieldNotes: [
        {
          title: "Every retry looked like a duplicate",
          symptom:
            "While the message queue was down, a provider's webhook failed, and every retry of it was then rejected as already seen. The event never got in at all.",
          rootCause:
            "The 'seen' record (the idempotency key) was saved whether or not the event reached Redpanda. A failed hand-off left the record behind, so 'we have seen this' outlived the event it described.",
          fix: "Saving the 'seen' record and waiting for the queue's confirmation are now one step. Any failure undoes the record and returns 503, which is exactly the signal a provider retries on.",
          guard: "test_failed_publish_does_not_register_idempotency_key and test_ingest_failure_returns_503_so_psp_retries.",
        },
        {
          title: "Discrepancies filed against the wrong payments",
          symptom: "A matching run raised problems against payments that weren't part of the pair that caused them.",
          rootCause:
            "Results were lined up with their payments by position in a list, so any candidate skipped between the two lists shifted every pairing after it by one.",
          fix: "Results are tied to payment IDs from start to finish. Candidates now come from a recent time window, which also fixed the starvation where the oldest 500 unmatched rows were retried forever and nothing newer was ever looked at.",
        },
        {
          title: "Two different people, one perfect name match",
          symptom: "Round 2 paired transfers between different people with full confidence on the name.",
          rootCause:
            "The names being compared were already masked. 'Chioma Okonkwo' and 'Chisom Onyekwe' both become 'C***** O******', so letter-by-letter similarity was really measuring word lengths. That is noise, and at worst it supported wrong matches.",
          fix: "Names are cleaned up and stored as keyed HMAC-SHA256 tokens, one per word, and similarity is the overlap between the two sets of tokens (the Dice coefficient). Masked names are still kept, but only for display.",
          guard: "Tokenization tests cover word order, accents, titles and dropped middle names, and check that one shared word (every 'John') is never a match.",
        },
      ],
      notice:
        "Finished at v1.0.0 and kept as a reference implementation: it only gets correctness, security and documentation fixes. It was built and tested on synthetic data and has never handled real merchant traffic. It checks provider records against provider records. Proving the cash actually reached a bank account would need bank statements, which it doesn't use. It serves one business at a time, and it matches one payment to one payment, so batched settlements (many payments in one deposit) aren't solved. The CBN-style daily return is an experimental reporting prototype, not a compliance product.",
    },
  },
  {
    id: "logistics-watchtower",
    tier: "flagship",
    title: "Logistics Watchtower",
    subtitle: "Real-Time Cold Chain Fleet Monitoring",
    category: "Real-Time Systems",
    timeline: "2026",
    github: "https://github.com/emmanuelrichard01/logistics-watchtower",
    liveUrl: null,
    metrics: [
      { label: "Latency", value: "<200ms" },
      { label: "Sensors", value: "15+/truck" },
      { label: "Alert Rules", value: "8" },
    ],
    description:
      "Most logistics systems look at sensor data after the trip, and by the time a temperature spike shows up the cargo is already spoiled. This is a live pipeline instead. Each simulated truck has 15+ sensors and drives real Nigerian highway routes with realistic movement. The readings stream through Redpanda into Quix Streams, which checks 8 alert rules as they arrive (temperature, doors, speed, fuel and more) and pushes alerts, ranked by severity, to a live operations dashboard over WebSocket.",
    decisions: [
      {
        title: "Redpanda over Kafka",
        detail:
          "Written in C++, so there are no Java garbage-collection pauses. It runs as a single program and speaks the full Kafka API, and it cut the slowest response times (tail latency) by 40%.",
      },
      {
        title: "Monitoring built in from the start",
        detail:
          "Prometheus metrics, structured logs, and a demo mode that triggers the same failures every time, so the alert path can be tested reliably.",
      },
    ],
    stack: ["Python", "FastAPI", "Redpanda", "Quix Streams", "Docker", "Prometheus"],
    caseStudy: {
      problem:
        "Cold chain deliveries fail when cargo drifts out of its safe temperature range. Most monitoring only looks at the data after the trip, so a temperature problem shows up after delivery, when the cargo is already lost. The information is accurate, and too late to be useful.",
      approach:
        "A live pipeline built to let someone step in, not just report afterwards. A simulator runs a fleet of refrigerated trucks along real Nigerian highway routes, sending 15+ sensor readings per event from a simple physics model: movement between route points, speeds that depend on the type of road, heading, distance on a curved earth (the Haversine formula), and fuel burned per kilometre. The readings stream through Redpanda into a Quix Streams processor that checks 8 alert rules, each with a severity, and alerts reach a live operations dashboard over WebSocket.",
      outcome:
        "Under 200ms from a sensor reading to an alert on the dashboard. Eight alert types run from CRITICAL (temperature out of range, a door open while moving, a failing compressor) down to MEDIUM (speeding, low battery). Failures can be triggered on purpose, such as a compressor that fails between known route points or a door that opens at a known stop, so the whole alert path can be tested the same way every time instead of waiting for a real fault.",
      highlights: [
        "Real GPS points along Nigerian highways (Lagos → Abuja, Port Harcourt → Makurdi, Benin → Abuja), not random coordinates",
        "Six kinds of Prometheus metrics: messages, alerts by type, alerts by severity, WebSocket connections, and uptime",
        "The fleet size is one setting (FLEET_SIZE), and trucks cycle through the defined routes",
        "It comes with its own list of what production would still need: Redis-backed state, JWT logins with roles, Kubernetes autoscaling across partitioned consumers, distributed tracing, and archiving to S3 through Kafka Connect",
      ],
      tradeoffs: [
        {
          decision: "Message broker",
          chose: "Redpanda",
          rejected: "Apache Kafka",
          why: "Written in C++, it has no Java pauses, and dropping ZooKeeper removes something else to run. The cost is a younger ecosystem.",
        },
        {
          decision: "Stream processing",
          chose: "Quix Streams",
          rejected: "Spark / Flink",
          why: "Plain Python and lightweight, which suits a job that needs speed but little computing power. It gives up large-scale scaling that this problem doesn't need.",
        },
        {
          decision: "Getting updates to the dashboard",
          chose: "WebSocket",
          rejected: "Asking the server every few seconds (REST polling)",
          why: "A live fleet map needs updates in under a second. Polling adds delay and server load and still gives a worse result.",
        },
        {
          decision: "Where alert state lives",
          chose: "In memory",
          rejected: "A database",
          why: "It is lost on restart, and that is named as a demo-scope choice, not defended. Production would use Redis or Kafka Streams state stores.",
        },
      ],
    },
  },
  {
    id: "modern-warehouse",
    tier: "flagship",
    title: "Modern Data Warehouse",
    subtitle: "1.5M+ Record Analytics Platform",
    category: "Analytics Engineering",
    timeline: "2025",
    github: "https://github.com/emmanuelrichard01/modern-warehouse",
    liveUrl: null,
    metrics: [
      { label: "Records", value: "1.5M+" },
      { label: "dbt Tests", value: "21" },
      { label: "Coverage", value: "80%+" },
    ],
    description:
      "The complete Olist Brazilian e-commerce dataset in one warehouse: 99k orders, 103k payments, 99k reviews and 1M+ map coordinates from 9 source files. Data moves through three layers (raw, cleaned, ready for analysis, also called Bronze, Silver and Gold). Dagster runs the pipeline, dbt transforms the data and checks it with 21 schema tests, DuckDB stores it, and 9 interactive Plotly charts present it. Version 2.1 made loading 8× faster by reusing database connections and made CI 60% faster.",
    decisions: [
      {
        title: "DuckDB over Postgres",
        detail:
          "The work here is analysis (totals and groupings), not lots of small updates. DuckDB is far faster at that and there is no database server to look after.",
      },
      {
        title: "Built like production code",
        detail:
          "Full type checking with mypy, central logging, Docker containers that don't run as root and have resource limits, and models that only process new rows for the 1M+ location records.",
      },
    ],
    stack: ["Python", "Dagster", "dbt", "DuckDB", "Docker", "Plotly"],
    caseStudy: {
      problem:
        "The Olist Brazilian e-commerce dataset comes as nine separate files (orders, payments, reviews, sellers, locations and more) with nothing tying them together. Most people load a convenient slice and stop there. Any question that crosses those files needs a real warehouse behind it.",
      approach:
        "A full three-layer warehouse over the whole dataset, with nothing left out. Dagster loads the raw data into Bronze. dbt turns Bronze into Silver and then Gold, with schema tests attached directly to each model. DuckDB stores it all. The location data is processed incrementally, because rebuilding over a million coordinate rows on every run would be wasteful. Portuguese category names are translated to English as the data comes in, and the Gold layer feeds nine interactive Plotly charts.",
      outcome:
        "1.5M+ records: 99,441 orders from Sep 2016 to Oct 2018, 99,441 customers, 32,951 products in 71 categories, 112,650 order items, 103k payments, 99k reviews, 3k+ sellers and 1M+ location coordinates. Quality is checked by 21 dbt schema tests and 9 automated Dagster checks, all passing, with 80%+ test coverage and full mypy type checking. Version 2.1 made loading 8× faster by reusing database connections, made the Docker image 20% smaller, and cut CI from 5–8 minutes to 2–3.",
      highlights: [
        "Quality checks are split by layer: Bronze checks row counts and missing keys, and Gold checks that records link up correctly, that revenue is never negative, and that no customer appears twice",
        "Incremental dbt models for the 1M+ row location table",
        "Containers don't run as root, and have resource limits, health checks and their own network",
        "Category names are translated from Portuguese to English as the data comes in",
      ],
      tradeoffs: [
        {
          decision: "Storage engine",
          chose: "DuckDB",
          rejected: "PostgreSQL",
          why: "The work is analysis (totals and groupings across whole tables), not lots of small updates. A built-in analytics engine (OLAP) is far faster here and leaves no server to run.",
        },
      ],
    },
  },

  /* ── TIER 2: PRODUCTION ───────────────────────────────────────────────── */
  {
    id: "medvax",
    tier: "production",
    title: "MedVax",
    subtitle: "Health-Tech Telemedicine & E-Commerce",
    category: "Health-Tech Platform",
    // Matches the engagement recorded in EXPERIENCE and on the CV: a
    // Jan–Feb 2026 contract. This previously read "2025 — Present", which
    // contradicted both.
    timeline: "Jan – Feb 2026",
    github: null,
    liveUrl: "https://medvaxhealth.com",
    image: "/images/medvax.png",
    metrics: [
      { label: "Stack", value: "NestJS + Next.js" },
      { label: "Auth", value: "JWT + RBAC" },
      { label: "Status", value: "Production" },
    ],
    description:
      "A live platform in West Africa that joins online doctor consultations to pharmacy orders and delivery. It has secure logins with separate permissions for clients, consultants and admins (JWT and role-based access), Paystack payments, Dyte video calls, stock records that can't be oversold, and background jobs on BullMQ.",
    decisions: [
      {
        title: "Stock kept as a ledger",
        detail:
          "Every stock movement is added to a log that is never edited, and a version check (optimistic locking) stops two orders for the same product from both taking the last item.",
      },
    ],
    stack: ["NestJS", "Next.js", "PostgreSQL", "Redis", "BullMQ", "Paystack", "WhatsApp API"],
    caseStudy: {
      problem:
        "Getting sexual and reproductive health products in West Africa runs into two problems at once: privacy and supply. People who need contraceptives, prescription medicine or a frank conversation with a clinician often won't walk into a pharmacy and ask. And the pharmacies that do stock what they need are independent shops with no shared stock list or way of fulfilling orders together.",
      approach:
        "One backend with two ways in: a web app and a WhatsApp assistant, both linked to the same account through a one-time code sent to your phone. The catalogue keeps over-the-counter products separate from prescription-only ones, and checkout enforces it: a prescription-only item can't be sent until a prescription is uploaded and approved by a pharmacist or clinician, or a consultation is booked. Orders go to partner pharmacies, who accept or decline them from their own dashboard. Payments go through Paystack, background work runs on a Redis-backed queue, and the assistant helps people find the right next step while being blocked, by design, from prescribing.",
      outcome:
        "Live at medvaxhealth.com. The system was specified before it was built. The governing requirements document (SRS) defines what each of six roles can do, the database design (users, pharmacies, products, stock per pharmacy, orders, prescriptions, consultations and subscriptions), the steps an order goes through, the API, diagrams for checkout and for adding to cart on WhatsApp, and performance targets: 5,000 daily active users to start, p95 under 300ms on read endpoints, and 99.5% availability for the core service.",
      highlights: [
        "Stock is tracked per pharmacy, with a database rule that each product appears once per pharmacy, so stock is counted per location rather than as one global number",
        "Stock changes are logged and version-checked (optimistic locking), so two orders hitting the same product at once can't both take the last item",
        "The assistant never prescribes. Anything that needs a prescription is sent into a consultation instead",
        "Each order has a unique key, so tapping 'order' several times quickly can't create duplicate orders",
        "Running out of stock after checkout is a planned path (switch to another pharmacy, or refund), not an unhandled case",
        "Consent is recorded when you sign up. Consultation records are kept for 24 months by default, and transaction records for five years",
      ],
      tradeoffs: [
        {
          decision: "Second way in",
          chose: "A WhatsApp assistant",
          rejected: "A mobile app",
          why: "The people this serves already have WhatsApp and already treat it as private. An app is another install and another icon on the home screen, and for private health needs that icon itself gives something away.",
        },
        {
          decision: "What the assistant may do",
          chose: "Help people find the next step and route them, nothing more",
          rejected: "Letting the AI answer clinical questions",
          why: "An AI that names a medicine has effectively prescribed it. The assistant is kept away from that and books a consultation instead.",
        },
        {
          decision: "Assigning deliveries",
          chose: "Manual, or the nearest pharmacy",
          rejected: "A third-party delivery service",
          why: "A deliberate cut for the first version. Connecting a delivery service waits until the order flow itself is proven to work.",
        },
      ],
    },
  },
  {
    id: "ultra-news",
    tier: "production",
    title: "ULTRA-NEWS V3",
    subtitle: "The Wire Room",
    category: "News Intelligence",
    timeline: "2025 – Present",
    github: "https://github.com/emmanuelrichard01/ULTRA-NEWS",
    liveUrl: "https://ultra-news.vercel.app/",
    image: "/images/ultra-news.png",
    metrics: [
      { label: "Corroboration", value: "Publishers" },
      { label: "Ingestion", value: "41 Feeds" },
      { label: "Tests", value: "180" },
    ],
    description:
      "A news site built around one idea: the story matters more than the individual article. When many outlets cover the same event, their articles are grouped by meaning into one Story, which shows how many independent publishers reported it. Publishers are worked out from their web domains (using the Public Suffix List), so a newsroom can't confirm its own story. Three editions sort the whole collection in different ways instead of splitting it up, an hourly Briefing sums up what two or more newsrooms have confirmed, and Ask the Wire Room answers questions with numbered links back to the stories. It runs for $0 with every feature working.",
    decisions: [
      {
        title: "Confirmation is counted in publishers",
        detail:
          "The headline number is independent publishers, not articles. Two feeds from the same newsroom count as one publisher. A newsroom repeating itself isn't confirmation, and counting it that way would turn the product's only promise on its head.",
      },
      {
        title: "Momentum is stored, not recalculated",
        detail:
          "Momentum fades with time, not with new data: a story that drew ten outlets thirteen hours ago has none now, even though nothing changed its row. A regular sweep resets everything that has aged out. Working it out on every request took 251ms. Reading the stored value takes 7.6ms.",
      },
      {
        title: "Topics decided by a vote",
        detail:
          "A story's topics used to be every tag from every article, so they only ever grew, and the 'main' topic was whichever row came back first. Now each publisher gets one vote, recounted as new coverage arrives, and the winner is saved as the story's main topic.",
      },
    ],
    stack: ["Python", "Django", "Next.js", "TypeScript", "PostgreSQL", "pgvector", "Celery", "Redis"],
    caseStudy: {
      problem:
        "When something happens, fifty outlets write about it. Every news feed shows fifty headlines and leaves you to work out that they are one event. More importantly, it leaves you to work out whether anyone actually confirmed it, or whether fifty outlets are repeating one unchecked wire report. That second question is the one that matters, and no news aggregator answers it.",
      approach:
        "Rebuilt from an old Django monolith around one decision: stories, not articles, come first. 41 RSS feeds are checked in a way that skips anything unchanged (ETag/304, so an unchanged feed costs a quick check and no download). Full articles are fetched with trafilatura, cleaned with nh3, turned into meaning vectors on the server itself with bge-small-en-v1.5, and compared with recent stories using a fast vector search (pgvector HNSW). Articles that are similar enough join one Story, which then counts different publishers, not articles. The three editions, The Wire (newest), Developing (outlets added in the last 12 hours) and The Record (most confirmed), are different orderings of the same stories, not separate collections. That is what stops two of them sitting almost empty. On top of that are two ways to read that don't need an AI model to work: the Briefing, an hourly digest of stories at least two independent newsrooms have reported, and Ask the Wire Room, which finds the right stories and streams an answer with [n] citations, falling back to quoted text when no AI key is set.",
      outcome:
        "The README records 180 passing tests on a live stack, with a clean typecheck and no lint errors. It shipped with a timeline showing when a story became confirmed, side-by-side views that mark the words only one outlet used, summaries that lead with disagreements and are checked before they appear (claims credited to outlets not in the story are dropped), the hourly Briefing, streamed and cited answers with story scope and follow-up questions, an RSS feed per edition, topic pages with a daily pulse (today compared with that topic's usual level, a week of history, and how much of it is confirmed), shareable story cards, video badges that link to the outlet instead of copying the video, tiered data retention, and Prometheus metrics. It is built for phones too: Ask opens as a bottom sheet you can swipe away, with voice input and read-aloud using the browser's own speech features. The whole system runs for $0, with batch work on GitHub Actions runners where the memory is, a 512MB API host, Neon and Vercel, and no feature dropped. After the September storage incident below, it now reports its own database usage on every CI run.",
      highlights: [
        "The grouping threshold is 0.80 because it was measured, not picked. A calibration command recalculates it against hand-labelled pairs. An earlier 0.68 lumped 112 unrelated world-news articles into one story",
        "Bigger embedding models separated the labelled pairs worse, so the small 384-dimension model is a tested result, not a cost-cutting choice",
        "The confirmation count is never produced by AI. It is counted by the database and only shown to the model, which can't create or change it",
        "Topics combine where the publisher filed the piece (the URL section, RSS categories, feed section and the outlet's beat) with what the text is about. Meaning alone had left 28% of live stories with no topic. Coupon and promo-code pages are now dropped when they arrive",
        "Only the newest edition pages through results. Ranking scores change as stories regroup, and paging through a changing value repeats some rows and skips others",
        "Tests can't reach the internet. A rule fails any test that opens an outside connection. It was added after mocked services quietly stopped working and the test suite made real, paid API calls",
        "The 'am I running' and 'am I healthy' checks are separate. /health reports stale data and a grouping backlog, which a restart can't fix, so pointing an orchestrator at it would turn a late scheduled job into a restart loop",
        "Alerts watch the grouping backlog first. Articles that haven't been grouped are invisible to readers, so the site goes stale while every request still looks successful",
      ],
      tradeoffs: [
        {
          decision: "What counts as confirmation",
          chose: "Different publishers, worked out with the Public Suffix List",
          rejected: "Counting articles or feeds",
          why: "One newsroom filing five updates is one source. Counting feeds would let a publisher confirm its own story, which would make the only number the product offers meaningless.",
        },
        {
          decision: "How editions work",
          chose: "Three orderings of all the stories",
          rejected: "Three feeds split by a fixed source count",
          why: "The split put about 95% of stories on one page and left the other two almost always empty. Ordering the same stories means no edition can run dry, and confirmation becomes a signal on every card instead of a separate page.",
        },
        {
          decision: "Grouping articles into stories",
          chose: "By meaning (cosine similarity ≥ 0.80, calibrated)",
          rejected: "Matching exact headlines",
          why: "Three outlets write three different headlines for one event. Exact matching would leave every article on its own forever, which is the very problem the product exists to fix. The threshold sits above every 'different event' pair in the labelled set, because missing a merge is better than inventing one.",
        },
        {
          decision: "A story's main topic",
          chose: "One vote per publisher, recounted as coverage arrives",
          rejected: "Every tag from every article",
          why: "A list of every tag only grows, so stories drifted into every topic any outlet used, and the 'main' topic was whichever row the database returned first. One vote per publisher also means one outlet filing five pieces can't outvote four other newsrooms.",
        },
        {
          decision: "How pages are fetched",
          chose: "Page by time first seen, then ID (first_seen_at, id)",
          rejected: "Page by momentum or ranking score",
          why: "Only values that never change can be paged reliably. Grouping rewrites ranking scores, so paging by them repeats and skips rows. The ranked editions are fixed-size snapshots instead.",
        },
        {
          decision: "Where heavy batch work runs",
          chose: "GitHub Actions runners",
          rejected: "The web server, on a timer",
          why: "Creating embeddings needs a lot of memory for a few minutes, and serving pages needs a little all the time. The runner has 7GB free and the API host 512MB. Doing batch work on the web server gets that backwards and blocks requests while it runs.",
        },
        {
          decision: "How articles are shown",
          chose: "A ~40-word excerpt and a link to the original",
          rejected: "Showing the full article",
          why: "This is an aggregator, not a publisher. Linking out is the obligation that comes with using someone else's work. The same rule keeps publisher videos as links to the outlet rather than a player here.",
        },
      ],
      notice:
        "A high confirmation count isn't a truth score, and the site doesn't present it as one. Ten outlets can repeat one wrong report, and that is exactly what a confirmation count looks like when it fails. A low count isn't a warning sign either: original investigative reporting always starts at one outlet. Known limits: whether publishers are independent is worked out from their domains, so outlets with the same owner count separately; stories worded very differently (\"CBN holds rates\" vs \"Apex Bank keeps policy unchanged\") don't merge; topics sometimes land in the wrong category near the edges; and coverage leans towards English-language feeds.",
      blocks: {
        approach: [
          {
            kind: "architecture",
            caption:
              "The three ideas that make it different (grouping by meaning, counting publishers rather than articles, and editions as orderings) all happen in the grouping step, and none of it uses an AI language model. The model only writes text on top of work that has already succeeded, and can be switched off without the site losing its point.",
            columns: [
              {
                label: "Ingest · Actions cron",
                nodes: [
                  { id: "feeds", label: "41 RSS feeds", detail: "skip unchanged · ETag / 304" },
                  { id: "extract", label: "trafilatura → nh3", detail: "full text, cleaned" },
                ],
              },
              {
                label: "Cluster · no LLM",
                nodes: [
                  { id: "embed", label: "bge-small-en-v1.5", detail: "384d, runs on the server" },
                  { id: "match", label: "pgvector HNSW", detail: "cosine ≥ 0.80 joins a story" },
                  { id: "count", label: "Publisher recount", detail: "Public Suffix List + topic vote" },
                ],
              },
              {
                label: "Serve",
                nodes: [
                  { id: "pg", label: "Postgres + pgvector", detail: "Neon · usage reported per run" },
                  { id: "api", label: "Django Ninja API", detail: "editions · Briefing · Ask (SSE)" },
                  { id: "web", label: "Next.js 16", detail: "ISR, targeted revalidation" },
                ],
              },
            ],
            edges: [
              { from: "feeds", to: "extract" },
              { from: "extract", to: "embed" },
              { from: "embed", to: "match" },
              { from: "match", to: "count" },
              { from: "count", to: "pg" },
              { from: "pg", to: "api" },
              { from: "api", to: "web" },
            ],
          },
          {
            kind: "code",
            lang: "python",
            caption:
              "How a story's confirmation number is counted: one per publisher, not per article or feed. Two BBC feeds are one newsroom, so they count once.",
            href: "https://github.com/emmanuelrichard01/ULTRA-NEWS/blob/main/backend/core/clustering.py",
            code: `def _recount_cluster(story: Story) -> tuple[int, int, bool]:
    """
    Recompute (source_count, independent_count, has_primary_source) from the DB.

    independent_count is the number of distinct *publishers*, not distinct feed
    URLs. Counting feeds meant two BBC feeds read as two independent
    corroborations and falsely promoted the story to Developing.
    """
    rows = story.articles.values_list(
        'source__publisher_domain', 'source__url', 'source__source_type'
    )
    publishers = set()
    has_primary = False
    total = 0
    for domain, url, source_type in rows:
        total += 1
        publishers.add(domain or url)
        if source_type == 'primary':
            has_primary = True
    return total, len(publishers), has_primary`,
          },
        ],
        outcome: [
          {
            kind: "callout",
            text: "The whole system runs for $0 with nothing given up, which is also why a 512MB database limit became a production incident. The field notes below are what that cost, and what now fails loudly if it happens again.",
          },
        ],
      },
      fieldNotes: [
        {
          title: "The database was full, and the feeds took the blame",
          symptom:
            "No new stories for days. The pipeline failed every run with `could not extend file because project size limit (512 MB) has been exceeded`, and healthy publishers, Politico among them, were being switched off by the circuit breaker one after another.",
          wrongTurns: [
            "\"Clean-up broke, so storage grew.\" The job logs showed the opposite: clean-up succeeded every day from Sep 3 to Sep 9 while storage kept climbing, and only started failing once the database was already full",
          ],
          rootCause:
            "Three faults turned a storage limit into a long outage. The data retention windows were sized for a private server (raw data kept 45 days, single-source stories 90) on a 512 MB database, so hitting the limit was a matter of arithmetic, not bad luck. Clean-up couldn't run once the database was full: its first step was an UPDATE, which needs free space to write the new version of a row, so it failed, and the story DELETE after it (the biggest saving, and one that needs no space) never ran. And the ingestion code's catch-all blamed our own database error on the feed being read, so after 12 of them the circuit breaker switched that publisher off.",
          fix: "Retention windows sized for Neon (3, 14 and 10 days) and a 512 MB budget. Clean-up reordered for a full disk: DELETEs first, then VACUUM, then UPDATEs in batches, each separate so one failure no longer skips the rest. Database errors are now raised as database errors instead of being blamed on publishers, and wrongly disabled feeds were switched back on using the recorded reason. The first clean-up after the fix deleted 16,051 single-source stories and re-enabled 9 feeds, and the next run took in 798 articles with no failures.",
          guard:
            "core/tests/test_capacity.py covers the ordering and the error handling, and db_report prints size against budget on every CI run, warning at 80% of live data. The first warning is no longer Neon's own \"100% used\" email.",
        },
        {
          title: "The stream that arrived all at once",
          symptom:
            "Ask the Wire Room was meant to stream its answer. It showed an empty box, then the whole answer at once.",
          rootCause:
            "Two separate layers each stopped the streaming. The answer was generated in full and sent as one piece, and a regular (sync) generator under ASGI is held back until it finishes anyway. Once it was async, gzip compressed each chunk as a separate gzip block, and browsers stop reading after the first one.",
          fix: "An async generator passes words on as soon as the AI provider sends them, and event streams are no longer gzipped. The first word now arrives in under a second.",
        },
        {
          title: "The health check that answered 400 and passed",
          symptom:
            "The API went down on a nightly cycle, and the logs were full of DisallowedHost errors, dozens per instance.",
          rootCause:
            "The hosting platform checked the container using its internal hostname, which wasn't in ALLOWED_HOSTS, and counted Django's 400 error as a pass, so the check meant nothing. Separately, the 'am I running' and 'am I healthy' checks were one endpoint: /health reports a problem when data is stale, which a restart can't fix, so an orchestrator using it would turn a late scheduled job into a restart loop. And the staleness limit allowed 15 minutes of slack for a scheduled job that GitHub sometimes ran up to 138 minutes late overnight.",
          fix: "The container's own hostname is trusted. /health/live only reports that the server is answering and checks nothing else. Data counts as stale after 90 minutes (three missed runs), and that is configurable.",
          guard:
            "Tested against the real container hostname: 200 where it used to return 400, a fake hostname still rejected with 400, and /health/live staying at 200 while /health reports 503.",
        },
        {
          title: "The clean-up job that lost its place",
          symptom:
            "After the topic rules changed, a one-off job to re-label older stories failed in production with `cursor _django_curs_... does not exist`. The first fix then ran past the maintenance job's 30-minute limit.",
          rootCause:
            "The job walked through the stories with Django's .iterator(), which keeps a cursor open on the database for the whole loop. Neon's pooled connection drops that cursor as soon as the first write is saved, so the loop lost its place. It also re-labelled one article at a time, which was too slow over the network from a CI runner to Neon.",
          fix: "Stories are now read in batches by their ID, so nothing has to stay open between writes. Each batch is one read, one bulk update and one rewrite of each topic table, inside a single transaction. The newest stories go first, so a run that gets cut short has already fixed what readers actually see.",
        },
      ],
    },
  },

  {
    id: "caritas-scholar",
    tier: "production",
    title: "CARITAS AI Scholar",
    subtitle: "Intelligent Academic Platform",
    category: "AI / RAG",
    timeline: "2025",
    github: "https://github.com/emmanuelrichard01/caritas-ai-scholar",
    liveUrl: "https://caritas-ai-scholar.vercel.app/",
    image: "/images/caritas-scholar.png",
    metrics: [
      { label: "Workflows", value: "7" },
      { label: "Edge Functions", value: "6" },
      { label: "Access", value: "Row-level" },
    ],
    description:
      "A study platform built with React and Supabase that brings seven student tools together in one place: an AI tutor, course-material analysis (turning a PDF into notes, quizzes and flashcards), study planning, research, a GPA calculator, and a searchable history of everything you've asked. Every AI call runs on the server in Deno edge functions, never in the browser.",
    decisions: [],
    stack: ["TypeScript", "React", "Vite", "Supabase", "Deno", "PostgreSQL", "Gemini", "Tailwind"],
    caseStudy: {
      problem:
        "Students juggle lots of single-purpose tools: one for notes, another for flashcards, a calculator for GPA, a separate search for papers. None of them share anything. Ask a question on Monday and there's no record of it on Friday. For about three thousand students at Caritas University, the problem was never any one tool. It was that none of them knew about each other.",
      approach:
        "One React web app on Supabase, with seven tools sharing one account, one history and one design: an AI tutor, a dashboard, a GPA calculator, a study planner, a course assistant, a research assistant, and a searchable archive of everything you've done. All AI calls run inside Deno edge functions instead of the browser, so no AI provider key is ever sent to a visitor. Uploaded course material goes through set steps (stored, then read and split into sections, then turned into notes, quizzes and flashcards), and each step is saved so the expensive part never has to run twice.",
      outcome:
        "Six edge functions make up the backend: an AI router across Google Gemini, OpenRouter and OpenAI, a document reader, a study-aid generator, an upload handler, an academic search built on Serper, and a health check. Every table that holds a user's data has row-level security, with rules that only let you see your own rows (auth.uid() = user_id). Uploads sit in a private bucket that can only be reached through signed links, and a database trigger creates your profile when you sign up, so the app never has to.",
      highlights: [
        "AI output is repaired rather than trusted. jsonrepair rescues quiz data from almost-valid AI JSON instead of failing the request",
        "The health check tests all three AI providers at once with 5-second timeouts, remembers the result for 30 seconds, and allows 60 requests per hour per IP",
        "The powerful service key never leaves the server, and the browser only ever has the limited public key",
        "Processed material is saved as sections, summaries, quizzes and flashcards, so making a new study aid never re-reads the whole document",
        "Pages that need a login show a sign-in box over a blurred preview instead of sending you away, so you can see what a page offers before being asked to sign up",
      ],
      tradeoffs: [
        {
          decision: "Where AI calls run",
          chose: "Deno edge functions on the server",
          rejected: "Calling the AI straight from the browser",
          why: "Calling from the browser means sending an AI provider key to every visitor. The edge function keeps the key on the server and gives one place to check logins and route requests.",
        },
        {
          decision: "AI provider",
          chose: "A router across several providers (Gemini, OpenRouter, OpenAI)",
          rejected: "One fixed provider",
          why: "Providers limit usage, retire models and go down. Putting them behind one edge function makes switching provider a setting instead of a rewrite.",
        },
        {
          decision: "Where user roles are stored",
          chose: "A separate user_roles table, checked by a protected has_role() function (SECURITY DEFINER)",
          rejected: "A role column on the profiles table",
          why: "Users can edit their own profile row. A role stored there is a way to give yourself admin rights, waiting to be found.",
        },
        {
          decision: "Broken AI output",
          chose: "Repair it with jsonrepair",
          rejected: "Reject it and ask again",
          why: "AI models produce almost-valid JSON often enough that asking again is slower and costs more than fixing it. Asking again is still the fallback when a repair fails.",
        },
      ],
    },
  },
  /* ── TIER 3: SYSTEMS ──────────────────────────────────────────────────── */
  {
    id: "global-rate-limiter",
    tier: "system",
    title: "Global Rate Limiter as a Service",
    subtitle: "High-availability API quota management",
    category: "API Infrastructure",
    timeline: "2026",
    github: null,
    liveUrl: null,
    metrics: [
      { label: "Admission", value: "Exactly 50/300" },
      { label: "Check Latency", value: "p99 <15ms" },
      { label: "Tests", value: "36 / 7 suites" },
    ],
    description:
      "A shared rate limiter for calls to outside APIs that charge or cut you off when you go over a quota. Each client's allowance (a token bucket) lives in Redis and is checked and spent in one atomic Lua script, so the limit holds no matter how many servers are running. If Redis goes down it keeps working on a safe local limit (a bounded fail-open circuit breaker), it logs every request on Redis Streams without slowing the request down, and it caches settings with instant updates through pub/sub.",
    // Left empty deliberately: `tradeoffs` below covers the same decisions
    // with the rejected alternative named, which is strictly more useful.
    decisions: [],
    stack: ["TypeScript", "Node.js", "Express", "Redis", "Lua", "PostgreSQL", "nginx", "Docker"],
    caseStudy: {
      problem:
        "Calls to outside APIs with a quota, such as banking, logistics or AI providers, are counted by the provider, not by you, and going over costs real money. The hard part is that the limit has to hold across many identical servers. If each one keeps its own count, together they go over. This is the reverse of the usual problem. Tools like Kong and Envoy protect your API from people calling in. Here the job is to keep your own outgoing calls inside someone else's budget, and a limiter that blocks everything when it breaks would take the whole fleet down with it.",
      approach:
        "Each client has a token bucket in Redis, and checking and spending tokens happens in one atomic Lua script (called with EVALSHA). Everything else follows from that choice. Redis runs Lua scripts one at a time, so there is no moment when two servers can spend the same tokens. The result doesn't depend on locks, retries or luck. The script uses Redis's own clock (TIME) rather than a time sent by the caller, so clocks drifting apart between machines can't throw off refills. Around that core are three things: a circuit breaker with a safe local fallback, a logging pipeline on Redis Streams that requests never wait for, and a usage dashboard.",
      outcome:
        "36 tests across 7 suites, run against real Redis and Postgres, not mocks. The concurrency promise is proven, not just claimed: 8 separate limiter instances fire 300 requests at the same time at one bucket that holds 50, and exactly 50 get through, every run. Failures were also tested by hand against the built server. With Redis killed mid-traffic, checks kept working through the fallback, /healthz reported the breaker OPEN, and it closed itself after the cooldown with no help. With a log worker killed mid-traffic, the backlog grew instead of entries being lost, and it cleared to zero once a new worker started. Each check takes under 5ms at p50 and under 15ms at p99 against the test thresholds, and as little as 0.3ms live once warmed up. The whole system starts with one command: Redis, Postgres, two API servers behind nginx, and two log workers.",
      highlights: [
        "Processing a log twice is harmless by design. Every log row carries the ID of the Redis stream entry it came from, under a unique index with ON CONFLICT DO NOTHING, so a worker that crashes after saving but before confirming can't create a duplicate billing row",
        "The Lua script uses Redis's own clock (TIME), so clocks drifting apart between servers can't let too many or too few requests through",
        "Keys include a {clientId} hash tag, so moving to Redis Cluster later needs no change to the limiting logic",
        "The breaker fails fast. After three failures in a row, calls skip Redis entirely instead of each waiting out the full 20ms timeout, and only one test request is let through per cooldown, so recovery doesn't arrive as a stampede",
        "Settings are cached in a size-limited LRU, and many requests for the same missing entry share one lookup, so a rush on one client becomes one Postgres query instead of many",
        "Two separate API keys: a service key that can only call /v1/check, and an admin key for anything that changes settings or the breaker",
        "Deleting a client only marks it inactive (active = false), so its billing history survives. A real delete would either wipe that history or be blocked by the database",
      ],
      tradeoffs: [
        {
          decision: "How requests are counted",
          chose: "Token bucket",
          rejected: "Fixed window, sliding window log, leaky bucket",
          why: "A fixed window lets 200 requests through across the edge of two windows when the limit is 100 per window, which rules it out when the whole job is protecting a hard quota. A sliding window log is accurate but stores the time of every request, so memory grows with traffic instead of with the number of clients. A leaky bucket smooths traffic to a steady rate, but the need here is a budget that allows short bursts. A token bucket is two numbers per client and matches the need exactly.",
        },
        {
          decision: "Making check-and-spend one step",
          chose: "One Lua script, run with EVALSHA",
          rejected: "MULTI/EXEC with WATCH, or a distributed lock",
          why: "WATCH works by retrying when something changed underneath it, so it gets slower exactly when traffic is heaviest. Redlock's correctness is disputed even among Redis users, and it costs an extra round trip for what is one key. A Lua script is all-or-nothing by design, which is why the race test can check for an exact number instead of a rough one.",
        },
        {
          decision: "What happens when Redis is down",
          chose: "Fail open, but with limits: each server enforces the real limit on its own",
          rejected: "Block everything, or let everything through",
          why: "Blocking everything breaks the rule that traffic must never be fully stopped. Letting everything through keeps traffic moving but abandons the point of the system, which is avoiding penalties for going over quota, and an outage is the worst time to stop counting. Local limits mean the worst case is N times the intended rate across N servers. That is too much, on purpose, but it has a ceiling.",
        },
        {
          decision: "How logs are moved",
          chose: "Redis Streams with consumer groups",
          rejected: "An in-memory queue, or Kafka",
          why: "The first version used an in-memory queue and lost a batch when the process crashed. That was caught in review and replaced, not designed right the first time. Streams survive crashes, deliver each entry at least once, let several workers share the load, and can reclaim entries a dead worker never confirmed (XAUTOCLAIM), all without adding a new system to a 2.5-day build.",
        },
        {
          decision: "Keeping settings up to date",
          chose: "An LRU cache, instant updates through pub/sub, and a full check every 60 seconds",
          rejected: "Re-reading the whole clients table every few seconds",
          why: "Re-reading every row every few seconds keeps every client in memory whether it is active or not. Pub/sub on its own isn't enough either. Redis pub/sub doesn't retry, so a brief disconnect loses that message for good, and a cache that can go silently and permanently out of date is worse than one that is sometimes 60 seconds behind. This was a real bug: a plan changed directly in SQL never reached clients already in the cache, so the 60-second check went back in as a safety net.",
        },
      ],
      notice:
        "Built to a competition brief (Vega IT), which set up several servers behind a load balancer and required that traffic is never fully blocked. Known limits, stated up front: the single Redis server is a single point of failure for the exact count (the fallback keeps things running, but not exact); the log stream holds about 200,000 entries, so a worker outage longer than that would drop the oldest unprocessed rows; settings changed directly in SQL can take up to 60 seconds to apply; and there is no mutual TLS between services, with login a shared token per tier and demo passwords written into the compose file.",
    },
  },
  {
    id: "cloud-bill-hunter",
    tier: "system",
    title: "Cloud Bill Hunter",
    subtitle: "FinOps Intelligence Platform",
    category: "FinOps",
    timeline: "2025",
    github: "https://github.com/emmanuelrichard01/cloud-bill-hunter",
    liveUrl: null,
    metrics: [
      { label: "Detection", value: "Z-score" },
      { label: "Contracts", value: "Pandera" },
      { label: "Storage", value: "DuckDB" },
    ],
    description:
      "A tool that finds wasted cloud spending. It reads AWS Cost & Usage Reports through an Airflow pipeline with three layers (raw, cleaned, ready to use), spots forgotten 'zombie' resources and sudden cost spikes with statistics, and shows the results through a FastAPI service and a React dashboard.",
    decisions: [],
    stack: ["Python", "FastAPI", "React", "Airflow", "DuckDB", "Terraform", "Pandera", "Docker"],
    caseStudy: {
      problem:
        "Cloud waste hides in plain sight: resources nobody uses, billing every hour. Normal cost reports show the total but not which items are the forgotten ones. And the obvious check, 'usage is zero', misses everything that is nearly idle or has just started spiking.",
      approach:
        "A cost analysis platform over AWS Cost & Usage Reports (CUR). Airflow runs a three-layer pipeline. Pandera checks every raw report against an agreed shape before anything is stored (Bronze), the cleaned layer reshapes it into a star schema with Fact_Usage and Dim_Resource tables (Silver), and the final layer uses statistics (Z-scores against rolling averages) to list zombie resources and flag cost spikes (Gold). A separate FastAPI service passes the results to a React dashboard.",
      outcome:
        "Detection went from a simple 'is it idle?' check to statistical anomaly detection with resources grouped by type. Airflow replaced hand-written folder-watching scripts, adding retries, deadline monitoring and a history of every run. Each cloud provider plugs in behind one shared interface, with GCP and Azure stubbed in to prove it works, and Terraform defines the S3, ECR and ECS deployment.",
      highlights: [
        "Pandera checks the data's shape before it is loaded, because the pipeline doesn't trust its source",
        "Z-score detection against rolling averages replaces the usage == 0 check",
        "Tests check that broken report files are rejected, not just that good ones pass",
        "CI runs Ruff, mypy and pytest on every pull request",
      ],
      tradeoffs: [
        {
          decision: "Running the pipeline",
          chose: "Apache Airflow",
          rejected: "Scripts that watch a folder",
          why: "Retries, deadline monitoring and run history come built in. The folder-watching scripts had no answer for a run that failed halfway.",
        },
        {
          decision: "Dashboard",
          chose: "React + Vite with Recharts",
          rejected: "Streamlit",
          why: "Streamlit was quick to set up but limited both what you could do and how it looked. Rebuilding it gave full control of both.",
        },
        {
          decision: "Storage engine",
          chose: "DuckDB",
          rejected: "A hosted data warehouse",
          why: "A built-in analytics engine is fast enough for cost reports of this size, with nothing to run or pay for.",
        },
      ],
    },
  },
  {
    id: "crypto-pipeline",
    tier: "system",
    title: "Crypto Data Pipeline",
    subtitle: "Market Analytics Engine",
    category: "Data Pipeline",
    timeline: "2025",
    github: "https://github.com/emmanuelrichard01/crypto-data-pipeline",
    liveUrl: null,
    metrics: [
      { label: "Cadence", value: "Hourly" },
      { label: "Freshness SLA", value: "2h alert" },
      { label: "Coverage", value: "80%+" },
    ],
    description:
      "A containerised pipeline that pulls crypto market data from CoinGecko every hour, backing off politely when the API is busy, checks the data with dbt schema tests, and serves trusted analysis in Streamlit, with Grafana watching the pipeline itself.",
    decisions: [],
    stack: ["Python", "dbt", "PostgreSQL", "Redis", "Docker", "Streamlit", "Grafana"],
    caseStudy: {
      problem:
        "Market data is easy to fetch and hard to trust. A public API will happily give you a price. It won't tell you that the last three hours are missing, that a price jumped 40% because of a bad data point rather than the market, or that your dashboard is quietly showing yesterday's numbers. A chart built straight on an API call inherits all of those problems without telling you.",
      approach:
        "An hourly pipeline where trustworthy data is the actual goal, not a side effect. Data is fetched from the CoinGecko API in the background, waiting longer between retries when the API pushes back (exponential backoff). It is loaded into PostgreSQL through SQLAlchemy, and dbt shapes and tests it, so data quality is checked in the warehouse instead of assumed later on. Redis caches frequent reads. Streamlit shows the market analysis and Grafana shows the pipeline's health. They are kept apart on purpose, because \"what is the market doing?\" and \"is the pipeline working?\" are different questions for different people.",
      outcome:
        "The pipeline watches itself. Alerts fire when no data has come in for over two hours, when a run fails, and when a price moves more than 20% in 24 hours. Tests cover fetching, loading, scheduling, health monitoring and settings, with 80%+ coverage, and type hints and PEP 8 style are enforced in CI. Everything runs in containers and is driven by Make, with Alembic migrations and dbt runs as standard commands.",
      highlights: [
        "Fresh data is checked, not assumed. If the fetcher goes quiet, that silence itself triggers an alert",
        "Price moves above 20% in 24 hours are flagged, so a bad data point is noticed instead of plotted",
        "The health monitor has its own tests, so the part that watches the pipeline is checked too",
        "Backing off when the API is busy means rate limits slow a run down instead of breaking it",
      ],
      tradeoffs: [
        {
          decision: "Where data quality is checked",
          chose: "dbt schema tests in the warehouse",
          rejected: "Checks inside the fetching script",
          why: "Checks in the script only cover what that script did. Tests attached to the models check the data on every run, whatever produced it.",
        },
        {
          decision: "Dashboards",
          chose: "Streamlit for analysis, Grafana for operations",
          rejected: "One tool for both",
          why: "Market trends and pipeline health are for different people and need different refresh rates. Putting them on one screen makes both worse.",
        },
        {
          decision: "How often to fetch",
          chose: "Once an hour, in batches",
          rejected: "Live streaming",
          why: "The questions being asked are about trends, not second-by-second ticks. Hourly stays well inside the free API limits and avoids a whole layer of streaming infrastructure that would add nothing here.",
        },
      ],
    },
  },
  {
    id: "evanty",
    tier: "system",
    title: "Evanty",
    subtitle: "Event Management Platform",
    category: "Full-Stack",
    timeline: "2025",
    github: "https://github.com/emmanuelrichard01/Evanty",
    liveUrl: "https://evanty.vercel.app/",
    image: "/images/evanty.png",
    metrics: [
      { label: "Payments", value: "Stripe" },
      { label: "Auth", value: "Clerk" },
    ],
    description:
      "An events platform built with Next.js 14: create and browse events, sign in with Clerk, and pay with Stripe checkout. Data lives in MongoDB, forms are validated with Zod, and webhooks keep user and payment records in sync.",
    decisions: [],
    stack: ["Next.js", "TypeScript", "MongoDB", "Stripe", "Clerk"],
  },

  /* ── TIER 4: ARCHITECTURE STUDIES ──────────────────────────────────────
     Design-stage work. Not built, not running, and labelled as such
     everywhere it renders. `stack` is left empty where no technology was
     actually committed to, rather than filled in with plausible guesses. */
  {
    id: "cbn-data-residency",
    tier: "design",
    title: "CBN Data Residency Migration",
    subtitle: "Reference Architecture for Local Payment Data Storage",
    category: "Regulatory Architecture",
    timeline: "2026",
    github: null,
    liveUrl: null,
    metrics: [{ label: "Compliance Deadline", value: "Jan 2027" }],
    description:
      "A plan for moving Nigerian payment data onto storage inside Nigeria before the Central Bank of Nigeria's January 2027 deadline, set out in Circular PSS/DIR/PUB/CIR/001/004. It maps out the migration steps, where the line around local data sits, and which kinds of data the circular actually covers.",
    decisions: [],
    stack: [],
  },
  {
    id: "smart-meter-telemetry",
    tier: "design",
    title: "Smart Meter & Inverter Telemetry",
    subtitle: "Distributed IoT Telemetry Platform",
    category: "Streaming Architecture",
    timeline: "2026",
    github: null,
    liveUrl: null,
    metrics: [],
    description:
      "A design, not yet built, for collecting live readings from smart meters and solar inverters spread across many sites. Flink processes the stream, Iceberg stores the history as tables, and TimescaleDB serves the time-series data.",
    decisions: [],
    stack: ["Apache Flink", "Apache Iceberg", "TimescaleDB"],
  },
];
