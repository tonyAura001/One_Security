/**
 * Bulletins de paie via Supabase (RLS bulletins_read_paie : DG/RF/COMPTABLE/RH).
 * Les bulletins concernent les agents de sécurité terrain (AgentSecurite).
 * Le détail des cotisations (IPRES/CSS/IR) est reconstruit à partir du brut/net
 * et des taux sénégalais.
 */
import { createClient } from "@/lib/supabase/client";
import type { Payslip } from "@/lib/api/types";

interface DbAgent {
  prenom: string;
  nom: string | null;
}
interface DbBulletin {
  id: string;
  salaireBrut: number | string;
  salaireNet: number | string;
  heuresTravaillees: number | string;
  AgentSecurite: DbAgent | DbAgent[] | null;
}

const num = (v: number | string): number => Number(v) || 0;
function one<T>(v: T | T[] | null): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}

// Taux sénégalais (approximation) : cotisations sociales + IR simplifié.
const TAUX_IPRES = 0.056;
const TAUX_CSS = 0.036;
const TAUX_IR = 0.05;

function mapPayslip(b: DbBulletin): Payslip {
  const a = one(b.AgentSecurite);
  const gross = num(b.salaireBrut);
  const net = num(b.salaireNet);
  const ipres = Math.round(gross * TAUX_IPRES);
  const css = Math.round(gross * TAUX_CSS);
  const ir = Math.max(0, gross - net - ipres - css);
  return {
    id: b.id,
    agent: a ? `${a.prenom} ${a.nom ?? ""}`.trim() : "—",
    role: "Agent de sécurité",
    gross,
    ipres,
    css,
    ir,
    net,
    days: Math.round(num(b.heuresTravaillees) / 8),
  };
}

/** Bulletins de la période (par défaut le mois courant du jeu de données). */
export async function fetchPayslips(periode = "2026-07"): Promise<Payslip[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("BulletinPaie")
    .select("id,salaireBrut,salaireNet,heuresTravaillees,AgentSecurite(prenom,nom)")
    .eq("periode", periode);
  if (error) throw error;
  return (data as unknown as DbBulletin[]).map(mapPayslip);
}

export interface GeneratePaieResult {
  created: number;
  skipped: number;
}

/**
 * Génère les bulletins de la période pour tous les agents actifs qui n'en ont
 * pas encore (idempotent). Brut = salaire de l'agent ; net = brut − IPRES − CSS
 * − IR. RLS bulletin_insert : DG/RF/RH.
 */
export async function generatePaie(
  periode: string,
): Promise<GeneratePaieResult> {
  const supabase = createClient();

  const { data: agents, error: aErr } = await supabase
    .from("AgentSecurite")
    .select("id,salaire")
    .eq("statut", "actif");
  if (aErr) throw aErr;

  const { data: existing, error: eErr } = await supabase
    .from("BulletinPaie")
    .select("agentId")
    .eq("periode", periode);
  if (eErr) throw eErr;

  const done = new Set(
    (existing as unknown as { agentId: string }[] | null)?.map(
      (b) => b.agentId,
    ) ?? [],
  );
  const list = (agents as unknown as { id: string; salaire: number | null }[]) ?? [];
  const toCreate = list.filter((a) => !done.has(a.id));

  if (toCreate.length === 0) {
    return { created: 0, skipped: list.length };
  }

  const rows = toCreate.map((a) => {
    const brut = num(a.salaire ?? 0);
    const ipres = Math.round(brut * TAUX_IPRES);
    const css = Math.round(brut * TAUX_CSS);
    const ir = Math.round(brut * TAUX_IR);
    const cotisations = ipres + css;
    const net = brut - ipres - css - ir;
    return {
      periode,
      agentId: a.id,
      salaireBrut: brut,
      salaireNet: net,
      cotisationsSociales: cotisations,
      heuresTravaillees: 173, // base légale mensuelle
    };
  });

  const { error } = await supabase
    .from("BulletinPaie")
    .insert(rows as never);
  if (error) throw error;

  return { created: toCreate.length, skipped: done.size };
}
