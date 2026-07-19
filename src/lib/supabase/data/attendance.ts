/**
 * Présences = roster des **agents de sécurité terrain** (`AgentSecurite`, les
 * 67 agents importés) sur lequel on superpose les événements `Pointage`
 * (ARRIVEE/DEPART) du jour. Une ligne par agent. Sécurisé par RLS
 * (agents_securite_read + pointage_read_ops).
 *
 * Tant qu'un agent n'a pas d'événement d'arrivée, son statut est « non_pointe »
 * (neutre) — pas « absent », qui serait faux. Les responsables enregistrent le
 * pointage au fil de l'eau ; les statuts se colorent alors automatiquement.
 */
import { createClient } from "@/lib/supabase/client";
import type { Attendance } from "@/lib/api/types";

interface DbPointage {
  type: string;
  dateHeure: string;
  agentId: string;
  Site: { nom: string } | { nom: string }[] | null;
}
interface DbAgent {
  id: string;
  prenom: string;
  nom: string | null;
  poste: string | null;
}

const SEUIL_RETARD = "07:00";

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Présences du jour, une ligne par agent terrain (selon RLS). */
export async function fetchAttendance(): Promise<Attendance[]> {
  const supabase = createClient();
  const [pts, agents] = await Promise.all([
    supabase.from("Pointage").select("type,dateHeure,agentId,Site(nom)"),
    supabase
      .from("AgentSecurite")
      .select("id,prenom,nom,poste")
      .order("prenom"),
  ]);
  if (pts.error) throw pts.error;
  if (agents.error) throw agents.error;

  // Regroupe les événements de pointage par agent (forward-compatible : dès que
  // des pointages référencent un AgentSecurite, ils s'agrègent ici).
  const byAgent = new Map<string, DbPointage[]>();
  for (const p of pts.data as unknown as DbPointage[]) {
    const list = byAgent.get(p.agentId);
    if (list) list.push(p);
    else byAgent.set(p.agentId, [p]);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (agents.data as unknown as DbAgent[]).map((a): Attendance => {
    const events = (byAgent.get(a.id) ?? []).sort((x, y) =>
      x.dateHeure.localeCompare(y.dateHeure),
    );
    const arr = events.find((e) => e.type === "ARRIVEE");
    const dep = events.find((e) => e.type === "DEPART");
    const site = arr && (Array.isArray(arr.Site) ? arr.Site[0] : arr.Site);
    const checkIn = arr ? hhmm(arr.dateHeure) : null;
    const status: Attendance["status"] = !arr
      ? "non_pointe"
      : checkIn! > SEUIL_RETARD
        ? "retard"
        : "present";
    return {
      id: a.id,
      agent: `${a.prenom} ${a.nom ?? ""}`.trim(),
      // Site = celui du pointage si présent, sinon l'affectation de l'agent.
      site: site?.nom ?? a.poste ?? "—",
      date: arr ? arr.dateHeure.slice(0, 10) : today,
      checkIn,
      checkOut: dep ? hhmm(dep.dateHeure) : null,
      status,
    };
  });
}
