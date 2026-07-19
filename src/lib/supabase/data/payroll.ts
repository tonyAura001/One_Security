/**
 * Bulletins de paie via Supabase (RLS bulletins_read_paie : DG/RF/COMPTABLE/RH).
 * Reconstruit le détail des cotisations (IPRES/CSS/IR) attendu par l'UI à
 * partir du brut/net et des taux sénégalais.
 */
import { createClient } from "@/lib/supabase/client";
import type { Payslip } from "@/lib/api/types";

interface DbUser {
  prenom: string;
  nom: string;
  role: string;
}
interface DbBulletin {
  id: string;
  salaireBrut: number | string;
  salaireNet: number | string;
  heuresTravaillees: number | string;
  User: DbUser | DbUser[] | null;
}

const num = (v: number | string): number => Number(v) || 0;
function one<T>(v: T | T[] | null): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}

function mapPayslip(b: DbBulletin): Payslip {
  const u = one(b.User);
  const gross = num(b.salaireBrut);
  const net = num(b.salaireNet);
  const ipres = Math.round(gross * 0.056);
  const css = Math.round(gross * 0.036);
  const ir = Math.max(0, gross - net - ipres - css);
  return {
    id: b.id,
    agent: u ? `${u.prenom} ${u.nom}` : "—",
    role: u?.role === "AGENT" ? "Agent de sécurité" : (u?.role ?? "—"),
    gross,
    ipres,
    css,
    ir,
    net,
    days: Math.round(num(b.heuresTravaillees) / 8),
  };
}

/** Bulletins de la période (par défaut le dernier mois), selon RLS. */
export async function fetchPayslips(periode = "2026-06"): Promise<Payslip[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("BulletinPaie")
    .select("id,salaireBrut,salaireNet,heuresTravaillees,User(prenom,nom,role)")
    .eq("periode", periode);
  if (error) throw error;
  return (data as unknown as DbBulletin[]).map(mapPayslip);
}
