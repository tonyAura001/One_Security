/**
 * Membres = la table `User` lue via Supabase (RLS `users_read_admin` : DG/RH).
 * Mappe l'utilisateur DB vers le type UI `Member` de l'écran d'administration.
 */
import { createClient } from "@/lib/supabase/client";
import { ROLES, type RoleId } from "@/lib/rbac";
import type { Member } from "@/lib/store/members";

interface DbUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  role: string;
  actif: boolean;
}

function initials(prenom: string, nom: string): string {
  return ((prenom[0] ?? "") + (nom[0] ?? "")).toUpperCase();
}

function mapMember(u: DbUser): Member {
  const role = u.role.toLowerCase() as RoleId;
  return {
    id: u.id,
    name: `${u.prenom} ${u.nom}`.trim(),
    initials: initials(u.prenom, u.nom),
    email: u.email,
    phone: u.telephone ?? "—",
    role,
    roleLabel: ROLES[role]?.fonction ?? role,
    site: "Siège", // pas encore rattaché en base
    statut: u.actif ? "actif" : "suspendu",
    lastSeen: "",
  };
}

/** Liste des membres (utilisateurs) visibles selon la RLS. */
export async function fetchMembers(): Promise<Member[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("User")
    .select("id,nom,prenom,email,telephone,role,actif")
    .order("nom");
  if (error) throw error;
  return (data as unknown as DbUser[]).map(mapMember);
}

/** Active/suspend un membre (RLS users_update_admin : DG/RH). */
export async function setMemberActif(id: string, actif: boolean): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("User")
    .update({ actif } as never)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: modification refusée (DG/RH requis).");
}
