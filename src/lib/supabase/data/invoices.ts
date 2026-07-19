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
