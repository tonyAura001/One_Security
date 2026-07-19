/**
 * Maintenance (tickets + interventions) via Supabase (RLS : DG/RP/MANAGER/
 * CONTROLEUR/SURVEILLANT en lecture ; écriture sans SURVEILLANT).
 */
import { createClient } from "@/lib/supabase/client";
import type { Ticket, Intervention } from "@/lib/api/types";

interface Named { nom: string }
interface Person { prenom: string; nom: string }
function one<T>(v: T | T[] | null): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}

interface DbTicket {
  id: string; ref: string; titre: string; criticite: string; stage: string;
  dateOuverture: string; equipement: string | null; Site: Named | Named[] | null;
}
export async function fetchTickets(): Promise<Ticket[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Ticket")
    .select("id,ref,titre,criticite,stage,dateOuverture,equipement,Site(nom)")
    .order("dateOuverture", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbTicket[]).map((t) => ({
    id: t.id,
    ref: t.ref,
    title: t.titre,
    site: one(t.Site)?.nom ?? "—",
    criticality: t.criticite as Ticket["criticality"],
    stage: t.stage as Ticket["stage"],
    opened: t.dateOuverture,
    equipment: t.equipement ?? "—",
  }));
}
export async function updateTicketStage(id: string, stage: string): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase.from("Ticket").update({ stage }).eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("row-level security: accès refusé");
}

export interface NewTicketInput {
  titre: string;
  criticite: string; // critique | haute | normale | basse
  siteId?: string | null;
  equipement?: string;
}

/** Crée un ticket de maintenance (RLS Ticket_maint_write). Stage = ouvert. */
export async function createTicket(i: NewTicketInput): Promise<void> {
  const supabase = createClient();
  const ref = `TCK-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  const { data, error } = await supabase
    .from("Ticket")
    .insert({
      ref,
      titre: i.titre.trim(),
      criticite: i.criticite,
      stage: "ouvert",
      siteId: i.siteId || null,
      equipement: i.equipement?.trim() || null,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
}

export interface NewInterventionInput {
  resume?: string;
  dureeMin?: number | null;
  siteId?: string | null;
  statut: string; // planifiee | terminee
}

/** Crée une intervention (RLS Intervention_maint_write). */
export async function createIntervention(
  i: NewInterventionInput,
): Promise<void> {
  const supabase = createClient();
  const ref = `INT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  const { data, error } = await supabase
    .from("Intervention")
    .insert({
      ref,
      resume: i.resume?.trim() || null,
      dureeMin: i.dureeMin ?? null,
      siteId: i.siteId || null,
      statut: i.statut,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
}

/** Met à jour le statut d'une intervention (ex. clôture). */
export async function updateInterventionStatut(
  id: string,
  statut: string,
): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Intervention")
    .update({ statut } as never)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: accès refusé");
}

/** Enregistre le compte rendu (résumé) d'une intervention. */
export async function updateInterventionResume(
  id: string,
  resume: string,
): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Intervention")
    .update({ resume: resume.trim() || null } as never)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: accès refusé");
}

interface DbIntervention {
  id: string; ref: string; dateHeure: string; resume: string | null; statut: string;
  dureeMin: number | null; Site: Named | Named[] | null; User: Person | Person[] | null;
}
export async function fetchInterventions(): Promise<Intervention[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Intervention")
    .select("id,ref,dateHeure,resume,statut,dureeMin,Site(nom),User(prenom,nom)")
    .order("dateHeure", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbIntervention[]).map((i) => {
    const t = one(i.User);
    return {
      id: i.id,
      ref: i.ref,
      site: one(i.Site)?.nom ?? "—",
      agent: t ? `${t.prenom} ${t.nom}` : "—",
      date: i.dateHeure,
      summary: i.resume ?? "",
      status: i.statut as Intervention["status"],
      durationMin: i.dureeMin ?? 0,
    };
  });
}
