import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PillVariant =
  "success" | "warning" | "danger" | "neutral" | "info" | "violet";

const styles: Record<PillVariant, string> = {
  success: "bg-success/12 text-success",
  warning: "bg-warning/14 text-warning",
  danger: "bg-danger/12 text-danger",
  info: "bg-accent/14 text-accent",
  violet: "bg-violet/14 text-violet",
  neutral: "bg-muted/12 text-muted",
};

const dotColor: Record<PillVariant, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-accent",
  violet: "bg-violet",
  neutral: "bg-muted",
};

/** Soft coloured status badge. `uppercase` matches the compact mockup tags. */
export function StatusPill({
  children,
  variant = "neutral",
  dot = false,
  uppercase = false,
  className,
}: {
  children: ReactNode;
  variant?: PillVariant;
  dot?: boolean;
  uppercase?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-bold whitespace-nowrap",
        uppercase ? "text-[10px] tracking-[0.4px] uppercase" : "text-[11px]",
        styles[variant],
        className,
      )}
    >
      {dot && (
        <span className={cn("size-1.5 rounded-full", dotColor[variant])} />
      )}
      {children}
    </span>
  );
}
