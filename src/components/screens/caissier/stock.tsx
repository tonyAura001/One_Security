"use client";

import { useQuery } from "@tanstack/react-query";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Boxes, PackageX, Plus, Wallet } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { fetchProduits } from "@/lib/supabase/data/caisse";
import type { Product } from "@/lib/api/types";
import { formatFCFACompact, formatNumberFR } from "@/lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type StockStatus = "rupture" | "seuil" | "ok";

interface StockRow extends Product {
  state: StockStatus;
}

const STATUS_META: Record<
  StockStatus,
  { label: string; variant: PillVariant; text: string }
> = {
  rupture: { label: "Rupture", variant: "danger", text: "text-danger" },
  seuil: { label: "Sous seuil", variant: "warning", text: "text-warning" },
  ok: { label: "En stock", variant: "success", text: "text-foreground" },
};

function stockState(p: Product): StockStatus {
  if (p.stock === 0) return "rupture";
  if (p.stock < p.threshold) return "seuil";
  return "ok";
}

const columns: ColumnDef<StockRow>[] = [
  {
    accessorKey: "name",
    header: "Article",
    cell: ({ row }) => (
      <div>
        <div className="text-foreground font-bold">{row.original.name}</div>
        <div className="text-muted mt-0.5 text-[11.5px] font-semibold">
          {row.original.category}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "stock",
    header: "Stock",
    cell: ({ row }) => (
      <span
        className={cn(
          "text-[13px] font-extrabold",
          STATUS_META[row.original.state].text,
        )}
      >
        {row.original.stock}
      </span>
    ),
  },
  {
    accessorKey: "threshold",
    header: "Seuil",
    cell: ({ row }) => (
      <span className="text-muted font-semibold">{row.original.threshold}</span>
    ),
  },
  {
    id: "statut",
    header: "Statut",
    enableSorting: false,
    cell: ({ row }) => {
      const meta = STATUS_META[row.original.state];
      return (
        <StatusPill variant={meta.variant} uppercase>
          {meta.label}
        </StatusPill>
      );
    },
  },
];

export function CaissierStock() {
  const { data } = useQuery({ queryKey: ["produits"], queryFn: fetchProduits });
  const products = data ?? [];
  const rows = useMemo<StockRow[]>(
    () => products.map((p) => ({ ...p, state: stockState(p) })),
    [products],
  );

  const ruptures = rows.filter((r) => r.state === "rupture").length;
  const sousSeuil = rows.filter((r) => r.state === "seuil").length;
  const stockValue = rows.reduce((sum, r) => sum + r.price * r.stock, 0);

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
            Gestion du stock — équipements
          </div>
          <div className="text-muted mt-0.5 text-[12px] font-semibold">
            {rows.length} articles suivis · {sousSeuil + ruptures} à
            réapprovisionner
          </div>
        </div>
        <Button onClick={() => toast.success("Entrée de stock enregistrée")}>
          <Plus strokeWidth={2.4} />
          Entrée de stock
        </Button>
      </div>

      <div className="mb-[15px] grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Boxes}
          tone="accent"
          value={String(rows.length)}
          label="Produits référencés"
          hint="Catalogue équipements & tenues"
        />
        <KpiCard
          icon={Wallet}
          tone="success"
          value={formatFCFACompact(stockValue)}
          label="Valeur du stock"
          hint="Au prix d'achat unitaire"
        />
        <KpiCard
          icon={AlertTriangle}
          tone="warning"
          value={String(sousSeuil)}
          valueTone="warning"
          label="Sous seuil"
          hint="À commander bientôt"
          hintTone="warning"
        />
        <KpiCard
          icon={PackageX}
          tone="danger"
          value={String(ruptures)}
          valueTone="danger"
          dot={ruptures > 0}
          label="Ruptures de stock"
          hint="Réapprovisionnement urgent"
          hintTone="danger"
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        searchable
        searchPlaceholder="Rechercher un article…"
        pageSize={10}
        emptyTitle="Aucun article"
        emptyDescription="Le catalogue de stock est vide."
      />

      <p className="text-muted mt-3 text-[11.5px] font-semibold">
        {formatNumberFR(rows.length)} articles · valeur totale{" "}
        {formatFCFACompact(stockValue)}
      </p>
    </ScreenContainer>
  );
}
