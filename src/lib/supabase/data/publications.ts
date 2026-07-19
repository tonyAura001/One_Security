/** Publications (community management) via Supabase (RLS : DG/RP/RH/MANAGER). */
import { createClient } from "@/lib/supabase/client";
import type { Publication } from "@/lib/api/types";

interface DbPub { id: string; titre: string; canal: string; datePublication: string; statut: string; engagement: number | null }
export async function fetchPublications(): Promise<Publication[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("Publication")
    .select("id,titre,canal,datePublication,statut,engagement")
    .order("datePublication");
  if (error) throw error;
  return (data as unknown as DbPub[]).map((p) => ({
    id: p.id, title: p.titre,
    channel: p.canal as Publication["channel"],
    date: p.datePublication,
    status: p.statut as Publication["status"],
    engagement: p.engagement ?? undefined,
  }));
}

export interface NewPublicationInput {
  titre: string;
  canal: string; // Facebook | LinkedIn | Instagram | Site web
  contenu?: string;
  datePublication: string; // yyyy-mm-dd
  statut: string; // planifie | publie | brouillon
}

/** Crée une publication (RLS publication_write : DG/RP/RH/MANAGER). */
export async function createPublication(
  i: NewPublicationInput,
): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Publication")
    .insert({
      titre: i.titre.trim(),
      canal: i.canal,
      contenu: i.contenu?.trim() || null,
      datePublication: i.datePublication,
      statut: i.statut,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
}
