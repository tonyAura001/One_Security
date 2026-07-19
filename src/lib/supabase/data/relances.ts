/**
 * « Relances » = factures en retard, dérivées de la table Facture
 * (statut EN_RETARD), sécurisé par la RLS `factures_read_finance`
 * (DG/RF/COMPTABLE/RP/MANAGER). Le palier de relance vient du nombre de jours
 * de retard. Aucune table dédiée : c'est une vue métier sur les factures.
 */
import { createClient } from "@/lib/supabase/client";
import type { Relance } from "@/lib/api/types";

type Stage = Relance["stage"];

interface DbFacture {
  id: string;
  numero: string;
  montantTTC: number | string;
  dateEcheance: string;
  Client: { raisonSociale: string } | { raisonSociale: string }[] | null;
}

function stageOf(daysLate: number): Stage {
  if (daysLate >= 45) return "J+45";
  if (daysLate >= 30) return "J+30";
  if (daysLate >= 15) return "J+15";
  if (daysLate >= 7) return "J+7";
  return "J+1";
}

function mapRelance(r: DbFacture): Relance {
  const client = Array.isArray(r.Client) ? r.Client[0] : r.Client;
  const daysLate = Math.max(
    0,
    Math.round((Date.now() - new Date(r.dateEcheance).getTime()) / 86_400_000),
  );
  return {
    id: r.id,
    ref: r.numero,
    client: client?.raisonSociale ?? "—",
    amount: Number(r.montantTTC) || 0,
    daysLate,
    stage: stageOf(daysLate),
  };
}

/** Factures en retard (relances) visibles par l'utilisateur (selon RLS). */
export async function fetchRelances(): Promise<Relance[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Facture")
    .select("id,numero,montantTTC,dateEcheance,Client(raisonSociale)")
    .eq("statut", "EN_RETARD")
    .order("dateEcheance");
  if (error) throw error;
  return (data as unknown as DbFacture[]).map(mapRelance);
}
