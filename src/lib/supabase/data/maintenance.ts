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
