import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { ArrowRight, ArrowUpRight, Download, Sparkles } from "lucide-react";

import TransitionLink from "@/components/ui/TransitionLink";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { Reveal, RevealText, Rule, SectionHead } from "@/components/ui/Reveal";
import { useAsk } from "@/components/ai/AskProvider";
import { PROJECTS } from "@/data/projects";
import { EXPERIENCE } from "@/data/experience";
import { PRINCIPLES } from "@/data/principles";
import { WRITING } from "@/data/writing";
import { CV_FILE_SIZE, downloadCV } from "@/lib/cv";
import { formatDuration } from "@/lib/tenure";
import { scrollToElementAndLand } from "@/lib/scrollToSection";
import { STACK_GROUPS } from "@/components/about/stackGroups";
import { stackUsage, type Usage } from "@/components/about/stackUsage";
import { buildFigures, formatCount, type Figure } from "@/components/about/figures";
import { CAPABILITIES } from "@/components/about/capabilities";
import { GITHUB, githubFacts, snapshotDate } from "@/components/about/background";
import { useCardPlacement } from "@/components/about/useCardPlacement";

/* ==========================================================================
   ABOUT

   Set as the monograph's opening pages, in the order a reader wants them:

     who        the title and what the work was, then the bio (read as one
                large paragraph) beside a portrait plate and the two doors
                (the CV, the assistant)
     counted    three figures, each derived from the site's own data and
                each showing its working when pointed at or tapped
                (about/figures.ts: the test count is a sum, rounded down)
     how        four working principles in plain words, each with one
                example from a case study and a link to where it is shown
                (data/principles.ts: a test fails the build if the fact an
                example rests on stops appearing in its project)
     what       two ways into the same work: what I can do (about/
                capabilities.ts, each row backed by words in its projects)
                and the tools (the stack index, weighted by where each one
                actually shipped; a tool filters the Work section)
     beyond     open source counted from GitHub, and writing or talks, each
                shown only when there is something real to show

   Nothing here is asserted that the page cannot show.

   This section emerges out of the hero's dive into the event horizon: it
   is rendered as the hero's child and revealed as the dive completes (see
   Hero.tsx), which is why its own top padding is shorter than a section's.
   ========================================================================== */

/* Narrowed to what the work actually demonstrates. "Cloud infrastructure"
   has been considered and rejected twice: five projects are fintech, one is
   cloud infrastructure, and AWS appears in zero project stacks. */
const ROLES = ["Data engineering", "Backend systems", "Fintech infrastructure"];

/* Derived once: the data is static for the life of the page. */
const FIGURES = buildFigures(PROJECTS, EXPERIENCE);

const BIO =
  "Most of my time goes to the parts nobody shows in a demo: a cache that goes down in the middle of busy traffic, a payment confirmation that never arrives, two servers spending the same allowance at once. The case studies on this site are those parts, written down: what I chose, what I turned down, and what broke along the way.";

/* -------------------------------------------------------------------------- */
/* BIO — read in as it is scrolled to                                          */
/* -------------------------------------------------------------------------- */

/* One word of the reveal, at module scope so its type is stable across
   renders. Blur carries the reveal; colour lifts from caption grey to ink.
   Both ends are full-opacity text colours — caption grey is 5.7:1 on the
   stock — so the worst point of the sweep still passes AA. Literal colours
   because framer cannot interpolate hsl(var(--x)). */
const BioWord = ({ word, index, total, progress }: { word: string; index: number; total: number; progress: MotionValue<number> }) => {
  const start = index / total;
  const end = Math.min(start + 2 / total, 1);
  // `none` once sharp: blur(0px) is still a filter layer.
  const blur = useTransform(progress, (p) => {
    const t = Math.min(1, Math.max(0, (p - start) / (end - start)));
    return t >= 1 ? "none" : `blur(${4 * (1 - t)}px)`;
  });
  const color = useTransform(progress, [start, end], ["hsl(240 2% 55%)", "hsl(60 6% 94%)"]);
  return (
    <motion.span style={{ filter: blur, color }} className="inline-block mr-[0.26em]">
      {word}
    </motion.span>
  );
};

