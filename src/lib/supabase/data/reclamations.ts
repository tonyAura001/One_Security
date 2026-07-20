/**
 * Réclamations clients via Supabase. RLS : lecture DG/RP/MANAGER/COMPTABLE,
 * écriture DG/RP/MANAGER.
 */
import { createClient } from "@/lib/supabase/client";

export type Severite = "elevee" | "moyenne" | "faible";
export type ReclamationStatut = "ouverte" | "en_cours" | "resolue";

export interface Reclamation {
  id: string;
  ref: string;
  client: string;
  objet: string;
  description: string | null;
  severite: Severite;
  statut: ReclamationStatut;
  createdAt: string;
}

interface DbReclamation {
  id: string;
  ref: string;
  objet: string;
  description: string | null;
  severite: string;
  statut: string;
  createdAt: string;
  Client: { raisonSociale: string } | { raisonSociale: string }[] | null;
}
function one<T>(v: T | T[] | null): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}

export async function fetchReclamations(): Promise<Reclamation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Reclamation")
    .select("id,ref,objet,description,severite,statut,createdAt,Client(raisonSociale)")
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbReclamation[]).map((r) => ({
    id: r.id,
    ref: r.ref,
    client: one(r.Client)?.raisonSociale ?? "—",
    objet: r.objet,
    description: r.description,
    severite: (r.severite as Severite) ?? "moyenne",
    statut: (r.statut as ReclamationStatut) ?? "ouverte",
    createdAt: r.createdAt,
  }));
}

export interface NewReclamationInput {
  clientId?: string | null;
  objet: string;
  description?: string;
  severite: Severite;
}
export async function createReclamation(i: NewReclamationInput): Promise<void> {
  const supabase = createClient();
  const ref = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
  const { data, error } = await supabase
    .from("Reclamation")
    .insert({
      ref,
      clientId: i.clientId || null,
      objet: i.objet.trim(),
      description: i.description?.trim() || null,
      severite: i.severite,
      statut: "ouverte",
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (DG/RP/Manager).");
}

export async function updateReclamationStatut(
  id: string,
  statut: ReclamationStatut,
): Promise<void> {
  const supabase = createClient();
  const patch: Record<string, unknown> = { statut, updatedAt: new Date().toISOString() };
  if (statut === "resolue") patch.resoluLe = new Date().toISOString();
  const { data, error } = await supabase
    .from("Reclamation")
    .update(patch as never)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("row-level security: accès refusé");
}
