import {
  AlertTriangle,
  Banknote,
  CheckSquare,
  Database,
  FileClock,
  HeartPulse,
  Package,
  ShieldCheck,
  ShoppingBag,
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
 * Bandeau FINANCIER — les 4 chiffres « argent » qui cadrent le graphique
 * Revenus/Dépenses juste en dessous (grande taille).
 */
export const FINANCIAL_KPIS: DashboardKpi[] = [
  {
    icon: TrendingUp,
    tone: "success",
    value: "12 450 000",
    unit: "FCFA",
    label: "CA du mois",
    hint: "vs juin · objectif 12 000 000",
    trend: { value: "8%", direction: "up" },
  },
  {
    icon: Target,
    tone: "warning",
    value: "82",
    unit: "%",
    label: "Taux de recouvrement",
    hint: "Objectif 90%",
    progress: { value: 82, tone: "warning" },
  },
  {
    icon: Database,
    tone: "violet",
    value: "8 920 000",
    unit: "FCFA",
    label: "Masse salariale du mois",
    hint: "Juin 2026 · 52 agents",
    badge: { label: "À valider", variant: "warning" },
  },
  {
    icon: AlertTriangle,
    tone: "danger",
    value: "1 875 000",
    unit: "FCFA",
    label: "Factures en retard",
    hint: "5 factures impayées",
    hintTone: "danger",
    badge: { label: "En retard", variant: "danger" },
  },
];

/**
 * Bandeau OPÉRATIONNEL — indicateurs secondaires, en cartes compactes.
 * (Les 8 KPI restants, dont CA boutique & Score CRM, pour conserver les 12.)
 */
export const OPERATIONAL_KPIS: DashboardKpi[] = [
  {
    icon: ShieldCheck,
    tone: "warning",
    value: "47",
    unit: "/52",
    label: "Agents en service",
    hint: "3 sites non couverts",
    hintTone: "warning",
  },
  {
    icon: FileClock,
    tone: "warning",
    value: "3",
    label: "Contrats expirant < 30 j",
    hint: "À renouveler",
    hintTone: "warning",
  },
  {
    icon: Wrench,
    tone: "danger",
    value: "4",
    label: "Tickets maintenance ouverts",
    hint: "Portiques & télésurveillance",
    badge: { label: "1 critique", variant: "danger" },
  },
  {
    icon: CheckSquare,
    tone: "accent",
    value: "7",
    unit: "/34",
    label: "Tâches en retard",
    hint: "Sur 34 tâches actives",
  },
  {
    icon: Package,
    tone: "warning",
    value: "2",
    label: "Stock équipement sous seuil",
    hint: "1 en rupture",
    hintTone: "warning",
  },
  {
    icon: Banknote,
    tone: "success",
    value: "Ouverte",
    valueTone: "success",
    dot: true,
    label: "Statut caisse",
    hint: "Caissière · Awa N.",
  },
  {
    icon: ShoppingBag,
    tone: "violet",
    value: "342 000",
    unit: "FCFA",
    label: "CA boutique du jour",
    hint: "56 ventes · équipements",
  },
  {
    icon: HeartPulse,
    tone: "violet",
    value: "71",
    unit: "/100",
    label: "Score santé CRM",
    hint: "Portefeuille sain",
    progress: { value: 71, tone: "violet" },
  },
];
