import type { RoleId } from "@/lib/rbac";

/** Données brutes d'un site gardé (entrées du calcul de rentabilité). */
export interface SiteProfitabilityInput {
  siteId: string;
  siteName: string;
  /** Revenu mensuel facturé au client (FCFA). */
  revenuMensuel: number;
  /** Salaires + charges des agents affectés (FCFA). */
  masseSalariale: number;
  /** Équipement, transport, maintenance, divers (FCFA). */
  fraisOperationnels: number;
  /** Variation de la marge nette vs mois précédent (%). */
  tendancePct: number;
}

/** Site gardé avec marge nette et marge % dérivées. */
export interface SiteProfitability extends SiteProfitabilityInput {
  /** Revenu − (masse salariale + frais opérationnels). */
  margeNette: number;
  /** Marge nette / revenu × 100. */
  margePct: number;
}

/** Applique la formule de marge nette à un site (source de vérité du calcul). */
export function computeSiteProfitability(
  s: SiteProfitabilityInput,
): SiteProfitability {
  const margeNette =
    s.revenuMensuel - (s.masseSalariale + s.fraisOperationnels);
  const margePct =
    s.revenuMensuel > 0 ? (margeNette / s.revenuMensuel) * 100 : 0;
  return { ...s, margeNette, margePct };
}

/** Totaux consolidés (tous sites). */
export interface ProfitabilityTotals {
  revenuMensuel: number;
  masseSalariale: number;
  fraisOperationnels: number;
  margeNette: number;
  margePct: number;
  nbSites: number;
}

export function consolidate(list: SiteProfitability[]): ProfitabilityTotals {
  const t = list.reduce(
    (acc, s) => ({
      revenuMensuel: acc.revenuMensuel + s.revenuMensuel,
      masseSalariale: acc.masseSalariale + s.masseSalariale,
      fraisOperationnels: acc.fraisOperationnels + s.fraisOperationnels,
      margeNette: acc.margeNette + s.margeNette,
    }),
    {
      revenuMensuel: 0,
      masseSalariale: 0,
      fraisOperationnels: 0,
      margeNette: 0,
    },
  );
  return {
    ...t,
    margePct: t.revenuMensuel > 0 ? (t.margeNette / t.revenuMensuel) * 100 : 0,
    nbSites: list.length,
  };
}

/** Sites gardés — fixtures réalistes (Dakar, FCFA/mois). */
const SITES: SiteProfitabilityInput[] = [
  {
    siteId: "s-pad",
    siteName: "Port Autonome de Dakar",
    revenuMensuel: 4_200_000,
    masseSalariale: 2_400_000,
    fraisOperationnels: 480_000,
    tendancePct: 6.2,
  },
  {
    siteId: "s-aibd",
    siteName: "Aéroport AIBD",
    revenuMensuel: 3_600_000,
    masseSalariale: 2_100_000,
    fraisOperationnels: 520_000,
    tendancePct: 3.1,
  },
  {
    siteId: "s-amb",
    siteName: "Ambassade de France",
    revenuMensuel: 2_800_000,
    masseSalariale: 1_650_000,
    fraisOperationnels: 310_000,
    tendancePct: -2.4,
  },
  {
    siteId: "s-sonatel",
    siteName: "Siège Sonatel",
    revenuMensuel: 2_100_000,
    masseSalariale: 1_350_000,
    fraisOperationnels: 240_000,
    tendancePct: 1.8,
  },
  {
    siteId: "s-cbao",
    siteName: "CBAO Plateau",
    revenuMensuel: 1_850_000,
    masseSalariale: 1_120_000,
    fraisOperationnels: 205_000,
    tendancePct: 4.5,
  },
  {
    siteId: "s-almadies",
    siteName: "Résidence Almadies",
    revenuMensuel: 1_500_000,
    masseSalariale: 980_000,
    fraisOperationnels: 190_000,
    tendancePct: -1.1,
  },
];

/**
 * Rentabilité par site — accès DG + Comptable (gating au niveau de l'écran).
 * Backend-ready : remplaçable par un vrai appel sans toucher au composant.
 */
export function getSiteProfitability(_role: RoleId): SiteProfitability[] {
  return SITES.map(computeSiteProfitability);
}
