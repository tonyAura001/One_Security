import type { Tone } from "@/lib/colors";
import { toneBar } from "@/lib/colors";
import { cn } from "@/lib/utils";

/** Thin rounded track + fill, used in KPI meters and the commercial pipeline. */
export function ProgressBar({
  value,
  tone = "accent",
  height = 6,
  faded = false,
  className,
}: {
  /** 0–100 */
  value: number;
  tone?: Tone;
  height?: number;
  faded?: boolean;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("bg-surface2 overflow-hidden rounded-full", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-all", toneBar[tone])}
        style={{ width: `${pct}%`, opacity: faded ? 0.55 : 1 }}
      />
    </div>
  );
}
