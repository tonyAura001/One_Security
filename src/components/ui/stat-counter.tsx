"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts up to `value` on mount for a lively KPI feel. Honours
 * prefers-reduced-motion (jumps straight to the final value).
 */
export function StatCounter({
  value,
  format = (n) => Math.round(n).toLocaleString("fr-FR").replace(/ /g, " "),
  durationMs = 900,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  durationMs?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      raf.current = requestAnimationFrame(() => setDisplay(value));
      return () => {
        if (raf.current) cancelAnimationFrame(raf.current);
      };
    }
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, durationMs]);

  return (
    <span className={className} suppressHydrationWarning>
      {format(display)}
    </span>
  );
}
