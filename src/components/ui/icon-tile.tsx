import type { LucideIcon } from "lucide-react";
import type { Tone } from "@/lib/colors";
import { toneText, toneTint } from "@/lib/colors";
import { cn } from "@/lib/utils";

/** The soft-tinted rounded square holding a lucide icon (used in KPIs, rows…). */
export function IconTile({
  icon: Icon,
  tone,
  size = 36,
  className,
}: {
  icon: LucideIcon;
  tone: Tone;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-none items-center justify-center rounded-[10px]",
        toneTint[tone],
        toneText[tone],
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Icon size={size * 0.52} strokeWidth={1.8} />
    </div>
  );
}
