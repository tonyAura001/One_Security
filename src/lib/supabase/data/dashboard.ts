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
  facturesRetardCount: number;
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
    supabase.from("Vente").select("total,dateHeure"),
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
    facturesRetardCount: retard.length,
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

// ── Analytique (J3.2) ────────────────────────────────────────────────────

export interface SalesPoint {
  day: string; // JJ/MM
  total: number;
}
/** Chiffre d'affaires boutique par jour sur les N derniers jours (défaut 14). */
export async function fetchSalesDaily(days = 14): Promise<SalesPoint[]> {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("Vente")
    .select("total,dateHeure")
    .gte("dateHeure", since.toISOString());
  if (error) throw error;
  const rows = (data ?? []) as { total: number | string; dateHeure: string }[];

  // Squelette de N jours à 0, puis addition.
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of rows) {
    const key = new Date(r.dateHeure).toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + num(r.total));
  }
  return [...buckets.entries()].map(([iso, total]) => {
    const [, m, dd] = iso.split("-");
    return { day: `${dd}/${m}`, total };
  });
}

export interface StatutCount {
  statut: string;
  count: number;
}
/** Répartition des projets (déploiements) par statut. */
export async function fetchProjetsByStatut(): Promise<StatutCount[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("Projet").select("statut");
  if (error) throw error;
  const rows = (data ?? []) as { statut: string }[];
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.statut, (counts.get(r.statut) ?? 0) + 1);
  return [...counts.entries()].map(([statut, count]) => ({ statut, count }));
}

// ── Chiffre d'affaires mensuel (6 derniers mois) ──────────────────────────

export interface CaMonthlyPoint {
  month: string; // libellé court « Juil. »
  total: number; // CA encaissé (factures payées) du mois
}
/**
 * Chiffre d'affaires encaissé par mois sur les N derniers mois (défaut 6).
 * Basé sur les factures PAYÉE, agrégées par mois d'émission (RLS finance).
 */
export async function fetchCaMonthly(months = 6): Promise<CaMonthlyPoint[]> {
  const supabase = createClient();
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const { data, error } = await supabase
    .from("Facture")
    .select("montantTTC,statut,dateEmission")
    .gte("dateEmission", since.toISOString().slice(0, 10));
  if (error) throw error;
  const rows = (data ?? []) as {
    montantTTC: number | string;
    statut: string;
    dateEmission: string;
  }[];

  const fmt = new Intl.DateTimeFormat("fr-FR", { month: "short" });
  const buckets: { key: string; label: string; total: number }[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    const label = fmt.format(d).replace(/\.$/, "");
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      total: 0,
    });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const r of rows) {
    if (r.statut !== "PAYEE") continue;
    const key = r.dateEmission.slice(0, 7);
    const b = byKey.get(key);
    if (b) b.total += num(r.montantTTC);
  }
  return buckets.map((b) => ({ month: b.label, total: b.total }));
}

// ── Répartition des factures par statut ───────────────────────────────────

export interface FactureStatutPoint {
  statut: string;
  label: string;
  count: number;
  montant: number;
}

const FACTURE_STATUT_LABELS: Record<string, string> = {
  PAYEE: "Payées",
  ENVOYEE: "Envoyées",
  EMISE: "Émises",
  EN_RETARD: "En retard",
  LITIGE: "En litige",
  ANNULEE: "Annulées",
};

/** Nombre et montant de factures groupés par statut (RLS finance). */
export async function fetchFacturesByStatut(): Promise<FactureStatutPoint[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("Facture")
    .select("montantTTC,statut");
  if (error) throw error;
  const rows = (data ?? []) as { montantTTC: number | string; statut: string }[];
  const map = new Map<string, { count: number; montant: number }>();
  for (const r of rows) {
    const cur = map.get(r.statut) ?? { count: 0, montant: 0 };
    cur.count += 1;
    cur.montant += num(r.montantTTC);
    map.set(r.statut, cur);
  }
  return [...map.entries()]
    .map(([statut, v]) => ({
      statut,
      label: FACTURE_STATUT_LABELS[statut] ?? statut,
      count: v.count,
      montant: v.montant,
    }))
    .sort((a, b) => b.count - a.count);
}
