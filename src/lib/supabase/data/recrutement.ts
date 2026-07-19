/**
 * Domaine recrutement via Supabase (PostgREST), sécurisé par RLS.
 * - Poste/Candidat/Candidature : équipe recrutement (DG/RH/MANAGER).
 * - Entretien : le recruteur ne voit que les siens ; Manager/DG voient tout.
 */
import { createClient } from "@/lib/supabase/client";

export type PosteStatut = "ouvert" | "pourvu" | "ferme";
export type CandidatureStatut =
  | "nouveau"
  | "preselection"
  | "entretien"
  | "offre"
  | "embauche"
  | "refuse";
export type EntretienType = "telephonique" | "visio" | "physique";
export type EntretienStatut = "planifie" | "realise" | "annule";

export interface Poste {
  id: string;
  titre: string;
  description: string | null;
  salaireMin: number | null;
  salaireMax: number | null;
  lieu: string | null;
  typeContrat: string;
  statut: PosteStatut;
  nbCandidatures: number;
}

export interface Candidature {
  id: string;
  posteId: string;
  statut: CandidatureStatut;
  datePostulation: string;
  messageMotivation: string | null;
  candidat: {
    id: string;
    nom: string;
    prenom: string;
    email: string | null;
    telephone: string | null;
  };
}

export interface Entretien {
  id: string;
  dateHeure: string;
  type: EntretienType;
  statut: EntretienStatut;
  compteRendu: string | null;
  recruteur: string;
  candidat?: string;
  poste?: string;
}

function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}

interface DbCandidat {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
}
interface DbCandRow {
  id: string;
  posteId: string;
  statut: string;
  datePostulation: string;
  messageMotivation: string | null;
  Candidat: DbCandidat | DbCandidat[] | null;
}
interface DbRec {
  prenom: string;
  nom: string;
}
interface DbEntRow {
  id: string;
  dateHeure: string;
  type: string;
  statut: string;
  compteRendu: string | null;
  User: DbRec | DbRec[] | null;
}

/** Postes à pourvoir + nombre de candidatures. */
export async function fetchPostes(): Promise<Poste[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Poste")
    .select(
      "id,titre,description,salaireMin,salaireMax,lieu,typeContrat,statut,Candidature(count)",
    )
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return (data as unknown as Record<string, unknown>[]).map((p) => ({
    id: p.id as string,
    titre: p.titre as string,
    description: (p.description as string) ?? null,
    salaireMin: (p.salaireMin as number) ?? null,
    salaireMax: (p.salaireMax as number) ?? null,
    lieu: (p.lieu as string) ?? null,
    typeContrat: p.typeContrat as string,
    statut: p.statut as PosteStatut,
    nbCandidatures:
      (p.Candidature as { count: number }[])?.[0]?.count ?? 0,
  }));
}

/** Candidatures d'un poste (avec le candidat). */
export async function fetchCandidatures(posteId: string): Promise<Candidature[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Candidature")
    .select(
      "id,posteId,statut,datePostulation,messageMotivation,Candidat(id,nom,prenom,email,telephone)",
    )
    .eq("posteId", posteId)
    .order("datePostulation", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbCandRow[]).map((r) => {
    const cand = one(r.Candidat);
    return {
      id: r.id,
      posteId: r.posteId,
      statut: r.statut as CandidatureStatut,
      datePostulation: r.datePostulation,
      messageMotivation: r.messageMotivation,
      candidat: {
        id: cand?.id ?? "",
        nom: cand?.nom ?? "—",
        prenom: cand?.prenom ?? "",
        email: cand?.email ?? null,
        telephone: cand?.telephone ?? null,
      },
    };
  });
}

/** Entretiens d'une candidature (avec le recruteur). Filtrés par la RLS. */
export async function fetchEntretiens(candidatureId: string): Promise<Entretien[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Entretien")
    .select("id,dateHeure,type,statut,compteRendu,User(prenom,nom)")
    .eq("candidatureId", candidatureId)
    .order("dateHeure", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbEntRow[]).map((r) => {
    const rec = one(r.User);
    return {
      id: r.id,
      dateHeure: r.dateHeure,
      type: r.type as EntretienType,
      statut: r.statut as EntretienStatut,
      compteRendu: r.compteRendu,
      recruteur: rec ? `${rec.prenom} ${rec.nom}` : "—",
    };
  });
}

/** Change le statut d'une candidature (RLS : équipe recrutement). */
export async function updateCandidatureStatut(
  id: string,
  statut: CandidatureStatut,
): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Candidature")
    .update({ statut })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("row-level security: accès refusé");
  }
}