const Bio = ({ text, className = "" }: { text: string; className?: string }) => {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: container, offset: ["start 0.92", "start 0.4"] });
  const words = useMemo(() => text.split(" "), [text]);
  const prefersReduced = useReducedMotion();

  /* Under reduced motion, a paragraph. The ref must still land on an
     element: useScroll throws if its target is empty after mount. */
  if (prefersReduced) {
    return (
      <div ref={container}>
        <p className={`text-foreground ${className}`}>{text}</p>
      </div>
    );
  }
  return (
    <div ref={container}>
      {/* Read as one sentence by assistive tech, not word by word. */}
      <p className="sr-only">{text}</p>
      <p aria-hidden="true" className={className}>
        {words.map((word, i) => (
          <BioWord key={i} word={word} index={i} total={words.length} progress={scrollYProgress} />
        ))}
      </p>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* FIGURES                                                                    */
/* -------------------------------------------------------------------------- */

/* Three figures in a ruled row, set at reading scale rather than as hero
   numbers: the figure, what it counts, and where it came from. Each one
   shows its working: pointing at it (or focusing it) previews the parts it
   was added up from, and a click or tap keeps that open, with links to
   where each part is written. Only one is open at a time. */

type ShownBy = "preview" | "pinned";

/** The working behind one figure: its parts, what each counted, and where. */
const Receipts = ({ figure }: { figure: Figure }) => (
  <>
    <p className="t-caption">
      {figure.exact ? (
        <>
          <span className="text-foreground">{figure.exact} in total</span>, shown rounded down. Added up from:
        </>
      ) : (
        "Where this number is written:"
      )}
    </p>
    <ul className="mt-2 divide-y divide-border border-t border-border">
      {figure.receipts.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 py-2.5">
          <span className="min-w-0">
            {r.href ? (
              <TransitionLink to={r.href} className="group/r inline-flex items-center gap-1 text-[13px] text-foreground">
                <span className="link-draw">{r.label}</span>
                <ArrowUpRight className="w-3 h-3 transition-transform duration-300 group-hover/r:-translate-y-px group-hover/r:translate-x-px" aria-hidden="true" />
              </TransitionLink>
            ) : (
              <span className="text-[13px] text-foreground">{r.label}</span>
            )}
            <span className="block mt-0.5 text-[12px] leading-snug text-muted-foreground first-letter:uppercase">{r.note}</span>
          </span>
          <span className="t-figure text-[13px] text-foreground pt-px">{r.value}</span>
        </li>
      ))}
    </ul>
  </>
);

/* The panel is placed like the stack cards: below its figure when there is
   room, above it otherwise, slid sideways to stay on screen. Its wrapper's
   padding (not margin) bridges the gap to the figure, so a pointer can travel
   from one to the other without the preview closing on the way. */
