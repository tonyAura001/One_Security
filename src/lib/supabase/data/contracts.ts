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

export interface NewContractInput {
  clientId: string;
  siteId: string;
  type: string; // enum ContratType (PRESTATION, MISE_A_DISPOSITION, PONCTUEL)
  montantHT: number;
  tauxTVA: number;
  frequenceFacturation: string; // enum FrequenceFacturation
  dateSignature: string; // yyyy-mm-dd
  dateDebut: string;
  dateFin?: string | null;
  description?: string | null;
}

/** Crée un contrat de prestation (RLS insert : DG/RP/RF). */
export async function createContract(i: NewContractInput): Promise<void> {
  const supabase = createClient();
  const numero = `CTR-${i.dateDebut.slice(0, 4)}-${Date.now()
    .toString()
    .slice(-6)}`;
  const { data, error } = await supabase
    .from("Contrat")
    .insert({
      numero,
      clientId: i.clientId,
      siteId: i.siteId,
      type: i.type,
      montantHT: Math.round(i.montantHT),
      tauxTVA: i.tauxTVA,
      frequenceFacturation: i.frequenceFacturation,
      dateSignature: i.dateSignature,
      dateDebut: i.dateDebut,
      dateFin: i.dateFin || null,
      description: i.description?.trim() || null,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
}
