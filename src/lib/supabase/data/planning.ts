/**
 * Planning des vacations via Supabase. Modèle unifié : table `Vacation`
 * (créneau planifié d'un agent sur un site) — distincte de RondeAgent (ronde
 * de contrôle). RLS ops. Vacation → type UI `Shift`.
 */
import { createClient } from "@/lib/supabase/client";
import type { Shift, ShiftType } from "@/lib/api/types";

interface Named {
  nom: string;
}
interface Person {
  prenom: string;
  nom: string | null;
}
interface DbVacation {
  id: string;
  debut: string | null;
  fin: string | null;
  type: string;
  AgentSecurite: Person | Person[] | null;
  Site: Named | Named[] | null;
}
function one<T>(v: T | T[] | null): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}
function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export async function fetchShifts(): Promise<Shift[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Vacation")
    .select("id,debut,fin,type,AgentSecurite(prenom,nom),Site(nom)")
    .not("debut", "is", null);
  if (error) throw error;
  return (data as unknown as DbVacation[]).map((r) => {
    const u = one(r.AgentSecurite);
    const s = one(r.Site);
    const start = r.debut ? hhmm(r.debut) : "00:00";
    const jsDay = r.debut ? new Date(r.debut).getDay() : 1;
    return {
      id: r.id,
      agent: u ? `${u.prenom} ${u.nom ?? ""}`.trim() : "—",
      site: s?.nom ?? "—",
      day: (jsDay + 6) % 7,
      date: r.debut ? r.debut.slice(0, 10) : undefined,
      start,
      end: r.fin ? hhmm(r.fin) : "",
      type: (r.type as ShiftType) ?? "jour",
    };
  });
}

export interface NewShiftInput {
  agentId: string;
  date: string; // yyyy-mm-dd (jour ciblé de la semaine affichée)
  type: ShiftType;
  siteId?: string | null;
}

/** Horaires par type de vacation ([heure début, heure fin]). Absences = journée. */
const SHIFT_HOURS: Record<ShiftType, [number, number]> = {
  jour: [6, 18],
  renfort: [14, 22],
  nuit: [20, 6],
  repos: [0, 0],
  rtt: [0, 0],
  conge: [0, 0],
  maladie: [0, 0],
  formation: [8, 17],
};

/** Affecte une vacation à un agent sur une date. RLS : DG/RP/MANAGER/CONTROLEUR. */
export async function createShift(i: NewShiftInput): Promise<void> {
  const supabase = createClient();
  const [sh, eh] = SHIFT_HOURS[i.type];
  const debut = new Date(`${i.date}T00:00:00`);
  debut.setHours(sh, 0, 0, 0);
  const fin = new Date(`${i.date}T00:00:00`);
  // Journée complète pour les absences (00:00 → 23:59), sinon horaires du poste.
  if (sh === 0 && eh === 0) fin.setHours(23, 59, 0, 0);
  else fin.setHours(eh, 0, 0, 0);
  if (i.type === "nuit") fin.setDate(fin.getDate() + 1); // fin le lendemain matin
  const { data, error } = await supabase
    .from("Vacation")
    .insert({
      agentId: i.agentId,
      siteId: i.siteId || null,
      debut: debut.toISOString(),
      fin: fin.toISOString(),
      type: i.type,
    } as never)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0)
    throw new Error("row-level security: affectation refusée (accès écriture).");
}

/** Retire une vacation. RLS vacation_delete : DG/RP/MANAGER. */
export async function deleteShift(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("Vacation").delete().eq("id", id);
  if (error) throw error;
}
