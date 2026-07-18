import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * In-content section header: breadcrumb + title + optional actions.
 * The app header carries the screen title; this is for sub-sections and
 * toolbars that need their own heading and controls.
 */
export function PageHeader({
  title,
  crumb,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  crumb?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        {crumb && (
          <div className="text-muted mb-1 text-[11px] font-bold tracking-[0.6px] uppercase">
            {crumb}
          </div>
        )}
        <h2 className="text-foreground text-lg font-extrabold tracking-[-0.4px]">
          {title}
        </h2>
        {description && (
          <p className="text-muted mt-1 text-[12.5px] font-semibold">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
