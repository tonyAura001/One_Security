/**
 * Cycle d'approbation de la paie (table `CyclePaie`, une ligne par période).
 * Circuit à 3 niveaux avancé par le RPC `avancer_cycle_paie` (garde de rôle).
 */
import { createClient } from "@/lib/supabase/client";

export type PayrollStage = "brouillon" | "soumis" | "valide" | "approuve";

export interface CyclePaie {
  periode: string;
  statut: PayrollStage;
  soumisLe: string | null;
  valideLe: string | null;
  approuveLe: string | null;
}

/** Période de paie courante au format 'YYYY-MM'. */
export function currentPeriode(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function fetchCyclePaie(periode: string): Promise<CyclePaie> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("CyclePaie")
    .select("periode,statut,soumisLe,valideLe,approuveLe")
    .eq("periode", periode)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    return { periode, statut: "brouillon", soumisLe: null, valideLe: null, approuveLe: null };
  }
  return data as unknown as CyclePaie;
}

type RpcCaller = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

/** Fait avancer le cycle d'un niveau (RPC role-gardé). Retourne le nouveau statut. */
export async function avancerCyclePaie(periode: string): Promise<PayrollStage> {
  const supabase = createClient();
  const { data, error } = await (supabase.rpc as unknown as RpcCaller)("avancer_cycle_paie", {
    _periode: periode,
  });
  if (error) throw new Error(error.message);
  return data as PayrollStage;
}
