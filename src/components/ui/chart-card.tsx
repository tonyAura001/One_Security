"use client";

import type { ReactNode } from "react";
import type { TooltipContentProps } from "recharts";
import { Card } from "./card";
import { cn } from "@/lib/utils";

/** Token-driven colours for Recharts (CSS vars work in SVG fill/stroke). */
export const CHART_COLORS = {
  accent: "var(--accent)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  violet: "var(--violet)",
  grid: "var(--border)",
  axis: "var(--text2)",
} as const;

/** A card wrapping a chart with a title, optional subtitle and header slot. */
export function ChartCard({
  title,
  subtitle,
  action,
  legend,
  height = 240,
  className,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  legend?: ReactNode;
  height?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("p-[18px_20px]", className)}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
            {title}
          </div>
          {subtitle && (
            <div className="text-muted mt-0.5 text-[12px] font-semibold">
              {subtitle}
            </div>
          )}
        </div>
        {action}
      </div>
      {legend && <div className="mb-1.5 flex gap-4">{legend}</div>}
      <div style={{ height }}>{children}</div>
    </Card>
  );
}

/** Small square + label legend entry. */
export function LegendDot({
  color,
  children,
}: {
  color: string;
  children: ReactNode;
}) {
  return (
    <span className="text-muted inline-flex items-center gap-2 text-[11.5px] font-bold">
      <span
        className="size-[11px] rounded-[3px]"
        style={{ background: color }}
      />
      {children}
    </span>
  );
}

/** Themed tooltip surface for Recharts. */
export function ChartTooltip({
  active,
  payload,
  label,
  valueFormat,
}: Partial<TooltipContentProps<number, string>> & {
  valueFormat?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border-border bg-surface shadow-pop rounded-[10px] border px-3 py-2">
      {label != null && (
        <div className="text-muted mb-1 text-[11px] font-bold">
          {String(label)}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((entry, i) => (
          <div
            key={i}
            className="text-foreground flex items-center gap-2 text-[12px] font-bold"
          >
            <span
              className="size-2 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-muted">{entry.name}</span>
            <span className="tnum ml-auto">
              {valueFormat && typeof entry.value === "number"
                ? valueFormat(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
