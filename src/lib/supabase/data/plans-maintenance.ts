/**
 * Plans de maintenance préventive via Supabase. RLS alignée sur Ticket
 * (lecture DG/RP/MANAGER/CONTROLEUR/SURVEILLANT, écriture sans SURVEILLANT).
 * Le RPC `generer_ticket_plan` crée un ticket depuis un plan et avance
 * l'échéance d'une période.
 */
import { createClient } from "@/lib/supabase/client";

export type Periodicite =
  | "mensuelle"
  | "trimestrielle"
  | "semestrielle"
  | "annuelle";

export interface PlanMaintenance {
  id: string;
  titre: string;
  site: string | null;
  equipement: string | null;
  periodicite: Periodicite;
  prochaineEcheance: string;
  criticite: string;
  actif: boolean;
}

interface Named { nom: string }
interface DbPlan {
  id: string;
  titre: string;
  equipement: string | null;
  periodicite: string;
  prochaineEcheance: string;
  criticite: string;
  actif: boolean;
  Site: Named | Named[] | null;
}
function one<T>(v: T | T[] | null): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}

export async function fetchPlans(): Promise<PlanMaintenance[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("PlanMaintenance")
    .select("id,titre,equipement,periodicite,prochaineEcheance,criticite,actif,Site(nom)")
    .order("prochaineEcheance");
  if (error) throw error;
  return (data as unknown as DbPlan[]).map((p) => ({
    id: p.id,
    titre: p.titre,
    site: one(p.Site)?.nom ?? null,
    equipement: p.equipement,
    periodicite: (p.periodicite as Periodicite) ?? "mensuelle",
    prochaineEcheance: p.prochaineEcheance,
    criticite: p.criticite,
    actif: p.actif,
  }));
}

export interface NewPlanInput {
  titre: string;
  siteId?: string | null;
  equipement?: string;
  periodicite: Periodicite;
  prochaineEcheance: string;
  criticite: string;
  responsableId?: string | null;
  notes?: string;
}

/** Crée un plan préventif (RLS Plan_maint_write). */
export async function createPlan(i: NewPlanInput): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("PlanMaintenance")
    .insert({
      titre: i.titre.trim(),
      siteId: i.siteId || null,
      equipement: i.equipement?.trim() || null,
      periodicite: i.periodicite,
      prochaineEcheance: i.prochaineEcheance,
      criticite: i.criticite,
      responsableId: i.responsableId || null,
      notes: i.notes?.trim() || null,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
}

/** Active/désactive un plan préventif. */
export async function togglePlanActif(id: string, actif: boolean): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("PlanMaintenance")
    .update({ actif, updatedAt: new Date().toISOString() } as never)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("row-level security: accès refusé");
}

type RpcCaller = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

/** Génère un ticket depuis un plan et avance l'échéance (RPC atomique). */
export async function genererTicketPlan(planId: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await (supabase.rpc as unknown as RpcCaller)("generer_ticket_plan", {
    _plan: planId,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
