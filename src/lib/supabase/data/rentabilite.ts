/**
 * Rentabilité par site, dérivée des données réelles :
 *   revenu mensuel  = contrats du site (normalisés au mois),
 *   masse salariale = salaires des agents affectés (via vacations),
 *   frais opé.      = non tracés en base (0, honnête).
 * RLS des tables sources : le résultat ne couvre que ce que le rôle peut lire.
 */
import { createClient } from "@/lib/supabase/client";
import {
  computeSiteProfitability,
  type SiteProfitability,
} from "@/lib/api/profitability";

const num = (v: unknown) => Number(v) || 0;

/** Facteur de conversion d'un contrat vers un montant mensuel. */
const MENSUALISE: Record<string, number> = {
  MENSUELLE: 1,
  TRIMESTRIELLE: 1 / 3,
  SEMESTRIELLE: 1 / 6,
  ANNUELLE: 1 / 12,
  PONCTUELLE: 1,
};

interface DbContrat {
  siteId: string | null;
  montantHT: number | string | null;
  frequenceFacturation: string | null;
  Site: { nom: string } | { nom: string }[] | null;
}
function one<T>(v: T | T[] | null): T | undefined {
  return Array.isArray(v) ? v[0] : (v ?? undefined);
}

export async function fetchRentabilite(): Promise<SiteProfitability[]> {
  const supabase = createClient();
  const [ctr, vac, ag] = await Promise.all([
    supabase.from("Contrat").select("siteId,montantHT,frequenceFacturation,Site(nom)"),
    supabase.from("Vacation").select("agentId,siteId").not("siteId", "is", null),
    supabase.from("AgentSecurite").select("id,salaire"),
  ]);

  const salaire = new Map<string, number>();
  for (const a of (ag.data as { id: string; salaire: number | null }[] | null) ?? []) {
    salaire.set(a.id, num(a.salaire));
  }

  // Agents distincts par site (via vacations) → masse salariale mensuelle.
  const agentsBySite = new Map<string, Set<string>>();
  for (const v of (vac.data as { agentId: string | null; siteId: string | null }[] | null) ?? []) {
    if (!v.siteId || !v.agentId) continue;
    const set = agentsBySite.get(v.siteId) ?? new Set<string>();
    set.add(v.agentId);
    agentsBySite.set(v.siteId, set);
  }

  const sites = new Map<string, { nom: string; revenu: number }>();
  for (const c of (ctr.data as unknown as DbContrat[]) ?? []) {
    if (!c.siteId) continue;
    const factor = MENSUALISE[c.frequenceFacturation ?? "MENSUELLE"] ?? 1;
    const cur = sites.get(c.siteId) ?? { nom: one(c.Site)?.nom ?? "Site", revenu: 0 };
    cur.revenu += Math.round(num(c.montantHT) * factor);
    sites.set(c.siteId, cur);
  }
  // Sites qui ont des agents mais pas de contrat lisible → inclure aussi.
  for (const [siteId] of agentsBySite) {
    if (!sites.has(siteId)) sites.set(siteId, { nom: "Site", revenu: 0 });
  }

  return [...sites.entries()].map(([siteId, s]) => {
    const agents = agentsBySite.get(siteId) ?? new Set<string>();
    let masse = 0;
    for (const aid of agents) masse += salaire.get(aid) ?? 0;
    return computeSiteProfitability({
      siteId,
      siteName: s.nom,
      revenuMensuel: s.revenu,
      masseSalariale: masse,
      fraisOperationnels: 0,
      tendancePct: 0,
    });
  });
}
