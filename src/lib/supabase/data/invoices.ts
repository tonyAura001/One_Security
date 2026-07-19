/**
 * Accès données « factures » via Supabase (PostgREST), sécurisé par RLS.
 * RLS `factures_read_finance` : DG/RF/COMPTABLE/RP/MANAGER. Le nom du client
 * vient de la jointure `Client` (policy clients_read_commerce).
 */
import { createClient } from "@/lib/supabase/client";
import type { Invoice, InvoiceStatus } from "@/lib/api/types";

interface DbFacture {
  id: string;
  numero: string;
  dateEmission: string;
  dateEcheance: string;
  montantTTC: number | string;
  statut: string;
  Client: { raisonSociale: string } | { raisonSociale: string }[] | null;
}

/** StatutFacture (DB) → InvoiceStatus (UI). */
function mapStatus(s: string): InvoiceStatus {
  switch (s) {
    case "PAYEE":
      return "payee";
    case "EN_RETARD":
    case "LITIGE":
      return "retard";
    case "ANNULEE":
      return "brouillon";
    default:
      return "envoyee"; // EMISE, ENVOYEE
  }
}

function mapInvoice(r: DbFacture): Invoice {
  const client = Array.isArray(r.Client) ? r.Client[0] : r.Client;
  return {
    id: r.id,
    ref: r.numero,
    client: client?.raisonSociale ?? "—",
    amount: Number(r.montantTTC) || 0,
    issued: r.dateEmission,
    due: r.dateEcheance,
    status: mapStatus(r.statut),
  };
}

/** Factures visibles par l'utilisateur courant (selon RLS), récentes d'abord. */
export async function fetchInvoices(): Promise<Invoice[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Facture")
    .select(
      "id,numero,dateEmission,dateEcheance,montantTTC,statut,Client(raisonSociale)",
    )
    .order("dateEmission", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbFacture[]).map(mapInvoice);
}

export interface NewInvoiceInput {
  clientId: string;
  montantHT: number;
  tauxTVA: number; // en %
  dateEmission: string; // yyyy-mm-dd
  dateEcheance: string;
  statut: string; // valeur enum StatutFacture (EMISE, ENVOYEE, …)
}

/** Crée une facture (RLS insert : DG/RF/COMPTABLE). */
export async function createInvoice(input: NewInvoiceInput): Promise<void> {
  const supabase = createClient();
  const montantHT = Math.round(input.montantHT);
  const montantTVA = Math.round((montantHT * input.tauxTVA) / 100);
  const montantTTC = montantHT + montantTVA;
  const numero = `FAC-${input.dateEmission.slice(0, 4)}-${Date.now()
    .toString()
    .slice(-6)}`;
  const { data, error } = await supabase
    .from("Facture")
    .insert({
      numero,
      clientId: input.clientId,
      dateEmission: input.dateEmission,
      dateEcheance: input.dateEcheance,
      montantHT,
      montantTVA,
      montantTTC,
      statut: input.statut,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
}

/** Enregistre une relance sur une facture (RLS update : DG/RF/COMPTABLE). */
export async function sendRelance(id: string, niveau: number): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Facture")
    .update({
      derniereRelance: new Date().toISOString(),
      nombreRelances: niveau,
    } as never)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: relance refusée (accès écriture).");
}
