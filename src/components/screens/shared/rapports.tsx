"use client";

import dynamic from "next/dynamic";
import {
  CalendarRange,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { ChartCard, CHART_COLORS, LegendDot } from "@/components/ui/chart-card";
import { toast } from "@/lib/toast";
import type { Tone } from "@/lib/colors";

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

type ReportFormat = "PDF" | "EXCEL";

interface ReportDef {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: Tone;
  format: ReportFormat;
}

const REPORTS: ReportDef[] = [
  {
    title: "Rapport financier mensuel",
    description: "Juin 2026 · généré le 01/07/2026",
    icon: FileText,
    tone: "danger",
    format: "PDF",
  },
  {
    title: "État de recouvrement",
    description: "Arrêté au 03/07/2026",
    icon: FileSpreadsheet,
    tone: "success",
    format: "EXCEL",
  },
  {
    title: "Rapport RH & effectifs",
    description: "Juin 2026 · 52 agents",
    icon: Users,
    tone: "danger",
    format: "PDF",
  },
  {
    title: "Planning & couverture des sites",
    description: "Semaine 27 · 14 sites",
    icon: CalendarRange,
    tone: "success",
    format: "EXCEL",
  },
  {
    title: "Performance commerciale",
    description: "2ᵉ trimestre 2026",
    icon: TrendingUp,
    tone: "danger",
    format: "PDF",
  },
  {
    title: "Rapport de caisse (boutique)",
    description: "Journée du 02/07/2026",
    icon: ShoppingCart,
    tone: "success",
    format: "EXCEL",
  },
];

export function SharedRapports() {
  return (
    <ScreenContainer>
      {/* Overview chart */}
      <ChartCard
        title="Aperçu — Revenus vs Dépenses"
        subtitle="6 derniers mois · 2026"
        height={220}
        legend={
          <>
            <LegendDot color={CHART_COLORS.accent}>Revenus</LegendDot>
            <LegendDot color={CHART_COLORS.warning}>Dépenses</LegendDot>
          </>
        }
      >
        <RevenueChart />
      </ChartCard>

      {/* Reports gallery */}
      <Card className="mt-[15px] p-[18px_20px]">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-foreground text-[16px] font-extrabold tracking-[-0.3px]">
            Rapports générés
          </div>
          <Button
            size="sm"
            onClick={() =>
              toast.success("Génération d'un nouveau rapport lancée")
            }
          >
            <Download className="size-3.5" strokeWidth={2.2} />
            Générer un rapport
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {REPORTS.map((report) => (
            <div
              key={report.title}
              className="border-border bg-surface2 flex flex-col gap-3 rounded-xl border p-4"
            >
              <div className="flex items-center gap-3">
                <IconTile icon={report.icon} tone={report.tone} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="text-foreground text-[13.5px] font-bold">
                    {report.title}
                  </div>
                  <div className="text-muted mt-0.5 text-[11.5px] font-semibold">
                    {report.description}
                  </div>
                </div>
                <StatusPill
                  variant={report.format === "PDF" ? "danger" : "success"}
                  uppercase
                >
                  {report.format}
                </StatusPill>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => toast.success(`« ${report.title} » régénéré`)}
                >
                  Générer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    toast.info(`Export ${report.format} de « ${report.title} »`)
                  }
                >
                  Exporter
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </ScreenContainer>
  );
}
