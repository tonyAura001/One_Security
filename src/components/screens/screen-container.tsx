import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Consistent screen padding + max width + subtle enter animation. */
export function ScreenContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  // Le shell du kit fournit déjà le padding externe (main p-4 md:p-6) et la
  // largeur max (KitShell). Ce conteneur reste neutre pour ne pas doubler.
  return <div className={cn("w-full", className)}>{children}</div>;
}
