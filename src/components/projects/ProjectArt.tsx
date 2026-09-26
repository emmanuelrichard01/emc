import type { Project } from '@/types';
import { depthOf } from './workModel';

/* ==========================================================================
   PROJECT ART

   What a project looks like when it is shown larger than a row.

   Five projects have a screenshot. The other eight — pipelines, engines,
   limiters, design studies — have no front end to photograph, and the old
   card simply had a blank where the picture would go, which made the
   deepest work look like the least finished. Inventing artwork for them
   would be the kind of decoration this site removes on sight.

   So those get a spec sheet instead: the project's own measured figures,
   set large, over the drafting grid — the thing a data system actually has
   to show. It is honest by construction: nothing on it is not in the data.
   ========================================================================== */

interface ProjectArtProps {
  project: Project;
  /** Shared-element name for the card → case-study morph. */
  transitionName?: string;
  className?: string;
  /** Tighter type for small previews. */
  compact?: boolean;
  /** Thumbnail: the grid and the lead figure only. */
  thumb?: boolean;
}

export default function ProjectArt({ project, transitionName, className = '', compact, thumb }: ProjectArtProps) {
  if (project.image) {
    return (
      <div className={`relative overflow-hidden bg-muted ${className}`}>
        <img
          src={project.image}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.025]"
          style={transitionName ? { viewTransitionName: transitionName } : undefined}
        />
        {/* Scanline wash: a screenshot reads as something on a screen rather
            than as stock imagery dropped into the layout. */}
        <span
          className="absolute inset-0 pointer-events-none opacity-30"
          aria-hidden="true"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, hsl(0 0% 0% / 0.3) 0px, hsl(0 0% 0% / 0.3) 1px, transparent 1px, transparent 3px)',
          }}
        />
      </div>
    );
  }

  if (thumb) {
    const lead = project.metrics[0];
    return (
      <div className={`relative overflow-hidden bg-[hsl(var(--hero-surface))] flex items-center justify-center ${className}`}>
        <span
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(to right, hsl(var(--foreground) / 0.05) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground) / 0.05) 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }}
        />
        <span className="relative font-mono text-[12px] text-primary tabular-nums px-2 truncate">{lead?.value ?? '—'}</span>
      </div>
    );
  }

  const depth = depthOf(project);
  const metrics = project.metrics.slice(0, 3);
  const isDesign = project.tier === 'design';

  return (
    <div
      className={`relative overflow-hidden bg-[hsl(var(--hero-surface))] ${className}`}
      style={transitionName ? { viewTransitionName: transitionName } : undefined}
    >
      {/* Drafting grid, two scales — the same language as the hero. */}
      <span
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--foreground) / 0.035) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground) / 0.035) 1px, transparent 1px),
            linear-gradient(to right, hsl(var(--foreground) / 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground) / 0.05) 1px, transparent 1px)`,
          backgroundSize: '16px 16px, 16px 16px, 64px 64px, 64px 64px',
        }}
      />
      <span
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 30% 20%, hsl(var(--primary) / 0.08), transparent 70%)' }}
      />

      <div className={`relative h-full flex flex-col justify-between ${compact ? 'p-4' : 'p-5 md:p-6'}`}>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {isDesign ? 'spec · not built' : 'spec sheet'}
        </span>

        {metrics.length > 0 ? (
          <dl className={`grid gap-x-4 gap-y-3 ${metrics.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {metrics.map((metric, i) => (
              <div key={metric.label} className={i === 0 && metrics.length === 3 ? 'col-span-2' : ''}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground truncate">
                  {metric.label}
                </dt>
                <dd
                  className={`font-mono tabular-nums leading-tight truncate ${
                    i === 0
                      ? `${compact ? 'text-xl' : 'text-2xl md:text-3xl'} text-primary`
                      : `${compact ? 'text-[13px]' : 'text-sm'} text-foreground`
                  }`}
                >
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <span className="font-mono text-[12px] text-muted-foreground">{project.category}</span>
        )}

        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
          {depth.tradeoffs ? `${depth.tradeoffs} trade-offs` : project.category}
          {depth.fieldNotes ? ` · ${depth.fieldNotes} field notes` : ''}
        </span>
      </div>
    </div>
  );
}
