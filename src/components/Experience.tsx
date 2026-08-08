import React, { useMemo, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Terminal } from "lucide-react";

import { EXPERIENCE } from "@/data/experience";
import { careerWindow, formatDuration, parsePeriod, spanBar, yearTicks } from "@/lib/tenure";
import type { Span } from "@/lib/tenure";

/** Shared horizontal scale for every span bar in the ledger. */
interface Axis {
  from: number;
  to: number;
}

const pct = (bar: { left: number; width: number }) => ({
  left: `${bar.left}%`,
  width: `${bar.width}%`,
});

/* -------------------------------------------------------------------------- */
/* ROLE ROW                                                                   */
/* -------------------------------------------------------------------------- */

const RoleRow = ({
  role,
  index,
  isLast,
  span,
  spans,
  axis,
}: {
  role: (typeof EXPERIENCE)[0];
  index: number;
  isLast: boolean;
  span: Span | null;
  /** Every role's span, so each track can show the career behind this one. */
  spans: (Span | null)[];
  axis: Axis | null;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  const ticks = useMemo(() => (axis ? yearTicks(axis) : []), [axis]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className={`group relative grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 py-8 md:py-12 ${
        !isLast ? "border-b border-border" : ""
      }`}
    >
      {/* Left: Metadata / Ledger info */}
      <div className="lg:col-span-4 flex flex-col gap-1.5">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-mono text-[10px] text-primary border border-primary/20 bg-primary/5 px-1.5 py-0.5">
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3 className="text-xl font-bold text-foreground">{role.company}</h3>
        </div>

        <div className="flex flex-col gap-1 lg:pl-5">
          <span className="text-[13px] font-mono uppercase tracking-widest text-foreground/80">
            {role.role}
          </span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-muted-foreground mt-1">
            {/* Duration sits inside the brackets with the dates it is derived
                from. Trailing the employment type instead put a third
                separator on a line already long enough to wrap, which left a
                stranded "·" at the end of the first line. */}
            <span className="whitespace-nowrap">
              {'[ '}
              {role.period}
              {span && (
                <>
                  {' · '}
                  <span className="text-foreground/80 tabular-nums">{formatDuration(span.months)}</span>
                </>
              )}
              {' ]'}
            </span>
            {/* Bound to its separator so the pair wraps together — loose, the
                "·" stayed behind on the previous line. */}
            <span className="whitespace-nowrap">
              <span className="text-primary">·</span> {role.type}
            </span>
          </div>

          {/* Span bar.

              Every role carried the same visual weight while the real spans
              run from two months to three and a half years, so the one
              quantity a ledger exists to record was invisible. Each bar sits
              on the same axis, which also makes the overlaps a shape rather
              than a footnote — TAC AFRICA falls entirely inside AfriHUB.

              Redundant to the dates and the duration beside it, so it is
              hidden from assistive tech rather than read out as noise. */}
          {span && axis && (
            <div className="mt-3 max-w-[280px]" aria-hidden="true">
              <div className="relative h-1.5 bg-border/25">
                {/* The rest of the career, held at low contrast. Each track
                    becomes a small multiple — the whole span every time, with
                    one segment lit — which is what makes the overlaps
                    legible: TAC AFRICA sits entirely inside AfriHUB, and you
                    can see that on either row without holding both in your
                    head. */}
                {spans.map((other, i) =>
                  other && i !== index ? (
                    <span
                      key={EXPERIENCE[i].id}
                      className="absolute inset-y-0 bg-muted-foreground/20"
                      style={pct(spanBar(other, axis))}
                    />
                  ) : null,
                )}

                {/* Year boundaries, shared by every row, so the column reads
                    as one chart rather than five unrelated sliders.

                    Drawn over the ghosts rather than under them: the roles
                    abut almost continuously from 2018 to 2024, so beneath
                    that band the scale vanished exactly where the career is
                    densest, and adjacent spans merged into one grey slab with
                    nothing to divide them. */}
                {ticks.map((t) => (
                  <span
                    key={t}
                    className="absolute inset-y-0 w-px bg-background/70"
                    style={{ left: `${t}%` }}
                  />
                ))}

                {/* Drawn last so it wins wherever roles overlap, and scaled
                    from its own left edge so the bar grows out of its start
                    date rather than fading in place. */}
                <motion.span
                  className="absolute inset-y-0 bg-primary origin-left"
                  style={pct(spanBar(span, axis))}
                  initial={{ scaleX: 0 }}
                  animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
                  transition={{ duration: 0.55, delay: index * 0.08 + 0.2, ease: "easeOut" }}
                />
              </div>

              {/* Labelled once, at the first bar a reader meets, so the rest
                  of the column inherits the scale without repeating it. */}
              {index === 0 && (
                <div className="flex justify-between text-[9px] font-mono text-muted-foreground tabular-nums mt-1.5">
                  <span>{Math.floor(axis.from / 12)}</span>
                  <span>{Math.floor(axis.to / 12)}</span>
                </div>
              )}
            </div>
          )}

          {/* Overlapping dates read as an error until you say otherwise. */}
          {role.note && (
            <span className="text-[11px] text-muted-foreground font-light leading-snug mt-1.5 max-w-[280px]">
              {role.note}
            </span>
          )}
        </div>
      </div>

      {/* Right: Content */}
      <div className="lg:col-span-8 space-y-4 pt-1">
        <p className="text-[13px] text-foreground/80 leading-relaxed font-light">
          {role.summary}
        </p>

        {role.highlights.length > 0 && (
          <ul className="space-y-2 mt-4">
            {role.highlights.map((h, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
                transition={{ duration: 0.4, delay: index * 0.08 + (i + 1) * 0.08 }}
                className="flex items-start gap-3 text-[13px] text-muted-foreground font-light leading-relaxed"
              >
                <span className="mt-1.5 w-1 h-1 bg-primary shrink-0" />
                {h}
              </motion.li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2 pt-4">
          {role.stack.map((t) => (
            <span
              key={t}
              className="text-[10px] font-mono text-muted-foreground border border-border px-2 py-0.5 uppercase tracking-widest hover:border-primary/30 hover:text-foreground transition-colors cursor-default"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/* MAIN                                                                       */
/* -------------------------------------------------------------------------- */

const Experience: React.FC = () => {
  // Parsed once for the whole ledger: the bars share an axis, so the window
  // has to be computed across every role rather than per row.
  const spans = useMemo(() => EXPERIENCE.map((role) => parsePeriod(role.period)), []);
  const axis = useMemo(() => careerWindow(spans), [spans]);

  // Derived, so the header cannot claim a range the bars below it contradict.
  const startYear = axis ? Math.floor(axis.from / 12) : null;
  const endYear = axis ? Math.floor(axis.to / 12) : null;

  return (
    <section
      id="experience"
      data-section="experience"
      className="py-24 relative overflow-hidden"
      aria-label="Work experience"
    >
      <div className="container px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-16 border-b border-border pb-8"
        >
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
          <p className="text-[13px] text-muted-foreground max-w-md font-light leading-relaxed">
            {EXPERIENCE.length} roles since {startYear}, most run alongside a degree or another
            contract. The work was largely inherited — systems already in production, already
            depended on, and usually manual or slow.
          </p>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-4">
            {startYear} — {endYear} · Health-tech, construction &amp; consulting
          </p>
        </motion.div>

        {/* Roles Ledger */}
        <div className="relative border border-border bg-card/20 px-6 sm:px-10">
          {/* Top gradient accent */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          {EXPERIENCE.map((role, i) => (
            <RoleRow
              key={role.id}
              role={role}
              index={i}
              isLast={i === EXPERIENCE.length - 1}
              span={spans[i]}
              spans={spans}
              axis={axis}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Experience;