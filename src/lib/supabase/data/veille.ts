/** Veille réputation (CM). RLS : DG/RP/RH/MANAGER. */
import { createClient } from "@/lib/supabase/client";

export type Sentiment = "positif" | "neutre" | "négatif";

export interface VeilleItem {
  id: string;
  extrait: string;
  source: string | null;
  url: string | null;
  sentiment: Sentiment;
  date: string;
}

export async function fetchVeille(): Promise<VeilleItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Veille")
    .select("id,extrait,source,url,sentiment,date")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data as unknown as VeilleItem[]) ?? [];
}

export interface NewVeilleInput {
  extrait: string;
  source?: string;
  url?: string;
  sentiment: Sentiment;
  date?: string | null;
}
export async function createVeille(i: NewVeilleInput): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Veille")
    .insert({
      extrait: i.extrait.trim(),
      source: i.source?.trim() || null,
      url: i.url?.trim() || null,
      sentiment: i.sentiment,
      date: i.date || new Date().toISOString().slice(0, 10),
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (CM).");
}
