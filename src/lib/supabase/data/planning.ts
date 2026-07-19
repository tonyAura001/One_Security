/** Planning des rondes via Supabase (RLS ops). RondeAgent → type UI Shift. */
import { createClient } from "@/lib/supabase/client";
import type { Shift } from "@/lib/api/types";

interface Named { nom: string }
interface Person { prenom: string; nom: string }
interface DbRonde { id: string; debut: string | null; fin: string | null; User: Person | Person[] | null; Site: Named | Named[] | null }
function one<T>(v: T | T[] | null): T | undefined { return Array.isArray(v) ? v[0] : (v ?? undefined); }
function hhmm(iso: string): string { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
function typeFrom(start: string): Shift["type"] {
  const h = parseInt(start.slice(0, 2), 10);
  if (h >= 19 || h < 5) return "nuit";
  if (h >= 12) return "renfort";
  return "jour";
}
export async function fetchShifts(): Promise<Shift[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("RondeAgent")
    .select("id,debut,fin,User(prenom,nom),Site(nom)").not("debut", "is", null);
  if (error) throw error;
  return (data as unknown as DbRonde[]).map((r) => {
    const u = one(r.User); const s = one(r.Site);
    const start = r.debut ? hhmm(r.debut) : "00:00";
    const jsDay = r.debut ? new Date(r.debut).getDay() : 1;
    return {
      id: r.id,
      agent: u ? `${u.prenom} ${u.nom}` : "—",
      site: s?.nom ?? "—",
      day: (jsDay + 6) % 7,
      start,
      end: r.fin ? hhmm(r.fin) : "",
      type: typeFrom(start),
    };
  });
}
