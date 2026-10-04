import type { NavigateFunction } from 'react-router-dom';

import type { AiAction } from './aiProtocol';
import { scrollToElementAndLand, scrollToSection } from './scrollToSection';

/* ==========================================================================
   AI ACTIONS — doing what the assistant offered

   The assistant never moves the page on its own. Every action arrives as a
   button; this runs it when the visitor presses it, and the guided tour
   runs them one step at a time after the visitor has started it.

   Off the home page, an action that needs the home page navigates there
   first and finishes once the sections have mounted.

   A quote to highlight travels to the case-study page in sessionStorage
   (HIGHLIGHT_KEY), read once on arrival and cleared, so it never outlives
   the jump that asked for it.
   ========================================================================== */

export const HIGHLIGHT_KEY = 'emc-ai-highlight';

export interface PendingHighlight {
  projectId: string;
  section?: string;
  quote?: string;
  at: number;
}

const onHome = () => window.location.pathname === '/';

/** Waits until an element with `id` exists (the home page has mounted), up to a limit. */
async function whenPresent(id: string, timeoutMs = 4000): Promise<boolean> {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if (document.getElementById(id)) return true;
    await new Promise((r) => setTimeout(r, 60));
  }
  return false;
}

async function home(navigate: NavigateFunction, then: () => void | Promise<void>, anchor: string) {
  if (!onHome()) {
    navigate('/');
    if (!(await whenPresent(anchor))) return;
    // A frame for the route transition to settle.
    await new Promise((r) => setTimeout(r, 120));
  }
  await then();
}

export async function runAction(action: AiAction, navigate: NavigateFunction): Promise<void> {
  switch (action.kind) {
    case 'show-work':
      return home(
        navigate,
        async () => {
          window.dispatchEvent(
            new CustomEvent('emc:work-filter', {
              detail: { stack: action.stack ?? [], tier: action.tier, query: action.query },
            })
          );
          await scrollToElementAndLand('work-catalogue');
        },
        'work-catalogue'
      );

    case 'go-to':
      return home(navigate, () => void scrollToSection(action.section), action.section);

    case 'open-role':
      return home(
        navigate,
        () => {
          window.dispatchEvent(new CustomEvent('emc:open-role', { detail: action.id }));
        },
        'experience'
      );

    case 'open-case': {
      try {
        const pending: PendingHighlight = { projectId: action.id, section: action.section, quote: action.quote, at: Date.now() };
        sessionStorage.setItem(HIGHLIGHT_KEY, JSON.stringify(pending));
      } catch {
        /* storage blocked: the jump still works, without the highlight */
      }
      const hash = action.section ? `#${action.section}` : '';
      if (window.location.pathname === `/projects/${action.id}`) {
        if (action.section) document.getElementById(action.section)?.scrollIntoView({ behavior: 'smooth' });
        window.dispatchEvent(new CustomEvent('emc:ai-highlight'));
        return;
      }
      navigate(`/projects/${action.id}${hash}`);
      return;
    }
  }
}

/** Reads (and clears) a highlight meant for this case study, if it is fresh. */
export function takeHighlight(projectId: string): PendingHighlight | null {
  try {
    const raw = sessionStorage.getItem(HIGHLIGHT_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw) as PendingHighlight;
    if (pending.projectId !== projectId || Date.now() - pending.at > 15_000) return null;
    sessionStorage.removeItem(HIGHLIGHT_KEY);
    return pending;
  } catch {
    return null;
  }
}
