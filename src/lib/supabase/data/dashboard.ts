/**
 * Tableau de bord DG — agrégation multi-domaines (RLS : le DG a accès à tout).
 * Chaque compteur est calculé côté client sur les données visibles.
 */
import { createClient } from "@/lib/supabase/client";

export interface DashboardKpis {
  caMois: number;
  tauxRecouvrement: number;
  masseSalariale: number;
  facturesRetard: number;
  agentsService: number;
  contratsExpirant: number;
  ticketsOuverts: number;
  tachesRetard: number;
  stockSousSeuil: number;
  caBoutique: number;
  scoreSanteCrm: number;
}

const num = (v: unknown): number => Number(v) || 0;

export async function fetchDashboardKpis(): Promise<DashboardKpis> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [fac, bul, ag, ctr, tik, tac, mat, tck, cli] = await Promise.all([
    supabase.from("Facture").select("montantTTC,statut"),
    supabase.from("BulletinPaie").select("salaireNet").eq("periode", "2026-06"),
    supabase.from("AgentSecurite").select("statut"),
    supabase.from("Contrat").select("dateFin"),
    supabase.from("Ticket").select("stage,criticite"),
    supabase.from("Tache").select("terminee,echeance"),
    supabase.from("Materiel").select("quantite"),
    supabase.from("TicketCaisse").select("total,dateHeure"),
    supabase.from("Client").select("scoreSante"),
  ]);

  const factures = (fac.data ?? []) as { montantTTC: number | string; statut: string }[];
  const paye = factures.filter((f) => f.statut === "PAYEE").reduce((s, f) => s + num(f.montantTTC), 0);
  const envoye = factures.filter((f) => f.statut === "ENVOYEE").reduce((s, f) => s + num(f.montantTTC), 0);
  const retard = factures.filter((f) => f.statut === "EN_RETARD");
  const retardMt = retard.reduce((s, f) => s + num(f.montantTTC), 0);
  const denom = paye + envoye + retardMt;

  const contrats = (ctr.data ?? []) as { dateFin: string | null }[];
  const in30 = contrats.filter((c) => {
    if (!c.dateFin) return false;
    const d = (new Date(c.dateFin).getTime() - Date.now()) / 86_400_000;
    return d >= 0 && d < 30;
  }).length;

  const clients = (cli.data ?? []) as { scoreSante: number }[];
  const scoreCrm = clients.length
    ? Math.round(clients.reduce((s, c) => s + num(c.scoreSante), 0) / clients.length)
    : 0;

  return {
    caMois: paye,
    tauxRecouvrement: denom ? Math.round((paye / denom) * 100) : 0,
    masseSalariale: (bul.data ?? []).reduce((s, b) => s + num((b as { salaireNet: unknown }).salaireNet), 0),
    facturesRetard: retardMt,
    agentsService: ((ag.data ?? []) as { statut: string }[]).filter((a) => a.statut === "actif").length,
    contratsExpirant: in30,
    ticketsOuverts: ((tik.data ?? []) as { stage: string }[]).filter((t) => t.stage !== "resolu").length,
    tachesRetard: ((tac.data ?? []) as { terminee: boolean; echeance: string | null }[]).filter(
      (t) => !t.terminee && t.echeance && t.echeance < today,
    ).length,
    stockSousSeuil: ((mat.data ?? []) as { quantite: number }[]).filter((m) => m.quantite <= 5).length,
    caBoutique: ((tck.data ?? []) as { total: number }[]).reduce((s, t) => s + num(t.total), 0),
    scoreSanteCrm: scoreCrm,
  };
}
