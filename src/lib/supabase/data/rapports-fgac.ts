/**
 * Rapports rédigés avec contrôle d'accès. Tout le monde crée ; l'AUTEUR choisit
 * qui peut voir (privé / personnes choisies / tous) ; le DG voit tout (RLS).
 * Tables récentes (hors types générés) → client non typé.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

function loose(): SupabaseClient {
  return createClient() as unknown as SupabaseClient;
}
function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}

export type RapportVisibilite = "prive" | "choisis" | "tous";

export interface Rapport {
  id: string;
  titre: string;
  corps: string;
  categorie: string;
  visibilite: RapportVisibilite;
  auteur: string;
  auteurId: string;
  createdAt: string;
  lecteurs: string[]; // userIds autorisés (quand 'choisis')
  mine: boolean;
}

interface DbPerson { prenom: string; nom: string | null }
const fullName = (p?: DbPerson) => (p ? `${p.prenom} ${p.nom ?? ""}`.trim() : "—");

/** Rapports visibles par l'utilisateur (RLS : auteur, DG, 'tous', ou lecteur choisi). */
export async function fetchRapports(): Promise<Rapport[]> {
  const sb = loose();
  const { data: auth } = await sb.auth.getUser();
  const uid = auth.user?.id ?? "";
  const { data, error } = await sb
    .from("Rapport")
    .select("id,titre,corps,categorie,visibilite,auteurId,createdAt,auteur:User!auteurId(prenom,nom),RapportLecteur(userId)")
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map((r) => ({
    id: String(r.id),
    titre: String(r.titre),
    corps: (r.corps as string) ?? "",
    categorie: (r.categorie as string) ?? "general",
    visibilite: (r.visibilite as RapportVisibilite) ?? "prive",
    auteur: fullName(one(r.auteur as DbPerson | DbPerson[] | null)),
    auteurId: String(r.auteurId),
    createdAt: String(r.createdAt),
    lecteurs: ((r.RapportLecteur as { userId: string }[]) ?? []).map((l) => l.userId),
    mine: String(r.auteurId) === uid,
  }));
}

export interface RapportInput {
  titre: string;
  corps: string;
  categorie: string;
  visibilite: RapportVisibilite;
  lecteurIds: string[];
}

async function syncLecteurs(sb: SupabaseClient, rapportId: string, visibilite: RapportVisibilite, lecteurIds: string[]) {
  await sb.from("RapportLecteur").delete().eq("rapportId", rapportId);
  if (visibilite === "choisis" && lecteurIds.length > 0) {
    const rows = lecteurIds.map((userId) => ({ rapportId, userId }));
    const { error } = await sb.from("RapportLecteur").insert(rows);
    if (error) throw error;
  }
}

/** Crée un rapport (tout utilisateur). L'auteur définit la visibilité. */
export async function createRapport(i: RapportInput): Promise<void> {
  const sb = loose();
  const { data: auth } = await sb.auth.getUser();
  const auteurId = auth.user?.id;
  if (!auteurId) throw new Error("Session expirée.");
  const { data, error } = await sb
    .from("Rapport")
    .insert({ titre: i.titre.trim(), corps: i.corps.trim() || null, categorie: i.categorie, visibilite: i.visibilite, auteurId })
    .select("id");
  if (error) throw error;
  const rapportId = (data as { id: string }[] | null)?.[0]?.id;
  if (!rapportId) throw new Error("row-level security: création refusée.");
  await syncLecteurs(sb, rapportId, i.visibilite, i.lecteurIds);
}

/** Modifie un rapport (auteur ou DG). */
export async function updateRapport(id: string, i: RapportInput): Promise<void> {
  const sb = loose();
  const { error } = await sb
    .from("Rapport")
    .update({ titre: i.titre.trim(), corps: i.corps.trim() || null, categorie: i.categorie, visibilite: i.visibilite, updatedAt: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await syncLecteurs(sb, id, i.visibilite, i.lecteurIds);
}

/** Supprime un rapport (auteur ou DG). */
export async function deleteRapport(id: string): Promise<void> {
  const sb = loose();
  const { error } = await sb.from("Rapport").delete().eq("id", id);
  if (error) throw error;
}
