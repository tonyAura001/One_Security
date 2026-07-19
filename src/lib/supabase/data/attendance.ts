/**
 * Présences = agrégation des événements `Pointage` (ARRIVEE/DEPART) en une
 * ligne journalière par agent. Sécurisé par RLS (pointage_read_ops + join
 * User/Site). Statut dérivé de l'heure d'arrivée (absent si aucune arrivée).
 *
 * Compromis assumé : les « agents » sont ici les utilisateurs (User) — pas
 * encore de roster d'agents terrain dédié.
 */
import { createClient } from "@/lib/supabase/client";
import type { Attendance } from "@/lib/api/types";

interface DbPointage {
  type: string;
  dateHeure: string;
  agentId: string;
  Site: { nom: string } | { nom: string }[] | null;
}
interface DbUser {
  id: string;
  prenom: string;
  nom: string;
}

const SEUIL_RETARD = "07:00";

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Présences du jour, une ligne par agent (selon RLS). */
export async function fetchAttendance(): Promise<Attendance[]> {
  const supabase = createClient();
  const [pts, users] = await Promise.all([
    supabase.from("Pointage").select("type,dateHeure,agentId,Site(nom)"),
    supabase.from("User").select("id,prenom,nom").order("nom"),
  ]);
  if (pts.error) throw pts.error;
  if (users.error) throw users.error;

  const byAgent = new Map<string, DbPointage[]>();
  for (const p of pts.data as unknown as DbPointage[]) {
    const list = byAgent.get(p.agentId);
    if (list) list.push(p);
    else byAgent.set(p.agentId, [p]);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (users.data as unknown as DbUser[]).map((u): Attendance => {
    const events = (byAgent.get(u.id) ?? []).sort((a, b) =>
      a.dateHeure.localeCompare(b.dateHeure),
    );
    const arr = events.find((e) => e.type === "ARRIVEE");
    const dep = events.find((e) => e.type === "DEPART");
    const site = arr && (Array.isArray(arr.Site) ? arr.Site[0] : arr.Site);
    const checkIn = arr ? hhmm(arr.dateHeure) : null;
    const status: Attendance["status"] = !arr
      ? "absent"
      : checkIn! > SEUIL_RETARD
        ? "retard"
        : "present";
    return {
      id: u.id,
      agent: `${u.prenom} ${u.nom}`.trim(),
      site: site?.nom ?? "—",
      date: arr ? arr.dateHeure.slice(0, 10) : today,
      checkIn,
      checkOut: dep ? hhmm(dep.dateHeure) : null,
      status,
    };
  });
}
