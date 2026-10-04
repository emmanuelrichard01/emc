import { useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { buildTour, TOUR_AUDIENCES, TOUR_STOP_SECONDS, type TourAudience } from '@/lib/aiTour';
import type { ModeProps } from './index';
import { startTour } from './tourRuntime';

/* ==========================================================================
   TOUR MODE

   Choose who the tour is for, see where it will go, and start it. Starting
   closes the dock so the page is in view; the tour bar takes over from
   there (TourBar.tsx). The stops are a script built from the site's data,
   so the tour costs nothing and says only what the pages say.
   ========================================================================== */

export default function TourMode({ onClose }: ModeProps) {
  const navigate = useNavigate();
  const groupId = useId();
  const [audience, setAudience] = useState<TourAudience>('hiring');
  const stops = useMemo(() => buildTour(audience), [audience]);
  const minutes = Math.max(1, Math.round((stops.length * (TOUR_STOP_SECONDS + 2)) / 60));
  const chosen = TOUR_AUDIENCES.find((a) => a.id === audience)!;

  const select = (id: TourAudience) => setAudience(id);

  return (
    <div className="h-full overflow-y-auto px-5 md:px-7 py-6" data-lenis-prevent>
      <h3 className="t-subhead text-foreground">Take the guided tour</h3>
      <p className="mt-2 t-caption max-w-[48ch]">
        A short walk through the site, about {minutes} {minutes === 1 ? 'minute' : 'minutes'}, with one sentence at each stop. Pause or leave whenever you like.
      </p>

      <p id={groupId} className="mt-6 t-caption text-foreground">
        Who is it for?
      </p>
      {/* A real radio group: arrow keys move it, as in the contact form. */}
      <div role="radiogroup" aria-labelledby={groupId} className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
        {TOUR_AUDIENCES.map((a, i) => {
          const active = a.id === audience;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => select(a.id)}
              onKeyDown={(e) => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
                e.preventDefault();
                const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
                const next = TOUR_AUDIENCES[(i + step + TOUR_AUDIENCES.length) % TOUR_AUDIENCES.length];
                select(next.id);
                (e.currentTarget.parentElement?.children[(i + step + TOUR_AUDIENCES.length) % TOUR_AUDIENCES.length] as HTMLElement | undefined)?.focus();
              }}
              className={`tap relative py-1.5 text-[15px] transition-colors ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {a.label}
              {active && <span aria-hidden="true" className="absolute left-0 right-0 -bottom-px h-px bg-foreground" />}
            </button>
          );
        })}
      </div>
      <p className="mt-3 t-caption">{chosen.hint}</p>

      <ol className="mt-6 border-b border-border" aria-label="Stops on this tour">
        {stops.map((stop, i) => (
          <li key={stop.id} className="grid grid-cols-[2rem_1fr] gap-x-2 py-3 border-t border-border">
            <span className="t-folio pt-0.5">{String(i + 1).padStart(2, '0')}</span>
            <span className="text-[14px] text-foreground">{stop.place}</span>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => {
          onClose();
          // After the dock has gone, so the first stop is seen, not covered.
          setTimeout(() => startTour(audience, navigate), 250);
        }}
        className="mt-6 btn-ink tap group"
      >
        Start the tour
        <ArrowRight className="nudge w-4 h-4" aria-hidden="true" />
      </button>
      <p className="mt-3 text-[12px] text-muted-quiet">Esc leaves the tour at any point. Scrolling the page pauses it.</p>
    </div>
  );
}
