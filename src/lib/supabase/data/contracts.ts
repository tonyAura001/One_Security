/**
 * Accès données « contrats » via Supabase (PostgREST), sécurisé par RLS
 * (`Contrat_read_commerce` : DG/RP/RF/COMPTABLE/MANAGER). Nom du client via
 * jointure. Statut dérivé de la date de fin.
 */
import { createClient } from "@/lib/supabase/client";
import type { Contract, ContractStatus } from "@/lib/api/types";

interface DbContrat {
  id: string;
  numero: string;
  dateDebut: string;
  dateFin: string | null;
  montantHT: number | string;
  frequenceFacturation: string;
  Client: { raisonSociale: string } | { raisonSociale: string }[] | null;
}

/** Montant contractuel ramené au mensuel (FCFA). */
function toMonthly(amount: number, freq: string): number {
  switch (freq) {
    case "MENSUELLE":
      return amount;
    case "TRIMESTRIELLE":
      return amount / 3;
    case "SEMESTRIELLE":
      return amount / 6;
    case "ANNUELLE":
      return amount / 12;
    default:
      return 0;
  }
}

/** Statut d'échéance à partir de la date de fin. */
function statusFrom(end: string | null): ContractStatus {
  if (!end) return "actif";
  const days = (new Date(end).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return "expire";
  if (days < 90) return "expirant";
  return "actif";
}

function mapContract(r: DbContrat): Contract {
  const client = Array.isArray(r.Client) ? r.Client[0] : r.Client;
  return {
    id: r.id,
    ref: r.numero,
    client: client?.raisonSociale ?? "—",
    monthly: Math.round(toMonthly(Number(r.montantHT) || 0, r.frequenceFacturation)),
    start: r.dateDebut,
    end: r.dateFin ?? "",
    status: statusFrom(r.dateFin),
  };
}

/** Contrats visibles par l'utilisateur courant (selon RLS). */
export async function fetchContracts(): Promise<Contract[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Contrat")
    .select(
      "id,numero,dateDebut,dateFin,montantHT,frequenceFacturation,Client(raisonSociale)",
    )
    .order("dateDebut", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbContrat[]).map(mapContract);
}
