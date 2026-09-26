import React, { useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { ArrowUpRight, Download, Sparkles, Terminal } from "lucide-react";

import TransitionLink from "@/components/ui/TransitionLink";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAsk } from "@/components/ai/AskProvider";
import { PROJECTS } from "@/data/projects";
import { EXPERIENCE } from "@/data/experience";
import { PRINCIPLES } from "@/data/principles";
import { CV_FILE_SIZE, downloadCV } from "@/lib/cv";
import { trackPointer } from "@/lib/pointer";
import { scrollToElementAndLand } from "@/lib/scrollToSection";
import { STACK_GROUPS } from "@/components/about/stackGroups";
import { stackUsage } from "@/components/about/stackUsage";

/* ==========================================================================
   ABOUT

   Three things, in the order a reader wants them:

     who        a heading that states what the work was and stops, the bio
                (revealed by scroll), and the figures — each with its source
     how        four working principles, each carrying a receipt: a line
                quoted verbatim from a case study, one click from the
                section that shows it (data/principles.ts — a test fails the
                build if a quote stops matching its source)
     with what  the stack, weighted by where it actually shipped: a bar per
                technology counted from the projects and roles, the list on
                hover, and a click that filters the Work section to it

   The through-line is the site's own: nothing here is asserted that the
   page cannot show. The earlier version's bento — "what I build", three
   counters, a wall of logo chips — said the same things with less proof.

   This section emerges out of the hero's dive into the event horizon: it
   is rendered as the hero's child and revealed as the dive completes (see
   Hero.tsx), which is why it has no entrance of its own at the top.
   ========================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

/* Narrowed to what the work actually demonstrates. "Cloud infrastructure"
   has been considered and rejected twice: five projects are fintech, one is
   cloud infrastructure, and AWS appears in zero project stacks. */
const ROLES = ["Data engineering", "Backend systems", "Fintech infrastructure"];

/* Each maps onto a shipped project rather than a generic capability. */
const BUILDS = ["event-driven pipelines", "payment reconciliation", "real-time streaming", "analytics warehouses"];

/* Every figure is countable, and every figure states where it came from.
   The originals ("12M+ Events/Day", "99.9% Uptime") matched nothing in the
   data; "99.9% Data Accuracy" had no denominator. These three can each be
   checked. The test count sums shipped systems: 160+ (MMR Engine) + 36 (Rate
   Limiter) + 21 dbt schema tests and 9 pipeline checks (Modern Warehouse). */
const METRICS = [
  { value: 1.5, suffix: "M+", label: "records processed", source: "Olist warehouse, one run", href: "/projects/modern-warehouse" },
  { value: 220, suffix: "+", label: "automated tests", source: "across shipped systems", href: null },
  { value: 50, suffix: "K+", label: "users served", source: "TAC Africa platform", href: null },
];

/* -------------------------------------------------------------------------- */
/* BIO — a scroll-driven reveal                                                */
/* -------------------------------------------------------------------------- */

/* One word of the reveal, at module scope so its type is stable across
   renders (declared inline it remounted every word on every render).

   Blur carries the reveal; colour and a floored opacity carry the lift.
   Alpha alone cannot be made accessible here — nothing under 0.9 passes AA
   on this background — but a blurred glyph and a sharp one are the same
   colour, so the worst point of the sweep still measures 4.75:1. Literal
   colours because framer cannot interpolate hsl(var(--x)). */
const RevealWord = ({ word, index, total, progress }: { word: string; index: number; total: number; progress: MotionValue<number> }) => {
  const start = index / total;
  const end = Math.min(start + 2 / total, 1);
  const blur = useTransform(progress, [start, end], ["blur(5px)", "blur(0px)"]);
  const color = useTransform(progress, [start, end], ["hsl(0 0% 53%)", "hsl(0 0% 90%)"]);
  const opacity = useTransform(progress, [start, end], [0.9, 1]);
  return (
    <motion.span style={{ filter: blur, color, opacity }} className="relative inline-block mr-[0.28em]">
      {word}
    </motion.span>
  );
};

