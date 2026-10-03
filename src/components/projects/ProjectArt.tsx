import type { Project } from '@/types';
import { DESIGN_OUTLINE } from './tiers';

/* ==========================================================================
   PROJECT ART

   What a project looks like when it is shown larger than a row.

   Most projects have a screenshot. The others (pipelines, engines,
   limiters, design studies) have no front end to photograph, and inventing
   artwork for them would be the kind of decoration this site removes on
   sight. So they get a typographic plate instead: a hairline frame on the
   stock with the project's title, what it is, and what it is built with.
   No fill, no hero number. Nothing on it is not in the data.

   Design-stage work is framed by a dashed hairline inside the plate, the
   monograph's mark for "drawn, not built".
   ========================================================================== */

interface ProjectArtProps {
  project: Project;
  /** Shared-element name for the card → case-study morph. */
  transitionName?: string;
  className?: string;
  /** Tighter type for small previews. */
  compact?: boolean;
  /** Thumbnail: the lead figure only. */
  thumb?: boolean;
}

export default function ProjectArt({ project, transitionName, className = '', compact, thumb }: ProjectArtProps) {
  const isDesign = project.tier === 'design';

  if (project.image) {
    return (
      <div className={`relative overflow-hidden bg-card ${className}`}>
        <img
          src={project.image}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-[1200ms] ease-out-expo group-hover:scale-[1.025]"
          style={transitionName ? { viewTransitionName: transitionName } : undefined}
        />
        {/* A hairline keeps a light screenshot's edge from bleeding into
            the stock. */}
        <span className="absolute inset-0 pointer-events-none shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.06)]" aria-hidden="true" />
      </div>
    );
  }

  if (thumb) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center shadow-[inset_0_0_0_1px_hsl(var(--border))] ${className}`}
      >
        {isDesign && <span className="absolute inset-1.5 border border-dashed border-rule-strong pointer-events-none" aria-hidden="true" />}
        <span className={`relative font-display font-[560] text-[12px] leading-tight text-center px-2 line-clamp-2 ${isDesign ? "text-muted-foreground" : "text-foreground"}`}>
          {project.title}
        </span>
      </div>
    );
  }

  const tools = project.stack.slice(0, compact ? 4 : 6);

  return (
    <div
      className={`relative overflow-hidden shadow-[inset_0_0_0_1px_hsl(var(--border))] ${className}`}
      style={transitionName ? { viewTransitionName: transitionName } : undefined}
    >
      {isDesign && (
        <span
          className={`absolute pointer-events-none border border-dashed border-rule-strong ${compact ? "inset-2" : "inset-3 md:inset-4"}`}
          aria-hidden="true"
        />
      )}

      <div className={`relative h-full flex flex-col justify-between ${compact ? "p-4" : "p-6 md:p-10"}`}>
        {/* Said plainly rather than left for the reader to wonder about. */}
        <span className="t-caption">{isDesign ? "Designed, not built" : "No screen to show: this runs behind the scenes"}</span>

        {/* What it is made of, set large: the caption beside the plate
            already carries the title, so the plate shows the one thing a
            screenshot would have shown, which is the system's parts. */}
        <ul className="min-w-0 space-y-1">
          {tools.slice(0, compact ? 3 : 4).map((tool) => (
            <li
              key={tool}
              className={`font-display font-[560] tracking-[-0.03em] leading-[1.02] ${isDesign ? DESIGN_OUTLINE : "text-foreground"} ${
                compact ? "text-[1.125rem]" : "text-[1.75rem] sm:text-[2.25rem] lg:text-[2.75rem]"
              }`}
            >
              {tool}
            </li>
          ))}
        </ul>

        {project.stack.length > (compact ? 3 : 4) ? (
          <p className="t-caption border-t border-border pt-3">
            and {project.stack.slice(compact ? 3 : 4).join(", ")}
          </p>
        ) : (
          <span className="t-caption border-t border-border pt-3">{project.stack.length ? "That is the whole stack" : "No code yet"}</span>
        )}
      </div>
    </div>
  );
}
