import { flushSync } from 'react-dom';

import { loadIndex, loadProjectDetail } from './routeChunks';

/* ==========================================================================
   VIEW TRANSITIONS

   A project card becoming its case study: the screenshot grows into the
   page's hero image and the title travels into the heading, so the page you
   land on is visibly the thing you clicked rather than a new screen that
   happens to share its name.

   Built on the browser's View Transitions API rather than React Router's
   `viewTransition` prop, which only exists for data routers; this app uses
   the declarative <BrowserRouter>. The recipe:

     1. load the destination's chunk first, while the old page is still up;
     2. inside startViewTransition, navigate under flushSync, so the new page
        is in the DOM — scrolled to top by its own effect — before the
        browser takes the "after" snapshot;
     3. elements that should morph share a `view-transition-name`.

   Where the API is missing, or the visitor prefers reduced motion, it is an
   ordinary navigation and the existing fade applies.
   ========================================================================== */

type Navigate = (to: string) => void;

export function supportsViewTransitions(): boolean {
  return (
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Evaluated once: the route renderer's shape must not change mid-session. */
export const VIEW_TRANSITIONS = supportsViewTransitions();

/** The chunk a destination path renders, so it can be loaded before the transition starts. */
function chunkFor(to: string): () => Promise<unknown> {
  return to.startsWith('/projects/') ? loadProjectDetail : loadIndex;
}

export function navigateWithTransition(navigate: Navigate, to: string): void {
  if (!VIEW_TRANSITIONS || !supportsViewTransitions()) {
    navigate(to);
    return;
  }
  chunkFor(to)().then(
    () => {
      (document as Document & { startViewTransition: (update: () => void) => unknown }).startViewTransition(() => {
        flushSync(() => navigate(to));
      });
    },
    // A chunk that failed to load is the router's problem to report, not ours.
    () => navigate(to)
  );
}

/** Shared-element names. Ids are kebab-case, which is a valid CSS ident. */
export const transitionName = (part: 'art' | 'title', projectId: string) => `project-${part}-${projectId}`;
