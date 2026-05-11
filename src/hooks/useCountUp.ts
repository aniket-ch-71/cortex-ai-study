import { useEffect, useRef, useState } from "react";

/** Animates a number from 0 → target over `duration` ms using rAF. */
export function useCountUp(target: number, duration = 800, enabled = true) {
  const [value, setValue] = useState(enabled ? 0 : target);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }
    startRef.current = null;
    const from = 0;
    const to = Number.isFinite(target) ? target : 0;

    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, enabled]);

  return value;
}
