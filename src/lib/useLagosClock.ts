import { useEffect, useState } from 'react';

import { lagosClock, type Clock } from './lagosClock';

/* Abuja/Lagos (UTC+1) time, re-rendering on the minute boundary rather than
   every second — a quiet ambient detail, not a countdown. Shared by the
   hero's baseline, Contact and the footer, so none can show a different
   time. The visitor's offset is read with the time, so a laptop that
   crosses a zone mid-visit is right on the next minute. */
const read = (): Clock => {
  const now = new Date();
  return lagosClock(now, -now.getTimezoneOffset());
};

export function useLagosClock(): Clock {
  // Lazy initialiser: read once on mount, not on every render.
  const [clock, setClock] = useState(read);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const align = setTimeout(() => {
      setClock(read());
      interval = setInterval(() => setClock(read()), 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      clearTimeout(align);
      if (interval) clearInterval(interval);
    };
  }, []);

  return clock;
}
