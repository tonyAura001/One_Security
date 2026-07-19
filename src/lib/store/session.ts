"use client";

import { create } from "zustand";
import { ORG, ROLES, type RoleConfig, type RoleId } from "@/lib/rbac";
import { useUiStore } from "./ui";

/** Identité réelle de l'utilisateur connecté (issue de Supabase / `/me`). */
export interface Identity {
  name: string;
  initials: string;
  fonction?: string;
}

interface SessionState {
  /** Rôle AFFICHÉ (menu, accès, guards). Peut être surchargé par le DG. */
  role: RoleId;
  /** Vraie identité RBAC authentifiée (immuable côté client). */
  actualRole: RoleId;
  /** Identité réelle ; `null` avant hydratation depuis le serveur. */
  identity: Identity | null;
  setRole: (role: RoleId) => void;
  /**
   * « Voir en tant que » : le DG (et lui seul) peut consulter l'interface d'un
   * autre rôle. Sans effet si l'utilisateur réel n'est pas DG (défense en
   * profondeur — l'UI ne montre le switcher qu'au DG).
   */
  viewAs: (role: RoleId) => void;
  /** Revient à l'espace de la vraie identité. */
  resetView: () => void;
  /** Hydrate le store avec l'utilisateur authentifié (voir SessionHydrator). */
  setSession: (role: RoleId, identity: Identity | null) => void;
}

/**
 * Store de session.
 *
 * Le rôle n'est plus choisi en démo ni persisté : il est hydraté depuis le
 * serveur (`getCurrentUser` → Supabase, autorité RBAC = backend) via le
 * `SessionHydrator` monté dans le shell. `useSession()` garde exactement la
 * même forme qu'en démo, donc AUCUN écran n'a à changer.
 */
export const useSessionStore = create<SessionState>()((set, get) => ({
  role: "dg",
  actualRole: "dg",
  identity: null,
  setRole: (role) => set({ role }),
  viewAs: (role) => {
    if (get().actualRole === "dg") set({ role });
  },
  resetView: () => set({ role: get().actualRole }),
  setSession: (role, identity) => set({ role, actualRole: role, identity }),
}));

export interface Session {
  role: RoleId;
  config: RoleConfig;
  org: typeof ORG;
  user: {
    name: string;
    fonction: string;
    initials: string;
    gradient: [string, string];
  };
}

/**
 * Session courante, dérivée du rôle authentifié. L'identité réelle (nom,
 * initiales) prime sur la persona du rôle quand elle est disponible ; le
 * dégradé d'avatar et le libellé de fonction restent tirés du rôle.
 */
export function useSession(): Session & {
  setRole: (role: RoleId) => void;
  actualRole: RoleId;
  isViewingAs: boolean;
  viewAs: (role: RoleId) => void;
  resetView: () => void;
} {
  const role = useSessionStore((s) => s.role);
  const actualRole = useSessionStore((s) => s.actualRole);
  const identity = useSessionStore((s) => s.identity);
  const setRole = useSessionStore((s) => s.setRole);
  const viewAs = useSessionStore((s) => s.viewAs);
  const resetView = useSessionStore((s) => s.resetView);
  const config = ROLES[role];
  const isViewingAs = role !== actualRole;
  return {
    role,
    config,
    org: ORG,
    setRole,
    actualRole,
    isViewingAs,
    viewAs,
    resetView,
    user: {
      // En « voir en tant que », on affiche la persona du rôle consulté ;
      // sinon l'identité réelle de l'utilisateur connecté.
      name: isViewingAs ? config.name : (identity?.name ?? config.name),
      fonction: config.fonction,
      initials: isViewingAs
        ? config.initials
        : (identity?.initials ?? config.initials),
      gradient: config.gradient,
    },
  };
}

/** CSS gradient string for a role avatar. */
export function avatarGradient(gradient: [string, string]): string {
  return `linear-gradient(145deg, ${gradient[0]}, ${gradient[1]})`;
}

/**
 * True once the persisted UI store has rehydrated (see RehydrateGate). The
 * route guard waits for this so a deep-linked URL isn't wrongly redirected
 * while the collapse/UI state is still at its default.
 */
export function useSessionHydrated(): boolean {
  return useUiStore((s) => s.hydrated);
}
