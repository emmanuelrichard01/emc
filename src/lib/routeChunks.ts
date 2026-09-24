import type { ComponentType } from 'react';

/* ==========================================================================
   ROUTE CHUNKS

   The two routes a view transition travels between, loadable ahead of time
   and renderable *synchronously* once loaded.

   The second half is the point. React.lazy suspends on its first render even
   when the module arrived long ago, and a suspended route renders its
   fallback — so a view transition that navigated into a lazy route would
   capture a blank loading screen as the "after" picture and morph the card
   into nothing. Holding on to the loaded module lets the route render the
   real page in the very commit the transition snapshots.
   ========================================================================== */

type PageModule = { default: ComponentType };

const loaded: Record<string, PageModule | undefined> = {};

function loader(name: string, load: () => Promise<PageModule>) {
  let pending: Promise<PageModule> | null = null;
  return () =>
    (pending ??= load().then((module) => {
      loaded[name] = module;
      return module;
    }));
}

export const loadIndex = loader('index', () => import('../pages/Index'));
export const loadProjectDetail = loader('detail', () => import('../pages/ProjectDetail'));

/** The page component if its chunk has already arrived, else null. */
export const loadedIndex = () => loaded.index?.default ?? null;
export const loadedProjectDetail = () => loaded.detail?.default ?? null;
