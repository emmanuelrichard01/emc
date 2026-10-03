import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { ArrowRight, ArrowUpRight, Download, Sparkles } from "lucide-react";

import TransitionLink from "@/components/ui/TransitionLink";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { Reveal, RevealText, Rule, SectionHead } from "@/components/ui/Reveal";
import { useAsk } from "@/components/ai/AskProvider";
import { PROJECTS } from "@/data/projects";
import { EXPERIENCE } from "@/data/experience";
import { PRINCIPLES } from "@/data/principles";
import { CV_FILE_SIZE, downloadCV } from "@/lib/cv";
import { scrollToElementAndLand } from "@/lib/scrollToSection";
import { STACK_GROUPS } from "@/components/about/stackGroups";
import { stackUsage, type Usage } from "@/components/about/stackUsage";

/* ==========================================================================
   ABOUT

   Set as the monograph's opening pages, in the order a reader wants them:

     who        the title and what the work was, three figures each with its
                source, then the bio — read as one large paragraph — beside
                a portrait plate and the two doors (the CV, the assistant)
     how        four working principles in plain words, each with one
                example from a case study and a link to where it is shown
                (data/principles.ts: a test fails the build if the fact an
                example rests on stops appearing in its project)
     with what  the stack as a typographic index, weighted by where it
                actually shipped; a technology filters the Work section

   Nothing here is asserted that the page cannot show.

   This section emerges out of the hero's dive into the event horizon: it
   is rendered as the hero's child and revealed as the dive completes (see
   Hero.tsx), which is why its own top padding is shorter than a section's.
   ========================================================================== */

/* Narrowed to what the work actually demonstrates. "Cloud infrastructure"
   has been considered and rejected twice: five projects are fintech, one is
   cloud infrastructure, and AWS appears in zero project stacks. */
const ROLES = ["Data engineering", "Backend systems", "Fintech infrastructure"];

/* Every figure is countable, and every figure states where it came from.
   The test count sums shipped systems: 276 (MMR Engine) + 36 (Rate
   Limiter) + 21 dbt schema tests and 9 pipeline checks (Modern Warehouse). */
const METRICS = [
  { value: 1.5, suffix: "M+", label: "Records processed", source: "Olist data warehouse, in a single run", href: "/projects/modern-warehouse" },
  { value: 340, suffix: "+", label: "Automated tests", source: "Across the systems I have shipped", href: null },
  { value: 50, suffix: "K+", label: "Users served", source: "TAC Africa platform", href: null },
];

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
   numbers: the figure, what it counts, and where it came from. These are the only numbers on the page
   that are not counted from the page itself, so each carries its source. */
const Figures = () => (
  <ul className="grid grid-cols-1 sm:grid-cols-3 border-t border-border">
    {METRICS.map((m, i) => {
      const body = (
        <>
          <span className="block t-figure text-[clamp(1.875rem,1.5rem+1vw,2.25rem)] leading-none text-foreground">
            <AnimatedCounter target={m.value} suffix={m.suffix} />
          </span>
          <span className="block mt-3 text-[15px] text-foreground">{m.label}</span>
          <span className="mt-1 t-caption flex items-center gap-1">
            {m.href ? <span className="link-draw">{m.source}</span> : m.source}
            {m.href && <ArrowUpRight className="nudge-up w-3.5 h-3.5" aria-hidden="true" />}
          </span>
        </>
      );
      const cell = `block py-6 sm:py-7 ${i > 0 ? "border-t sm:border-t-0 sm:border-l border-border sm:pl-8 lg:pl-10" : ""}`;
      return (
        <Reveal as="li" key={m.label} delay={i * 0.08}>
          {m.href ? (
            <TransitionLink to={m.href} className={`group ${cell}`} aria-label={`${m.label}: ${m.value}${m.suffix}. Source: ${m.source}`}>
              {body}
            </TransitionLink>
          ) : (
            <div className={cell}>{body}</div>
          )}
        </Reveal>
      );
    })}
  </ul>
);

/* -------------------------------------------------------------------------- */
/* PORTRAIT                                                                   */
/* -------------------------------------------------------------------------- */

/* A small square plate with its caption, and the two doors under it. The
   photograph is set in greyscale like the rest of the stock and comes into
   colour when it is pointed at. */
