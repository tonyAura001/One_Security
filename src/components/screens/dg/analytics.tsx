"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/aurantir-front-kit";
import { ChartCard } from "@/components/ui/chart-card";
import { Segmented } from "@/components/ui/segmented";
import {
  MONTHLY,
  BY_SITE,
  sliceByPeriod,
  type AnalyticsPeriod,
} from "@/lib/api/analytics";
import { formatFCFACompact } from "@/lib/format";

const spinner = () => (
  <div className="text-muted flex h-full items-center justify-center">
    <Loader2 className="size-5 animate-spin" />
  </div>
);
const CaChart = dynamic(
  () => import("@/components/charts/analytics-charts").then((m) => m.CaChart),
  { ssr: false, loading: spinner },
);
const MasseChart = dynamic(
  () =>
    import("@/components/charts/analytics-charts").then((m) => m.MasseChart),
  { ssr: false, loading: spinner },
);
const IncidentsChart = dynamic(
  () =>
    import("@/components/charts/analytics-charts").then(
      (m) => m.IncidentsChart,
    ),
  { ssr: false, loading: spinner },
);
const ContratsChart = dynamic(
  () =>
    import("@/components/charts/analytics-charts").then((m) => m.ContratsChart),
  { ssr: false, loading: spinner },
);
const CouvertureChart = dynamic(
  () =>
    import("@/components/charts/analytics-charts").then(
      (m) => m.CouvertureChart,
    ),
  { ssr: false, loading: spinner },
);

export function AnalyticsScreen() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("annee");
  const data = useMemo(() => sliceByPeriod(period), [period]);

  const caCumul = data.reduce((s, m) => s + m.ca, 0);
  const contratsActifs = BY_SITE.reduce((s, x) => s + x.contrats, 0);
  const couvMoy = Math.round(
    BY_SITE.reduce((s, x) => s + x.couverture, 0) / BY_SITE.length,
  );
  const incidentsMois = MONTHLY[MONTHLY.length - 1].incidents;

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">
            Analyse de la performance — Dakar Sécurité
          </p>
        </div>
        <Segmented<AnalyticsPeriod>
          value={period}
          onChange={setPeriod}
          options={[
            { value: "mois", label: "Mois" },
            { value: "trimestre", label: "Trimestre" },
            { value: "annee", label: "Année" },
          ]}
        />
      </div>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="CA cumulé" value={`${formatFCFACompact(caCumul)}`} />
        <Kpi label="Contrats actifs" value={String(contratsActifs)} />
        <Kpi label="Couverture moyenne" value={`${couvMoy}%`} />
        <Kpi label="Incidents ce mois" value={String(incidentsMois)} />
      </div>

      {/* Graphiques */}
      <div className="mt-4 grid grid-cols-1 gap-[15px] lg:grid-cols-2">
        <ChartCard
          title="Chiffre d'affaires par mois"
          subtitle="FCFA · 2026"
          height={220}
        >
          <CaChart data={data} />
        </ChartCard>
        <ChartCard
          title="Évolution de la masse salariale"
          subtitle="FCFA · 2026"
          height={220}
        >
          <MasseChart data={data} />
        </ChartCard>
        <ChartCard
          title="Contrats par site"
          subtitle="Répartition du portefeuille"
          height={220}
        >
          <ContratsChart />
        </ChartCard>
        <ChartCard
          title="Taux de couverture des sites"
          subtitle="% de postes couverts"
          height={220}
        >
          <CouvertureChart />
        </ChartCard>
        <ChartCard
          title="Incidents par mois"
          subtitle="Tous sites confondus"
          height={220}
          className="lg:col-span-2"
        >
          <IncidentsChart data={data} />
        </ChartCard>
      </div>
    </ScreenContainer>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card padding="sm">
      <p className="text-text-muted text-[11px] font-semibold">{label}</p>
      <p className="text-text-primary mt-1 text-xl font-extrabold tracking-[-0.5px]">
        {value}
      </p>
    </Card>
  );
}
