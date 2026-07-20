/**
 * Clôture de caisse. Le récapitulatif du jour est calculé depuis les ventes/
 * paiements réels (J1.3). L'enregistrement de clôture est stocké dans
 * `ClotureCaisse`. RLS : DG/RF/COMPTABLE.
 */
import { createClient } from "@/lib/supabase/client";

const num = (v: unknown) => Number(v) || 0;

export interface ClotureJour {
  total: number;
  count: number;
  byMoyen: { moyen: string; montant: number }[];
  especes: number;
}

interface DbVente {
  total: number | string;
  Paiement: { moyen: string; montant: number | string }[] | null;
}

/** Récapitulatif des ventes de la journée en cours (par moyen de paiement). */
export async function fetchClotureJour(): Promise<ClotureJour> {
  const supabase = createClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("Vente")
    .select("total,Paiement(moyen,montant)")
    .gte("dateHeure", start.toISOString());
  if (error) throw error;
  const ventes = (data as unknown as DbVente[]) ?? [];

  const byMoyenMap = new Map<string, number>();
  let total = 0;
  for (const v of ventes) {
    total += num(v.total);
    for (const p of v.Paiement ?? []) {
      byMoyenMap.set(p.moyen, (byMoyenMap.get(p.moyen) ?? 0) + num(p.montant));
    }
  }
  const byMoyen = [...byMoyenMap.entries()].map(([moyen, montant]) => ({ moyen, montant }));
  const especes = byMoyenMap.get("Espèces") ?? 0;
  return { total, count: ventes.length, byMoyen, especes };
}

export interface ClotureInput {
  fondCaisse: number;
  ventesEspeces: number;
  compteEspeces: number;
  totalVentes: number;
  nbTransactions: number;
}
export async function enregistrerCloture(i: ClotureInput): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const ecart = i.compteEspeces - (i.fondCaisse + i.ventesEspeces);
  const { data, error } = await supabase
    .from("ClotureCaisse")
    .insert({
      fondCaisse: Math.round(i.fondCaisse),
      ventesEspeces: Math.round(i.ventesEspeces),
      compteEspeces: Math.round(i.compteEspeces),
      ecart,
      totalVentes: Math.round(i.totalVentes),
      nbTransactions: i.nbTransactions,
      clotureParId: auth.user?.id ?? null,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: clôture refusée (DG/RF/Comptable).");
}
