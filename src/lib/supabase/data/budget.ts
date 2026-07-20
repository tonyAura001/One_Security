/** Lignes budgétaires (prévu vs réalisé). RLS : DG/RF/COMPTABLE. */
import { createClient } from "@/lib/supabase/client";

export interface BudgetLigne {
  id: string;
  poste: string;
  prevu: number;
  realise: number;
  periode: string;
}

export async function fetchBudget(): Promise<BudgetLigne[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("BudgetLigne")
    .select("id,poste,prevu,realise,periode")
    .order("createdAt", { ascending: true });
  if (error) throw error;
  return (data as unknown as BudgetLigne[]) ?? [];
}

export interface NewBudgetInput {
  poste: string;
  prevu: number;
  realise?: number;
}
export async function createBudgetLigne(i: NewBudgetInput): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("BudgetLigne")
    .insert({ poste: i.poste.trim(), prevu: Math.round(i.prevu), realise: Math.round(i.realise ?? 0) } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("row-level security: création refusée (DG/RF/Comptable).");
}

export async function updateBudgetRealise(id: string, realise: number): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("BudgetLigne")
    .update({ realise: Math.round(realise), updatedAt: new Date().toISOString() } as never)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("row-level security: accès refusé");
}
