import { useEffect, useMemo, useState } from 'react';

/* Abuja/Lagos (UTC+1) time, re-rendering on the minute boundary rather than
   every second — a quiet ambient detail, not a countdown. Shared by the hero's
   baseline and the footer so the two can never show different times. */
export function useLagosClock(): string {
  const formatter = useMemo(
    () => new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit' }),
    []
  );
  // Lazy initialiser: read once on mount, not on every render.
  const [time, setTime] = useState(() => formatter.format(new Date()));

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const align = setTimeout(() => {
      setTime(formatter.format(new Date()));
      interval = setInterval(() => setTime(formatter.format(new Date())), 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      clearTimeout(align);
      if (interval) clearInterval(interval);
    };
  }, [formatter]);

  return time;
}
