/**
 * Incidents / main courante via Supabase (RLS incidents_read_ops :
 * DG/RP/MANAGER/CONTROLEUR/SURVEILLANT/JURISTE). Join Site pour le lieu.
 */
import { createClient } from "@/lib/supabase/client";

export type IncidentCriticite = "FAIBLE" | "MODEREE" | "ELEVEE" | "CRITIQUE";
export type IncidentStatut = "NOUVEAU" | "EN_COURS" | "CLOTURE";

export interface Incident {
  id: string;
  date: string;
  type: string;
  site: string;
  criticite: IncidentCriticite;
  statut: IncidentStatut;
  description: string;
}

interface DbIncident {
  id: string;
  dateHeure: string;
  type: string;
  description: string;
  criticite: string;
  statut: string;
  Site: { nom: string } | { nom: string }[] | null;
}

function mapIncident(r: DbIncident): Incident {
  const site = Array.isArray(r.Site) ? r.Site[0] : r.Site;
  return {
    id: r.id,
    date: r.dateHeure,
    type: r.type,
    site: site?.nom ?? "—",
    criticite: r.criticite as IncidentCriticite,
    statut: r.statut as IncidentStatut,
    description: r.description,
  };
}

export interface NewIncidentInput {
  type: string;
  description: string;
  criticite: IncidentCriticite;
}

/** Crée un incident / entrée de main courante (RLS incident_insert). */
export async function createIncident(i: NewIncidentInput): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("IncidentSecurite")
    .insert({
      type: i.type.trim(),
      description: i.description.trim(),
      criticite: i.criticite,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: création refusée (accès écriture).");
}

/** Incidents visibles par l'utilisateur courant (selon RLS), récents d'abord. */
export async function fetchIncidents(): Promise<Incident[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("IncidentSecurite")
    .select("id,dateHeure,type,description,criticite,statut,Site(nom)")
    .order("dateHeure", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbIncident[]).map(mapIncident);
}
