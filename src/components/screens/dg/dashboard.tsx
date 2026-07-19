"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { AlertTriangle, Calendar, Loader2, Package } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusPill } from "@/components/ui/status-pill";
import { Segmented } from "@/components/ui/segmented";
import { ChartCard, CHART_COLORS, LegendDot } from "@/components/ui/chart-card";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { ActivityFeed } from "@/components/ui/activity-feed";
import { useSession } from "@/lib/store/session";
import { getRecentActivity } from "@/lib/api/activity";
import type { Tone } from "@/lib/colors";
import { toast } from "@/lib/toast";
import { FINANCIAL_KPIS, OPERATIONAL_KPIS } from "./dashboard-kpis";
import { fetchDashboardKpis } from "@/lib/supabase/data/dashboard";

const RevenueChart = dynamic(
  () => import("@/components/charts/revenue-chart").then((m) => m.RevenueChart),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin" />
      </div>
    ),
  },
);

type Period = "jour" | "semaine" | "mois";

const PIPELINE = [
  {
    label: "Brouillons",
    count: 2,
    pct: 29,
    tone: "accent" as Tone,
    faded: true,
  },
  { label: "Devis envoyés", count: 7, pct: 100, tone: "accent" as Tone },
  { label: "Négociation", count: 3, pct: 43, tone: "accent" as Tone },
  { label: "Signés", count: 5, pct: 71, tone: "success" as Tone },
];

interface AlertRow {
  tone: Tone;
  icon: LucideIcon;
  title: string;
  detail: string;
  value: string;
  action: string;
  solid?: boolean;
}

const ALERTS: AlertRow[] = [
  {
    tone: "danger",
    icon: AlertTriangle,
    title: "Facture FAC-2025-041 impayée depuis 32 jours",
    detail: "Mise en demeure prête à l'envoi · Ambassade — sécurité résidence",
    value: "1 875 000 FCFA",
    action: "Relancer",
    solid: true,
  },
  {
    tone: "warning",
    icon: Calendar,
    title: "Contrat CTR-2025-007 — Port Autonome de Dakar",
    detail: "Expire dans 12 jours · préparer le renouvellement",
    value: "J-12",
    action: "Renouveler",
  },
  {
    tone: "warning",
    icon: Package,
    title: "Gilet pare-balles niv. III — rupture de stock",
    detail: "Réapprovisionnement requis · équipement de protection",
    value: "0 en stock",
    action: "Commander",
  },
];

const borderTone: Record<Tone, string> = {
  danger: "border-l-danger",
  warning: "border-l-warning",
  success: "border-l-success",
  accent: "border-l-accent",
  violet: "border-l-violet",
  foreground: "border-l-foreground",
  muted: "border-l-muted",
};

const valueTone: Record<Tone, string> = {
  danger: "text-danger",
  warning: "text-warning",
  success: "text-success",
  accent: "text-accent",
  violet: "text-violet",
  foreground: "text-foreground",
  muted: "text-muted",
};

