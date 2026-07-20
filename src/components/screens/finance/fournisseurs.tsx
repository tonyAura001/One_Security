"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Boxes, Clock, FileWarning, Users } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import {
  SUPPLIER_CATEGORY_META,
  SUPPLIER_STATUS_META,
  type Supplier,
} from "@/lib/api/suppliers";
import {
  fetchSuppliers,
  computeSupplierStats,
} from "@/lib/supabase/data/suppliers";
import { toneText } from "@/lib/colors";
import { formatFCFA, formatFCFACompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NewSupplierDialog } from "./new-supplier-dialog";

const columns: ColumnDef<Supplier>[] = [
  {
    accessorKey: "name",
    header: "Fournisseur",
    cell: ({ row }) => (
      <div>
        <div className="text-foreground font-bold">{row.original.name}</div>
        <div className="text-muted text-[11.5px] font-semibold">
          {row.original.contact} · {row.original.phone}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Catégorie",
    cell: ({ row }) => (
      <span
        className={cn(
          "font-bold",
          toneText[SUPPLIER_CATEGORY_META[row.original.category].tone],
        )}
      >
        {row.original.category}
      </span>
    ),
  },
  {
    accessorKey: "openInvoices",
    header: "Factures",
    cell: ({ row }) => (
      <span className="text-foreground tnum font-semibold">
        {row.original.openInvoices}
      </span>
    ),
  },
  {
    accessorKey: "avgDelayDays",
    header: "Délai moyen",
    cell: ({ row }) => (
      <span className="text-muted tnum font-semibold">
        {row.original.avgDelayDays} j
      </span>
    ),
  },
  {
    accessorKey: "outstanding",
    header: "Encours",
    cell: ({ row }) => (
      <span className="text-foreground tnum font-extrabold whitespace-nowrap">
        {formatFCFA(row.original.outstanding)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => {
      const meta = SUPPLIER_STATUS_META[row.original.status];
      return <StatusPill variant={meta.variant}>{meta.label}</StatusPill>;
    },
  },
];

export function FournisseursScreen() {
  // Fournisseurs réels via Supabase (RLS finance).
  const { data } = useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchSuppliers,
  });
  const suppliers = data ?? [];
  const stats = useMemo(() => computeSupplierStats(suppliers), [suppliers]);

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fournisseurs</h1>
          <p className="page-subtitle">
            Équipement, uniformes, carburant, télécom & formation
          </p>
        </div>
        <NewSupplierDialog />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          tone="accent"
          value={String(stats.activeCount)}
          label="Fournisseurs actifs"
        />
        <KpiCard
          icon={Boxes}
          tone="violet"
          value={formatFCFACompact(stats.outstanding)}
          label="Encours fournisseurs"
        />
        <KpiCard
          icon={FileWarning}
          tone="warning"
          value={String(stats.toPay)}
          label="Factures à payer"
        />
        <KpiCard
          icon={Clock}
          tone="success"
          value={`${stats.avgDelay} j`}
          label="Délai moyen de paiement"
        />
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={suppliers}
          searchable
          searchPlaceholder="Rechercher un fournisseur…"
          exportFilename="fournisseurs"
          emptyTitle="Aucun fournisseur"
          emptyDescription="Ajoutez vos fournisseurs pour suivre les encours."
        />
      </div>
    </ScreenContainer>
  );
}
