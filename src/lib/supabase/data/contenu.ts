/**
 * Contenu interne générique (notes, décisions, annonces, réunions) — table
 * `ContenuInterne` discriminée par `type`. Lecture staff, écriture par l'auteur.
 */
import { createClient } from "@/lib/supabase/client";

export type ContenuType = "note" | "decision" | "annonce" | "reunion";

export interface Contenu {
  id: string;
  type: ContenuType;
  titre: string;
  corps: string | null;
  categorie: string | null;
  statut: string;
  dateEvenement: string | null;
  epingle: boolean;
  meta: Record<string, unknown>;
  auteur: string;
  mine: boolean;
  createdAt: string;
}

interface DbContenu {
  id: string;
  type: string;
  titre: string;
  corps: string | null;
  categorie: string | null;
  statut: string;
  dateEvenement: string | null;
  epingle: boolean;
  meta: Record<string, unknown> | null;
  auteurId: string | null;
  createdAt: string;
  User: { prenom: string; nom: string | null } | { prenom: string; nom: string | null }[] | null;
}
function one<T>(v: T | T[] | null): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}

export async function fetchContenus(type: ContenuType): Promise<Contenu[]> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const meId = auth.user?.id;
  const { data, error } = await supabase
    .from("ContenuInterne")
    .select(
      "id,type,titre,corps,categorie,statut,dateEvenement,epingle,meta,auteurId,createdAt,User:User!auteurId(prenom,nom)",
    )
    .eq("type", type)
    .order("epingle", { ascending: false })
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbContenu[]).map((r) => {
    const u = one(r.User);
    return {
      id: r.id,
      type: r.type as ContenuType,
      titre: r.titre,
      corps: r.corps,
      categorie: r.categorie,
      statut: r.statut,
      dateEvenement: r.dateEvenement,
      epingle: r.epingle,
      meta: r.meta ?? {},
      auteur: u ? `${u.prenom} ${u.nom ?? ""}`.trim() : "—",
      mine: r.auteurId === meId,
      createdAt: r.createdAt,
    };
  });
}

export interface NewContenuInput {
  type: ContenuType;
  titre: string;
  corps?: string;
  categorie?: string;
  dateEvenement?: string | null;
  epingle?: boolean;
  meta?: Record<string, unknown>;
}

export async function createContenu(i: NewContenuInput): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("non authentifié");
  const { data, error } = await supabase
    .from("ContenuInterne")
    .insert({
      type: i.type,
      titre: i.titre.trim(),
      corps: i.corps?.trim() || null,
      categorie: i.categorie || null,
      dateEvenement: i.dateEvenement || null,
      epingle: i.epingle ?? false,
      meta: i.meta ?? {},
      auteurId: auth.user.id,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée.");
}

export async function updateContenu(
  id: string,
  patch: { statut?: string; epingle?: boolean; titre?: string; corps?: string; categorie?: string },
): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ContenuInterne")
    .update({ ...patch, updatedAt: new Date().toISOString() } as never)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("row-level security: accès refusé");
}

export async function deleteContenu(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("ContenuInterne").delete().eq("id", id);
  if (error) throw error;
}
