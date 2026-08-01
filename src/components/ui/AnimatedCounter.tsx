import { useState, useEffect, useRef } from "react";

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
}

/* Count-up that triggers once when scrolled into view, with a spring-like
   overshoot-then-settle ease. Shared by About's metrics grid and Projects'
   flagship spotlight. */
export const AnimatedCounter = ({ target, suffix = "" }: AnimatedCounterProps) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1200;
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Spring-like easing: overshoots slightly then settles
            const eased = progress < 0.8
              ? 1 - Math.pow(1 - (progress / 0.8), 3)
              : 1 + Math.sin((progress - 0.8) * Math.PI * 5) * 0.02 * (1 - progress);
            setCount(Math.round(Math.min(eased, 1.02) * target));
            if (progress < 1) requestAnimationFrame(animate);
            else setCount(target); // ensure exact final value
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count}{suffix}</span>;
};
