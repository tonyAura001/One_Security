"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { ScreenContainer } from "@/components/screens/screen-container";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  CHART_COLORS,
  ChartCard,
  ChartTooltip,
} from "@/components/ui/chart-card";
import { StatusPill } from "@/components/ui/status-pill";
import { FINANCIAL_KPIS, OPERATIONAL_KPIS } from "./dashboard-kpis";
import { fetchDashboardKpis } from "@/lib/supabase/data/dashboard";
import {
  fetchAccounts,
  fetchMovements,
  computeBalanceSeries,
} from "@/lib/supabase/data/treasury";
import { formatFCFACompact } from "@/lib/format";

export function DgDashboard() {
  // KPIs réels agrégés multi-domaines (RLS).
  const { data: k } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: fetchDashboardKpis,
  });
  const fmt = (n: number) => n.toLocaleString("fr-FR");

  // Évolution de la trésorerie (solde cumulé par mois).
  const accQ = useQuery({ queryKey: ["treasury-accounts"], queryFn: fetchAccounts });
  const movQ = useQuery({ queryKey: ["treasury-movements"], queryFn: fetchMovements });
  const series = useMemo(
    () => computeBalanceSeries(accQ.data ?? [], movQ.data ?? []),
    [accQ.data, movQ.data],
  );
  const hasTreasury = (accQ.data ?? []).length > 0;

  const financial = k
    ? FINANCIAL_KPIS.map((kpi, i) => {
        const vals = [
          fmt(k.caMois),
          String(k.tauxRecouvrement),
          fmt(k.masseSalariale),
          fmt(k.facturesRetard),
        ];
        const patched = { ...kpi, value: vals[i] ?? "—" };
        if (i === 1) patched.progress = { value: k.tauxRecouvrement, tone: "warning" };
        return patched;
      })
    : FINANCIAL_KPIS.map((kpi) => ({ ...kpi, value: "—" }));

  const operational = k
    ? OPERATIONAL_KPIS.map((kpi, i) => {
        const vals = [
          String(k.agentsService),
          String(k.contratsExpirant),
          String(k.ticketsOuverts),
          String(k.tachesRetard),
        ];
        return { ...kpi, value: vals[i] ?? "—" };
      })
    : OPERATIONAL_KPIS.map((kpi) => ({ ...kpi, value: "—" }));

  return (
    <ScreenContainer>
      {/* ── Santé financière (agrégats réels) ── */}
      <div className="text-muted mb-3.5 text-[11px] font-bold tracking-[0.7px]">
        SANTÉ FINANCIÈRE
      </div>
      <div className="grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        {financial.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* ── Évolution de la trésorerie ── */}
      <div className="mt-[18px]">
        <ChartCard
          title="Évolution de la trésorerie"
          subtitle="Solde cumulé par mois"
          height={260}
          action={
            <StatusPill variant="info" dot>
              Temps réel
            </StatusPill>
          }
        >
          {hasTreasury ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={series}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="ppTreso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.36} />
                    <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: CHART_COLORS.axis, fontSize: 12, fontWeight: 700 }}
                  dy={6}
                />
                <Tooltip
                  cursor={{ stroke: CHART_COLORS.grid }}
                  content={<ChartTooltip valueFormat={formatFCFACompact} />}
                />
                <Area
                  type="monotone"
                  dataKey="solde"
                  name="Solde"
                  stroke={CHART_COLORS.accent}
                  strokeWidth={2.8}
                  fill="url(#ppTreso)"
                  dot={false}
                  activeDot={{ r: 4.5, strokeWidth: 2.5, stroke: "var(--surface)" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-muted flex h-full flex-col items-center justify-center gap-1 text-center">
              <div className="text-[13px] font-bold">
                Aucune donnée de trésorerie
              </div>
              <div className="text-[12px] font-medium">
                Ajoutez un compte et des mouvements pour voir la courbe.
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Opérationnel (agrégats réels) ── */}
      <div className="text-muted mt-[18px] mb-3 text-[11px] font-bold tracking-[0.7px]">
        OPÉRATIONNEL
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {operational.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} compact />
        ))}
      </div>
    </ScreenContainer>
  );
}
