import { createRoot, type Root } from 'react-dom/client';
import type { NavigateFunction } from 'react-router-dom';

import { buildTour, TOUR_AUDIENCES, type TourAudience } from '@/lib/aiTour';
import TourBar from './TourBar';

/* ==========================================================================
   TOUR RUNTIME

   The tour outlives the dock that starts it: the dock closes so the page is
   visible, and the bar has to keep going across route changes. So the bar
   is mounted in its own root on <body>, outside the dock's tree, and is
   driven with the router's navigate function captured when the tour began.
   One tour at a time; starting another replaces it.
   ========================================================================== */

let root: Root | null = null;
let host: HTMLDivElement | null = null;

export function stopTour() {
  root?.unmount();
  host?.remove();
  root = null;
  host = null;
}

export function startTour(audience: TourAudience, navigate: NavigateFunction) {
  stopTour();
  host = document.createElement('div');
  host.setAttribute('data-tour-host', '');
  document.body.appendChild(host);
  root = createRoot(host);
  const label = TOUR_AUDIENCES.find((a) => a.id === audience)?.label ?? 'Visitor';
  root.render(<TourBar stops={buildTour(audience)} audienceLabel={label} navigate={navigate} onExit={stopTour} />);
}
