"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Database,
  DatabaseBackup,
  Download,
  FileSpreadsheet,
  HardDriveUpload,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable } from "@/components/ui/data-table";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import {
  getBackups,
  getExports,
  getRetentionPolicies,
  getDataStats,
  BACKUP_STATUS_META,
  EXPORT_STATUS_META,
  type ExportRecord,
} from "@/lib/api/data-management";
import { formatDateFR } from "@/lib/format";
import { toast } from "@/lib/toast";

const exportColumns: ColumnDef<ExportRecord>[] = [
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <span className="text-foreground font-bold">{row.original.type}</span>
    ),
  },
  {
    accessorKey: "requester",
    header: "Demandeur",
    cell: ({ row }) => (
      <span className="text-muted font-semibold">{row.original.requester}</span>
    ),
  },
  {
    accessorKey: "at",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-muted tnum font-semibold whitespace-nowrap">
        {formatDateFR(row.original.at, "dd/MM/yyyy HH:mm")}
      </span>
    ),
  },
  {
    accessorKey: "format",
    header: "Format",
    cell: ({ row }) => (
      <span className="text-muted font-semibold">{row.original.format}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => {
      const meta = EXPORT_STATUS_META[row.original.status];
      return <StatusPill variant={meta.variant}>{meta.label}</StatusPill>;
    },
  },
];

const EXPORT_ACTIONS = [
  { label: "Agents", format: "CSV" },
  { label: "Contrats", format: "PDF" },
  { label: "Paie", format: "Excel" },
  { label: "Factures", format: "Excel" },
];

export function DonneesScreen() {
  const backups = useMemo(() => getBackups(), []);
  const exports = useMemo(() => getExports(), []);
  const retention = useMemo(() => getRetentionPolicies(), []);
  const stats = useMemo(() => getDataStats(), []);

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Données</h1>
          <p className="page-subtitle">
            Sauvegardes, exports & conformité APDP
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => toast.success("Sauvegarde manuelle lancée")}
        >
          <DatabaseBackup className="size-4" /> Sauvegarder
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-[15px] sm:grid-cols-3">
        <KpiCard
          icon={Database}
          tone="accent"
          value={stats.volume}
          label="Volume de données"
        />
        <KpiCard
          icon={DatabaseBackup}
          tone="success"
          value={formatDateFR(stats.lastBackup, "d MMM · HH:mm")}
          label="Dernière sauvegarde"
        />
        <KpiCard
          icon={Download}
          tone="violet"
          value={String(stats.exportsThisMonth)}
          label="Exports ce mois"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-[15px] lg:grid-cols-2">
        {/* Sauvegardes */}
        <Card className="flex flex-col gap-3 p-4">
          <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
            Sauvegardes automatiques
          </div>
          <p className="text-muted text-[12px] font-semibold">
            Sauvegarde quotidienne chiffrée à 03h00 (rétention 30 jours).
          </p>
          <div className="flex flex-col gap-2">
            {backups.map((b) => {
              const meta = BACKUP_STATUS_META[b.status];
              return (
                <div
                  key={b.id}
                  className="border-border bg-surface2 flex items-center gap-3 rounded-xl border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground text-[12.5px] font-bold">
                      {formatDateFR(b.at, "dd/MM/yyyy · HH:mm")}
                    </div>
                    <div className="text-muted text-[11px] font-semibold">
                      {b.type} · {b.size}
                    </div>
                  </div>
                  <StatusPill variant={meta.variant}>{meta.label}</StatusPill>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Exports & Import */}
        <div className="flex flex-col gap-[15px]">
          <Card className="flex flex-col gap-3 p-4">
            <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
              Exporter des données
            </div>
            <div className="grid grid-cols-2 gap-2">
              {EXPORT_ACTIONS.map((a) => (
                <Button
                  key={a.label}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() =>
                    toast.success(`Export ${a.label} (${a.format}) généré`)
                  }
                >
                  <FileSpreadsheet className="size-4" /> {a.label}
                  <span className="text-muted ml-auto text-[10.5px] font-bold">
                    {a.format}
                  </span>
                </Button>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col gap-3 p-4">
            <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
              Import de données
            </div>
            <p className="text-muted text-[12px] font-semibold">
              Importez un fichier CSV/Excel (agents, clients, présences).
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => toast.info("Import de données", "Fonction de démonstration")}
            >
              <Upload className="size-4" /> Choisir un fichier
            </Button>
          </Card>
        </div>
      </div>

      {/* Rétention & conformité */}
      <Card className="mt-4 flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-success size-5" />
          <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
            Rétention & conformité APDP
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {retention.map((r) => (
            <div
              key={r.dataType}
              className="border-border bg-surface2 rounded-xl border p-3"
            >
              <div className="text-foreground text-[12.5px] font-bold">
                {r.dataType}
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-accent text-[12px] font-extrabold">
                  {r.duration}
                </span>
                <span className="text-muted text-[10.5px] font-semibold">
                  {r.basis}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Historique des exports */}
      <div className="mt-4">
        <div className="text-foreground mb-2.5 flex items-center gap-2 text-[15px] font-extrabold tracking-[-0.3px]">
          <HardDriveUpload className="size-4" /> Historique des exports
        </div>
        <DataTable
          columns={exportColumns}
          data={exports}
          emptyTitle="Aucun export"
          emptyDescription="Aucun export réalisé ce mois."
        />
      </div>
    </ScreenContainer>
  );
}
