/**
 * Bulletins de paie via Supabase (RLS bulletins_read_paie : DG/RF/COMPTABLE/RH).
 * Bulletin décomposé (salaire de base + heures sup + primes) → recalcul des
 * cotisations sénégalaises (IPRES/CSS/IR) et du net. Édition d'un bulletin et
 * configuration des salaires (individuel + en lot) sur AgentSecurite.
 * Colonnes récentes hors types générés → client non typé.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Payslip } from "@/lib/api/types";

function loose(): SupabaseClient {
  return createClient() as unknown as SupabaseClient;
}
const num = (v: unknown): number => Number(v) || 0;
function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}

// Taux sénégalais (approximation) : cotisations salariales + patronales + IR.
const TAUX = { ipres: 0.056, css: 0.036, ir: 0.05, ipresPat: 0.084, cssPat: 0.07 };

export interface BulletinComponents {
  base: number;
  heuresSup: number;
  primeAnciennete: number;
  autresPrimes: number;
}

/** Recalcule brut, cotisations, IR et net à partir de la décomposition. */
export function computeBulletin(c: BulletinComponents) {
  const brut = c.base + c.heuresSup + c.primeAnciennete + c.autresPrimes;
  const ipres = Math.round(brut * TAUX.ipres);
  const css = Math.round(brut * TAUX.css);
  const ir = Math.round(brut * TAUX.ir);
  return {
    brut,
    ipres,
    css,
    ir,
    net: brut - ipres - css - ir,
    ipresPatronal: Math.round(brut * TAUX.ipresPat),
    cssPatronal: Math.round(brut * TAUX.cssPat),
  };
}

interface DbBulletin {
  id: string;
  agentId: string;
  salaireBase: number | string | null;
  heuresSup: number | string | null;
  primeAnciennete: number | string | null;
  autresPrimes: number | string | null;
  salaireBrut: number | string | null;
  heuresTravaillees: number | string | null;
  AgentSecurite: { prenom: string; nom: string | null } | { prenom: string; nom: string | null }[] | null;
}

function mapPayslip(b: DbBulletin): Payslip {
  const a = one(b.AgentSecurite);
  const base = num(b.salaireBase) || num(b.salaireBrut); // héritage : base = brut
  const comp: BulletinComponents = {
    base,
    heuresSup: num(b.heuresSup),
    primeAnciennete: num(b.primeAnciennete),
    autresPrimes: num(b.autresPrimes),
  };
  const c = computeBulletin(comp);
  return {
    id: b.id,
    agentId: b.agentId,
    agent: a ? `${a.prenom} ${a.nom ?? ""}`.trim() : "—",
    role: "Agent de sécurité",
    gross: c.brut,
    ipres: c.ipres,
    css: c.css,
    ir: c.ir,
    net: c.net,
    days: Math.round(num(b.heuresTravaillees) / 8),
    base: comp.base,
    heuresSup: comp.heuresSup,
    primeAnciennete: comp.primeAnciennete,
    autresPrimes: comp.autresPrimes,
    ipresPatronal: c.ipresPatronal,
    cssPatronal: c.cssPatronal,
  };
}

/** Bulletins de la période. */
export async function fetchPayslips(periode = "2026-07"): Promise<Payslip[]> {
  const sb = loose();
  const { data, error } = await sb
    .from("BulletinPaie")
    .select("id,agentId,salaireBase,heuresSup,primeAnciennete,autresPrimes,salaireBrut,heuresTravaillees,AgentSecurite(prenom,nom)")
    .eq("periode", periode);
  if (error) throw error;
  return ((data as DbBulletin[]) ?? []).map(mapPayslip).sort((x, y) => x.agent.localeCompare(y.agent));
}

/** Met à jour la décomposition d'un bulletin (recalcul brut/net). RLS DG/RF/RH. */
export async function updateBulletin(id: string, c: BulletinComponents): Promise<void> {
  const sb = loose();
  const r = computeBulletin(c);
  const { error } = await sb
    .from("BulletinPaie")
    .update({
      salaireBase: c.base,
      heuresSup: c.heuresSup,
      primeAnciennete: c.primeAnciennete,
      autresPrimes: c.autresPrimes,
      salaireBrut: r.brut,
      salaireNet: r.net,
      cotisationsSociales: r.ipres + r.css,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export interface GeneratePaieResult {
  created: number;
  skipped: number;
}

/** Génère les bulletins manquants de la période (idempotent). RLS DG/RF/RH. */
export async function generatePaie(periode: string): Promise<GeneratePaieResult> {
  const sb = loose();
  const { data: agents, error: aErr } = await sb.from("AgentSecurite").select("id,salaire").eq("statut", "actif");
  if (aErr) throw aErr;
  const { data: existing, error: eErr } = await sb.from("BulletinPaie").select("agentId").eq("periode", periode);
  if (eErr) throw eErr;

  const done = new Set(((existing as { agentId: string }[]) ?? []).map((b) => b.agentId));
  const list = (agents as { id: string; salaire: number | null }[]) ?? [];
  const toCreate = list.filter((a) => !done.has(a.id));
  if (toCreate.length === 0) return { created: 0, skipped: list.length };

  const rows = toCreate.map((a) => {
    const base = num(a.salaire);
    const r = computeBulletin({ base, heuresSup: 0, primeAnciennete: 0, autresPrimes: 0 });
    return {
      periode,
      agentId: a.id,
      salaireBase: base,
      heuresSup: 0,
      primeAnciennete: 0,
      autresPrimes: 0,
      salaireBrut: r.brut,
      salaireNet: r.net,
      cotisationsSociales: r.ipres + r.css,
      heuresTravaillees: 173,
    };
  });
  const { error } = await sb.from("BulletinPaie").insert(rows);
  if (error) throw error;
  return { created: toCreate.length, skipped: done.size };
}

// ── Configuration des salaires (AgentSecurite.salaire) ──────────────────────

export interface AgentSalaire {
  id: string;
  name: string;
  poste: string;
  salaire: number;
}

/** Liste des agents actifs avec leur salaire de base. */
export async function fetchAgentsSalaire(): Promise<AgentSalaire[]> {
  const sb = loose();
  const { data, error } = await sb
    .from("AgentSecurite")
    .select("id,prenom,nom,poste,salaire,statut")
    .order("prenom");
  if (error) throw error;
  return ((data as { id: string; prenom: string; nom: string | null; poste: string | null; salaire: number | null; statut: string }[]) ?? [])
    .filter((a) => a.statut === "actif")
    .map((a) => ({ id: a.id, name: `${a.prenom} ${a.nom ?? ""}`.trim() || "—", poste: a.poste ?? "—", salaire: num(a.salaire) }));
}

/** Met à jour le salaire de base d'un agent. RLS DG/RP/RH/MANAGER. */
export async function updateAgentSalaire(id: string, salaire: number): Promise<void> {
  const sb = loose();
  const { error } = await sb.from("AgentSecurite").update({ salaire: Math.max(0, Math.round(salaire)) }).eq("id", id);
  if (error) throw error;
}

/** Applique en lot un salaire fixe OU un ajustement en % à plusieurs agents. */
export async function bulkUpdateSalaire(
  agents: { id: string; salaire: number }[],
  op: { mode: "set"; value: number } | { mode: "percent"; value: number },
): Promise<void> {
  for (const a of agents) {
    const next = op.mode === "set" ? op.value : Math.round(a.salaire * (1 + op.value / 100));
    await updateAgentSalaire(a.id, next);
  }
}
