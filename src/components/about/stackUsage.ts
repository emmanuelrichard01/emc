import type { ExperienceItem, Project } from '@/types';
import { IMPLIED_BY, usesTech } from '@/lib/techFamily';

/* ==========================================================================
   STACK USAGE

   A skills list asserts; this counts. For each technology in the About
   section's stack, which built projects and which roles actually used it —
   read from the same arrays the Work and Experience sections render, so the
   bar beside "PostgreSQL" is the number of places PostgreSQL really went.

   Design studies are excluded: a blueprint names technologies it never ran,
   and counting them would be exactly the inflation this section refuses.
   ========================================================================== */

export interface Usage {
  name: string;
  projects: { id: string; title: string }[];
  roles: string[];
  /** Projects + roles. */
  count: number;
  /** For a family like SQL: the tools that also counted (PostgreSQL, dbt…). */
  implied: readonly string[];
}

export function stackUsage(names: readonly string[], projects: Project[], roles: ExperienceItem[]): Usage[] {
  const built = projects.filter((p) => p.tier !== 'design');
  return names.map((name) => {
    const inProjects = built.filter((p) => usesTech(p.stack, name)).map((p) => ({ id: p.id, title: p.title }));
    const inRoles = roles.filter((r) => usesTech(r.stack, name)).map((r) => r.company);
    return {
      name,
      projects: inProjects,
      roles: inRoles,
      count: inProjects.length + inRoles.length,
      implied: IMPLIED_BY[name] ?? [],
    };
  });
}