const ReceiptsPanel = ({ id, figure, by }: { id: string; figure: Figure; by: ShownBy }) => {
  const ref = useRef<HTMLDivElement>(null);
  const place = useCardPlacement(ref, "bottom");
  const side = place?.side ?? "bottom";
  const prefersReduced = useReducedMotion();
  return (
    <div
      ref={ref}
      id={id}
      role="region"
      aria-label={`How ${figure.label.toLowerCase()} was counted`}
      style={{ transform: `translateX(${place?.shift ?? 0}px)`, visibility: place ? "visible" : "hidden" }}
      className={`absolute left-0 z-30 w-[min(400px,calc(100vw-2rem))] ${side === "bottom" ? "top-full pt-3" : "bottom-full pb-3"}`}
    >
      <motion.div
        key={side}
        initial={prefersReduced ? false : { opacity: 0, y: side === "bottom" ? -6 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="bg-popover p-4 text-left shadow-[0_0_0_1px_hsl(var(--rule-strong)),0_18px_48px_-16px_rgba(0,0,0,0.8)]"
      >
        <Receipts figure={figure} />
        {by === "preview" && <p className="mt-3 text-[12px] text-muted-foreground">Click to keep this open.</p>}
      </motion.div>
    </div>
  );
};

const Figures = () => {
  const [shown, setShown] = useState<{ id: Figure["id"]; by: ShownBy } | null>(null);
  const container = useRef<HTMLUListElement>(null);
  const base = useId();
  const pinned = shown?.by === "pinned";

  // A press anywhere else, or Escape, puts it away.
  useEffect(() => {
    if (!shown) return;
    const onDown = (e: PointerEvent) => {
      if (!container.current?.contains(e.target as Node)) setShown(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShown(null);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [shown]);

  const preview = (id: Figure["id"]) => setShown((cur) => (cur?.by === "pinned" ? cur : { id, by: "preview" }));
  const unpreview = (id: Figure["id"]) => setShown((cur) => (cur?.by === "preview" && cur.id === id ? null : cur));

  return (
    <ul ref={container} className="grid grid-cols-3 border-t border-border">
      {FIGURES.map((f, i) => {
        const open = shown?.id === f.id;
        const panelId = `${base}-receipts-${f.id}`;
        const figure = `${formatCount(f.value)}${f.suffix}`;
        return (
          <Reveal
            as="li"
            key={f.id}
            delay={i * 0.08}
            className={`relative min-w-0 ${i > 0 ? "border-l border-border pl-3 min-[480px]:pl-5 sm:pl-8 lg:pl-10" : "pr-2"}`}
          >
            <div
              className="relative"
              onPointerEnter={(e) => e.pointerType === "mouse" && preview(f.id)}
              onPointerLeave={(e) => e.pointerType === "mouse" && unpreview(f.id)}
              onBlur={(e) => {
                // Moving focus into its own panel keeps it open.
                if (!e.currentTarget.contains(e.relatedTarget as Node)) unpreview(f.id);
              }}
            >
              <button
                type="button"
                aria-expanded={open}
                aria-controls={open ? panelId : undefined}
                aria-label={`${figure} ${f.label.toLowerCase()}, ${f.source.toLowerCase()}. ${open && pinned ? "Hide" : "Show"} how it was counted`}
                onFocus={(e) => {
                  if (e.currentTarget.matches(":focus-visible")) preview(f.id);
                }}
                onClick={() => setShown(open && pinned ? null : { id: f.id, by: "pinned" })}
                className="tap group block w-full text-left py-5 sm:py-7"
              >
                <span className="block t-figure text-[clamp(1.375rem,1rem+1.6vw,2.25rem)] leading-none text-foreground">
                  <AnimatedCounter target={f.value} suffix={f.suffix} />
                </span>
                <span className="block mt-2.5 sm:mt-3 text-[13px] sm:text-[15px] leading-snug text-foreground">{f.label}</span>
                <span className="mt-1 t-caption hidden min-[480px]:flex items-center gap-1">
                  <span
                    className={`bg-[linear-gradient(currentColor,currentColor)] bg-no-repeat bg-[position:0_100%] pb-px transition-[background-size] duration-500 ease-out-expo ${
                      open ? "bg-[length:100%_1px]" : "bg-[length:0%_1px] group-hover:bg-[length:100%_1px]"
                    }`}
                  >
                    {f.source}
                  </span>
                </span>
                {/* The affordance, said once in words: where to look for the working. */}
                <span className={`mt-2 block text-[12px] transition-colors ${open ? "text-foreground" : "text-muted-quiet group-hover:text-muted-foreground"}`}>
                  {open && pinned ? "Hide the working" : "Show the working"}
                </span>
              </button>
              <AnimatePresence>{open && shown && <ReceiptsPanel id={panelId} figure={f} by={shown.by} />}</AnimatePresence>
            </div>
          </Reveal>
        );
      })}
    </ul>
  );
};

/* -------------------------------------------------------------------------- */
/* PORTRAIT                                                                   */
/* -------------------------------------------------------------------------- */

/* A square plate with its caption, and the two doors under it. On a phone
   the plate is small and sits beside its caption, so the photograph does
   not take a whole screen to scroll past. The photograph is set in
   greyscale like the rest of the stock and comes into colour when it is
   pointed at. */
const Portrait = ({ onAsk }: { onAsk: () => void }) => {
  const [failed, setFailed] = useState(false);
  const prefersReduced = useReducedMotion();

  return (
    <figure className="w-full sm:max-w-[380px]" aria-label="Profile">
      <div className="grid grid-cols-[96px_minmax(0,1fr)] sm:grid-cols-1 items-center gap-x-5">
        <motion.div
          className="plate group aspect-square"
          initial={prefersReduced ? false : { clipPath: "inset(0% 0% 100% 0%)" }}
          whileInView={prefersReduced ? undefined : { clipPath: "inset(0% 0% 0% 0%)" }}
          viewport={{ once: true, margin: "0px 0px -12% 0px" }}
          transition={{ duration: 1.25, ease: [0.77, 0, 0.18, 1] }}
        >
          {failed ? (
            <div className="w-full h-full flex items-center justify-center font-display text-2xl sm:text-5xl text-muted-foreground">EM</div>
          ) : (
            <img
              src="/images/avatar.jpg"
              alt="Emmanuel Moghalu"
              width={756}
              height={756}
              loading="lazy"
              decoding="async"
              className="grayscale contrast-[1.05] transition-[filter,transform] duration-1000 ease-out-expo group-hover:grayscale-0"
              onError={() => setFailed(true)}
            />
          )}
        </motion.div>

        <figcaption className="sm:mt-5">
          <p className="t-subhead text-foreground">Emmanuel Moghalu</p>
          <p className="t-caption mt-1">Abuja, Nigeria · UTC+1</p>
          <p className="t-caption mt-2 sm:mt-3">{ROLES.join(" · ")}</p>
        </figcaption>
      </div>

      {/* The two doors, at equal weight: the CV for a hiring team, the
          assistant for anyone who wants to ask first. */}
      <div className="mt-6 sm:mt-7 grid grid-cols-1 min-[400px]:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={downloadCV}
          aria-label={`Download CV (PDF, ${CV_FILE_SIZE})`}
          className="btn-line tap group !px-3 !gap-2 !text-[14px] whitespace-nowrap"
        >
          <Download className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5" aria-hidden="true" />
          Download CV
        </button>
        <button type="button" onClick={onAsk} className="btn-line tap group !px-3 !gap-2 !text-[14px] whitespace-nowrap">
          <Sparkles className="w-4 h-4 text-primary transition-transform duration-500 ease-out-expo group-hover:rotate-12" aria-hidden="true" />
          Ask how he works
        </button>
      </div>
    </figure>
  );
};

/* -------------------------------------------------------------------------- */
/* SUB-HEAD                                                                   */
/* -------------------------------------------------------------------------- */

/* A page within the section: a drawn rule, the sub-title under it, and a
   quiet aside on the right. */
const SubHead = ({ title, aside, id }: { title: string; aside?: React.ReactNode; id?: string }) => (
  <div className="mb-10 md:mb-14">
    <Rule className="mb-8" />
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
      <RevealText as="h3" id={id} className="t-heading text-foreground">
        {title}
      </RevealText>
      {aside && (
        <Reveal as="p" className="t-caption" delay={0.2} y={0}>
          {aside}
        </Reveal>
      )}
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* PRINCIPLES                                                                 */
/* -------------------------------------------------------------------------- */

/* Numbered, so a principle can be named in a conversation. The title sits
   large on the left; on the right, what it means in plain words, then one
   example from a real project and a link to where the case study shows it.

   It reads like a page being followed with a finger: the principle in the
   middle of the screen is the lit one, its number in the accent and its
   title in full ink, while the others step back to grey. The fact each
   example rests on (its `anchor`) is underlined as it arrives, because that
   one detail is the proof. Under reduced motion nothing is lit: every row
   reads at full strength, numbers stay grey and the underlines are ink, so
   the accent never marks four things at once. */
const Principles = () => {
  const reduced = useReducedMotion();

  return (
    <div className="relative">
      <ol>
        {PRINCIPLES.map((principle, i) => (
          <PrincipleRow key={principle.id} principle={principle} index={i} reduced={Boolean(reduced)} />
        ))}
      </ol>
    </div>
  );
};

/** The example, with the fact it rests on underlined in the accent as it arrives. */
const MarkedExample = ({ text, anchor, lit, ink }: { text: string; anchor: string; lit: boolean; ink: boolean }) => {
  const at = text.indexOf(anchor);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span
        className={`text-foreground bg-no-repeat bg-[position:0_100%] pb-px transition-[background-size] duration-[1100ms] ease-out-expo ${
          ink ? "bg-[linear-gradient(currentColor,currentColor)]" : "bg-[linear-gradient(hsl(var(--primary)),hsl(var(--primary)))]"
        }`}
        style={{ backgroundSize: lit ? "100% 1px" : "0% 1px" }}
      >
        {anchor}
      </span>
      {text.slice(at + anchor.length)}
    </>
  );
};

const PrincipleRow = ({
  principle,
  index,
  reduced,
}: {
  principle: (typeof PRINCIPLES)[number];
  index: number;
  reduced: boolean;
}) => {
  const ref = useRef<HTMLLIElement>(null);
  const project = PROJECTS.find((p) => p.id === principle.projectId);
  // Lit while the row crosses the middle band of the screen.
  const centred = useInView(ref, { margin: "-42% 0px -42% 0px" });
  // Seen once: the proof's underline stays drawn after the row has passed.
  const seen = useInView(ref, { once: true, margin: "0px 0px -30% 0px" });
  // In motion, only the centred row is lit; under reduced motion none is,
  // and every row reads at full strength instead.
  const lit = !reduced && centred;
  const full = reduced || centred;

  return (
    <li
      ref={ref}
      className="group relative border-t border-border grid grid-cols-[2.25rem_minmax(0,1fr)] md:grid-cols-[3.5rem_minmax(0,5fr)_minmax(0,6fr)] gap-x-4 md:gap-x-8 lg:gap-x-12 gap-y-6 py-10 md:py-14"
    >
      {/* The number sits on the spine, on a small stock-coloured ground so
          the line appears to pass behind it. */}
      <span
        className={`relative z-10 self-start mt-[0.45em] -ml-1 px-1 bg-background t-folio transition-colors duration-500 ${
          lit ? "text-primary" : "group-hover:text-foreground"
        }`}
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      <RevealText
        as="h4"
        stagger={0.06}
        className={`t-heading text-[clamp(1.5rem,1.1rem+1.4vw,2.25rem)] leading-[1.08] max-w-[16ch] transition-[color,transform] duration-500 ease-out-expo md:group-hover:translate-x-1.5 ${
          full ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
        }`}
      >
        {principle.title}
      </RevealText>

      <Reveal delay={0.12} className="col-start-2 md:col-start-3 min-w-0 max-w-[60ch]">
        <p
          className={`text-[17px] md:text-[18px] leading-[1.6] tracking-[-0.01em] transition-colors duration-500 ${
            full ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
          }`}
        >
          {principle.gist}
        </p>
        <p className="mt-5 t-body">
          <span className="text-foreground">For example: </span>
          <MarkedExample text={principle.example} anchor={principle.anchor} lit={reduced || seen} ink={reduced} />
        </p>
        {project && (
          <TransitionLink
            to={`/projects/${principle.projectId}#${principle.section}`}
            className="group/link mt-5 inline-flex items-center gap-1.5 py-1 text-[14px] text-foreground"
          >
            <span className="bg-[linear-gradient(currentColor,currentColor)] bg-no-repeat bg-[length:0%_1px] bg-[position:0_100%] pb-0.5 transition-[background-size] duration-500 ease-out-expo group-hover/link:bg-[length:100%_1px] group-focus-visible/link:bg-[length:100%_1px]">
              Read how in {project.title}
            </span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 ease-out-expo group-hover/link:translate-x-[3px]" aria-hidden="true" />
          </TransitionLink>
        )}
      </Reveal>
    </li>
  );
};

/* -------------------------------------------------------------------------- */
/* STACK                                                                      */
/* -------------------------------------------------------------------------- */

/* Filters the Work section to one technology and takes the visitor to the
   results — the catalogue, not the top of the section. Work listens for the
   event rather than this component reaching into its state; the scroll waits
   for the filter to render and checks where it landed. */
function showWorkWith(tech: string) {
  window.dispatchEvent(new CustomEvent("emc:work-filter", { detail: { stack: tech } }));
  void scrollToElementAndLand("work-catalogue");
}

type OpenedBy = "pointer" | "touch" | "keyboard";
interface OpenCard {
  name: string;
  by: OpenedBy;
}

/* The card a technology opens: its logo (drawn in ink, not brand colour), how
   much it shipped, for how long and how recently, and where. Opened by
   pointing, by keyboard focus, or by a tap — on touch the first tap shows it
   and a second tap goes to the work, because a phone has no hover to look
   before it leaps.

   Positioned above its technology and nudged back inside the screen when it
   would run off an edge (useCardPlacement). Not interactive itself, so it is
   a tooltip to assistive tech, linked to its button by aria-describedby. */
const StackCard = ({
  id,
  name,
  icon: Icon,
  usage,
  max,
  by,
}: {
  id: string;
  name: string;
  icon: React.ElementType;
  usage: Usage;
  max: number;
  by: OpenedBy;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const place = useCardPlacement(ref, "top");
  const prefersReduced = useReducedMotion();
  const side = place?.side ?? "top";

  const inWork = usage.projects.length > 0;
  // "Used in 2 projects and 1 job", leaving out whichever part is zero.
  const used = [
    usage.projects.length > 0 && `${usage.projects.length} project${usage.projects.length === 1 ? "" : "s"}`,
    usage.roles.length > 0 && `${usage.roles.length} job${usage.roles.length === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" and ");
  // From the career dates: time in jobs that used it (overlaps once), and the latest year anything did.
  const when = [
    usage.months > 0 ? `${formatDuration(usage.months)} at work` : "In projects, not at work",
    usage.lastUsed !== null && `last used ${usage.lastUsed}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const hint = !inWork
    ? "Used in my jobs, not in a project listed here."
    : by === "touch"
      ? "Tap again to see these projects."
      : by === "keyboard"
        ? "Press Enter to see these projects."
        : "Click to see these projects.";

  return (
    /* The outer box is measured and placed; the inner one animates, keyed by
       side, so it always slides in from the direction it opens toward. */
    <div
      ref={ref}
      id={id}
      role="tooltip"
      style={{ transform: `translateX(${place?.shift ?? 0}px)`, visibility: place ? "visible" : "hidden" }}
      className={`absolute left-0 z-30 w-[min(300px,calc(100vw-2rem))] pointer-events-none ${side === "top" ? "bottom-full mb-3" : "top-full mt-3"}`}
    >
    <motion.div
      key={side}
      initial={prefersReduced ? false : { opacity: 0, y: side === "top" ? 6 : -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="bg-popover p-4 text-left font-sans shadow-[0_0_0_1px_hsl(var(--rule-strong)),0_18px_48px_-16px_rgba(0,0,0,0.8)]"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-7 h-7 shrink-0 text-foreground" aria-hidden="true" />
        <p className="t-subhead text-foreground">{name}</p>
      </div>

      <p className="mt-4 text-[13px] text-foreground">
        Used in {used}
      </p>
      {/* Weight against the most-used technology, as a hairline in ink. */}
      <div className="mt-2 h-px bg-border" aria-hidden="true">
        <div className="h-px bg-foreground origin-left" style={{ transform: `scaleX(${usage.count / max})` }} />
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground">{when}</p>

      {usage.implied.length > 0 && (
        <p className="mt-3 text-[12px] leading-snug text-muted-foreground">
          Counts every project and job built on {usage.implied.slice(0, -1).join(", ")} or {usage.implied[usage.implied.length - 1]}, since using those means writing {name}.
        </p>
      )}
      {usage.projects.length > 0 && (
        <p className="mt-4 text-[13px] leading-snug text-muted-foreground">
          <span className="text-foreground">Projects: </span>
          {usage.projects.slice(0, 5).map((p) => p.title).join(", ")}
          {usage.projects.length > 5 ? `, and ${usage.projects.length - 5} more` : ""}
        </p>
      )}
      {usage.roles.length > 0 && (
        <p className="mt-2 text-[13px] leading-snug text-muted-foreground">
          <span className="text-foreground">Jobs: </span>
          {usage.roles.join(", ")}
        </p>
      )}

      <p className="mt-4 pt-3 border-t border-border text-[12px] text-muted-foreground">{hint}</p>
    </motion.div>
    </div>
  );
};

/* An index, as at the back of a monograph: the group on the left, its
   technologies as text on the right, each followed by how many projects and
   roles it shipped in. Pointing at, focusing or tapping one opens its card;
   one that shipped in a project filters Work to those projects. */
const Stack = () => {
  const usage = useMemo(() => {
    const names = STACK_GROUPS.flatMap((g) => g.items.map((i) => i.name));
    return new Map(stackUsage(names, PROJECTS, EXPERIENCE).map((u) => [u.name, u]));
  }, []);
  const max = Math.max(...[...usage.values()].map((u) => u.count));

  const [open, setOpen] = useState<OpenCard | null>(null);
  const container = useRef<HTMLDivElement>(null);
  /* How the current press started, and whether its card was already open
     before the press focused the button — focus fires before click, so
     without this a first tap would open the card and filter in one go. */
  const press = useRef<{ type: string; wasOpen: boolean }>({ type: "mouse", wasOpen: false });

  // A tap or click anywhere else closes the card.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!container.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div ref={container}>
      {STACK_GROUPS.map((group, g) => (
        <Reveal
          key={group.label}
          delay={g * 0.05}
          className="grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,9fr)] gap-x-8 gap-y-3 py-6 md:py-7 border-t border-border"
        >
          <h4 className="text-[14px] text-muted-foreground md:pt-1">{group.label}</h4>
          <ul className="flex flex-wrap gap-x-7 gap-y-2">
            {group.items.map((item) => {
              const u = usage.get(item.name)!;
              const inWork = u.projects.length > 0;
              const isOpen = open?.name === item.name;
              const cardId = `stack-card-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
              return (
                <li key={item.name} className="relative">
                  <button
                    type="button"
                    aria-describedby={isOpen ? cardId : undefined}
                    aria-label={`${item.name}: used in ${u.projects.length} project${u.projects.length === 1 ? "" : "s"} and ${u.roles.length} role${u.roles.length === 1 ? "" : "s"}${inWork ? ". Show those projects" : ""}`}
                    onPointerDown={(e) => {
                      press.current = { type: e.pointerType, wasOpen: isOpen };
                    }}
                    onPointerEnter={(e) => {
                      if (e.pointerType === "mouse") setOpen({ name: item.name, by: "pointer" });
                    }}
                    onPointerLeave={(e) => {
                      if (e.pointerType === "mouse") setOpen((current) => (current?.name === item.name ? null : current));
                    }}
                    onFocus={(e) => {
                      // A press focuses too; only keyboard focus (focus-visible) opens it here.
                      if (e.currentTarget.matches(":focus-visible")) setOpen({ name: item.name, by: "keyboard" });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setOpen(null);
                    }}
                    onBlur={() => {
                      setOpen((current) => (current?.name === item.name ? null : current));
                    }}
                    onClick={(e) => {
                      // detail 0: activated from the keyboard, so act at once.
                      const { type, wasOpen } = e.detail === 0 ? { type: "keyboard", wasOpen: true } : press.current;
                      if (type === "touch" || type === "pen") {
                        if (!wasOpen) {
                          setOpen({ name: item.name, by: "touch" });
                          press.current = { type, wasOpen: true };
                          return;
                        }
                      }
                      if (inWork) {
                        setOpen(null);
                        showWorkWith(item.name);
                      } else {
                        setOpen({ name: item.name, by: type === "touch" || type === "pen" ? "touch" : "pointer" });
                      }
                    }}
                    className={`tap group inline-flex items-baseline gap-1.5 py-1 text-left font-display [font-stretch:110%] text-[clamp(1.125rem,1rem+0.5vw,1.5rem)] font-[480] tracking-[-0.015em] transition-colors ${
                      inWork ? "text-foreground cursor-pointer" : "text-muted-foreground cursor-default"
                    }`}
                  >
                    <span className={inWork ? "link-draw" : undefined}>{item.name}</span>
                    <sup className="t-folio text-[11px] font-sans font-normal [font-stretch:100%] group-hover:text-foreground transition-colors">
                      {u.count}
                    </sup>
                  </button>
                  <AnimatePresence>
                    {isOpen && open && (
                      <StackCard id={cardId} name={item.name} icon={item.icon} usage={u} max={max} by={open.by} />
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </Reveal>
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* CAPABILITIES                                                               */
/* -------------------------------------------------------------------------- */

const titleOf = new Map(PROJECTS.map((p) => [p.id, p.title]));

/* The same work as the stack, read by what it does for someone. Each row
   names the kind of work in plain words and links the projects that show
   it; about/capabilities.ts keeps every link backed by the project's own
   words. */
const Capabilities = () => (
  <ol>
    {CAPABILITIES.map((cap, i) => (
      <Reveal
        as="li"
        key={cap.id}
        delay={i * 0.05}
        className="group grid grid-cols-[2.25rem_minmax(0,1fr)] md:grid-cols-[3.5rem_minmax(0,5fr)_minmax(0,6fr)] gap-x-4 md:gap-x-8 lg:gap-x-12 gap-y-2 md:gap-y-3 py-5 md:py-8 border-t border-border"
      >
        <span className="t-folio mt-[0.4em] transition-colors duration-300 group-hover:text-foreground">{String(i + 1).padStart(2, "0")}</span>
        <h4 className="font-display [font-stretch:110%] text-[clamp(1.125rem,1rem+0.5vw,1.5rem)] font-[480] tracking-[-0.015em] text-foreground transition-transform duration-500 ease-out-expo md:group-hover:translate-x-1">
          {cap.title}
        </h4>
        <div className="col-start-2 md:col-start-3 min-w-0 max-w-[60ch]">
          <p className="t-body">{cap.gist}</p>
          <p className="mt-2 md:mt-3 text-[14px] leading-relaxed text-muted-foreground">
            Shown in{" "}
            {cap.projects.map((p, j) => (
              <React.Fragment key={p.id}>
                {j > 0 && (j === cap.projects.length - 1 ? " and " : ", ")}
                <TransitionLink to={`/projects/${p.id}`} className="link-draw text-foreground">
                  {titleOf.get(p.id) ?? p.id}
                </TransitionLink>
              </React.Fragment>
            ))}
          </p>
        </div>
      </Reveal>
    ))}
  </ol>
);

/* -------------------------------------------------------------------------- */
/* WHAT: two ways into the same work                                          */
/* -------------------------------------------------------------------------- */

const VIEWS = [
  { id: "can", label: "What I can do" },
  { id: "tools", label: "Tools" },
] as const;
type View = (typeof VIEWS)[number]["id"];

/* A sub-head whose title is the choice: two words at heading size, the one
   being read in ink and the other in grey, as a tablist (arrow keys move
   between them). The aside says how to read the view that is showing. */
const WorkViews = () => {
  const [view, setView] = useState<View>("can");
  const base = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const techCount = STACK_GROUPS.reduce((n, g) => n + g.items.length, 0);

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const next =
      e.key === "ArrowRight" ? (i + 1) % VIEWS.length
      : e.key === "ArrowLeft" ? (i - 1 + VIEWS.length) % VIEWS.length
      : e.key === "Home" ? 0
      : e.key === "End" ? VIEWS.length - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    setView(VIEWS[next].id);
    tabs.current[next]?.focus();
  };

  return (
    <div>
      <div className="mb-8 md:mb-12">
        <Rule className="mb-8" />
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <Reveal y={8}>
            <div role="tablist" aria-label="Skills" className="flex items-baseline gap-x-5 md:gap-x-7">
              {VIEWS.map((v, i) => {
                const selected = view === v.id;
                return (
                  <button
                    key={v.id}
                    ref={(el) => {
                      tabs.current[i] = el;
                    }}
                    id={`${base}-tab-${v.id}`}
                    role="tab"
                    type="button"
                    aria-selected={selected}
                    aria-controls={`${base}-panel-${v.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setView(v.id)}
                    onKeyDown={(e) => onKey(e, i)}
                    className={`tap relative t-heading pb-1.5 transition-colors duration-300 ${
                      selected ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {v.label}
                    {/* The reading mark: a hairline under the chosen view that travels between them. */}
                    {selected && (
                      <motion.span
                        layoutId={`${base}-mark`}
                        className="absolute left-0 right-0 bottom-0 h-px bg-foreground"
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </Reveal>
          <p className="t-caption" aria-live="polite">
            {view === "can" ? (
              `${CAPABILITIES.length} kinds of work, each shown in real projects`
            ) : (
              <>
                <span className="sm:hidden">{techCount} tools, and where they were used</span>
                <span className="hidden sm:inline">{techCount} tools. The small number is how many projects and jobs each one was used in.</span>
              </>
            )}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view}
          id={`${base}-panel-${view}`}
          role="tabpanel"
          aria-labelledby={`${base}-tab-${view}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {view === "can" ? <Capabilities /> : <Stack />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* BACKGROUND                                                                 */
/* -------------------------------------------------------------------------- */

const writingDate = (date: string) => {
  const d = new Date(`${date.length === 7 ? `${date}-01` : date}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
};

/* What sits outside the case studies, kept quiet: open source as counted by
   GitHub on the day the site was built, and writing or talks. A row appears
   only when it has something real in it; with neither, the block is gone. */
const Background = () => {
  const facts = GITHUB ? githubFacts(GITHUB) : null;
  if (!GITHUB && !WRITING.length) return null;

  return (
    <div className="mt-20 md:mt-28">
      {GITHUB && facts && (
        <Reveal className="grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,9fr)] gap-x-8 gap-y-2 py-6 md:py-7 border-t border-border">
          <h3 className="text-[14px] text-muted-foreground md:pt-0.5">Open source</h3>
          <div className="min-w-0">
            <p className="text-[15px] md:text-[17px] leading-relaxed text-foreground">
              {facts.repos}
              {facts.merged && (
                <>
                  <span className="text-muted-foreground"> · </span>
                  {facts.merged}
                  {GITHUB.contributions.length > 0 && (
                    <span className="text-muted-foreground">
                      {" ("}
                      {GITHUB.contributions.map((c, i) => (
                        <React.Fragment key={c.name}>
                          {i > 0 && ", "}
                          <a href={c.url} target="_blank" rel="noopener noreferrer" className="link-draw text-foreground">
                            {c.name}
                          </a>
                        </React.Fragment>
                      ))}
                      {")"}
                    </span>
                  )}
                </>
              )}
            </p>
            <p className="mt-2 t-caption flex flex-wrap items-center gap-x-4 gap-y-1">
              <a href={GITHUB.profileUrl} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1 text-foreground">
                <span className="link-draw">View on GitHub</span>
                <ArrowUpRight className="nudge-up w-3.5 h-3.5" aria-hidden="true" />
              </a>
              <span>Counted from GitHub on {snapshotDate(GITHUB.takenAt)}</span>
            </p>
          </div>
        </Reveal>
      )}

      {WRITING.length > 0 && (
        <Reveal className="grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,9fr)] gap-x-8 gap-y-2 py-6 md:py-7 border-t border-border">
          <h3 className="text-[14px] text-muted-foreground md:pt-0.5">Writing and talks</h3>
          <ul className="min-w-0 space-y-2">
            {WRITING.map((w) => (
              <li key={w.url} className="text-[15px] leading-relaxed">
                <a href={w.url} target="_blank" rel="noopener noreferrer" className="group inline-flex items-baseline gap-1 text-foreground">
                  <span className="link-draw">{w.title}</span>
                  <ArrowUpRight className="nudge-up w-3.5 h-3.5 self-center" aria-hidden="true" />
                </a>
                <span className="t-caption">
                  {" "}
                  {w.kind === "talk" ? "Talk" : "Article"} · {w.venue} · {writingDate(w.date)}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* SECTION                                                                    */
/* -------------------------------------------------------------------------- */

const About: React.FC = () => {
  const { openAsk } = useAsk();

  return (
    <section id="about" data-section="about" className="relative page-x pt-28 md:pt-36 pb-[clamp(4rem,3rem+4vw,7rem)]" aria-label="About">
      <div className="page-max">
        {/* States what the work was and stops. Earlier headings made claims
            the page could not back. */}
        <SectionHead
          title="Systems that stay correct"
          lede="I have built data and backend systems since 2018, in fintech, logistics, health and analytics. Everything I ship comes with tests that show it still works when things go wrong."
          aside="2018 to now"
        />

        {/* ── Who, and counted: the bio and its three figures beside the
            portrait, so the plate's height is filled with evidence ── */}
        <div className="mt-14 md:mt-24 grid grid-cols-12 gap-x-6 gap-y-10 md:gap-y-16 items-start">
          <div className="col-span-12 lg:col-span-7">
            <Bio
              text={BIO}
              className="text-[clamp(1.25rem,0.95rem+1.5vw,2.375rem)] leading-[1.32] tracking-[-0.022em] max-w-[30ch] md:max-w-[34ch]"
            />
            <div className="mt-12 md:mt-16">
              <Figures />
            </div>
          </div>
          <div className="col-span-12 sm:col-span-8 md:col-span-6 lg:col-span-4 lg:col-start-9">
            <Portrait onAsk={() => openAsk({ question: "how does he work, and what's the evidence?" })} />
          </div>
        </div>

        {/* ── How ── */}
        <div className="mt-20 md:mt-36">
          <SubHead title="How I work" aside="Four habits, each shown in a real project" />
          <Principles />
        </div>

        {/* ── What ── */}
        <div className="mt-20 md:mt-36">
          <WorkViews />
        </div>

        {/* ── Beyond ── */}
        <Background />
      </div>
    </section>
  );
};

export default About;
