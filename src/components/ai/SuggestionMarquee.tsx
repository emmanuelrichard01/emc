import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';

/* ==========================================================================
   SUGGESTION MARQUEE

   Starter questions as a slow, continuous ticker rather than a wall of
   chips. Six boxed questions took four rows on a phone and read as a form
   to fill in; one moving line reads as an invitation, costs one row at any
   width, and still puts every question one click away.

   Built to stay quiet:

     · CSS animation on transform only, so it composites on the GPU and
       costs nothing on a page already running the hero canvas;
     · edges faded with a mask, so items drift in and out of view instead of
       being cut at a hard border;
     · paused while hovered or while anything inside has keyboard focus —
       nobody should have to chase the thing they are trying to click;
     · the loop is the list twice, the second copy hidden from assistive tech
       and the tab order, so a screen reader hears each question once and a
       keyboard user tabs through each once;
     · under reduced motion it is not a marquee at all: the same items wrap
       as a static row (see .marquee in index.css).

   Speed is set per item rather than as one duration, so a longer list moves
   at the same pace as a short one instead of racing.
   ========================================================================== */

interface SuggestionMarqueeProps {
  items: readonly string[];
  onPick: (question: string) => void;
  disabled?: boolean;
  /** Seconds per item for one full loop. Higher is slower. */
  secondsPerItem?: number;
  /** Run the other way — for a second row. */
  reverse?: boolean;
  label?: string;
  className?: string;
}

export default function SuggestionMarquee({
  items,
  onPick,
  disabled,
  secondsPerItem = 7,
  reverse,
  label = 'Suggested questions',
  className = '',
}: SuggestionMarqueeProps) {
  const duration = useMemo(() => Math.max(24, items.length * secondsPerItem), [items.length, secondsPerItem]);

  const renderItem = (question: string, copy: boolean, i: number) => (
    <li key={`${copy ? 'b' : 'a'}-${i}`} className="marquee__item" aria-hidden={copy || undefined}>
      <button
        type="button"
        tabIndex={copy ? -1 : undefined}
        disabled={disabled}
        onClick={() => onPick(question)}
        className="group flex items-center gap-2 whitespace-nowrap motion-reduce:whitespace-normal motion-reduce:text-left font-sans text-[13px] text-muted-foreground px-3 py-2 hover:text-foreground focus-visible:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Sparkles
          className="w-3 h-3 text-muted-quiet group-hover:text-primary group-focus-visible:text-primary group-hover:rotate-12 transition-[color,transform] duration-500 shrink-0"
          aria-hidden="true"
        />
        <span className="bg-[linear-gradient(currentColor,currentColor)] bg-no-repeat bg-[length:0%_1px] bg-[position:0_100%] pb-0.5 transition-[background-size] duration-500 ease-out-expo group-hover:bg-[length:100%_1px] group-focus-visible:bg-[length:100%_1px]">
          {question}
        </span>
      </button>
      <span className="marquee__sep text-muted-ghost select-none" aria-hidden="true">
        ·
      </span>
    </li>
  );

  return (
    <div
      className={`marquee ${reverse ? 'marquee--reverse' : ''} ${className}`}
      style={{ ['--marquee-duration' as string]: `${duration}s` }}
      role="group"
      aria-label={label}
    >
      <ul className="marquee__track">
        {items.map((q, i) => renderItem(q, false, i))}
        {items.map((q, i) => renderItem(q, true, i))}
      </ul>
    </div>
  );
}
