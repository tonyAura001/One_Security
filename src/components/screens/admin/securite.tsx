"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Activity, ShieldCheck, ShieldX, UserCog } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import {
  getAuditTrail,
  getAuditStats,
  ACTION_META,
  OUTCOME_META,
  type AuditEvent,
} from "@/lib/api/audit";
import { toneText } from "@/lib/colors";
import { formatDateFR } from "@/lib/format";
import { cn } from "@/lib/utils";

const columns: ColumnDef<AuditEvent>[] = [
  {
    accessorKey: "at",
    header: "Horodatage",
    cell: ({ row }) => (
      <span className="text-muted tnum font-semibold whitespace-nowrap">
        {formatDateFR(row.original.at, "dd/MM/yyyy HH:mm")}
      </span>
    ),
  },
  {
    accessorKey: "user",
    header: "Utilisateur",
    cell: ({ row }) => (
      <div>
        <div className="text-foreground font-bold">{row.original.user}</div>
        <div className="text-muted text-[11px] font-semibold">
          {row.original.role}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => {
      const meta = ACTION_META[row.original.action];
      return (
        <div>
          <div className={cn("font-bold", toneText[meta.tone])}>
            {meta.label}
          </div>
          <div className="text-muted text-[11.5px] font-semibold">
            {row.original.detail}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "module",
    header: "Module",
    cell: ({ row }) => (
      <span className="text-muted font-semibold">{row.original.module}</span>
    ),
  },
  {
    accessorKey: "ip",
    header: "Adresse IP",
    cell: ({ row }) => (
      <span className="text-muted tnum font-semibold">{row.original.ip}</span>
    ),
  },
  {
    accessorKey: "outcome",
    header: "Statut",
    cell: ({ row }) => {
      const meta = OUTCOME_META[row.original.outcome];
      return <StatusPill variant={meta.variant}>{meta.label}</StatusPill>;
    },
  },
];

export function SecuriteScreen() {
  const events = useMemo(() => getAuditTrail(), []);
  const stats = useMemo(() => getAuditStats(), []);

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sécurité — Audit trail</h1>
          <p className="page-subtitle">
            Journal des actions sensibles · traçabilité APDP
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Activity}
          tone="accent"
          value={String(stats.today)}
          label="Événements aujourd’hui"
        />
        <KpiCard
          icon={ShieldCheck}
          tone="success"
          value={String(stats.activeSessions)}
          label="Connexions actives"
        />
        <KpiCard
          icon={ShieldX}
          tone="danger"
          value={String(stats.failedAttempts)}
          label="Tentatives échouées"
        />
        <KpiCard
          icon={UserCog}
          tone="violet"
          value={String(stats.sensitiveThisMonth)}
          label="Actions sensibles ce mois"
        />
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={events}
          searchable
          searchPlaceholder="Rechercher un utilisateur, une action…"
          pageSize={10}
          emptyTitle="Aucun événement"
          emptyDescription="Aucun événement d’audit sur la période."
        />
      </div>

      <div className="text-muted mt-3 flex items-center gap-2 text-[11.5px] font-semibold">
        <ShieldCheck className="text-success size-4" />
        Les journaux d’audit sont conservés 12 mois (traçabilité APDP) et non
        modifiables.
      </div>
    </ScreenContainer>
  );
}
