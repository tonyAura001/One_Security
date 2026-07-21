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
  Client: { raisonSociale: string } | { raisonSociale: string }[] | null;
}

function raison(
  r: { raisonSociale: string } | { raisonSociale: string }[] | null,
): string | null {
  const v = Array.isArray(r) ? r[0] : r;
  return v?.raisonSociale ?? null;
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
  return {
    id: r.id,
    ref: r.numero,
    client: raison(r.Client) ?? raison(r.Prospect) ?? "—",
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
    .select(
      "id,numero,totalTTC,dateEnvoi,createdAt,statut,Prospect(raisonSociale),Client(raisonSociale)",
    )
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbDevis[]).map(mapQuote);
}

export interface NewQuoteInput {
  prospectId?: string | null;
  clientId?: string | null; // devis adressé à un client existant
  totalHT: number;
  tauxTVA: number; // %
  statut: string; // enum StatutDevis
  dateEnvoi?: string | null;
  numero?: string; // fourni par l'éditeur pour rester cohérent avec le PDF archivé
}

/** Crée un devis (RLS insert : DG/RP/MANAGER). Renvoie le numéro utilisé. */
export async function createQuote(i: NewQuoteInput): Promise<string> {
  const supabase = createClient();
  const totalHT = Math.round(i.totalHT);
  const totalTTC = totalHT + Math.round((totalHT * i.tauxTVA) / 100);
  const numero =
    i.numero?.trim() ||
    `DEV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  const { data, error } = await supabase
    .from("Devis")
    .insert({
      numero,
      prospectId: i.prospectId || null,
      clientId: i.clientId || null,
      totalHT,
      totalTTC,
      statut: i.statut,
      dateEnvoi: i.dateEnvoi || null,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
  return numero;
}