const Portrait = ({ onAsk }: { onAsk: () => void }) => {
  const [failed, setFailed] = useState(false);
  const prefersReduced = useReducedMotion();

  return (
    <figure className="w-full max-w-[380px]" aria-label="Profile">
      <motion.div
        className="plate group aspect-square"
        initial={prefersReduced ? false : { clipPath: "inset(0% 0% 100% 0%)" }}
        whileInView={prefersReduced ? undefined : { clipPath: "inset(0% 0% 0% 0%)" }}
        viewport={{ once: true, margin: "0px 0px -12% 0px" }}
        transition={{ duration: 1.25, ease: [0.77, 0, 0.18, 1] }}
      >
        {failed ? (
          <div className="w-full h-full flex items-center justify-center font-display text-5xl text-muted-foreground">EM</div>
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

      <figcaption className="mt-5">
        <p className="t-subhead text-foreground">Emmanuel Moghalu</p>
        <p className="t-caption mt-1">Abuja, Nigeria · UTC+1</p>
        <p className="t-caption mt-3">{ROLES.join(" · ")}</p>
      </figcaption>

      {/* The two doors, at equal weight: the CV for a hiring team, the
          assistant for anyone who wants to ask first. */}
      <div className="mt-7 grid grid-cols-1 min-[400px]:grid-cols-2 gap-2">
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
   much it shipped, and where. Opened by pointing, by keyboard focus, or by a
   tap — on touch the first tap shows it and a second tap goes to the work,
   because a phone has no hover to look before it leaps.

   Positioned above its technology and nudged back inside the screen when it
   would run off an edge. Not interactive itself, so it is a tooltip to
   assistive tech, linked to its button by aria-describedby. */
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
  /* Where the card sits: above its technology when there is room under the
     fixed running head, below it otherwise, and slid sideways to stay inside
     the screen. Null until measured, so it never paints in the wrong place. */
  const [place, setPlace] = useState<{ side: "top" | "bottom"; shift: number } | null>(null);
  const prefersReduced = useReducedMotion();

  useLayoutEffect(() => {
    const el = ref.current;
    const anchor = el?.parentElement;
    if (!el || !anchor) return;
    const NAV = 64; // the running head
    const GAP = 12; // between the card and its technology, and the card and the nav
    const GUTTER = 16; // from the screen edges
    const measure = () => {
      const a = anchor.getBoundingClientRect();
      const h = el.offsetHeight;
      const w = el.offsetWidth;
      const roomAbove = a.top - GAP - h >= NAV + GAP;
      const roomBelow = a.bottom + GAP + h <= window.innerHeight - GUTTER;
      const side = roomAbove || !roomBelow ? "top" : "bottom";
      const left = Math.min(Math.max(a.left, GUTTER), window.innerWidth - GUTTER - w);
      const shift = Math.round(left - a.left);
      setPlace((prev) => (prev && prev.side === side && prev.shift === shift ? prev : { side, shift }));
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);
  const side = place?.side ?? "top";

  const inWork = usage.projects.length > 0;
  // "Used in 2 projects and 1 job", leaving out whichever part is zero.
  const used = [
    usage.projects.length > 0 && `${usage.projects.length} project${usage.projects.length === 1 ? "" : "s"}`,
    usage.roles.length > 0 && `${usage.roles.length} job${usage.roles.length === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" and ");
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
/* SECTION                                                                    */
/* -------------------------------------------------------------------------- */

const About: React.FC = () => {
  const { openAsk } = useAsk();
  const techCount = STACK_GROUPS.reduce((n, g) => n + g.items.length, 0);

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

        <div className="mt-16 md:mt-24">
          <Figures />
        </div>

        {/* ── Bio + portrait ── */}
        <div className="mt-24 md:mt-36 grid grid-cols-12 gap-x-6 gap-y-16 items-start">
          <div className="col-span-12 lg:col-span-7">
            <Bio
              text={BIO}
              className="text-[clamp(1.5rem,1.15rem+1.4vw,2.375rem)] leading-[1.32] tracking-[-0.022em] max-w-[30ch] md:max-w-[34ch]"
            />
          </div>
          <div className="col-span-12 sm:col-span-8 md:col-span-6 lg:col-span-4 lg:col-start-9">
            <Portrait onAsk={() => openAsk({ question: "how does he work, and what's the evidence?" })} />
          </div>
        </div>

        {/* ── How ── */}
        <div className="mt-32 md:mt-44">
          <SubHead title="How I work" aside="Four habits, each shown in a real project" />
          <Principles />
        </div>

        {/* ── With what ── */}
        <div className="mt-32 md:mt-44">
          <SubHead
            title="Stack"
            aside={
              <>
                <span className="sm:hidden">{techCount} tools, and where they were used</span>
                <span className="hidden sm:inline">{techCount} tools. The small number is how many projects and jobs each one was used in.</span>
              </>
            }
          />
          <Stack />
        </div>
      </div>
    </section>
  );
};

export default About;
