/**
 * Community management — plateformes gérées + ventilation d'engagement.
 * RLS : DG/RP/RH/MANAGER. Le total d'engagement d'une publication est recalculé
 * atomiquement par le RPC `enregistrer_engagement`.
 */
import { createClient } from "@/lib/supabase/client";

export type PlateformeType =
  | "facebook"
  | "linkedin"
  | "instagram"
  | "site_web"
  | "tiktok"
  | "youtube";

export interface Plateforme {
  id: string;
  nom: string;
  type: PlateformeType;
  handle: string | null;
  url: string | null;
  actif: boolean;
}

export const PLATEFORME_LABEL: Record<PlateformeType, string> = {
  facebook: "Facebook",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  site_web: "Site web",
  tiktok: "TikTok",
  youtube: "YouTube",
};

export type InteractionType = "vue" | "jaime" | "commentaire" | "partage" | "clic";
export const INTERACTION_LABEL: Record<InteractionType, string> = {
  vue: "Vues",
  jaime: "J'aime",
  commentaire: "Commentaires",
  partage: "Partages",
  clic: "Clics",
};

export async function fetchPlateformes(): Promise<Plateforme[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Plateforme")
    .select("id,nom,type,handle,url,actif")
    .order("nom");
  if (error) throw error;
  return (data as unknown as Plateforme[]) ?? [];
}

export interface NewPlateformeInput {
  nom: string;
  type: PlateformeType;
  handle?: string;
  url?: string;
}
export async function createPlateforme(i: NewPlateformeInput): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Plateforme")
    .insert({
      nom: i.nom.trim(),
      type: i.type,
      handle: i.handle?.trim() || null,
      url: i.url?.trim() || null,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
}

export async function togglePlateforme(id: string, actif: boolean): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Plateforme")
    .update({ actif, updatedAt: new Date().toISOString() } as never)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("row-level security: accès refusé");
}

export interface Interaction {
  type: InteractionType;
  nombre: number;
}
export async function fetchInteractions(publicationId: string): Promise<Interaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Interaction")
    .select("type,nombre")
    .eq("publicationId", publicationId);
  if (error) throw error;
  return (data as unknown as Interaction[]) ?? [];
}

type RpcCaller = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

/** Remplace la ventilation d'engagement d'une publication (RPC atomique). */
export async function enregistrerEngagement(
  publicationId: string,
  rows: Interaction[],
): Promise<number> {
  const supabase = createClient();
  const payload = rows
    .filter((r) => r.nombre > 0)
    .map((r) => ({ type: r.type, nombre: Math.max(0, Math.round(r.nombre)) }));
  const { data, error } = await (supabase.rpc as unknown as RpcCaller)("enregistrer_engagement", {
    _pub: publicationId,
    _rows: payload,
  });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}
