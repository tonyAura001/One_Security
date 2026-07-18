import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The elevated surface used for every panel/card across the app. */
export function Card({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "border-surface-border bg-surface shadow-card rounded-xl border",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
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
  );
}
