"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CalendarClock,
  FileText,
  MapPin,
  Plus,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getContracts,
  getContractStats,
  CONTRACT_STATUS_META,
  CONTRACT_TYPE_META,
  type GuardingContract,
} from "@/lib/api/contracts";
import { toneText } from "@/lib/colors";
import { formatFCFA, formatFCFACompact, formatDateFR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

function useColumns(): ColumnDef<GuardingContract>[] {
  return [
    {
      accessorKey: "ref",
      header: "Référence",
      cell: ({ row }) => (
        <span className="text-foreground font-bold">{row.original.ref}</span>
      ),
    },
    {
      accessorKey: "client",
      header: "Client / site",
      cell: ({ row }) => (
        <span className="text-muted font-semibold">{row.original.client}</span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const meta = CONTRACT_TYPE_META[row.original.type];
        return (
          <span className={cn("font-bold", toneText[meta.tone])}>
            {meta.label}
          </span>
        );
      },
    },
    {
      accessorKey: "agentsDeployed",
      header: "Agents",
      cell: ({ row }) => (
        <span className="text-foreground tnum font-semibold">
          {row.original.agentsDeployed}
        </span>
      ),
    },
    {
      accessorKey: "monthly",
      header: "Montant / mois",
      cell: ({ row }) => (
        <span className="text-foreground tnum font-extrabold whitespace-nowrap">
          {formatFCFA(row.original.monthly)}
        </span>
      ),
    },
    {
      accessorKey: "end",
      header: "Échéance",
      cell: ({ row }) => (
        <span className="text-muted font-semibold whitespace-nowrap">
          {formatDateFR(row.original.end, "d MMM yyyy")}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Statut",
      cell: ({ row }) => {
        const meta = CONTRACT_STATUS_META[row.original.status];
        return <StatusPill variant={meta.variant}>{meta.label}</StatusPill>;
      },
    },
  ];
}

export function ContratsScreen() {
  const contracts = useMemo(() => getContracts(), []);
  const stats = useMemo(() => getContractStats(), []);
  const columns = useColumns();
  const [selected, setSelected] = useState<GuardingContract | null>(null);

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Contrats</h1>
          <p className="page-subtitle">
            Prestations de gardiennage · {stats.active} contrats actifs
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => toast.info("Nouveau contrat", "Fonction de démonstration")}
        >
          <Plus className="size-4" /> Nouveau contrat
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={FileText}
          tone="accent"
          value={String(stats.active)}
          label="Contrats actifs"
        />
        <KpiCard
          icon={TrendingUp}
          tone="success"
          value={formatFCFACompact(stats.mrr)}
          label="Revenu mensuel récurrent"
        />
        <KpiCard
          icon={CalendarClock}
          tone="warning"
          value={String(stats.toRenew)}
          label="À renouveler (< 60 j)"
          hint="Action commerciale requise"
          hintTone="warning"
        />
        <KpiCard
          icon={RefreshCw}
          tone="violet"
          value={`${stats.renewalRate} %`}
          label="Taux de renouvellement"
        />
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={contracts}
          searchable
          searchPlaceholder="Rechercher un contrat, un client…"
          exportFilename="contrats"
          onRowClick={(c) => setSelected(c)}
          emptyTitle="Aucun contrat"
          emptyDescription="Créez un premier contrat de prestation."
        />
      </div>

      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
          {selected && <ContractDetail contract={selected} />}
        </SheetContent>
      </Sheet>
    </ScreenContainer>
  );
}

function ContractDetail({ contract }: { contract: GuardingContract }) {
  const typeMeta = CONTRACT_TYPE_META[contract.type];
  const statusMeta = CONTRACT_STATUS_META[contract.status];

  return (
    <>
      <SheetHeader className="border-border border-b">
        <div className="flex items-center gap-2">
          <SheetTitle className="text-foreground text-base font-extrabold">
            {contract.ref}
          </SheetTitle>
          <StatusPill variant={statusMeta.variant}>{statusMeta.label}</StatusPill>
        </div>
        <SheetDescription className="text-muted font-semibold">
          {contract.client} · {typeMeta.label}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <DetailStat
            label="Montant mensuel"
            value={formatFCFA(contract.monthly)}
          />
          <DetailStat
            label="Agents déployés"
            value={String(contract.agentsDeployed)}
          />
          <DetailStat label="Début" value={formatDateFR(contract.start)} />
          <DetailStat label="Fin" value={formatDateFR(contract.end)} />
        </div>

        <section>
          <div className="text-muted mb-2 flex items-center gap-2 text-[11px] font-bold tracking-[0.5px] uppercase">
            <MapPin className="size-3.5" /> Sites couverts
          </div>
          <div className="flex flex-col gap-2">
            {contract.sites.map((s) => (
              <div
                key={s.site}
                className="border-border bg-surface2 rounded-xl border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-foreground text-[13px] font-bold">
                      {s.site}
                    </div>
                    <div className="text-muted text-[11.5px] font-semibold">
                      {s.zone} · {s.regime}
                    </div>
                  </div>
                  <span className="bg-accent/14 text-accent flex-none rounded-full px-2.5 py-1 text-[11px] font-extrabold">
                    {s.agents} agent{s.agents > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="text-muted mb-2 flex items-center gap-2 text-[11px] font-bold tracking-[0.5px] uppercase">
            <Users className="size-3.5" /> Agents affectés
          </div>
          <div className="flex flex-col gap-2">
            {contract.agents.map((a) => (
              <div key={a.name} className="flex items-center gap-3">
                <span className="bg-active text-accent flex size-8 flex-none items-center justify-center rounded-full text-[11px] font-extrabold">
                  {a.initials}
                </span>
                <div className="min-w-0">
                  <div className="text-foreground text-[12.5px] font-bold">
                    {a.name}
                  </div>
                  <div className="text-muted text-[11px] font-semibold">
                    {a.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1"
            onClick={() =>
              toast.success(`Contrat ${contract.ref} — renouvellement lancé`)
            }
          >
            Renouveler
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => toast.info(`Contrat ${contract.ref}`, "Aperçu PDF (démo)")}
          >
            Voir le PDF
          </Button>
        </div>
      </div>
    </>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-surface2 rounded-xl border p-3">
      <div className="text-muted text-[10.5px] font-semibold">{label}</div>
      <div className="text-foreground tnum mt-0.5 text-[14px] font-extrabold">
        {value}
      </div>
    </div>
  );
}
