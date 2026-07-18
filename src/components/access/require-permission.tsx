"use client";

import type { ReactNode } from "react";
import { usePermissions } from "@/lib/store/access";
import { hasAccess } from "./can";
import { Forbidden403 } from "./forbidden";
import type { Permission } from "@/config/permissions";

/**
 * Protège une page/section entière : affiche un écran 403 si l'utilisateur
 * n'a pas la permission requise (défense en profondeur côté UI — le backend
 * reste le gardien réel).
 */
export function RequirePermission({
  permission,
  anyOf,
  allOf,
  children,
}: {
  permission?: Permission;
  anyOf?: Permission[];
  allOf?: Permission[];
  children: ReactNode;
}) {
  const perms = usePermissions();
  if (!hasAccess(perms, { permission, anyOf, allOf })) {
    return <Forbidden403 />;
  }
  return <>{children}</>;
}
