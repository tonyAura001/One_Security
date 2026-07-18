"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, useSessionHydrated } from "@/lib/store/session";
import { canAccess, homeScreen, isScreenKey } from "@/lib/rbac";

/**
 * Client-side RBAC route guard. A role that lacks access to the current
 * screen is redirected to its own home screen (once the session store has
 * rehydrated, to avoid bouncing a deep link during hydration).
 */
export function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = useSession();
  const hydrated = useSessionHydrated();

  const seg = pathname.split("/")[1] ?? "";
  const allowed = isScreenKey(seg) && canAccess(role, seg);

  useEffect(() => {
    if (hydrated && !allowed) {
      router.replace(`/${homeScreen(role)}`);
    }
  }, [hydrated, allowed, role, router]);

  return <>{!hydrated || allowed ? children : null}</>;
}
