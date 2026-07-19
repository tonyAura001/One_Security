import {
  AlertTriangle,
  CheckSquare,
  Database,
  FileClock,
  ShieldCheck,
  Target,
  TrendingUp,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/lib/colors";
import type { PillVariant } from "@/components/ui/status-pill";

export interface DashboardKpi {
  icon: LucideIcon;
  tone: Tone;
  value: string;
  unit?: string;
  label: string;
  hint?: string;
  hintTone?: Tone;
  trend?: { value: string; direction: "up" | "down" };
  badge?: { label: string; variant: PillVariant };
  progress?: { value: number; tone: Tone };
  valueTone?: Tone;
  dot?: boolean;
}

/**
 * Bandeau FINANCIER — structure des cartes (icône, ton, unité, libellé).
 * Les VALEURS sont injectées au rendu depuis les agrégats réels
 * (`fetchDashboardKpis`) ; aucune donnée de démonstration ici.
 */
export const FINANCIAL_KPIS: DashboardKpi[] = [
  { icon: TrendingUp, tone: "success", value: "—", unit: "FCFA", label: "CA du mois" },
  { icon: Target, tone: "warning", value: "—", unit: "%", label: "Taux de recouvrement" },
  { icon: Database, tone: "violet", value: "—", unit: "FCFA", label: "Masse salariale du mois" },
  { icon: AlertTriangle, tone: "danger", value: "—", unit: "FCFA", label: "Factures en retard" },
];

/**
 * Bandeau OPÉRATIONNEL — 8 indicateurs secondaires (structure uniquement).
 * Les valeurs viennent des agrégats réels au rendu.
 */
export const OPERATIONAL_KPIS: DashboardKpi[] = [
  { icon: ShieldCheck, tone: "warning", value: "—", label: "Agents en service" },
  { icon: FileClock, tone: "warning", value: "—", label: "Contrats expirant < 30 j" },
  { icon: Wrench, tone: "danger", value: "—", label: "Tickets maintenance ouverts" },
  { icon: CheckSquare, tone: "accent", value: "—", label: "Tâches en retard" },
];
