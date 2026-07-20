/**
 * Profil du compte connecté (onglet « Mon profil »). Lecture via la policy
 * `users_read_self` (id = auth.uid()). L'écriture passe par la fonction RPC
 * `update_own_profile` (SECURITY DEFINER) qui ne touche QUE prénom/nom/téléphone
 * — pas le rôle ni le statut : aucune élévation de privilège possible.
 */
import { createClient } from "@/lib/supabase/client";
import { ROLES, type RoleId } from "@/lib/rbac";

export interface MyProfile {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  role: RoleId;
  roleLabel: string;
  initials: string;
}

function initials(prenom: string, nom: string): string {
  return ((prenom[0] ?? "") + (nom[0] ?? "")).toUpperCase();
}

/** Fiche du compte connecté. */
export async function fetchMyProfile(): Promise<MyProfile> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Session expirée — reconnectez-vous.");
  const { data, error } = await supabase
    .from("User")
    .select("id,nom,prenom,email,telephone,role")
    .eq("id", uid)
    .single();
  if (error) throw error;
  const u = data as {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    telephone: string | null;
    role: string;
  };
  const role = u.role.toLowerCase() as RoleId;
  return {
    id: u.id,
    prenom: u.prenom,
    nom: u.nom,
    email: u.email,
    telephone: u.telephone ?? "",
    role,
    roleLabel: ROLES[role]?.fonction ?? u.role,
    initials: initials(u.prenom, u.nom),
  };
}

export interface UpdateMyProfileInput {
  prenom: string;
  nom: string;
  telephone: string;
}

/** Met à jour SES propres coordonnées (prénom/nom/téléphone) via RPC sécurisée. */
export async function updateMyProfile(input: UpdateMyProfileInput): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_own_profile", {
    p_prenom: input.prenom.trim(),
    p_nom: input.nom.trim(),
    p_telephone: input.telephone.trim(),
  } as never);
  if (error) throw error;
}
