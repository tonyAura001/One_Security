"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ScreenContainer } from "@/components/screens/screen-container";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { COMPANIES } from "@/lib/api/data";
import type { Company, Plan } from "@/lib/api/types";
import { toneText, toneTint, type Tone } from "@/lib/colors";
import { formatFCFA, formatNumberFR } from "@/lib/format";
import { cn } from "@/lib/utils";

const PLAN_VARIANT: Record<Plan, PillVariant> = {
  Starter: "neutral",
  Pro: "info",
  Enterprise: "violet",
};

const PLAN_TONE: Record<Plan, Tone> = {
  Starter: "muted",
  Pro: "accent",
  Enterprise: "violet",
};

/** Modules débloqués par formule (sur 9 modules plateforme). */
const PLAN_MODULES: Record<Plan, number> = {
  Starter: 3,
  Pro: 6,
  Enterprise: 9,
};

const STATUS_META: Record<
  Company["status"],
  { label: string; variant: PillVariant }
> = {
  actif: { label: "Actif", variant: "success" },
  essai: { label: "Essai", variant: "warning" },
  suspendu: { label: "Suspendu", variant: "danger" },
};

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const columns: ColumnDef<Company>[] = [
  {
    accessorKey: "name",
    header: "Entreprise",
    cell: ({ row }) => {
      const tone = PLAN_TONE[row.original.plan];
      return (
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex size-[30px] flex-none items-center justify-center rounded-lg text-[10px] font-extrabold",
              toneTint[tone],
              toneText[tone],
            )}
          >
            {initials(row.original.name)}
          </div>
          <span className="text-foreground font-bold">{row.original.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "city",
    header: "Ville",
    cell: ({ row }) => (
      <span className="text-muted font-semibold">{row.original.city}</span>
    ),
  },
  {
    accessorKey: "plan",
    header: "Formule",
    cell: ({ row }) => (
      <StatusPill variant={PLAN_VARIANT[row.original.plan]} uppercase>
        {row.original.plan}
      </StatusPill>
    ),
  },
  {
    accessorKey: "seats",
    header: "Sièges",
    cell: ({ row }) => (
      <span className="text-foreground font-extrabold">
        {formatNumberFR(row.original.seats)}
      </span>
    ),
  },
  {
    id: "modules",
    header: "Modules",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-muted font-semibold">
        {PLAN_MODULES[row.original.plan]} / 9
      </span>
    ),
  },
  {
    accessorKey: "mrr",
    header: "MRR",
    cell: ({ row }) => (
      <span className="text-foreground font-extrabold">
        {formatFCFA(row.original.mrr)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => {
      const meta = STATUS_META[row.original.status];
      return (
        <StatusPill variant={meta.variant} uppercase>
          {meta.label}
        </StatusPill>
      );
    },
  },
];

export function SuperadminEntreprises() {
  const activeCount = useMemo(
    () => COMPANIES.filter((c) => c.status === "actif").length,
    [],
  );

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
          Entreprises clientes de la plateforme
        </div>
        <span className="text-muted text-[12px] font-bold">
          {formatNumberFR(COMPANIES.length)} PME · {formatNumberFR(activeCount)}{" "}
          actives
        </span>
      </div>

      <DataTable
        columns={columns}
        data={COMPANIES}
        searchable
        searchPlaceholder="Rechercher une entreprise, une ville…"
        pageSize={10}
        emptyTitle="Aucune entreprise"
        emptyDescription="Aucune PME cliente ne correspond à la recherche."
      />
    </ScreenContainer>
  );
}
