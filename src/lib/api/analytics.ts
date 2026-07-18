export interface MonthPoint {
  month: string;
  ca: number;
  masse: number;
  incidents: number;
}

/** Séries mensuelles 2026 (CA, masse salariale, incidents). */
export const MONTHLY: MonthPoint[] = [
  { month: "Jan", ca: 9_800_000, masse: 8_100_000, incidents: 12 },
  { month: "Fév", ca: 10_200_000, masse: 8_250_000, incidents: 9 },
  { month: "Mar", ca: 11_100_000, masse: 8_400_000, incidents: 14 },
  { month: "Avr", ca: 10_500_000, masse: 8_550_000, incidents: 8 },
  { month: "Mai", ca: 11_800_000, masse: 8_700_000, incidents: 11 },
  { month: "Juin", ca: 12_450_000, masse: 8_920_000, incidents: 7 },
];

export interface SitePoint {
  site: string;
  contrats: number;
  couverture: number; // %
}

/** Répartition des contrats et taux de couverture par site. */
export const BY_SITE: SitePoint[] = [
  { site: "Port Autonome", contrats: 8, couverture: 96 },
  { site: "Aéroport AIBD", contrats: 6, couverture: 88 },
  { site: "Ambassades", contrats: 5, couverture: 100 },
  { site: "Banques", contrats: 4, couverture: 92 },
  { site: "Résidences", contrats: 7, couverture: 85 },
  { site: "Commerces", contrats: 3, couverture: 90 },
];

export type AnalyticsPeriod = "mois" | "trimestre" | "annee";

/** Découpe les séries mensuelles selon la période choisie. */
export function sliceByPeriod(period: AnalyticsPeriod): MonthPoint[] {
  if (period === "mois") return MONTHLY.slice(-1);
  if (period === "trimestre") return MONTHLY.slice(-3);
  return MONTHLY;
}
