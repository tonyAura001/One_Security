/**
 * Projets (déploiements de dispositif) via Supabase. Table `Projet` :
 * lecture pour tout le staff authentifié, écriture DG / MANAGER / RP.
 */
import { createClient } from "@/lib/supabase/client";

export type ProjectStatut =
  | "planifie"
  | "en_cours"
  | "a_risque"
  | "en_avance"
  | "termine";

export interface Projet {
  id: string;
  nom: string;
  description: string | null;
  siteClient: string | null;
  responsable: { nom: string; initials: string } | null;
  statut: ProjectStatut;
  avancementPct: number;
  budgetTotal: number;
  budgetEngage: number;
  echeance: string | null;
}

interface DbUser {
  prenom: string;
  nom: string | null;
}
interface DbProjet {
  id: string;
  nom: string;
  description: string | null;
  siteClient: string | null;
  statut: string;
  avancementPct: number;
  budgetTotal: number;
  budgetEngage: number;
  echeance: string | null;
  responsable: DbUser | DbUser[] | null;
}
function one<T>(v: T | T[] | null): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}
function initials(prenom: string, nom: string | null): string {
  return `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase() || "—";
}
const SELECT =
  "id,nom,description,siteClient,statut,avancementPct,budgetTotal,budgetEngage,echeance,responsable:User!responsableId(prenom,nom)";

function map(p: DbProjet): Projet {
  const r = one(p.responsable);
  return {
    id: p.id,
    nom: p.nom,
    description: p.description,
    siteClient: p.siteClient,
    responsable: r ? { nom: `${r.prenom} ${r.nom ?? ""}`.trim(), initials: initials(r.prenom, r.nom) } : null,
    statut: (p.statut as ProjectStatut) ?? "planifie",
    avancementPct: p.avancementPct ?? 0,
    budgetTotal: p.budgetTotal ?? 0,
    budgetEngage: p.budgetEngage ?? 0,
    echeance: p.echeance,
  };
}

export async function fetchProjets(): Promise<Projet[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Projet")
    .select(SELECT)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbProjet[]).map(map);
}

export async function fetchProjet(id: string): Promise<Projet | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("Projet").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? map(data as unknown as DbProjet) : null;
}

export interface NewProjetInput {
  nom: string;
  siteClient?: string;
  description?: string;
  responsableId?: string | null;
  statut?: ProjectStatut;
  budgetTotal?: number;
  echeance?: string | null;
}

/** Crée un projet (RLS Projet_write : DG/MANAGER/RP). */
export async function createProjet(i: NewProjetInput): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Projet")
    .insert({
      nom: i.nom.trim(),
      siteClient: i.siteClient?.trim() || null,
      description: i.description?.trim() || null,
      responsableId: i.responsableId || null,
      statut: i.statut ?? "planifie",
      budgetTotal: Math.max(0, Math.round(i.budgetTotal ?? 0)),
      echeance: i.echeance || null,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
  return (data[0] as { id: string }).id;
}

export interface ProjetPatch {
  statut?: ProjectStatut;
  avancementPct?: number;
  budgetEngage?: number;
}
/** Met à jour l'avancement / statut d'un projet (RLS Projet_write). */
export async function updateProjet(id: string, patch: ProjetPatch): Promise<void> {
  const supabase = createClient();
  const payload: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (patch.statut !== undefined) payload.statut = patch.statut;
  if (patch.avancementPct !== undefined)
    payload.avancementPct = Math.min(100, Math.max(0, Math.round(patch.avancementPct)));
  if (patch.budgetEngage !== undefined)
    payload.budgetEngage = Math.max(0, Math.round(patch.budgetEngage));
  const { data, error } = await supabase
    .from("Projet")
    .update(payload as never)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: mise à jour refusée (accès écriture).");
}
