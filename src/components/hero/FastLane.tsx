import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowUpRight } from 'lucide-react';

import TransitionLink from '@/components/ui/TransitionLink';
import { PROJECTS } from '@/data/projects';
import { STATUS_CLASS, STATUS_LABEL, projectStatus } from '@/lib/project';
import { scrollToSection } from '@/lib/scrollToSection';

/* ==========================================================================
   FAST LANE

   The way past the terminal for someone who will not type.

   The shell is the site's idea and it keeps the whole first screen — but a
   recruiter with thirty seconds reads a blinking prompt as a question they
   have to answer before they get anything. This is the answer they did not
   have to ask for: the three flagships, one line each, with their status,
   one click from the case study. It sits under the shell rather than in it,
   so it never competes with the prompt for focus, and it is written in the
   same instrument voice so it reads as part of the console, not a banner
   bolted onto it.

   No view-transition names here, deliberately: the same titles appear in the
   project grid further down the page, and a name used twice on one page
   cancels the transition for every element.
   ========================================================================== */

const FLAGSHIPS = PROJECTS.filter((p) => p.tier === 'flagship').slice(0, 3);

export default function FastLane({ live }: { live: boolean }) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.nav
      aria-label="Selected work"
      initial={prefersReduced ? false : { opacity: 0, y: 6 }}
      animate={live ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      // Hidden on short screens, where every line belongs to the shell.
      className="relative z-10 hidden md:flex [@media(max-height:720px)]:hidden items-stretch shrink-0 border-t border-border/70 mt-3"
    >
      <span className="hidden lg:flex items-center pr-5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground shrink-0">
        selected work
      </span>

      <ul className="flex flex-1 min-w-0 divide-x divide-border/70 border-x border-border/70">
        {FLAGSHIPS.map((project) => {
          const status = projectStatus(project);
          return (
            <li key={project.id} className="flex-1 min-w-0">
              <TransitionLink
                to={`/projects/${project.id}`}
                className="group flex items-center gap-3 h-full px-4 py-3 hover:bg-primary/[0.05] focus-visible:bg-primary/[0.07] transition-colors"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[13px] text-foreground group-hover:text-primary transition-colors truncate">
                      {project.title}
                    </span>
                    <span className={`font-mono text-[10px] uppercase tracking-wider shrink-0 ${STATUS_CLASS[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                  </span>
                  <span className="block text-[12px] text-muted-foreground truncate mt-0.5">{project.subtitle}</span>
                </span>
                <ArrowUpRight
                  className="w-3.5 h-3.5 shrink-0 text-muted-foreground group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all"
                  aria-hidden="true"
                />
              </TransitionLink>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => scrollToSection('projects')}
        className="flex items-center gap-2 pl-5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors shrink-0"
      >
        all {PROJECTS.length}
        <ArrowDown className="w-3 h-3" aria-hidden="true" />
      </button>
    </motion.nav>
  );
}
