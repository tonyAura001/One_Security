"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DashboardShell } from "@/aurantir-front-kit/layout";
import { useSession, useSessionStore, type Identity } from "@/lib/store/session";
import { useAccessSync } from "@/lib/store/access";
import { roleMenu, type RoleId } from "@/lib/rbac";
import {
  useDecisionsStore,
  pendingDecisionsCount,
} from "@/lib/store/decisions";
import { RouteGuard } from "./route-guard";
import { PageTitleBar } from "./page-title-bar";
import { buildSidebarNav } from "./sidebar-nav-adapter";

/**
 * Application shell = le `DashboardShell` du kit Aurantir. Sa Sidebar
 * repliable (mécanique de repli du kit inchangée) reçoit en PROPS la
 * navigation dérivée du RBAC PilotePME, la marque et le profil du rôle
 * courant.
 *
 * `role` / `identity` proviennent du serveur (auth Supabase, cf.
 * `(app)/layout.tsx`) et amorcent le store de session AVANT le premier rendu,
 * pour que la nav et le garde de route soient corrects dès le premier paint.
 */
export function KitShell({
  role: serverRole,
  identity,
  children,
}: {
  role: RoleId;
  identity: Identity;
  children: ReactNode;
}) {
  // Amorçage synchrone (une fois) : la session lit déjà le bon rôle ci-dessous.
  useState(() => {
    useSessionStore.setState({ role: serverRole, identity });
    return null;
  });
  // Re-synchronise si l'utilisateur/rôle change entre deux navigations.
  useEffect(() => {
    useSessionStore.getState().setSession(serverRole, identity);
  }, [serverRole, identity]);

  const { role, org, user } = useSession();
  // Synchronise les permissions (Zustand) avec le rôle courant.
  useAccessSync();
  const decisions = useDecisionsStore((s) => s.decisions);
  const pending = pendingDecisionsCount(decisions);

  // Badge « en attente » sur l'item Centre de Décision (DG / Super Admin).
  const nav = buildSidebarNav(roleMenu(role)).map((item) =>
    item.href === "/decision" ? { ...item, badge: pending } : item,
  );

  return (
    <DashboardShell
      sidebar={{
        nav,
        brand: { name: org.name, tagline: "PilotePME" },
        userRole: role,
        profile: {
          name: user.name,
          initials: user.initials,
          role: user.fonction,
        },
      }}
    >
      <div className="mx-auto w-full max-w-[1440px]">
        <PageTitleBar />
        <RouteGuard>{children}</RouteGuard>
      </div>
    </DashboardShell>
  );
}
