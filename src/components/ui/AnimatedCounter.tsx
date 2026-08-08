import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
}

/** Decimal places to animate through, taken from the target itself. */
function decimalsOf(value: number): number {
  const text = String(value);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

/* Count-up that triggers once when scrolled into view, with a spring-like
   overshoot-then-settle ease. Shared by About's metrics grid and Projects'
   flagship spotlight. */
export const AnimatedCounter = ({ target, suffix = "" }: AnimatedCounterProps) => {
  const prefersReduced = useReducedMotion();
  const decimals = useMemo(() => decimalsOf(target), [target]);

  // Under reduced motion the value is simply the target from the first paint;
  // an animated count-up is precisely the kind of motion the preference asks
  // us to skip, and the number is the point, not the animation.
  const [count, setCount] = useState(() => (prefersReduced ? target : 0));
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (prefersReduced) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return;
        hasAnimated.current = true;

        const duration = 1200;
        const startTime = performance.now();

        const animate = (now: number) => {
          /* Clamped at both ends, not just the top.
             requestAnimationFrame reports the time the frame *began*, which
             can precede the performance.now() taken when it was scheduled —
             so the first tick could arrive with a negative progress. Fed
             through the cubic below that inverts the curve, and the counter
             painted a frame of "-2.8%" for a 99.5 target, or "-1K+" for 50K,
             before snapping upward. Rare, and exactly the kind of glitch a
             reader reads as a broken number. */
          const progress = Math.min(Math.max((now - startTime) / duration, 0), 1);
          // Spring-like easing: overshoots slightly then settles.
          const eased =
            progress < 0.8
              ? 1 - Math.pow(1 - progress / 0.8, 3)
              : 1 + Math.sin((progress - 0.8) * Math.PI * 5) * 0.02 * (1 - progress);

          // Rounded to the target's own precision rather than to an integer.
          // Rounding to whole numbers made a 99.5 target count up to "100"
          // and then snap backwards on the final frame, which reads as a bug.
          setCount(Number((Math.min(eased, 1.02) * target).toFixed(decimals)));

          if (progress < 1) requestAnimationFrame(animate);
          else setCount(target);
        };

        requestAnimationFrame(animate);
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, decimals, prefersReduced]);

  return (
    <span ref={ref}>
      {count.toFixed(decimals)}
      {suffix}
    </span>
  );
};
