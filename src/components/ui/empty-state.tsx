import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Friendly empty placeholder for data views with no rows. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="bg-surface2 text-muted flex size-12 items-center justify-center rounded-xl">
        <Icon className="size-6" strokeWidth={1.6} />
      </div>
      <div>
        <div className="text-foreground text-sm font-bold">{title}</div>
        {description && (
          <div className="text-muted mt-1 max-w-xs text-[12.5px] font-medium">
            {description}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}
