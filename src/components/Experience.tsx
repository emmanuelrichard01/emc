import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Terminal } from "lucide-react";

import { EXPERIENCE } from "@/data/experience";

/* -------------------------------------------------------------------------- */
/* ROLE ROW                                                                   */
/* -------------------------------------------------------------------------- */

const RoleRow = ({
  role,
  index,
  isLast,
}: {
  role: (typeof EXPERIENCE)[0];
  index: number;
  isLast: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className={`group grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 py-8 md:py-12 ${
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
          <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground mt-1">
            <span>[ {role.period} ]</span>
            <span className="text-primary/60">·</span>
            <span>{role.type}</span>
          </div>

          {/* Overlapping dates read as an error until you say otherwise. */}
          {role.note && (
            <span className="text-[11px] text-muted-foreground/60 font-light leading-snug mt-1.5 max-w-[280px]">
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
          className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-8"
        >
          <div>
            <div className="flex items-center gap-3 text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase mb-4">
              <Terminal className="w-4 h-4 text-primary" />
              <span>Module 03 // Career Ledger</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Production <span className="text-muted-foreground font-mono font-normal">History</span>
            </h2>
          </div>
          <p className="text-muted-foreground max-w-md text-[13px] leading-relaxed font-light">
            Roles that narrowed my focus on systems that scale and engineering decisions that hold up in production.
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
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Experience;