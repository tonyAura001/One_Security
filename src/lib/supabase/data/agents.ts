/**
 * « Agents » = les agents de sécurité terrain (table `AgentSecurite`, importée
 * depuis la liste du client), lus via Supabase (RLS agents_securite_read).
 *
 * Note : la colonne « POSTES » du fichier source est l'AFFECTATION (site/lieu),
 * mappée sur `Agent.site`. Le poste métier (`Agent.poste`) n'est pas fourni →
 * défaut « agent ». Carte pro / certifications / taux de présence pas encore
 * dans les données → valeurs par défaut.
 */
import { createClient } from "@/lib/supabase/client";
import type { Agent, AgentStats } from "@/lib/api/agents";

interface DbAgent {
  id: string;
  prenom: string;
  nom: string | null;
  matricule: string | null;
  telephone: string | null;
  poste: string | null;
  statut: string;
}

function initials(prenom: string, nom: string | null): string {
  return ((prenom[0] ?? "") + (nom?.[0] ?? "")).toUpperCase();
}

function mapAgent(a: DbAgent, i: number): Agent {
  return {
    id: a.id,
    name: `${a.prenom} ${a.nom ?? ""}`.trim(),
    initials: initials(a.prenom, a.nom),
    matricule: a.matricule ?? `AG-${String(i + 1).padStart(3, "0")}`,
    poste: "agent",
    site: a.poste ?? "—",
    status: a.statut === "actif" ? "en_poste" : "suspendu",
    phone: a.telephone ?? "—",
    cardExpiry: "2027-01-01", // carte pro non fournie
    certifications: [],
    attendanceRate: 95,
  };
}

/** Agents de sécurité terrain visibles par l'utilisateur courant (selon RLS). */
export async function fetchAgents(): Promise<Agent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("AgentSecurite")
    .select("id,prenom,nom,matricule,telephone,poste,statut")
    .order("prenom");
  if (error) throw error;
  return (data as unknown as DbAgent[]).map(mapAgent);
}

/** Fiche brute d'un agent (pour l'édition par les responsables). */
export interface AgentRecord {
  id: string;
  prenom: string;
  nom: string | null;
  telephone: string | null;
  telephone2: string | null;
  adresse: string | null;
  poste: string | null;
  salaire: number | null;
  statut: string;
  matricule: string | null;
  numeroCni: string | null;
  dateNaissance: string | null;
  lieuNaissance: string | null;
  dateDebutRaw: string | null;
  photoPath: string | null;
}

export async function fetchAgentRecord(id: string): Promise<AgentRecord> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("AgentSecurite")
    .select(
      "id,prenom,nom,telephone,telephone2,adresse,poste,salaire,statut,matricule,numeroCni,dateNaissance,lieuNaissance,dateDebutRaw,photoPath",
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as AgentRecord;
}

/** Met à jour une fiche agent (RLS : DG/RP/RH/MANAGER). */
export async function updateAgent(
  id: string,
  patch: Partial<Omit<AgentRecord, "id">>,
): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("AgentSecurite")
    .update(patch)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  // RLS peut filtrer la ligne (0 modifiée) sans erreur → traiter comme refus.
  if (!data || data.length === 0) {
    throw new Error("row-level security: aucune ligne modifiée (accès refusé)");
  }
}

/** KPIs agents dérivés de la liste (remplace getAgentStats mock). */
export function computeAgentStats(agents: Agent[]): AgentStats {
  return {
    active: agents.filter((a) => a.status !== "suspendu").length,
    onDuty: agents.filter((a) => a.status === "en_poste").length,
    cardsToRenew: agents.filter(
      (a) => (new Date(a.cardExpiry).getTime() - Date.now()) / 86_400_000 < 90,
    ).length,
    attendanceRate: agents.length
      ? Math.round(
          agents.reduce((s, a) => s + a.attendanceRate, 0) / agents.length,
        )
      : 0,
  };
}
