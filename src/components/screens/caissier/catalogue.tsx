"use client";

import { useQuery } from "@tanstack/react-query";

import { useMemo, useState } from "react";
import { Boxes, PackageX, Plus, ShoppingCart, Warehouse } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { Segmented } from "@/components/ui/segmented";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getCatalogue,
  stockStatus,
  CATEGORY_TONE,
  STOCK_STATUS_META,
  type CatalogueItem,
} from "@/lib/api/catalogue";
import { fetchCatalogue, computeCatalogueStats } from "@/lib/supabase/data/catalogue";
import { formatFCFA, formatFCFACompact } from "@/lib/format";
import { toast } from "@/lib/toast";

const FILTERS = [
  { value: "tous", label: "Tous" },
  { value: "en_stock", label: "En stock" },
  { value: "faible", label: "Faible" },
  { value: "rupture", label: "Rupture" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

export function CatalogueScreen() {
  // Catalogue réel via Supabase (RLS) ; repli démo si accès refusé.
  const { data, isSuccess } = useQuery({ queryKey: ["catalogue"], queryFn: fetchCatalogue });
  const items = isSuccess && data.length > 0 ? data : getCatalogue();
  const stats = useMemo(() => computeCatalogueStats(items), [items]);
  const [filter, setFilter] = useState<Filter>("tous");

  const filtered = useMemo(
    () =>
      filter === "tous"
        ? items
        : items.filter((i) => stockStatus(i) === filter),
    [items, filter],
  );

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catalogue équipements</h1>
          <p className="page-subtitle">
            Matériel de sécurité · {stats.references} références
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => toast.info("Nouvelle référence", "Fonction de démonstration")}
        >
          <Plus className="size-4" /> Nouvelle référence
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Boxes}
          tone="accent"
          value={String(stats.references)}
          label="Références en catalogue"
        />
        <KpiCard
          icon={Warehouse}
          tone="violet"
          value={formatFCFACompact(stats.stockValue)}
          label="Valeur du stock"
        />
        <KpiCard
          icon={PackageX}
          tone="danger"
          value={String(stats.ruptures)}
          label="Ruptures"
        />
        <KpiCard
          icon={ShoppingCart}
          tone="warning"
          value={String(stats.toReorder)}
          label="Réappro à commander"
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Segmented
          options={FILTERS}
          value={filter}
          onChange={setFilter}
          size="sm"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="mt-3">
          <EmptyState
            title="Aucune référence"
            description="Aucun article ne correspond à ce filtre."
          />
        </Card>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </ScreenContainer>
  );
}

function ProductCard({ item }: { item: CatalogueItem }) {
  const status = stockStatus(item);
  const statusMeta = STOCK_STATUS_META[status];
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="bg-surface2 flex h-24 items-center justify-center rounded-xl">
        <IconTile icon={Boxes} tone={CATEGORY_TONE[item.category]} size={44} />
      </div>
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="text-foreground text-[13px] font-extrabold leading-tight">
            {item.name}
          </div>
          <StatusPill variant={statusMeta.variant} uppercase>
            {statusMeta.label}
          </StatusPill>
        </div>
        <div className="text-muted mt-1 text-[11.5px] font-semibold">
          {item.category} · {item.reference}
        </div>
      </div>
      <div className="border-border mt-auto flex items-center justify-between border-t pt-3">
        <div>
          <div className="text-muted text-[10.5px] font-semibold">
            Prix unitaire
          </div>
          <div className="text-foreground tnum text-[14px] font-extrabold">
            {formatFCFA(item.price)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-muted text-[10.5px] font-semibold">Stock</div>
          <div className="text-foreground tnum text-[14px] font-extrabold">
            {item.stock}
          </div>
        </div>
      </div>
    </Card>
  );
}