const RevealText = ({ text, className = "" }: { text: string; className?: string }) => {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: container, offset: ["start 0.9", "start 0.45"] });
  const words = useMemo(() => text.split(" "), [text]);
  const prefersReduced = useReducedMotion();

  /* Under reduced motion, a paragraph. The ref must still land on an
     element: useScroll throws if its target is empty after mount, which once
     took the home page down for exactly the visitors this branch is for. */
  if (prefersReduced) {
    return (
      <div ref={container}>
        <p className={`text-foreground/90 ${className}`}>{text}</p>
      </div>
    );
  }
  return (
    <div ref={container} className={`flex flex-wrap ${className}`}>
      {words.map((word, i) => (
        <RevealWord key={i} word={word} index={i} total={words.length} progress={scrollYProgress} />
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* SMALL PARTS                                                                */
/* -------------------------------------------------------------------------- */

const Label = ({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-4 mb-5">
    <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">
      <span className="text-primary mr-2">//</span>
      {children}
    </h3>
    {aside && <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground text-right">{aside}</span>}
  </div>
);

const Portrait = () => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="group relative w-14 h-14 shrink-0 border border-border overflow-hidden bg-muted">
      {failed ? (
        <div className="w-full h-full flex items-center justify-center font-mono text-sm text-muted-foreground">EM</div>
      ) : (
        <img
          src="/images/avatar.jpg"
          alt="Emmanuel Moghalu"
          width={56}
          height={56}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover grayscale contrast-110 transition-[filter] duration-700 group-hover:grayscale-0"
          onError={() => setFailed(true)}
        />
      )}
      {/* An accent wash that lifts on hover, with the photo coming into
          colour — the one warm thing in the identity row. */}
      <span className="absolute inset-0 bg-primary/25 mix-blend-color transition-opacity duration-700 group-hover:opacity-0" aria-hidden="true" />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* FIGURES                                                                    */
/* -------------------------------------------------------------------------- */

/* The same ledger the Work header carries — one row of cells, a figure over
   its label — with one addition Work does not need: the source under each
   figure, because these are the only numbers on the page that are not
   counted from the page itself. */
const Figures = () => (
  <dl className="grid grid-cols-3 border border-border divide-x divide-border bg-card/30 self-start lg:self-end">
    {METRICS.map((m) => {
      const cell = (
        <>
          <dd className="font-mono text-xl md:text-2xl text-foreground tabular-nums leading-none">
            <AnimatedCounter target={m.value} suffix={m.suffix} />
          </dd>
          <dt className="mt-2 font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/80 whitespace-nowrap">{m.label}</dt>
          {/* Attribution, not decoration — and legible. */}
          <p className="mt-1 font-mono text-[9px] text-muted-foreground leading-snug">
            {m.source}
            {m.href && <ArrowUpRight className="inline w-2.5 h-2.5 ml-0.5 -mt-0.5 text-primary/80" aria-hidden="true" />}
          </p>
        </>
      );
      return m.href ? (
        <TransitionLink key={m.label} to={m.href} className="block px-4 py-3 min-w-[104px] hover:bg-primary/[0.04] transition-colors">
          {cell}
        </TransitionLink>
      ) : (
        <div key={m.label} className="px-4 py-3 min-w-[104px]">
          {cell}
        </div>
      );
    })}
  </dl>
);

/* The person behind the page: portrait, name, roles, whereabouts, and the
   two things someone who has read this far wants. A panel, like the Work
   section's, so it reads as part of the same instrument. */
const Profile = ({ onAsk }: { onAsk: () => void }) => (
  <aside
    onPointerMove={trackPointer}
    className="pointer-glow relative border border-border bg-card/30 p-5 md:p-6 flex flex-col gap-5"
    aria-label="Profile"
  >
    <span className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-primary/60 via-primary/15 to-transparent" aria-hidden="true" />
    <div className="flex items-center gap-4 min-w-0">
      <Portrait />
      <div className="min-w-0">
        <p className="text-[16px] font-semibold text-foreground">Emmanuel Moghalu</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mt-1">Abuja, Nigeria · UTC+1</p>
      </div>
    </div>
    <ul className="flex flex-wrap gap-1.5" aria-label="Roles">
      {ROLES.map((role) => (
        <li key={role} className="font-mono text-[10px] uppercase tracking-wider text-primary border border-primary/25 bg-primary/5 px-2 py-1">
          {role}
        </li>
      ))}
    </ul>
    <div className="mt-auto flex items-center gap-2">
      <button
        type="button"
        onClick={onAsk}
        className="flex-1 inline-flex items-center justify-center gap-2 border border-primary/40 bg-primary/5 px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-widest text-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
        ask how he works
      </button>
      <button
        type="button"
        onClick={downloadCV}
        aria-label={`Download CV (PDF, ${CV_FILE_SIZE})`}
        className="group inline-flex items-center gap-2 border border-border px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
      >
        <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" aria-hidden="true" />
        cv
      </button>
    </div>
  </aside>
);

/* -------------------------------------------------------------------------- */
/* PRINCIPLES                                                                 */
/* -------------------------------------------------------------------------- */

const SECTION_LABEL: Record<string, string> = {
  problem: "problem",
  approach: "approach",
  outcome: "outcome",
  tradeoffs: "trade-offs",
  "field-notes": "field notes",
};

const Principles = () => {
  const ref = useRef<HTMLOListElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const prefersReduced = useReducedMotion();

  return (
    <ol ref={ref} className="grid md:grid-cols-2 xl:grid-cols-4 gap-px bg-border border border-border">
      {PRINCIPLES.map((principle, i) => {
        const project = PROJECTS.find((p) => p.id === principle.projectId);
        return (
          <motion.li
            key={principle.id}
            initial={prefersReduced ? false : { opacity: 0, y: 14 }}
            animate={inView || prefersReduced ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
            className="bg-background"
          >
            <TransitionLink
              to={`/projects/${principle.projectId}#${principle.section}`}
              onPointerMove={trackPointer}
              className="pointer-glow group flex flex-col h-full p-5 md:p-6"
            >
              <span className="font-mono text-[10px] tabular-nums text-primary">{String(i + 1).padStart(2, "0")}</span>
              <span className="mt-3 text-[17px] font-semibold text-foreground leading-snug tracking-tight">{principle.title}</span>
              <span className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{principle.gist}</span>

              {/* The receipt. Quoted, marked as a quote, and attributed. */}
              <blockquote className="mt-5 border-l border-primary/40 group-hover:border-primary pl-3.5 transition-colors">
                <p className="font-mono text-[11.5px] leading-relaxed text-foreground/70 group-hover:text-foreground/90 transition-colors">
                  &ldquo;{principle.evidence}&rdquo;
                </p>
              </blockquote>
              <span className="mt-auto pt-5 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-widest">
                <span className="text-muted-foreground truncate">
                  {project?.title} · {SECTION_LABEL[principle.section]}
                </span>
                <ArrowUpRight
                  className="w-3.5 h-3.5 shrink-0 text-muted-foreground group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all"
                  aria-hidden="true"
                />
              </span>
            </TransitionLink>
          </motion.li>
        );
      })}
    </ol>
  );
};

/* -------------------------------------------------------------------------- */
/* STACK                                                                      */
/* -------------------------------------------------------------------------- */

/* Filters the Work section to one technology and takes the visitor to the
   results — the catalogue, not the top of the section, which would land on
   the flagship stage above them. Work listens for the event rather than
   this component reaching into its state; the scroll waits for the filter
   to render and checks where it landed (see scrollToElementAndLand), which
   is what stops it coming to rest half way. */
function showWorkWith(tech: string) {
  window.dispatchEvent(new CustomEvent("emc:work-filter", { detail: { stack: tech } }));
  void scrollToElementAndLand("work-catalogue");
}

const Stack = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const prefersReduced = useReducedMotion();

  const usage = useMemo(() => {
    const names = STACK_GROUPS.flatMap((g) => g.items.map((i) => i.name));
    return new Map(stackUsage(names, PROJECTS, EXPERIENCE).map((u) => [u.name, u]));
  }, []);
  const max = Math.max(...[...usage.values()].map((u) => u.count));

  return (
    <div ref={ref} className="border-t border-border">
      {STACK_GROUPS.map((group, g) => (
        <div key={group.label} className="grid sm:grid-cols-[10rem_1fr] gap-x-6 gap-y-3 py-4 border-b border-border">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:pt-2">{group.label}</span>
          <ul className="flex flex-wrap gap-2">
            {group.items.map((item, i) => {
              const u = usage.get(item.name)!;
              const inWork = u.projects.length > 0;
              return (
                <motion.li
                  key={item.name}
                  initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                  animate={inView || prefersReduced ? { opacity: 1, y: 0 } : undefined}
                  transition={{ duration: 0.35, delay: g * 0.06 + i * 0.03 }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => inWork && showWorkWith(item.name)}
                        aria-label={`${item.name}: used in ${u.projects.length} project${u.projects.length === 1 ? "" : "s"} and ${u.roles.length} role${u.roles.length === 1 ? "" : "s"}${inWork ? ". Show those projects" : ""}`}
                        className={`group relative flex flex-col gap-1.5 border border-border px-2.5 pt-1.5 pb-2 text-left transition-colors ${
                          inWork ? "hover:border-primary/50 cursor-pointer" : "cursor-default"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-muted-foreground group-hover:text-foreground transition-colors">
                          <item.icon className="w-3.5 h-3.5" aria-hidden="true" />
                          <span className="font-mono text-[10px] uppercase tracking-wider whitespace-nowrap">{item.name}</span>
                          <span className="font-mono text-[10px] tabular-nums text-muted-foreground/80 ml-1">{u.count}</span>
                        </span>
                        {/* Weight: where it actually shipped, relative to the most-used. */}
                        <span className="h-[2px] w-full bg-border overflow-hidden" aria-hidden="true">
                          <motion.span
                            className="block h-full bg-primary/70 group-hover:bg-primary origin-left"
                            initial={prefersReduced ? false : { scaleX: 0 }}
                            animate={inView || prefersReduced ? { scaleX: u.count / max } : undefined}
                            transition={{ duration: 0.8, delay: 0.2 + g * 0.06 + i * 0.03, ease: EASE }}
                          />
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="rounded-none border-border bg-card px-3 py-2.5 max-w-[260px]"
                    >
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary mb-1.5">{item.name}</p>
                      {u.projects.length > 0 && (
                        <p className="text-[12px] text-foreground/85 leading-snug">
                          {u.projects.slice(0, 4).map((p) => p.title).join(" · ")}
                          {u.projects.length > 4 ? ` +${u.projects.length - 4}` : ""}
                        </p>
                      )}
                      {u.roles.length > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-1">at {u.roles.join(", ")}</p>
                      )}
                      {inWork && (
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-2">click to show the work</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </motion.li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* SECTION                                                                    */
/* -------------------------------------------------------------------------- */

const About: React.FC = () => {
  const { openAsk } = useAsk();
  const techCount = STACK_GROUPS.reduce((n, g) => n + g.items.length, 0);

  return (
    <section id="about" data-section="about" className="relative pt-24 md:pt-28 pb-24" aria-label="About">
      <div className="container px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        {/* ── Header ──
            The block every module opens with — eyebrow, two-tone heading,
            one line of description, a mono meta line, the ledger to the
            right, a hairline under it all — so About reads as module 01 of
            the same system rather than a page of its own. It is also the
            first thing to grow out of the black hole (Hero.tsx), so it is
            composed to be seen whole on one screen. */}
        <div className="mb-12 border-b border-border pb-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
              <Terminal className="w-4 h-4 text-primary" aria-hidden="true" />
              Module 01 // Overview
            </p>
            {/* States what the work was and stops. Two earlier headings made
                claims — "millions of daily operations", "the happy path is
                the easy half" — the page could not back. */}
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
              Systems that stay <span className="text-muted-foreground font-mono font-normal">correct</span>
            </h2>
            <p className="text-[15px] md:text-[13px] text-muted-foreground max-w-md font-light leading-relaxed">
              Data and backend engineering since 2018 — fintech, logistics, health and analytics. What ships comes with
              the tests that prove its failure paths hold.
            </p>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-4">
              2018 — now · {BUILDS.join(" · ")}
            </p>
          </div>
          <Figures />
        </div>

        {/* ── Bio + profile ── */}
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-7">
            <Label>in his words</Label>
            <RevealText
              text="Most of my time goes to the parts nobody demos: Redis going down mid-traffic, a settlement webhook that never arrives, two instances spending the same token at once. The case studies on this site are those parts, written down — what was chosen, what was rejected, and what broke on the way."
              className="text-[19px] md:text-[22px] leading-[1.6] tracking-[-0.005em] max-w-[34ch] md:max-w-[40ch]"
            />
          </div>
          <div className="lg:col-span-5 lg:pt-10">
            <Profile onAsk={() => openAsk({ question: "how does he work, and what's the evidence?" })} />
          </div>
        </div>

        {/* ── How ── */}
        <div className="mt-20">
          <Label aside="each with its receipt">how i work</Label>
          <Principles />
        </div>

        {/* ── With what ── */}
        <div className="mt-20">
          <Label aside={`${techCount} technologies · weighted by where they shipped`}>stack</Label>
          <Stack />
        </div>
      </div>
    </section>
  );
};

export default About;
