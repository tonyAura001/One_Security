/**
 * Accès données « devis » via Supabase (PostgREST), sécurisé par RLS
 * (`devis_read_commerce` : DG/RP/MANAGER). Le client vient du prospect lié.
 */
import { createClient } from "@/lib/supabase/client";
import type { Quote, QuoteStatus } from "@/lib/api/types";

interface DbDevis {
  id: string;
  numero: string;
  totalTTC: number | string;
  dateEnvoi: string | null;
  createdAt: string;
  statut: string;
  Prospect: { raisonSociale: string } | { raisonSociale: string }[] | null;
}

/** StatutDevis (DB) → QuoteStatus (UI). */
function mapStatus(s: string): QuoteStatus {
  switch (s) {
    case "ACCEPTE":
      return "signe";
    case "RELANCE":
      return "negociation";
    case "ENVOYE":
      return "envoye";
    default:
      return "brouillon"; // BROUILLON, REFUSE, EXPIRE
  }
}

function mapQuote(r: DbDevis): Quote {
  const p = Array.isArray(r.Prospect) ? r.Prospect[0] : r.Prospect;
  return {
    id: r.id,
    ref: r.numero,
    client: p?.raisonSociale ?? "—",
    amount: Number(r.totalTTC) || 0,
    created: r.dateEnvoi ?? r.createdAt,
    status: mapStatus(r.statut),
  };
}

/** Devis visibles par l'utilisateur courant (selon RLS). */
export async function fetchQuotes(): Promise<Quote[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Devis")
    .select("id,numero,totalTTC,dateEnvoi,createdAt,statut,Prospect(raisonSociale)")
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbDevis[]).map(mapQuote);
}
