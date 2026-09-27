import React, { useCallback, useId, useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { ChevronDown, Terminal } from "lucide-react";

import { EXPERIENCE } from "@/data/experience";
import { PROJECTS } from "@/data/projects";
import { careerWindow, formatDuration, parsePeriod } from "@/lib/tenure";
import type { Span } from "@/lib/tenure";
import { scrollToElementAndLand } from "@/lib/scrollToSection";
import CareerTimeline from "@/components/experience/CareerTimeline";
import StackTenure from "@/components/experience/StackTenure";
import { concurrentMonths, markFigures, stackTenure, unionMonths } from "@/components/experience/ledgerModel";

/* ==========================================================================
   EXPERIENCE — the career ledger

   Seven roles, most of them run alongside a degree or another contract. The
   section's job is to make that legible in the time a recruiter gives it,
   and to answer the questions they bring — how long, doing what, in which
   stack — from the dates themselves rather than from adjectives:

     header     totals a reader could check against the rows: working time
                (overlaps counted once), time spent running two roles at
                once, roles, technologies
     timeline   the career on one axis (experience/CareerTimeline)
     tenure     time in each technology, selectable (experience/StackTenure)
     rows       what was done, with the measured outcomes set to be found

   The timeline, the tenure strip and the rows share two pieces of state —
   the role being pointed at and the technology chosen — so pointing at one
   lights the others.
   ========================================================================== */

const EASE = [0.16, 1, 0.3, 1] as const;

/** Built projects only — a design study names a stack it never ran. */
const BUILT = PROJECTS.filter((p) => p.tier !== "design");
const projectCount = (tech: string) => BUILT.filter((p) => p.stack.includes(tech)).length;

/* Filters Work to one technology and lands on its results — the same event
   About's stack sends, so Work has one way in. */
function showWorkWith(tech: string) {
  window.dispatchEvent(new CustomEvent("emc:work-filter", { detail: { stack: tech } }));
  void scrollToElementAndLand("work-catalogue");
}

/** A line of copy with its measured outcomes given a little more weight. */
const Figures = ({ text }: { text: string }) => (
  <>
    {markFigures(text).map((part, i) =>
      part.figure ? (
        <span key={i} className="font-mono text-[0.95em] text-foreground tabular-nums whitespace-nowrap">
          {part.text}
        </span>
      ) : (
        <React.Fragment key={i}>{part.text}</React.Fragment>
      ),
    )}
  </>
);

/* -------------------------------------------------------------------------- */
/* ROLE ROW                                                                   */
/* -------------------------------------------------------------------------- */

interface RowProps {
  role: (typeof EXPERIENCE)[0];
  index: number;
  isLast: boolean;
  span: Span | null;
  active: boolean;
  /** This role used the selected technology. */
  lit: boolean;
  tech: string | null;
  onActive: (id: string | null) => void;
  onTech: (name: string | null) => void;
  /** Bumped when the timeline asks for this row to be opened. */
  openRequest: number;
}

const RoleRow = ({ role, index, isLast, span, active, lit, tech, onActive, onTech, openRequest }: RowProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const prefersReduced = useReducedMotion();

  /* Collapsed below `lg`, and only there.

     Stacked on a phone this section ran 3,818px — 4.7 screens, 37% of the
     whole page — because the two columns that sit side by side on a desktop
     fall on top of each other, and every one of the roles pays full price
     for a summary, three highlights and up to seven stack chips. The two most
     recent stay open; the rest keep their heading and dates, which with the
     timeline above is enough to read the shape of the career, and open on
     demand — or from the timeline, which opens the row it takes you to.

     The desktop layout is untouched: the detail block carries `lg:block`, so
     above the breakpoint this state cannot hide anything. */
  const [open, setOpen] = useState(index < 2);
  const [seenRequest, setSeenRequest] = useState(openRequest);
  if (openRequest !== seenRequest) {
    setSeenRequest(openRequest);
    setOpen(true);
  }
  const detailId = useId();
  const shown = inView || Boolean(prefersReduced);

  return (
    <motion.div
      ref={ref}
      id={`role-${role.id}`}
      onPointerEnter={() => onActive(role.id)}
      onPointerLeave={() => onActive(null)}
      initial={prefersReduced ? false : { opacity: 0, y: 10 }}
      animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: EASE }}
      className={`group relative grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 py-8 md:py-12 scroll-mt-28 ${
        !isLast ? "border-b border-border" : ""
      }`}
    >
      {/* Lit edge: this role used the chosen technology, or it is the one
          being pointed at in the timeline. Marks rather than dims — fading
          the others would fade their text below a readable contrast. */}
      <span
        className={`absolute -left-6 sm:-left-10 top-8 bottom-8 w-[2px] bg-primary origin-top transition-transform duration-300 ${
          lit || active ? "scale-y-100" : "scale-y-0"
        }`}
        aria-hidden="true"
      />

      {/* Left: the ledger entry */}
      <div className="lg:col-span-4 flex flex-col gap-1.5">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-mono text-[10px] text-primary border border-primary/20 bg-primary/5 px-1.5 py-0.5">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="text-xl font-bold text-foreground">{role.company}</h3>
        </div>

        <div className="flex flex-col gap-1 lg:pl-5">
          <span className="text-[13px] font-mono uppercase tracking-widest text-foreground/80">{role.role}</span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-muted-foreground mt-1">
            {/* Duration sits inside the brackets with the dates it is derived
                from. Trailing the employment type instead put a third
                separator on a line already long enough to wrap, which left a
                stranded "·" at the end of the first line. */}
            <span className="whitespace-nowrap">
              {"[ "}
              {role.period}
              {span && (
                <>
                  {" · "}
                  <span className="text-foreground/80 tabular-nums">{formatDuration(span.months)}</span>
                </>
              )}
              {" ]"}
            </span>
            {/* Bound to its separator so the pair wraps together — loose, the
                "·" stayed behind on the previous line. */}
            <span className="whitespace-nowrap">
              <span className="text-primary">·</span> {role.type}
            </span>
          </div>

          {/* Overlapping dates read as an error until you say otherwise. */}
          {role.note && (
            <span className="text-[11px] text-muted-foreground font-light leading-snug mt-2 max-w-[280px]">{role.note}</span>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={detailId}
            className="tap lg:hidden mt-4 -ml-1 self-start flex items-center gap-1.5 px-1 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
            {open ? "Hide detail" : "What I did"}
          </button>
        </div>
      </div>

      {/* Right: the work */}
      <div id={detailId} className={`lg:col-span-8 space-y-4 pt-1 lg:block ${open ? "" : "hidden"}`}>
        <p className="text-[15px] md:text-[13px] text-foreground/80 leading-relaxed font-light max-w-[68ch]">
          <Figures text={role.summary} />
        </p>

        {role.highlights.length > 0 && (
          <ul className="space-y-2 mt-4 max-w-[68ch]">
            {role.highlights.map((h, i) => (
              <motion.li
                key={i}
                initial={prefersReduced ? false : { opacity: 0, x: -6 }}
                animate={shown ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
                transition={{ duration: 0.4, delay: index * 0.06 + (i + 1) * 0.07, ease: EASE }}
                className="flex items-start gap-3 text-[15px] md:text-[13px] text-muted-foreground font-light leading-relaxed"
              >
                <span className="mt-2 w-1 h-1 bg-primary shrink-0" aria-hidden="true" />
                <span>
                  <Figures text={h} />
                </span>
              </motion.li>
            ))}
          </ul>
        )}

        {/* The stack, as the same selection the tenure strip makes: choose
            one here and every role that used it lights. */}
        <ul className="flex flex-wrap gap-2 pt-4" aria-label={`${role.company} stack`}>
          {role.stack.map((t) => {
            const on = tech === t;
            return (
              <li key={t}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onTech(on ? null : t)}
                  className={`tap flex items-center text-[10px] font-mono border px-2 py-0.5 uppercase tracking-widest transition-colors ${
                    on
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/* MAIN                                                                       */
/* -------------------------------------------------------------------------- */

const Experience: React.FC = () => {
  const prefersReduced = useReducedMotion();
  // Parsed once for the whole ledger: everything shares one axis.
  const spans = useMemo(() => EXPERIENCE.map((role) => parsePeriod(role.period)), []);
  const axis = useMemo(() => careerWindow(spans), [spans]);
  const tenure = useMemo(() => stackTenure(EXPERIENCE, spans), [spans]);
  const working = useMemo(() => unionMonths(spans), [spans]);
  const together = useMemo(() => concurrentMonths(spans), [spans]);

  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [tech, setTech] = useState<string | null>(null);
  const [openRequests, setOpenRequests] = useState<Record<string, number>>({});
  const lit = useMemo(() => (tech ? new Set(tenure.find((t) => t.name === tech)?.roles ?? []) : null), [tech, tenure]);

  const chartRef = useRef<HTMLDivElement>(null);
  const chartInView = useInView(chartRef, { once: true, amount: 0.3 });

  const openRole = useCallback((id: string) => {
    setOpenRequests((r) => ({ ...r, [id]: (r[id] ?? 0) + 1 }));
    void scrollToElementAndLand(`role-${id}`);
  }, []);

  // Derived, so the header cannot claim a range the rows below contradict.
  const startYear = axis ? Math.floor(axis.from / 12) : null;
  const endYear = axis ? Math.floor(axis.to / 12) : null;

  return (
    <section id="experience" data-section="experience" className="py-24 relative overflow-hidden" aria-label="Work experience">
      <div className="container px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-10 border-b border-border pb-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
        >
          <div>
            <div className="flex items-center gap-3 text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase mb-4">
              <Terminal className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Module 03 // Career Ledger</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
              Production <span className="text-muted-foreground font-mono font-normal">History</span>
            </h2>
            {/* The previous line — "roles that narrowed my focus on systems that
                scale and engineering decisions that hold up in production" —
                could have sat under anyone's experience section. This says what
                is specific to these five: they overlap, and none of them started
                from an empty repository. */}
            <p className="text-[15px] md:text-[13px] text-muted-foreground max-w-md font-light leading-relaxed">
              {EXPERIENCE.length} roles since {startYear}, most run alongside a degree or another contract. The work
              was largely inherited — systems already in production, already depended on, and usually manual or
              slow.
            </p>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-4">
              {startYear} — {endYear} · AI evaluation, health-tech, construction &amp; consulting
            </p>
          </div>

          {/* The ledger's totals, in the form the Work section uses for its
              own — numbers a reader can check against the rows, not
              adjectives. Working time is a union: the overlaps are counted
              once, and the time spent in two roles is its own figure. */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border self-start lg:self-end">
            {[
              { label: "working time", value: formatDuration(working) },
              { label: "two at once", value: formatDuration(together) },
              { label: "roles", value: String(EXPERIENCE.length) },
              { label: "technologies", value: String(tenure.length) },
            ].map((item) => (
              <div key={item.label} className="bg-[#070707] px-4 py-3 sm:min-w-[96px] flex flex-col-reverse">
                <dt className="mt-2 font-mono text-[10px] sm:text-[9px] uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">
                  {item.label}
                </dt>
                <dd className="font-mono text-xl text-foreground tabular-nums leading-none whitespace-nowrap">{item.value}</dd>
              </div>
            ))}
          </dl>
        </motion.div>

        {/* Timeline + tenure */}
        {axis && (
          <div ref={chartRef} className="mb-12">
            <CareerTimeline
              roles={EXPERIENCE}
              spans={spans}
              axis={axis}
              activeRole={activeRole}
              onActiveRole={setActiveRole}
              lit={lit}
              onOpenRole={openRole}
              inView={chartInView}
            />
            <StackTenure
              tenure={tenure}
              total={working}
              selected={tech}
              onSelect={setTech}
              projectCount={projectCount}
              onShowProjects={showWorkWith}
            />
          </div>
        )}

        {/* Roles */}
        <div className="relative border border-border bg-card/20 px-6 sm:px-10">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" aria-hidden="true" />
          {EXPERIENCE.map((role, i) => (
            <RoleRow
              key={role.id}
              role={role}
              index={i}
              isLast={i === EXPERIENCE.length - 1}
              span={spans[i]}
              active={activeRole === role.id}
              lit={Boolean(lit?.has(role.id))}
              tech={tech}
              onActive={setActiveRole}
              onTech={setTech}
              openRequest={openRequests[role.id] ?? 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Experience;
