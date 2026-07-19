/**
 * « Agents » = la table `User` lue via Supabase (RLS users_read_admin / _ops).
 *
 * Compromis assumé : le schéma n'a pas de roster d'agents terrain dédié — on
 * projette les utilisateurs sur le type UI `Agent`. Les champs opérationnels
 * absents du modèle (matricule, poste, site, carte pro, certifications) sont
 * des valeurs par défaut, à remplacer par un vrai modèle Agent plus tard.
 */
import { createClient } from "@/lib/supabase/client";
import type { Agent, AgentStats } from "@/lib/api/agents";

interface DbUser {
  id: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  actif: boolean;
}

function initials(prenom: string, nom: string): string {
  return ((prenom[0] ?? "") + (nom[0] ?? "")).toUpperCase();
}

function mapAgent(u: DbUser, i: number): Agent {
  return {
    id: u.id,
    name: `${u.prenom} ${u.nom}`.trim(),
    initials: initials(u.prenom, u.nom),
    matricule: `AG-${String(i + 1).padStart(3, "0")}`,
    poste: "agent",
    site: "—",
    status: u.actif ? "en_poste" : "suspendu",
    phone: u.telephone ?? "—",
    cardExpiry: "2027-01-01", // placeholder (pas encore modélisé)
    certifications: [],
    attendanceRate: 95,
  };
}

/** Agents (utilisateurs) visibles par l'utilisateur courant (selon RLS). */
export async function fetchAgents(): Promise<Agent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("User")
    .select("id,nom,prenom,telephone,actif")
    .order("nom");
  if (error) throw error;
  return (data as unknown as DbUser[]).map(mapAgent);
}

/** KPIs agents dérivés de la liste (remplace getAgentStats mock). */
export function computeAgentStats(agents: Agent[]): AgentStats {
  const active = agents.filter((a) => a.status !== "suspendu").length;
  return {
    active,
    onDuty: agents.filter((a) => a.status === "en_poste").length,
    cardsToRenew: agents.filter(
      (a) =>
        (new Date(a.cardExpiry).getTime() - Date.now()) / 86_400_000 < 90,
    ).length,
    attendanceRate: agents.length
      ? Math.round(
          agents.reduce((s, a) => s + a.attendanceRate, 0) / agents.length,
        )
      : 0,
  };
}
