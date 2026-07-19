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
