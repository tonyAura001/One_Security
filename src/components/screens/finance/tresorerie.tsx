"use client";

import { useQuery } from "@tanstack/react-query";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Building2,
  Download,
  Landmark,
  Plus,
  Smartphone,
  Wallet,
} from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable } from "@/components/ui/data-table";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import {
  CHART_COLORS,
  ChartCard,
  ChartTooltip,
} from "@/components/ui/chart-card";
import {
  ACCOUNT_KIND_META,
  METHOD_META,
  type Account,
  type Movement,
} from "@/lib/api/treasury";
import { EmptyState } from "@/components/ui/empty-state";
import { formatFCFA, formatFCFACompact, formatDateFR } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

const ACCOUNT_ICON = {
  bank: Landmark,
  wave: Smartphone,
  om: Smartphone,
  cash: Wallet,
} as const;

const columns: ColumnDef<Movement>[] = [
  {
    accessorKey: "label",
    header: "Libellé",
    cell: ({ row }) => (
      <span className="text-foreground font-bold">{row.original.label}</span>
    ),
  },
  {
    accessorKey: "category",
    header: "Catégorie",
    cell: ({ row }) => (
      <span className="text-muted font-semibold">{row.original.category}</span>
    ),
  },
  {
    accessorKey: "method",
    header: "Moyen",
    cell: ({ row }) => (
      <StatusPill variant={METHOD_META[row.original.method]}>
        {row.original.method}
      </StatusPill>
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
    accessorKey: "amount",
    header: "Montant",
    cell: ({ row }) => {
      const credit = row.original.amount > 0;
      return (
        <span
          className={cn(
            "tnum inline-flex items-center gap-1 font-extrabold whitespace-nowrap",
            credit ? "text-success" : "text-danger",
          )}
        >
          {credit ? (
            <ArrowUpRight className="size-3.5" strokeWidth={2.6} />
          ) : (
            <ArrowDownRight className="size-3.5" strokeWidth={2.6} />
          )}
          {credit ? "+" : "−"}
          {formatFCFA(Math.abs(row.original.amount))}
        </span>
      );
    },
  },
];

import {
  fetchAccounts,
  fetchMovements,
  computeBalanceSeries,
  computeTreasuryStats,
} from "@/lib/supabase/data/treasury";

export function TresorerieScreen() {
  // Trésorerie réelle via Supabase (RLS finance).
  const accQ = useQuery({ queryKey: ["treasury-accounts"], queryFn: fetchAccounts });
  const movQ = useQuery({ queryKey: ["treasury-movements"], queryFn: fetchMovements });
  const accounts = accQ.data ?? [];
  const movements = movQ.data ?? [];
  const series = useMemo(() => computeBalanceSeries(accounts, movements), [accounts, movements]);
  const stats = useMemo(() => computeTreasuryStats(accounts, movements), [accounts, movements]);

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Trésorerie</h1>
          <p className="page-subtitle">
            Soldes multi-comptes · encaissements Wave, Orange Money & virements
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (movements.length === 0) {
                toast.info("Aucun mouvement à exporter.");
                return;
              }
              downloadCsv("tresorerie-mouvements.csv", [
                ["Date", "Libellé", "Catégorie", "Moyen", "Montant"],
                ...movements.map((m) => [
                  m.date,
                  m.label,
                  m.category,
                  m.method,
                  m.amount,
                ]),
              ]);
              toast.success(`Export CSV · ${movements.length} mouvements`);
            }}
          >
            <Download className="size-4" /> Exporter
          </Button>
          <Button
            size="sm"
            onClick={() => toast.info("Nouveau mouvement", "Fonction de démonstration")}
          >
            <Plus className="size-4" /> Mouvement
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Banknote}
          tone="accent"
          value={formatFCFACompact(stats.total)}
          label="Solde total"
          hint="Tous comptes confondus"
        />
        <KpiCard
          icon={ArrowUpRight}
          tone="success"
          value={formatFCFACompact(stats.encaissements)}
          label="Encaissements du mois"
        />
        <KpiCard
          icon={ArrowDownRight}
          tone="warning"
          value={formatFCFACompact(stats.decaissements)}
          label="Décaissements du mois"
        />
        <KpiCard
          icon={Building2}
          tone="violet"
          value={formatFCFACompact(stats.forecast30)}
          label="Prévisionnel J+30"
          hint="Encaissements attendus − paie"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-[15px] lg:grid-cols-[1fr_1.4fr]">
        {/* Comptes */}
        <Card className="flex flex-col gap-2.5 p-4">
          <div className="text-foreground mb-1 text-[15px] font-extrabold tracking-[-0.3px]">
            Comptes
          </div>
          {accounts.length === 0 && (
            <EmptyState title="Aucun compte pour le moment" />
          )}
          {accounts.map((acc) => (
            <AccountRow key={acc.id} account={acc} />
          ))}
        </Card>

        {/* Évolution du solde */}
        <ChartCard
          title="Évolution du solde"
          subtitle="6 derniers mois"
          height={230}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={series}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="ppSolde" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={CHART_COLORS.accent}
                    stopOpacity={0.38}
                  />
                  <stop
                    offset="100%"
                    stopColor={CHART_COLORS.accent}
                    stopOpacity={0}
                  />
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
                fill="url(#ppSolde)"
                dot={false}
                activeDot={{ r: 4.5, strokeWidth: 2.5, stroke: "var(--surface)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-4">
        <div className="text-foreground mb-2.5 text-[15px] font-extrabold tracking-[-0.3px]">
          Derniers mouvements
        </div>
        <DataTable
          columns={columns}
          data={movements}
          searchable
          searchPlaceholder="Rechercher un mouvement…"
          emptyTitle="Aucun mouvement"
          emptyDescription="Aucun mouvement de trésorerie sur la période."
        />
      </div>
    </ScreenContainer>
  );
}

function AccountRow({ account }: { account: Account }) {
  const meta = ACCOUNT_KIND_META[account.kind];
  const Icon = ACCOUNT_ICON[account.kind];
  return (
    <div className="border-border bg-surface2 flex items-center gap-3 rounded-xl border p-3.5">
      <IconTile icon={Icon} tone={meta.tone} size={38} />
      <div className="min-w-0 flex-1">
        <div className="text-foreground truncate text-[13px] font-extrabold">
          {account.name}
        </div>
        <div className="text-muted text-[11px] font-semibold">
          {account.reference}
        </div>
      </div>
      <div className="text-right">
        <div className="tnum text-foreground text-[14px] font-extrabold">
          {formatFCFA(account.balance)}
        </div>
        <div className="text-muted text-[10.5px] font-semibold">{meta.label}</div>
      </div>
    </div>
  );
}
