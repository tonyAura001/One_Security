"use client";

import type { ReactNode } from "react";
import { usePermissions } from "@/lib/store/access";
import type { Permission } from "@/config/permissions";

interface CanProps {
  /** Permission unique requise. */
  permission?: Permission;
  /** Au moins une de ces permissions. */
  anyOf?: Permission[];
  /** Toutes ces permissions. */
  allOf?: Permission[];
  /** Rendu de repli si non autorisé (par défaut : rien). */
  fallback?: ReactNode;
  children: ReactNode;
}

export function hasAccess(
  perms: string[],
  { permission, anyOf, allOf }: Omit<CanProps, "children" | "fallback">,
): boolean {
  if (permission && !perms.includes(permission)) return false;
  if (anyOf && !anyOf.some((p) => perms.includes(p))) return false;
  if (allOf && !allOf.every((p) => perms.includes(p))) return false;
  return true;
}

/**
 * Masque son contenu si l'utilisateur n'a pas la/les permission(s). À utiliser
 * pour les boutons, liens et sections sensibles.
 */
export function Can({ children, fallback = null, ...rule }: CanProps) {
  const perms = usePermissions();
  return <>{hasAccess(perms, rule) ? children : fallback}</>;
}
