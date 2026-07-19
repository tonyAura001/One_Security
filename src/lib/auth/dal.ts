import { cache } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
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

  // Supabase-native : le profil applicatif (rôle, identité) vient de la table
  // `User`, lue avec le JWT de l'utilisateur (RLS `users_read_self` : sa propre
  // fiche). Plus de dépendance à l'API NestJS. Le rôle DB est en MAJUSCULE.
  const { data: profile } = await supabase
    .from("User")
    .select("id, prenom, nom, email, role, telephone, avatarUrl, actif")
    .eq("id", user.id)
    .single();
  if (!profile || !profile.actif) return null;
  return {
    id: profile.id,
    firstName: profile.prenom,
    lastName: profile.nom,
    email: profile.email,
    role: (profile.role as string).toLowerCase() as Role,
    phone: profile.telephone ?? undefined,
    avatarUrl: profile.avatarUrl ?? undefined,
  };
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
 * Le rôle est lu dans `app_metadata` (posé à la création via l'admin API) ;
 * l'identité dans `user_metadata`. Rôle inconnu → `agent`
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
    phone: meta.phone,
    avatarUrl: meta.avatarUrl,
  };
}
