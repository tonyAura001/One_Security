"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CalendarClock,
  CheckSquare,
  ClipboardCheck,
  DollarSign,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  CHART_COLORS,
  ChartCard,
  ChartTooltip,
} from "@/components/ui/chart-card";
import type { Tone } from "@/lib/colors";
import { toneBar } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { formatDateFR, formatFCFA, formatFCFACompact } from "@/lib/format";
import { useSession } from "@/lib/store/session";
import {
  fetchDashboardKpis,
  fetchCaMonthly,
  fetchFacturesByStatut,
  type FactureStatutPoint,
} from "@/lib/supabase/data/dashboard";
import { fetchParametres, mergeIdentity } from "@/lib/supabase/data/parametres";

/** Carte KPI façon tableau de bord : libellé en haut, icône à droite, valeur. */
function MetricCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone: Tone;
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-muted text-[11px] font-bold tracking-[0.5px] uppercase">
          {label}
        </span>
        <IconTile icon={icon} tone={tone} size={30} />
      </div>
      <div className="text-foreground tnum text-[25px] leading-none font-extrabold tracking-[-0.6px]">
        {value}
      </div>
      {hint && (
        <div className="text-muted text-[12px] font-semibold">{hint}</div>
      )}
    </Card>
  );
}

/** Ton de la barre selon le statut d'une facture. */
function statutTone(statut: string): Tone {
  switch (statut) {
    case "PAYEE":
      return "success";
    case "EN_RETARD":
      return "danger";
    case "LITIGE":
      return "warning";
    case "ANNULEE":
      return "muted";
    default:
      return "accent";
  }
}

/** Accès rapides — libellé, écran cible et couleur de l'accent. */
const QUICK_ACCESS: { label: string; screen: string; tone: Tone }[] = [
  { label: "Créer une facture", screen: "finance", tone: "foreground" },
  { label: "Voir le planning", screen: "planning", tone: "accent" },
  { label: "Valider la paie", screen: "paie", tone: "warning" },
  { label: "Tickets maintenance", screen: "tickets", tone: "danger" },
  { label: "Pipeline CRM", screen: "crm", tone: "violet" },
  { label: "Mes tâches", screen: "mestaches", tone: "success" },
  { label: "Rapports", screen: "rapports", tone: "foreground" },
  { label: "Paramètres PME", screen: "parametres", tone: "foreground" },
];

