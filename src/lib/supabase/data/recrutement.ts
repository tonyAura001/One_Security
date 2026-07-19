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

interface DbAgendaRow {
  id: string;
  dateHeure: string;
  type: string;
  User: DbRec | DbRec[] | null;
  Candidature:
    | {
        Candidat: { prenom: string; nom: string } | { prenom: string; nom: string }[] | null;
        Poste: { titre: string } | { titre: string }[] | null;
      }
    | {
        Candidat: { prenom: string; nom: string } | { prenom: string; nom: string }[] | null;
        Poste: { titre: string } | { titre: string }[] | null;
      }[]
    | null;
}

/**
 * Agenda des entretiens de l'utilisateur courant (la RLS filtre : le recruteur
 * ne voit que les siens, Manager/DG voient tout). Mappé sur le type UI Interview.
 */
export async function fetchAgenda(): Promise<import("@/lib/api/types").Interview[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Entretien")
    .select(
      "id,dateHeure,type,User(prenom,nom),Candidature(Candidat(prenom,nom),Poste(titre))",
    )
    .order("dateHeure", { ascending: true });
  if (error) throw error;
  return (data as unknown as DbAgendaRow[]).map((r) => {
    const rec = one(r.User);
    const ca = one(r.Candidature);
    const cand = one(ca?.Candidat);
    const poste = one(ca?.Poste);
    const dt = new Date(r.dateHeure);
    return {
      id: r.id,
      candidate: cand ? `${cand.prenom} ${cand.nom}` : "—",
      role: poste?.titre ?? "—",
      date: r.dateHeure.slice(0, 10),
      time: dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      interviewer: rec ? `${rec.prenom} ${rec.nom}` : "—",
      mode: r.type === "telephonique" ? "téléphone" : "présentiel",
    };
  });
}

export interface RecrutementStats {
  postesOuverts: number;
  candidaturesTotal: number;
  entretiensAVenir: number;
  tauxEmbauche: number;
  funnel: { statut: CandidatureStatut; count: number }[];
}

const FUNNEL_ORDER: CandidatureStatut[] = [
  "nouveau",
  "preselection",
  "entretien",
  "offre",
  "embauche",
  "refuse",
];

/** KPIs du recrutement (agrégés côté client sur les données visibles par RLS). */
export async function fetchRecrutementStats(): Promise<RecrutementStats> {
  const supabase = createClient();
  const [postes, cands, ents] = await Promise.all([
    supabase.from("Poste").select("statut"),
    supabase.from("Candidature").select("statut"),
    supabase.from("Entretien").select("dateHeure,statut"),
  ]);
  if (postes.error) throw postes.error;
  if (cands.error) throw cands.error;
  if (ents.error) throw ents.error;

  const counts = new Map<string, number>();
  for (const c of cands.data as { statut: string }[]) {
    counts.set(c.statut, (counts.get(c.statut) ?? 0) + 1);
  }
  const now = Date.now();
  const total = cands.data.length;
  return {
    postesOuverts: (postes.data as { statut: string }[]).filter(
      (p) => p.statut === "ouvert",
    ).length,
    candidaturesTotal: total,
    entretiensAVenir: (ents.data as { dateHeure: string; statut: string }[]).filter(
      (e) => e.statut === "planifie" && new Date(e.dateHeure).getTime() > now,
    ).length,
    tauxEmbauche: total
      ? Math.round(((counts.get("embauche") ?? 0) / total) * 100)
      : 0,
    funnel: FUNNEL_ORDER.map((statut) => ({
      statut,
      count: counts.get(statut) ?? 0,
    })),
  };
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
