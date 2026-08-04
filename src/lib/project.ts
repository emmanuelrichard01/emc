import type { Project, ProjectStatus } from '@/types';

/**
 * Derives a project's public status from the links it actually has.
 *
 * Derived rather than stored so the label can never drift from reality — the
 * previous UI printed "ONLINE" on every card, including projects with neither
 * a live URL nor a public repository.
 */
export function projectStatus(project: Project): ProjectStatus {
  // Tier wins: a design study has no links precisely because it was never
  // built, and reporting that as "private build" would overstate it.
  if (project.tier === 'design') return 'design';
  if (project.liveUrl) return 'live';
  if (project.github) return 'source-available';
  return 'private';
}

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  live: 'LIVE',
  'source-available': 'SOURCE OPEN',
  private: 'PRIVATE BUILD',
  design: 'DESIGN STAGE',
};

export const STATUS_CLASS: Record<ProjectStatus, string> = {
  live: 'text-emerald-400',
  'source-available': 'text-primary',
  private: 'text-muted-foreground',
  design: 'text-amber-400',
};
