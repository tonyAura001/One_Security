"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { CHART_COLORS, ChartCard, ChartTooltip } from "@/components/ui/chart-card";
import { StatusPill } from "@/components/ui/status-pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  fetchDashboardKpis,
  fetchSalesDaily,
  fetchProjetsByStatut,
} from "@/lib/supabase/data/dashboard";
import { fetchAccounts, fetchMovements, computeBalanceSeries } from "@/lib/supabase/data/treasury";
import { STATUT_META } from "@/components/screens/projets/statut-meta";
import type { ProjectStatut } from "@/lib/supabase/data/projets";
import { formatFCFACompact } from "@/lib/format";

export function AnalyticsScreen() {
  const { data: k } = useQuery({ queryKey: ["dashboard-kpis"], queryFn: fetchDashboardKpis });
  const { data: sales = [] } = useQuery({ queryKey: ["sales-daily"], queryFn: () => fetchSalesDaily(14) });
  const { data: projStats = [] } = useQuery({ queryKey: ["projets-statut"], queryFn: fetchProjetsByStatut });
  const accQ = useQuery({ queryKey: ["treasury-accounts"], queryFn: fetchAccounts });
  const movQ = useQuery({ queryKey: ["treasury-movements"], queryFn: fetchMovements });
  const series = useMemo(() => computeBalanceSeries(accQ.data ?? [], movQ.data ?? []), [accQ.data, movQ.data]);

  const projTotal = projStats.reduce((s, p) => s + p.count, 0);
  const hasSales = sales.some((s) => s.total > 0);
  const fmt = (n: number) => n.toLocaleString("fr-FR");

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Analyse de la performance — One Security</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="CA encaissé (mois)" value={`${formatFCFACompact(k?.caMois ?? 0)}`} />
        <Kpi label="Taux de recouvrement" value={`${k?.tauxRecouvrement ?? 0}%`} />
        <Kpi label="Agents en service" value={String(k?.agentsService ?? 0)} />
        <Kpi label="Tickets ouverts" value={String(k?.ticketsOuverts ?? 0)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-[15px] lg:grid-cols-2">
        <ChartCard title="Évolution de la trésorerie" subtitle="Solde cumulé par mois" height={220}>
          {series.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="anaTreso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.36} />
                    <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.axis, fontSize: 12, fontWeight: 700 }} dy={6} />
                <Tooltip content={<ChartTooltip valueFormat={formatFCFACompact} />} />
                <Area type="monotone" dataKey="solde" name="Solde" stroke={CHART_COLORS.accent} strokeWidth={2.8} fill="url(#anaTreso)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </ChartCard>

        <ChartCard title="Chiffre d'affaires boutique" subtitle="14 derniers jours" height={220}>
          {hasSales ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sales} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.axis, fontSize: 11, fontWeight: 700 }} interval={1} dy={6} />
                <Tooltip cursor={{ fill: CHART_COLORS.grid, opacity: 0.4 }} content={<ChartTooltip valueFormat={formatFCFACompact} />} />
                <Bar dataKey="total" name="CA" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </ChartCard>

        <ChartCard title="Déploiements par statut" subtitle="Portefeuille projets" height={220} className="lg:col-span-2">
          {projTotal > 0 ? (
            <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projStats.map((p) => {
                const meta = STATUT_META[p.statut as ProjectStatut];
                const pct = Math.round((p.count / projTotal) * 100);
                return (
                  <div key={p.statut} className="self-center">
                    <div className="mb-1 flex items-center justify-between text-[12px] font-bold">
                      <StatusPill variant={meta?.variant ?? "neutral"}>{meta?.label ?? p.statut}</StatusPill>
                      <span className="text-muted">{p.count} · {pct}%</span>
                    </div>
                    <ProgressBar value={pct} tone="accent" height={6} />
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty />
          )}
        </ChartCard>
      </div>
      <p className="text-muted mt-3 text-[11px] font-medium">
        Indicateurs consolidés en temps réel — masse salariale {fmt(k?.masseSalariale ?? 0)} FCFA · score CRM {k?.scoreSanteCrm ?? 0}/100.
      </p>
    </ScreenContainer>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-muted text-[11px] font-semibold">{label}</p>
      <p className="text-foreground mt-1 text-xl font-extrabold tracking-[-0.5px]">{value}</p>
    </Card>
  );
}
function Empty() {
  return (
    <div className="text-muted flex h-full items-center justify-center text-[12.5px] font-semibold">
      Pas encore de données.
    </div>
  );
}
