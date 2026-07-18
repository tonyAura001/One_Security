import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { KitShell } from "@/components/shell/kit-shell";
import { getCurrentUser } from "@/lib/auth/dal";

/**
 * Layout de l'espace authentifié.
 *
 * La session est vérifiée côté serveur (DAL → Supabase, autorité RBAC =
 * backend). `proxy.ts` redirige déjà les non-connectés ; ce garde est la
 * défense en profondeur. L'utilisateur réel (rôle + identité) est transmis au
 * `KitShell`, qui hydrate le store de session côté client.
 */
export default async function AppGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const initials =
    (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "") || "?";

  return (
    <KitShell
      role={user.role}
      identity={{ name: name || user.email, initials: initials.toUpperCase() }}
    >
      {children}
    </KitShell>
  );
}
