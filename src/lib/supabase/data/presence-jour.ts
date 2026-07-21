/**
 * Feuille de pointage journalière (table `PresenceJour`) : une ligne par agent
 * et par jour — statut, arrivée, départ, heures sup, notes. Alimente le
 * Pointage journalier (saisie) et les Présences (synthèse mensuelle).
 * La table étant récente (hors types générés), on utilise un client non typé.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/** Client Supabase non typé (PresenceJour absent de database.types). */
function loose(): SupabaseClient {
  return createClient() as unknown as SupabaseClient;
}

export type PresenceStatut = "present" | "retard" | "absent" | "conge" | "repos";

export interface PresenceRow {
  agentId: string;
  agent: string;
  poste: string;
  statut: PresenceStatut;
  arrivee: string; // "HH:MM" (vide si non saisi)
  depart: string;
  heuresSup: number;
  notes: string;
  saved: boolean; // une ligne existe déjà en base
}

interface DbAgent {
  id: string;
  prenom: string;
  nom: string | null;
  poste: string | null;
}
interface DbPresence {
  agentId: string;
  statut: string;
  arrivee: string | null;
  depart: string | null;
  heuresSup: number | string | null;
  notes: string | null;
}

const hm = (t: string | null | undefined): string => (t ? String(t).slice(0, 5) : "");

/** Feuille du jour : tous les agents + leur présence saisie (le cas échéant). */
export async function fetchPresenceJour(date: string): Promise<PresenceRow[]> {
  const sb = loose();
  const [agentsRes, presRes] = await Promise.all([
    sb.from("AgentSecurite").select("id,prenom,nom,poste").order("prenom"),
    sb.from("PresenceJour").select("agentId,statut,arrivee,depart,heuresSup,notes").eq("date", date),
  ]);
  if (agentsRes.error) throw agentsRes.error;
  if (presRes.error) throw presRes.error;

  const byAgent = new Map<string, DbPresence>();
  for (const p of (presRes.data as DbPresence[]) ?? []) byAgent.set(p.agentId, p);

  return ((agentsRes.data as DbAgent[]) ?? []).map((a): PresenceRow => {
    const p = byAgent.get(a.id);
    return {
      agentId: a.id,
      agent: `${a.prenom} ${a.nom ?? ""}`.trim() || "—",
      poste: a.poste ?? "—",
      statut: (p?.statut as PresenceStatut) ?? "present",
      arrivee: hm(p?.arrivee),
      depart: hm(p?.depart),
      heuresSup: Number(p?.heuresSup ?? 0),
      notes: p?.notes ?? "",
      saved: !!p,
    };
  });
}

export interface UpsertPresenceInput {
  agentId: string;
  date: string; // yyyy-mm-dd
  statut: PresenceStatut;
  arrivee?: string; // "HH:MM"
  depart?: string;
  heuresSup?: number;
  notes?: string;
}

/** Enregistre (upsert) la présence d'un agent pour un jour. RLS ops. */
export async function upsertPresence(i: UpsertPresenceInput): Promise<void> {
  const sb = loose();
  const { error } = await sb.from("PresenceJour").upsert(
    {
      agentId: i.agentId,
      date: i.date,
      statut: i.statut,
      arrivee: i.arrivee || null,
      depart: i.depart || null,
      heuresSup: i.heuresSup || 0,
      notes: i.notes?.trim() || null,
      updatedAt: new Date().toISOString(),
    },
    { onConflict: "agentId,date" },
  );
  if (error) throw error;
}

export interface PresenceMonthRow {
  agentId: string;
  agent: string;
  poste: string;
  present: number;
  retard: number;
  absent: number;
  conge: number;
  heuresSup: number;
  joursSaisis: number;
}

/** Synthèse d'une période [from, to] (inclus) par agent — pour les Présences. */
export async function fetchPresenceMonth(from: string, to: string): Promise<PresenceMonthRow[]> {
  const sb = loose();
  const [agentsRes, presRes] = await Promise.all([
    sb.from("AgentSecurite").select("id,prenom,nom,poste").order("prenom"),
    sb.from("PresenceJour").select("agentId,statut,heuresSup").gte("date", from).lte("date", to),
  ]);
  if (agentsRes.error) throw agentsRes.error;
  if (presRes.error) throw presRes.error;

  const agg = new Map<string, { present: number; retard: number; absent: number; conge: number; heuresSup: number; jours: number }>();
  for (const p of (presRes.data as DbPresence[]) ?? []) {
    const a = agg.get(p.agentId) ?? { present: 0, retard: 0, absent: 0, conge: 0, heuresSup: 0, jours: 0 };
    if (p.statut === "present") a.present++;
    else if (p.statut === "retard") a.retard++;
    else if (p.statut === "absent") a.absent++;
    else if (p.statut === "conge") a.conge++;
    a.heuresSup += Number(p.heuresSup ?? 0);
    a.jours++;
    agg.set(p.agentId, a);
  }

  return ((agentsRes.data as DbAgent[]) ?? []).map((a): PresenceMonthRow => {
    const s = agg.get(a.id) ?? { present: 0, retard: 0, absent: 0, conge: 0, heuresSup: 0, jours: 0 };
    return {
      agentId: a.id,
      agent: `${a.prenom} ${a.nom ?? ""}`.trim() || "—",
      poste: a.poste ?? "—",
      present: s.present,
      retard: s.retard,
      absent: s.absent,
      conge: s.conge,
      heuresSup: s.heuresSup,
      joursSaisis: s.jours,
    };
  });
}
