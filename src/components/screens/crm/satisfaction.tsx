"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Star } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable } from "@/components/ui/data-table";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import {
  CHART_COLORS,
  ChartCard,
  ChartTooltip,
} from "@/components/ui/chart-card";
import {
  getAudits,
  getIncidents,
  getSatisfactionSeries,
  getSatisfactionStats,
  auditTone,
  AUDIT_STATUS_META,
  INCIDENT_SEVERITY_META,
  INCIDENT_STATUS_META,
  INCIDENT_TYPE_META,
  type Incident,
  type SiteAudit,
} from "@/lib/api/satisfaction";
import { toneText } from "@/lib/colors";
import { formatDateFR } from "@/lib/format";
import { cn } from "@/lib/utils";

const auditColumns: ColumnDef<SiteAudit>[] = [
  {
    accessorKey: "site",
    header: "Site",
    cell: ({ row }) => (
      <span className="text-foreground font-bold">{row.original.site}</span>
    ),
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-muted font-semibold whitespace-nowrap">
        {formatDateFR(row.original.date, "d MMM yyyy")}
      </span>
    ),
  },
  {
    accessorKey: "auditor",
    header: "Auditeur",
    cell: ({ row }) => (
      <span className="text-muted font-semibold">{row.original.auditor}</span>
    ),
  },
  {
    accessorKey: "score",
    header: "Score",
    cell: ({ row }) => (
      <span
        className={cn(
          "tnum font-extrabold",
          toneText[auditTone(row.original.score)],
        )}
      >
        {row.original.score}/100
      </span>
    ),
  },
  {
    id: "nc",
    header: "Non-conformités",
    cell: ({ row }) => {
      const nc = row.original.nonConformities;
      if (nc.length === 0)
        return <span className="text-muted font-semibold">—</span>;
      return (
        <span className="text-muted font-semibold" title={nc.join(" · ")}>
          {nc.length} point{nc.length > 1 ? "s" : ""}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => {
      const meta = AUDIT_STATUS_META[row.original.status];
      return <StatusPill variant={meta.variant}>{meta.label}</StatusPill>;
    },
  },
];

export function SatisfactionScreen() {
  const series = useMemo(() => getSatisfactionSeries(), []);
  const audits = useMemo(() => getAudits(), []);
  const incidents = useMemo(() => getIncidents(), []);
  const stats = useMemo(() => getSatisfactionStats(), []);

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Satisfaction & audits</h1>
          <p className="page-subtitle">
            Qualité de service · audits de sites & incidents terrain
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Star}
          tone="success"
          value={stats.avgScore.toLocaleString("fr-FR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}
          unit="/5"
          label="Satisfaction moyenne"
        />
        <KpiCard
          icon={ClipboardCheck}
          tone="accent"
          value={String(stats.auditsThisMonth)}
          label="Audits réalisés ce mois"
        />
        <KpiCard
          icon={AlertTriangle}
          tone="danger"
          value={String(stats.openIncidents)}
          label="Incidents ouverts"
        />
        <KpiCard
          icon={CheckCircle2}
          tone="violet"
          value={`${stats.resolutionRate} %`}
          label="Taux de résolution"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-[15px] lg:grid-cols-[1.4fr_1fr]">
        <ChartCard
          title="Évolution de la satisfaction"
          subtitle="Score moyen /5 · 6 derniers mois"
          height={230}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={series}
              margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
            >
              <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: CHART_COLORS.axis, fontSize: 12, fontWeight: 700 }}
                dy={6}
              />
              <YAxis
                domain={[0, 5]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: CHART_COLORS.axis, fontSize: 11, fontWeight: 700 }}
              />
              <Tooltip
                cursor={{ fill: "var(--hover)" }}
                content={
                  <ChartTooltip
                    valueFormat={(v) => `${v.toFixed(1)} / 5`}
                  />
                }
              />
              <Bar
                dataKey="score"
                name="Satisfaction"
                fill={CHART_COLORS.success}
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Incidents */}
        <Card className="flex flex-col gap-2.5 p-4">
          <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
            Incidents signalés
          </div>
          {incidents.map((inc) => (
            <IncidentRow key={inc.id} incident={inc} />
          ))}
        </Card>
      </div>

      <div className="mt-4">
        <div className="text-foreground mb-2.5 text-[15px] font-extrabold tracking-[-0.3px]">
          Audits de sites
        </div>
        <DataTable
          columns={auditColumns}
          data={audits}
          searchable
          searchPlaceholder="Rechercher un site…"
          emptyTitle="Aucun audit"
          emptyDescription="Aucun audit réalisé sur la période."
        />
      </div>
    </ScreenContainer>
  );
}

function IncidentRow({ incident }: { incident: Incident }) {
  const sev = INCIDENT_SEVERITY_META[incident.severity];
  const status = INCIDENT_STATUS_META[incident.status];
  return (
    <div className="border-border bg-surface2 flex items-center gap-3 rounded-xl border p-3">
      <div className="min-w-0 flex-1">
        <div className="text-foreground text-[12.5px] font-bold">
          {INCIDENT_TYPE_META[incident.type]}
        </div>
        <div className="text-muted text-[11px] font-semibold">
          {incident.site} · {formatDateFR(incident.date, "d MMM")}
        </div>
      </div>
      <StatusPill variant={sev.variant}>{sev.label}</StatusPill>
      <StatusPill variant={status.variant} dot>
        {status.label}
      </StatusPill>
    </div>
  );
}
