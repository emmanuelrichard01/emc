import React, { useCallback, useId, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";

import { EXPERIENCE } from "@/data/experience";
import { PROJECTS } from "@/data/projects";
import { careerWindow, formatDuration, parsePeriod } from "@/lib/tenure";
import type { Span } from "@/lib/tenure";
import { scrollToElementAndLand } from "@/lib/scrollToSection";
import { Reveal, SectionHead } from "@/components/ui/Reveal";
import CareerTimeline from "@/components/experience/CareerTimeline";
import StackTenure from "@/components/experience/StackTenure";
import { concurrentMonths, markFigures, stackTenure, unionMonths } from "@/components/experience/ledgerModel";
import { usesTech } from '@/lib/techFamily';

/* ==========================================================================
   EXPERIENCE — the career, as a chapter

   Seven roles, most of them run alongside a degree or another contract. The
   section's job is to make that legible in the time a recruiter gives it,
   and to answer the questions they bring — how long, doing what, in which
   stack — from the dates themselves rather than from adjectives:

     totals     figures a reader could check against the rows: working time
                (overlaps counted once), time spent running two roles at
                once, roles, technologies
     timeline   the career on one axis (experience/CareerTimeline)
     tenure     time in each technology, disclosed on demand
                (experience/StackTenure)
     roles      an index of entries; the earlier ones fold away behind one
                control, and open themselves when the timeline points at them

   The timeline, the tenure list and the roles share two pieces of state —
   the role being pointed at and the technology chosen — so pointing at one
   lights the others.
   ========================================================================== */

/** Built projects only — a design study names a stack it never ran. */
const BUILT = PROJECTS.filter((p) => p.tier !== "design");
const projectCount = (tech: string) => BUILT.filter((p) => usesTech(p.stack, tech)).length;

/** The most recent roles stay open; the rest fold behind "Earlier roles". */
const RECENT = 3;

/* Filters Work to one technology and lands on its results — the same event
   About's stack sends, so Work has one way in. */
function showWorkWith(tech: string) {
  window.dispatchEvent(new CustomEvent("emc:work-filter", { detail: { stack: tech } }));
  void scrollToElementAndLand("work-catalogue");
}

/** A line of copy with its measured outcomes set in ink, a weight heavier. */
const Figures = ({ text }: { text: string }) => (
  <>
    {markFigures(text).map((part, i) =>
      part.figure ? (
        <span key={i} className="font-medium text-foreground tabular-nums whitespace-nowrap">
          {part.text}
        </span>
      ) : (
        <React.Fragment key={i}>{part.text}</React.Fragment>
      ),
    )}
  </>
);

/* -------------------------------------------------------------------------- */
/* ROLE ENTRY                                                                 */
/* -------------------------------------------------------------------------- */

interface RowProps {
  role: (typeof EXPERIENCE)[0];
  index: number;
  span: Span | null;
  active: boolean;
  /** This role used the selected technology. */
  lit: boolean;
  tech: string | null;
  onActive: (id: string | null) => void;
  onTech: (name: string | null) => void;
}

const RoleRow = ({ role, index, span, active, lit, tech, onActive, onTech }: RowProps) => {
  const marked = lit || active;

  return (
    <li
      id={`role-${role.id}`}
      onPointerEnter={() => onActive(role.id)}
      onPointerLeave={() => onActive(null)}
      className="relative border-t border-border scroll-mt-28"
    >
      {/* The rule above an entry draws itself in the accent when the entry
          is pointed at in the timeline, or used the chosen technology. It
          marks rather than dims, so no text loses contrast. */}
      <span
        aria-hidden="true"
        className={`absolute left-0 right-0 -top-px h-px bg-primary origin-left transition-transform duration-500 ease-out-expo ${
          marked ? "scale-x-100" : "scale-x-0"
        }`}
      />

      <Reveal className="grid grid-cols-1 lg:grid-cols-12 gap-x-6 gap-y-5 py-10 md:py-14">
        {/* Folio and dates */}
        <div className="lg:col-span-3 flex flex-wrap lg:flex-col lg:flex-nowrap lg:items-start gap-x-3 gap-y-1 text-[13px] text-muted-foreground tabular-nums">
          <span className={`t-folio transition-colors duration-300 lg:mb-3 ${marked ? "text-primary" : ""}`}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-foreground">{role.period}</span>
          {span && (
            <span>
              <span className="lg:hidden" aria-hidden="true">· </span>
              {formatDuration(span.months)}
            </span>
          )}
          <span>
            <span className="lg:hidden" aria-hidden="true">· </span>
            {role.type}
          </span>
          {/* Overlapping dates read as an error until you say otherwise. */}
          {role.note && <span className="basis-full lg:basis-auto t-caption mt-2 lg:mt-4 max-w-[30ch]">{role.note}</span>}
        </div>

        {/* Who */}
        <div className="lg:col-span-3">
          <h3 className="t-heading text-foreground">{role.company}</h3>
          <p className="mt-2 text-[14px] leading-snug text-muted-foreground">{role.role}</p>
        </div>

        {/* What */}
        <div className="lg:col-span-6 max-w-[68ch]">
          <p className="text-[1.0625rem] leading-[1.65] text-foreground/90">
            <Figures text={role.summary} />
          </p>

          {role.highlights.length > 0 && (
            <ul className="mt-6 space-y-3">
              {role.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-4 text-[15px] leading-[1.65] text-muted-foreground">
                  <span className="mt-[0.82em] w-3 h-px bg-muted-ghost shrink-0" aria-hidden="true" />
                  <span>
                    <Figures text={h} />
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* The stack, as the same selection the tenure list makes: choose
              one here and every role that used it lights. */}
          <ul className="mt-7 flex flex-wrap items-center gap-y-1 text-[13px]" aria-label={`Tools used at ${role.company}`}>
            {role.stack.map((t, i) => {
              const on = tech === t;
              return (
                /* The separator belongs to the item before it, so a wrapped
                   line never starts with a stray dot. */
                <li key={t} className="flex items-center">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onTech(on ? null : t)}
                    className={`tap inline-flex items-center py-1 transition-colors ${
                      on ? "text-primary" : "text-muted-quiet hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                  {i < role.stack.length - 1 && (
                    <span className="px-2 text-muted-ghost" aria-hidden="true">
                      ·
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </Reveal>
    </li>
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
  const [showEarlier, setShowEarlier] = useState(false);
  const lit = useMemo(() => (tech ? new Set(tenure.find((t) => t.name === tech)?.roles ?? []) : null), [tech, tenure]);
  const earlierId = useId();

  /* The timeline goes to a role; an earlier one is opened first, so the
     landing is measured against an entry that is actually on the page. */
  const openRole = useCallback((id: string) => {
    const index = EXPERIENCE.findIndex((role) => role.id === id);
    if (index >= RECENT) setShowEarlier(true);
    void scrollToElementAndLand(`role-${id}`);
  }, []);

  // Derived, so the header cannot claim a range the rows below contradict.
  const startYear = axis ? Math.floor(axis.from / 12) : null;
  const endYear = axis ? Math.floor(axis.to / 12) : null;

  const earlier = EXPERIENCE.slice(RECENT);
  const earlierSpans = spans.slice(RECENT).filter((s): s is Span => s !== null);
  const earlierFrom = earlierSpans.length ? Math.min(...earlierSpans.map((s) => s.start.year)) : null;
  const earlierTo = earlierSpans.length ? Math.max(...earlierSpans.map((s) => s.end.year)) : null;
  // A technology chosen above may only have been used in a folded role.
  const litEarlier = lit ? earlier.filter((role) => lit.has(role.id)).length : 0;

  const totals = [
    { label: "working, with overlaps counted once", value: formatDuration(working) },
    { label: "in two roles at once", value: formatDuration(together) },
    { label: "roles", value: String(EXPERIENCE.length) },
    { label: "technologies", value: String(tenure.length) },
  ];

  const row = (role: (typeof EXPERIENCE)[0], i: number) => (
    <RoleRow
      key={role.id}
      role={role}
      index={i}
      span={spans[i]}
      active={activeRole === role.id}
      lit={Boolean(lit?.has(role.id))}
      tech={tech}
      onActive={setActiveRole}
      onTech={setTech}
    />
  );

  return (
    <section id="experience" data-section="experience" className="page-x section-y relative" aria-label="Work experience">
      <div className="page-max">
        <SectionHead
          title="Career"
          aside={startYear && endYear ? <span className="tabular-nums">{startYear}–{endYear}</span> : undefined}
          lede={
            <>
              {EXPERIENCE.length} roles since {startYear}, most of them alongside a degree or another job. Most of the
              work was on systems that already existed: live, relied on by real people, and often slow or done by hand.
            </>
          }
        />

        {/* The ledger's totals: numbers a reader can check against the rows,
            not adjectives. Working time is a union — the overlaps are counted
            once, and the time spent in two roles is its own figure. */}
        <Reveal className="mt-16 md:mt-24">
          {/* One ruled line, read left to right like a sentence: the figure
              in ink, what it counts beside it. */}
          <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-3 border-y border-border py-5">
            {totals.map((item) => (
              <div key={item.label} className="flex items-baseline gap-2">
                {/* dt first for a valid list; shown after its figure. */}
                <dt className="t-caption order-2">{item.label}</dt>
                <dd className="t-figure order-1 text-[1.125rem] md:text-[1.25rem] leading-none text-foreground whitespace-nowrap">{item.value}</dd>
              </div>
            ))}
          </dl>
          <p className="t-caption mt-5">Across AI evaluation, health tech, construction and consulting.</p>
        </Reveal>

        {/* Timeline + tenure */}
        {axis && (
          <div className="mt-20 md:mt-28">
            <CareerTimeline
              roles={EXPERIENCE}
              spans={spans}
              axis={axis}
              activeRole={activeRole}
              onActiveRole={setActiveRole}
              lit={lit}
              onOpenRole={openRole}
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
        <div className="mt-20 md:mt-28">
          <Reveal className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mb-6">
            <h3 className="t-subhead text-foreground">Roles</h3>
            <p className="t-caption">Newest first. Point at a role to see it on the timeline.</p>
          </Reveal>

          <ol>{EXPERIENCE.slice(0, RECENT).map((role, i) => row(role, i))}</ol>

          {earlier.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowEarlier((v) => !v)}
                aria-expanded={showEarlier}
                aria-controls={earlierId}
                className="tap group w-full flex items-center justify-between gap-6 border-t border-border py-6 md:py-8 text-left"
              >
                <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="t-subhead text-foreground">
                    <span className="link-draw">{showEarlier ? "Hide earlier roles" : "Earlier roles"}</span>
                  </span>
                  <span className="t-caption tabular-nums">
                    {earlier.length} roles
                    {earlierFrom && earlierTo ? `, ${earlierFrom}–${earlierTo}` : ""}
                    {!showEarlier && litEarlier > 0 && (
                      <span className="text-primary">
                        {" "}
                        · {litEarlier} used {tech}
                      </span>
                    )}
                  </span>
                </span>
                <Plus
                  className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-500 ease-out-expo group-hover:text-foreground ${
                    showEarlier ? "rotate-45" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              <AnimatePresence initial={false}>
                {showEarlier && (
                  <motion.ol
                    id={earlierId}
                    key="earlier"
                    initial={prefersReduced ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={prefersReduced ? { opacity: 0, transition: { duration: 0 } } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    {earlier.map((role, i) => row(role, i + RECENT))}
                  </motion.ol>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default Experience;
