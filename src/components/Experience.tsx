import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Terminal } from "lucide-react";

import { ExperienceItem } from "@/types";
import { EXPERIENCE } from "@/data/experience";

/* -------------------------------------------------------------------------- */
/* 2. ANIMATION                                                               */
/* -------------------------------------------------------------------------- */

const ease = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

/* -------------------------------------------------------------------------- */
/* 3. ROLE ROW                                                                */
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
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={fadeUp}
      className={`group grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 md:gap-8 py-6 sm:py-8 md:py-10 ${
        !isLast ? "border-b border-white/[0.04]" : ""
      }`}
    >
      {/* Left: metadata */}
      <div className="md:col-span-3 flex flex-col gap-1">
        <h3 className="text-[15px] font-semibold text-white/80 group-hover:text-white transition-colors duration-300">
          {role.company}
        </h3>
        <div className="flex items-center gap-2 text-[11px] font-mono text-white/50">
          <span>{role.period}</span>
          <span className="text-white/40" aria-hidden="true">·</span>
          <span className="text-white/50">{role.type}</span>
        </div>
      </div>

      {/* Right: content */}
      <div className="md:col-span-9 space-y-3">
        {/* Role title */}
        <h4 className="text-[15px] font-medium text-white/70 group-hover:text-white/90 transition-colors duration-300">
          {role.role}
        </h4>

        {/* Summary */}
        <p className="text-[13px] text-white/60 leading-relaxed font-light max-w-2xl">
          {role.summary}
        </p>

        {/* Highlights — max 2, short, scannable */}
        <ul className="space-y-1.5 pt-1">
          {role.highlights.map((h, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[12px] text-white/50 font-light"
            >
              <span className="mt-[6px] h-1 w-1 rounded-full bg-emerald-500/50 shrink-0" />
              {h}
            </li>
          ))}
        </ul>

        {/* Stack */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {role.stack.map((t) => (
            <span
              key={t}
              className="text-[10px] font-mono text-white/50 bg-white/[0.02] px-2 py-0.5 rounded border border-white/[0.04]"
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
/* 4. MAIN                                                                    */
/* -------------------------------------------------------------------------- */

const Experience: React.FC = () => {
  return (
    <section
      id="experience"
      data-section="experience"
      className="py-20 sm:py-24 md:py-32 relative overflow-hidden"
      aria-label="Work experience"
    >
      <div className="container px-4 md:px-6 max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease }}
          className="mb-14 md:mb-20"
        >
          <div className="flex items-center gap-2 text-primary/60 font-mono text-[10px] tracking-[0.2em] uppercase mb-4">
            <Terminal className="w-3.5 h-3.5" />
            <span>Experience</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white/90 mb-4">
            Where I've{" "}
            <span className="text-white/60">shipped.</span>
          </h2>
          <p className="text-sm text-white/60 max-w-lg font-light leading-relaxed">
            From infrastructure consulting to full-stack products to backend systems engineering — each role narrowed my focus on what matters: systems that scale, decisions that hold.
          </p>
        </motion.div>

        {/* Roles */}
        <div>
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