export function DgDashboard() {
  const { user, config } = useSession();

  // KPIs réels agrégés multi-domaines (RLS).
  const { data: k } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: fetchDashboardKpis,
  });

  // Identité de l'entreprise (raison sociale éditable par le DG).
  const paramsQ = useQuery({ queryKey: ["parametres"], queryFn: fetchParametres });
  const company = useMemo(
    () => mergeIdentity(paramsQ.data ?? {}).name,
    [paramsQ.data],
  );

  // Chiffre d'affaires mensuel + répartition des factures par statut.
  const caQ = useQuery({ queryKey: ["ca-monthly"], queryFn: () => fetchCaMonthly(6) });
  const statutQ = useQuery({
    queryKey: ["factures-statut"],
    queryFn: fetchFacturesByStatut,
  });
  const caSeries = caQ.data ?? [];
  const statuts = statutQ.data ?? [];
  const statutTotal = statuts.reduce((s, r) => s + r.count, 0);

  const today = formatDateFR(new Date(), "EEEE d MMMM yyyy");
  const initials =
    config.fonction
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "DG";

  const dash = "—";
  const financial = [
    {
      label: "CA du mois",
      value: k ? formatFCFA(k.caMois) : dash,
      hint: "Factures payées",
      icon: DollarSign,
      tone: "success" as Tone,
    },
    {
      label: "Factures en retard",
      value: k ? String(k.facturesRetardCount) : dash,
      hint: k ? formatFCFA(k.facturesRetard) : undefined,
      icon: AlertTriangle,
      tone: "danger" as Tone,
    },
    {
      label: "Agents en service",
      value: k ? String(k.agentsService) : dash,
      hint: "Aujourd'hui",
      icon: Users,
      tone: "accent" as Tone,
    },
    {
      label: "Masse salariale",
      value: k ? formatFCFA(k.masseSalariale) : dash,
      hint: "Paie en cours",
      icon: Wallet,
      tone: "warning" as Tone,
    },
    {
      label: "Taux recouvrement",
      value: k ? `${k.tauxRecouvrement}%` : dash,
      icon: TrendingUp,
      tone: "success" as Tone,
    },
  ];

  const operational = [
    {
      label: "Contrats expirant",
      value: k ? String(k.contratsExpirant) : dash,
      hint: "Dans 30 jours",
      icon: CalendarClock,
      tone: "warning" as Tone,
    },
    {
      label: "Tickets ouverts",
      value: k ? String(k.ticketsOuverts) : dash,
      icon: Wrench,
      tone: "accent" as Tone,
    },
    {
      label: "Tâches en retard",
      value: k ? String(k.tachesRetard) : dash,
      icon: CheckSquare,
      tone: "danger" as Tone,
    },
    {
      label: "Score CRM moyen",
      value: k ? `${k.scoreSanteCrm}/100` : dash,
      hint: "Santé portefeuille clients",
      icon: ClipboardCheck,
      tone: "success" as Tone,
    },
  ];

  return (
    <ScreenContainer>
      {/* ── En-tête : salutation + date + entreprise ── */}
      <div className="mb-[18px]">
        <div className="text-foreground text-[20px] font-extrabold tracking-[-0.4px]">
          Bonjour, {user.name}
        </div>
        <div className="text-muted mt-[3px] text-[12.5px] font-semibold">
          {today}
          {company ? ` — ${company}` : ""}
        </div>
      </div>

      {/* ── Bandeau rôle (accès 360°) ── */}
      <Card className="bg-accent/[0.04] mb-[18px] flex items-center gap-3 p-4">
        <span className="bg-accent/12 text-accent flex size-11 flex-none items-center justify-center rounded-[12px] text-[13px] font-extrabold tracking-[0.5px]">
          {initials}
        </span>
        <div>
          <div className="text-foreground text-[14px] font-extrabold">
            {config.fonction}
          </div>
          <div className="text-muted mt-0.5 text-[12.5px] font-semibold">
            Accès 360° à tous les modules de votre entreprise
          </div>
        </div>
      </Card>

      {/* ── KPI — première rangée (santé financière) ── */}
      <div className="grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-5">
        {financial.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* ── KPI — seconde rangée (opérationnel) ── */}
      <div className="mt-[15px] grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        {operational.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* ── Graphiques : CA 6 mois + factures par statut ── */}
      <div className="mt-[18px] grid grid-cols-1 gap-[15px] lg:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title="Chiffre d'affaires — 6 derniers mois"
          height={240}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={caSeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: CHART_COLORS.axis, fontSize: 12, fontWeight: 700 }}
                dy={6}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={28}
                tick={{ fill: CHART_COLORS.axis, fontSize: 11, fontWeight: 700 }}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                }
              />
              <Tooltip
                cursor={{ fill: CHART_COLORS.grid, opacity: 0.4 }}
                content={<ChartTooltip valueFormat={formatFCFACompact} />}
              />
              <Bar
                dataKey="total"
                name="CA"
                fill={CHART_COLORS.accent}
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Factures par statut" height={240}>
          {statutTotal > 0 ? (
            <div className="flex h-full flex-col justify-center gap-3.5">
              {statuts.map((r: FactureStatutPoint) => {
                const pct = Math.round((r.count / statutTotal) * 100);
                return (
                  <div key={r.statut}>
                    <div className="mb-1 flex items-center justify-between text-[12px] font-bold">
                      <span className="text-foreground">{r.label}</span>
                      <span className="text-muted tnum">
                        {r.count} · {pct}%
                      </span>
                    </div>
                    <ProgressBar
                      value={pct}
                      tone={statutTone(r.statut)}
                      height={6}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-muted flex h-full flex-col items-center justify-center gap-1 text-center">
              <div className="text-[13px] font-bold">Aucune facture</div>
              <div className="text-[12px] font-medium">
                Les factures émises apparaîtront ici par statut.
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Accès rapides ── */}
      <div className="text-muted mt-[22px] mb-3 text-[11px] font-bold tracking-[0.7px]">
        ACCÈS RAPIDES
      </div>
      <div className="grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACCESS.map((q) => (
          <Link
            key={q.label}
            href={`/${q.screen}`}
            className="border-surface-border bg-surface shadow-card hover:border-accent relative flex items-center overflow-hidden rounded-xl border px-4 py-[15px] transition-colors"
          >
            <span
              className={cn(
                "absolute top-0 left-0 h-full w-[3px]",
                toneBar[q.tone],
              )}
            />
            <span className="text-foreground text-[13px] font-bold">
              {q.label}
            </span>
          </Link>
        ))}
      </div>
    </ScreenContainer>
  );
}
