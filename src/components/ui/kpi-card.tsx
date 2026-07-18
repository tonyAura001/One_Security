import type { LucideIcon } from "lucide-react";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { Tone } from "@/lib/colors";
import { toneBar, toneText } from "@/lib/colors";
import { Card } from "./card";
import { IconTile } from "./icon-tile";
import { ProgressBar } from "./progress-bar";
import { StatusPill, type PillVariant } from "./status-pill";
import { cn } from "@/lib/utils";

/** Small green/red trend chip shown in the top-right of a KPI. */
export function TrendBadge({
  value,
  direction,
}: {
  value: string;
  direction: "up" | "down";
}) {
  const good = direction === "up";
  const Icon = good ? ChevronUp : ChevronDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-[3px] text-[11px] font-extrabold",
        good ? "bg-success/12 text-success" : "bg-danger/12 text-danger",
      )}
    >
      <Icon className="size-3" strokeWidth={2.6} />
      {value}
    </span>
  );
}

export interface KpiCardProps {
  icon: LucideIcon;
  tone: Tone;
  /** Big value — pre-formatted string (e.g. "12 450 000"). */
  value: string;
  unit?: string;
  label: string;
  hint?: string;
  hintTone?: Tone;
  /** Trend chip (top-right). */
  trend?: { value: string; direction: "up" | "down" };
  /** Status badge (top-right) — alternative to trend. */
  badge?: { label: string; variant: PillVariant };
  /** Optional meter under the value (0–100). */
  progress?: { value: number; tone: Tone };
  /** Colour the value (e.g. status KPI) and prefix a pulsing dot. */
  valueTone?: Tone;
  dot?: boolean;
  /** Denser card for secondary/operational indicators (smaller icon + value). */
  compact?: boolean;
}

/** The canonical dashboard KPI tile from the mockup. */
export function KpiCard({
  icon,
  tone,
  value,
  unit,
  label,
  hint,
  hintTone = "muted",
  trend,
  badge,
  progress,
  valueTone,
  dot,
  compact,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        "flex flex-col",
        compact ? "gap-2 p-3.5" : "gap-[11px] p-4",
      )}
    >
      <div className="flex items-start justify-between">
        <IconTile icon={icon} tone={tone} size={compact ? 30 : 36} />
        {trend && <TrendBadge {...trend} />}
        {badge && (
          <StatusPill variant={badge.variant} uppercase>
            {badge.label}
          </StatusPill>
        )}
      </div>

      <div
        className={cn(
          "tnum flex items-center gap-2 leading-none font-extrabold tracking-[-0.6px] whitespace-nowrap",
          compact ? "text-[19px]" : "text-[25px]",
          valueTone ? toneText[valueTone] : "text-foreground",
        )}
      >
        {dot && valueTone && (
          <span
            className={cn(
              "size-2.5 flex-none rounded-full",
              toneBar[valueTone],
            )}
            style={{
              boxShadow:
                "0 0 0 4px color-mix(in srgb, currentColor 20%, transparent)",
            }}
          />
        )}
        <span>
          {value}
          {unit && (
            <span className="text-muted ml-[5px] text-[12px] font-bold">
              {unit}
            </span>
          )}
        </span>
      </div>

      {progress && (
        <ProgressBar
          value={progress.value}
          tone={progress.tone}
          height={compact ? 5 : 6}
        />
      )}

      <div>
        <div
          className={cn(
            "text-foreground font-bold",
            compact ? "text-[12px]" : "text-[13px]",
          )}
        >
          {label}
        </div>
        {hint && (
          <div
            className={cn(
              "mt-0.5 font-semibold",
              compact ? "text-[10.5px]" : "text-[11.5px]",
              toneText[hintTone],
            )}
          >
            {hint}
          </div>
        )}
      </div>
    </Card>
  );
}