export function DgDashboard() {
  const [period, setPeriod] = useState<Period>("mois");
  const { role } = useSession();

  // KPIs réels agrégés multi-domaines (RLS) ; repli démo si non chargés.
  const { data: k } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: fetchDashboardKpis,
  });
  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const financial = k
    ? FINANCIAL_KPIS.map((kpi, i) => {
        const vals = [fmt(k.caMois), String(k.tauxRecouvrement), fmt(k.masseSalariale), fmt(k.facturesRetard)];
        const patched = { ...kpi, value: vals[i] ?? kpi.value };
        if (i === 1) patched.progress = { value: k.tauxRecouvrement, tone: "warning" };
        return patched;
      })
    : FINANCIAL_KPIS;
  const operational = k
    ? OPERATIONAL_KPIS.map((kpi, i) => {
        const vals = [
          String(k.agentsService), String(k.contratsExpirant), String(k.ticketsOuverts),
          String(k.tachesRetard), String(k.stockSousSeuil), undefined, fmt(k.caBoutique), String(k.scoreSanteCrm),
        ];
        const v = vals[i];
        const patched = { ...kpi, value: v ?? kpi.value };
        if (i === 7) patched.progress = { value: k.scoreSanteCrm, tone: "violet" };
        return patched;
      })
    : OPERATIONAL_KPIS;

  return (
    <ScreenContainer>
      {/* ── Bandeau FINANCIER : les 4 chiffres « argent » qui cadrent le graphe ── */}
      <div className="mb-3.5 flex items-center justify-between">
        <div className="text-muted text-[11px] font-bold tracking-[0.7px]">
          SANTÉ FINANCIÈRE
        </div>
        <Segmented<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { value: "jour", label: "Aujourd'hui" },
            { value: "semaine", label: "Semaine" },
            { value: "mois", label: "Ce mois" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        {financial.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* ── Bandeau CENTRAL : le graphique (point focal) + le pipeline ── */}
      <div className="mt-[15px] grid grid-cols-1 gap-[15px] lg:grid-cols-[1.7fr_1fr]">
        <ChartCard
          title="Revenus vs Dépenses"
          subtitle="6 derniers mois · 2026"
          height={232}
          action={
            <StatusPill variant="info" dot>
              Temps réel
            </StatusPill>
          }
          legend={
            <>
              <LegendDot color={CHART_COLORS.accent}>Revenus</LegendDot>
              <LegendDot color={CHART_COLORS.warning}>Dépenses</LegendDot>
            </>
          }
        >
          <RevenueChart />
        </ChartCard>

        <Card className="flex flex-col p-[18px_20px]">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
              Pipeline commercial
            </div>
            <button className="text-accent text-[11.5px] font-bold hover:underline">
              Voir tout
            </button>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            {PIPELINE.map((s) => (
              <div key={s.label}>
                <div className="mb-1.5 flex justify-between">
                  <span className="text-foreground text-[12.5px] font-bold">
                    {s.label}
                  </span>
                  <span
                    className={`text-[13px] font-extrabold ${
                      s.tone === "success" ? "text-success" : "text-foreground"
                    }`}
                  >
                    {s.count}
                  </span>
                </div>
                <ProgressBar
                  value={s.pct}
                  tone={s.tone}
                  height={7}
                  faded={s.faded}
                />
              </div>
            ))}
          </div>
          <div className="border-border mt-4 flex items-baseline justify-between border-t pt-3.5">
            <span className="text-muted text-[11.5px] font-semibold">
              17 opportunités
            </span>
            <span className="text-foreground text-[13px] font-extrabold">
              24 300 000 FCFA
            </span>
          </div>
        </Card>
      </div>

      {/* ── Bandeau OPÉRATIONNEL : indicateurs secondaires, cartes compactes ── */}
      <div className="text-muted mt-[18px] mb-3 text-[11px] font-bold tracking-[0.7px]">
        OPÉRATIONNEL
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {operational.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} compact />
        ))}
      </div>

      {/* Alerts */}
      <Card className="mt-[15px] p-[18px_20px]">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
              Alertes automatiques
            </div>
            <StatusPill variant="danger" uppercase>
              3 actives
            </StatusPill>
          </div>
          <button className="text-accent text-[11.5px] font-bold hover:underline">
            Voir tout
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          {ALERTS.map((a) => (
            <div
              key={a.title}
              className={`border-border bg-surface2 flex flex-wrap items-center gap-3.5 rounded-xl border border-l-[3px] px-[15px] py-3.5 ${borderTone[a.tone]}`}
            >
              <IconTile icon={a.icon} tone={a.tone} size={34} />
              <div className="min-w-0 flex-1">
                <div className="text-foreground text-[13px] font-bold">
                  {a.title}
                </div>
                <div className="text-muted mt-0.5 text-[11.5px] font-semibold">
                  {a.detail}
                </div>
              </div>
              <div
                className={`text-[13px] font-extrabold whitespace-nowrap ${valueTone[a.tone]}`}
              >
                {a.value}
              </div>
              <Button
                variant={a.solid ? "default" : "outline"}
                size="sm"
                className={
                  a.solid
                    ? "bg-danger text-white hover:brightness-110"
                    : undefined
                }
                onClick={() => toast.success(`Action « ${a.action} » lancée`)}
              >
                {a.action}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Activité récente (flux RBAC) ── */}
      <div className="mt-[15px]">
        <ActivityFeed items={getRecentActivity(role)} />
      </div>
    </ScreenContainer>
  );
}
