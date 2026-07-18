import { cache } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { API_BASE_URL } from "@/lib/api/config";
import type { Role, User } from "@/types";

/**
 * Data Access Layer (auth) — pattern recommandé par la doc Next.js 16.
 *
 * `getCurrentUser()` est la source de vérité côté serveur : elle valide la
 * session Supabase (`getUser()` vérifie le JWT auprès de Supabase) puis
 * récupère l'utilisateur applicatif — rôle et permissions compris — auprès du
 * backend NestJS (`GET /me`), qui reste l'autorité RBAC.
 *
 * Mémoïsée par requête (React `cache`) : appelable plusieurs fois par rendu
 * sans requêtes redondantes.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    // Supabase non configuré (clés absentes) → considéré non connecté.
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // --- Mode démo TEMPORAIRE (DEMO_AUTH=true) ---------------------------------
  // Dérive le User applicatif des métadonnées Supabase, SANS backend `/me`.
  // Sert uniquement à tester l'app en ligne tant que l'API NestJS n'est pas
  // déployée. À retirer (DEMO_AUTH=false) une fois `/me` disponible — le reste
  // du code ne change pas. Voir docs/AUTH.md.
  if (process.env.DEMO_AUTH === "true") {
    return mapSupabaseUser(user);
  }
  // ---------------------------------------------------------------------------

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
      // Toujours frais : le rôle/les permissions ne doivent pas être mis en cache.
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as User;
  } catch {
    return null;
  }
});

const VALID_ROLES: Role[] = [
  "dg",
  "rp",
  "rf",
  "rh",
  "manager",
  "controleur",
  "surveillant",
  "juriste",
  "comptable",
  "agent",
];

/**
 * Construit le `User` applicatif à partir d'un utilisateur Supabase (mode démo).
 * Le rôle et le tenant sont lus dans `app_metadata` (posés à la création via
 * l'admin API) ; l'identité dans `user_metadata`. Rôle inconnu → `agent`
 * (le moins privilégié), défense en profondeur.
 */
function mapSupabaseUser(user: SupabaseUser): User {
  const app = user.app_metadata ?? {};
  const meta = user.user_metadata ?? {};
  const role = (VALID_ROLES.includes(app.role) ? app.role : "agent") as Role;
  const email = user.email ?? "";

  return {
    id: user.id,
    firstName: meta.firstName ?? email.split("@")[0] ?? "Utilisateur",
    lastName: meta.lastName ?? "",
    email,
    role,
    companyId: app.companyId ?? "c_demo",
    phone: meta.phone,
    avatarUrl: meta.avatarUrl,
  };
}
