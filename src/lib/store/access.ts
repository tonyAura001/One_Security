"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { useSessionStore } from "./session";
import { ROLE_PERMISSIONS, type Permission } from "@/config/permissions";

/**
 * État global des permissions de l'utilisateur courant (Zustand).
 *
 * - `source: "demo"` → dérivé du rôle sélectionné (aucun backend).
 * - `source: "api"`  → hydraté depuis `GET /moi/permissions` après login.
 *
 * Les composants d'UI lisent cet état via `useHasPermission` / `<Can>`.
 */
interface AccessState {
  permissions: string[];
  source: "demo" | "api";
  setDemoPermissions: (permissions: string[]) => void;
  setApiPermissions: (permissions: string[]) => void;
}

export const useAccessStore = create<AccessState>((set) => ({
  permissions: [],
  source: "demo",
  setDemoPermissions: (permissions) => set({ permissions, source: "demo" }),
  setApiPermissions: (permissions) => set({ permissions, source: "api" }),
}));

export function usePermissions(): string[] {
  return useAccessStore((s) => s.permissions);
}

export function useHasPermission(permission: Permission): boolean {
  return useAccessStore((s) => s.permissions.includes(permission));
}

export function useHasAnyPermission(permissions: Permission[]): boolean {
  return useAccessStore((s) =>
    permissions.some((p) => s.permissions.includes(p)),
  );
}

export function useHasAllPermissions(permissions: Permission[]): boolean {
  return useAccessStore((s) =>
    permissions.every((p) => s.permissions.includes(p)),
  );
}

/**
 * Synchronise les permissions avec le rôle démo courant. À monter une fois
 * dans le shell. En mode connecté, remplacer par un appel à
 * `fetchMyPermissions()` (voir `lib/api/me.ts`) au login.
 */
export function useAccessSync(): void {
  const role = useSessionStore((s) => s.role);
  const setDemoPermissions = useAccessStore((s) => s.setDemoPermissions);

  useEffect(() => {
    setDemoPermissions(ROLE_PERMISSIONS[role] ?? []);
  }, [role, setDemoPermissions]);
}
