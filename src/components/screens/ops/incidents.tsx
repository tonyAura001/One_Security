"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, ShieldAlert, Clock, CheckCircle2 } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { formatDateFR } from "@/lib/format";
import {
  fetchIncidents,
  type Incident,
  type IncidentCriticite,
  type IncidentStatut,
} from "@/lib/supabase/data/incidents";
import { NewIncidentDialog } from "./new-incident-dialog";

const TYPE_LABEL: Record<string, string> = {
  AGRESSION: "Agression",
  MALVEILLANCE: "Malveillance",
  INCENDIE: "Incendie",
  RIXE: "Rixe",
  INTRUSION: "Intrusion",
  VOL: "Vol",
  ACCIDENT: "Accident",
  AUTRE: "Autre",
};

const CRITICITE_META: Record<
  IncidentCriticite,
  { variant: PillVariant; label: string }
> = {
  FAIBLE: { variant: "neutral", label: "Faible" },
  MODEREE: { variant: "info", label: "Modérée" },
  ELEVEE: { variant: "warning", label: "Élevée" },
  CRITIQUE: { variant: "danger", label: "Critique" },
};

const STATUT_META: Record<
  IncidentStatut,
  { variant: PillVariant; label: string }
> = {
  NOUVEAU: { variant: "info", label: "Nouveau" },
  EN_COURS: { variant: "warning", label: "En cours" },
  CLOTURE: { variant: "success", label: "Clôturé" },
};

const columns: ColumnDef<Incident>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => (
      <span className="text-muted font-semibold">
        {formatDateFR(row.original.date)}
      </span>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <span className="text-foreground font-extrabold">
        {TYPE_LABEL[row.original.type] ?? row.original.type}
      </span>
    ),
  },
  { accessorKey: "site", header: "Site" },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="text-muted line-clamp-1 max-w-[320px] text-[12.5px]">
        {row.original.description}
      </span>
    ),
  },
  {
    accessorKey: "criticite",
    header: "Criticité",
    cell: ({ row }) => {
      const m = CRITICITE_META[row.original.criticite];
      return (
        <StatusPill variant={m.variant} uppercase>
          {m.label}
        </StatusPill>
      );
    },
  },
  {
    accessorKey: "statut",
    header: "Statut",
    cell: ({ row }) => {
      const m = STATUT_META[row.original.statut];
      return (
        <StatusPill variant={m.variant} uppercase>
          {m.label}
        </StatusPill>
      );
    },
  },
];

export function IncidentsScreen() {
  const { data } = useQuery({ queryKey: ["incidents"], queryFn: fetchIncidents });
  const incidents = useMemo(() => data ?? [], [data]);

  const graves = incidents.filter(
    (i) => i.criticite === "ELEVEE" || i.criticite === "CRITIQUE",
  ).length;
  const enCours = incidents.filter((i) => i.statut === "EN_COURS").length;
  const clotures = incidents.filter((i) => i.statut === "CLOTURE").length;

  return (
    <ScreenContainer>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-muted text-[11px] font-bold tracking-[0.7px] uppercase">
          Main courante · 30 derniers jours
        </div>
        <NewIncidentDialog />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={ShieldAlert}
          tone="accent"
          value={String(incidents.length)}
          label="Incidents (30 j)"
        />
        <KpiCard
          icon={AlertTriangle}
          tone="danger"
          value={String(graves)}
          label="Graves (élevée + critique)"
          valueTone="danger"
        />
        <KpiCard
          icon={Clock}
          tone="warning"
          value={String(enCours)}
          label="En cours de traitement"
        />
        <KpiCard
          icon={CheckCircle2}
          tone="success"
          value={String(clotures)}
          label="Clôturés"
        />
      </div>

      <DataTable
        columns={columns}
        data={incidents}
        searchable
        searchPlaceholder="Rechercher un incident…"
        emptyTitle="Aucun incident"
      />
    </ScreenContainer>
  );
}
