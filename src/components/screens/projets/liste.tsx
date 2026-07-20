"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Banknote, Layers, TrendingUp } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable } from "@/components/ui/data-table";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusPill } from "@/components/ui/status-pill";
import { NewProjetDialog } from "./new-projet-dialog";
import { fetchProjets, type Projet } from "@/lib/supabase/data/projets";
import { STATUT_META } from "./statut-meta";
import { formatFCFACompact, formatDateFR } from "@/lib/format";

const columns: ColumnDef<Projet>[] = [
  {
    accessorKey: "nom",
    header: "Projet",
    cell: ({ row }) => (
      <span className="text-foreground font-bold">{row.original.nom}</span>
    ),
  },
  {
    id: "siteClient",
    accessorFn: (r) => r.siteClient ?? "",
    header: "Site client",
    cell: ({ row }) => (
      <span className="text-muted font-semibold">
        {row.original.siteClient ?? "—"}
      </span>
    ),
  },
  {
    id: "responsable",
    accessorFn: (r) => r.responsable?.nom ?? "",
    header: "Responsable",
    cell: ({ row }) => {
      const r = row.original.responsable;
      if (!r) return <span className="text-muted font-semibold">— À définir —</span>;
      return (
        <span className="inline-flex items-center gap-2">
          <span className="bg-active text-accent flex size-6 items-center justify-center rounded-full text-[10px] font-bold">
            {r.initials}
          </span>
          <span className="text-foreground font-semibold">{r.nom}</span>
        </span>
      );
    },
  },
  {
    accessorKey: "avancementPct",
    header: "Avancement",
    cell: ({ row }) => (
      <div className="flex min-w-[120px] items-center gap-2">
        <ProgressBar
          value={row.original.avancementPct}
          tone="accent"
          height={6}
          className="flex-1"
        />
        <span className="text-foreground tnum w-9 text-right text-[12px] font-bold">
          {row.original.avancementPct}%
        </span>
      </div>
    ),
  },
  {
    accessorKey: "echeance",
    header: "Échéance",
    cell: ({ row }) => (
      <span className="text-muted font-semibold whitespace-nowrap">
        {formatDateFR(row.original.echeance)}
      </span>
    ),
  },
  {
    accessorKey: "statut",
    header: "Statut",
    cell: ({ row }) => {
      const m = STATUT_META[row.original.statut];
      return <StatusPill variant={m.variant}>{m.label}</StatusPill>;
    },
  },
];

export function ProjetsListe() {
  const router = useRouter();
  const { data: projects = [] } = useQuery({
    queryKey: ["projets"],
    queryFn: fetchProjets,
  });

  const actifs = projects.filter((p) => p.statut !== "termine").length;
  const enCours = projects.filter((p) => p.statut === "en_cours").length;
  const aRisque = projects.filter((p) => p.statut === "a_risque").length;
  const enAvance = projects.filter((p) => p.statut === "en_avance").length;
  const budgetTotal = projects.reduce((s, p) => s + p.budgetTotal, 0);

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projets</h1>
          <p className="page-subtitle">
            {actifs} déploiement{actifs !== 1 ? "s" : ""} en cours
          </p>
        </div>
        <NewProjetDialog />
      </div>

      {/* KPI */}
      <div className="mt-4 grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Layers}
          tone="accent"
          value={String(enCours)}
          label="Déploiements en cours"
        />
        <KpiCard
          icon={AlertTriangle}
          tone="danger"
          value={String(aRisque)}
          label="À risque"
          hint="Action requise"
          hintTone="danger"
        />
        <KpiCard
          icon={TrendingUp}
          tone="success"
          value={String(enAvance)}
          label="En avance"
        />
        <KpiCard
          icon={Banknote}
          tone="violet"
          value={formatFCFACompact(budgetTotal)}
          label="Budget total"
        />
      </div>

      {/* Tableau */}
      <div className="mt-4">
        <DataTable
          columns={columns}
          data={projects}
          searchable
          searchPlaceholder="Rechercher un déploiement, un site…"
          onRowClick={(p) => router.push(`/projets/${p.id}`)}
          emptyTitle="Aucun déploiement"
          emptyDescription="Créez un premier déploiement de dispositif."
        />
      </div>
    </ScreenContainer>
  );
}
