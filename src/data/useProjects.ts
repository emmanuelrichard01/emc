import { useEffect, useState } from 'react';

import type { Project } from '@/types';

/* ==========================================================================
   PROJECTS, FOR THE APP SHELL

   The shell (navbar, palette, assistant) wants the project list too — the
   palette lists every case study, the assistant needs to know which one is
   on screen. Importing PROJECTS statically from the shell moved the whole
   dataset, every case study's prose included, into the entry bundle: +34 KB
   gzipped on the critical path, measured, for data no shell component needs
   before the first interaction.

   So the shell reads it through here: one dynamic import, shared with the
   route chunks that load the same module anyway, resolved once and cached
   at module scope. In practice it has arrived before anyone could open the
   palette; until it does, the shell simply has no projects to offer.
   ========================================================================== */

let cache: Project[] | null = null;
let pending: Promise<Project[]> | null = null;

function load(): Promise<Project[]> {
  pending ??= import('./projects').then((m) => (cache = m.PROJECTS));
  return pending;
}

export function useProjects(): Project[] | null {
  const [projects, setProjects] = useState<Project[] | null>(cache);
  useEffect(() => {
    if (cache) return;
    let live = true;
    load().then(
      (list) => {
        if (live) setProjects(list);
      },
      () => {
        /* a failed chunk is the router's to report; the shell just goes without */
      }
    );
    return () => {
      live = false;
    };
  }, []);
  return projects;
}
