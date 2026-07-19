/**
 * Sites gardés (table `Site`) — création rattachée à un client.
 * RLS insert/update : DG/RP/MANAGER.
 */
import { createClient } from "@/lib/supabase/client";

export interface NewSiteInput {
  clientId: string;
  nom: string;
  adresse: string;
  type: string;
  superficie?: number | null;
}

export async function createSite(i: NewSiteInput): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Site")
    .insert({
      clientId: i.clientId,
      nom: i.nom.trim(),
      adresse: i.adresse.trim(),
      type: i.type,
      superficie: i.superficie ?? null,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
}
