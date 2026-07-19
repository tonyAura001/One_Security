"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Percent, TrendingUp, Wallet } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { KpiCard } from "@/components/ui/kpi-card";
import { KanbanBoard, type KanbanColumn } from "@/components/ui/kanban-board";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { NewProspectDialog } from "./new-prospect-dialog";
import {
  STAGE_META,
  type PipelineStage,
  type Prospect,
} from "@/lib/api/prospects";
import {
  fetchProspects,
  updateProspectStage,
  computeProspectStats,
} from "@/lib/supabase/data/prospects";
import { formatFCFA, formatFCFACompact, formatDateFR } from "@/lib/format";
import { toast } from "@/lib/toast";

const COLUMNS: KanbanColumn[] = [
  { id: "nouveau", title: "Nouveau", tone: "muted" },
  { id: "qualifie", title: "Qualifié", tone: "accent" },
  { id: "devis", title: "Devis envoyé", tone: "violet" },
  { id: "negociation", title: "Négociation", tone: "warning" },
  { id: "clos", title: "Gagné / Perdu", tone: "success" },
];

/** Regroupe gagné + perdu dans la colonne « clos ». */
function columnOf(p: Prospect): string {
  return p.stage === "gagne" || p.stage === "perdu" ? "clos" : p.stage;
}

export function ProspectsScreen() {
  // Pipeline réel via Supabase (RLS commerce).
  const { data, isSuccess } = useQuery({
    queryKey: ["prospects"],
    queryFn: fetchProspects,
  });
  const [prospects, setProspects] = useState<Prospect[]>([]);
  useEffect(() => {
    if (data) setProspects(data);
  }, [data]);

  const stats = useMemo(() => computeProspectStats(prospects), [prospects]);
  const live = isSuccess;

  function handleMove(id: string, toColumn: string) {
    const nextStage: PipelineStage =
      toColumn === "clos" ? "gagne" : (toColumn as PipelineStage);
    setProspects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stage: nextStage } : p)),
    );
    // Persiste le déplacement (write RLS DG/RP) — seulement en données réelles.
    if (live) {
      updateProspectStage(id, nextStage).catch(() =>
        toast.error("Déplacement non enregistré (accès écriture requis)"),
      );
    }
  }

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Prospects</h1>
          <p className="page-subtitle">
            Pipeline commercial · glissez une carte pour la faire avancer
          </p>
        </div>
        <NewProspectDialog />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          tone="accent"
          value={String(stats.inPipeline)}
          label="Prospects en pipeline"
        />
        <KpiCard
          icon={Wallet}
          tone="violet"
          value={formatFCFACompact(stats.pipelineValue)}
          label="Valeur du pipeline"
          hint="Récurrent mensuel estimé"
        />
        <KpiCard
          icon={Percent}
          tone="success"
          value={`${stats.conversionRate} %`}
          label="Taux de conversion"
        />
        <KpiCard
          icon={CalendarClock}
          tone="warning"
          value={String(stats.toFollowUp)}
          label="Prospects à relancer"
          hint="Sous 3 jours"
          hintTone="warning"
        />
      </div>

      <Card className="mt-4 p-4">
        <KanbanBoard
          columns={COLUMNS}
          items={prospects}
          getId={(p) => p.id}
          getColumn={columnOf}
          onMove={handleMove}
          renderCard={(p) => <ProspectCard prospect={p} />}
        />
      </Card>
    </ScreenContainer>
  );
}

function ProspectCard({ prospect }: { prospect: Prospect }) {
  const stageMeta = STAGE_META[prospect.stage];
  const closed = prospect.stage === "gagne" || prospect.stage === "perdu";
  return (
    <div className="border-border bg-surface shadow-card rounded-xl border p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-foreground text-[13px] font-extrabold">
          {prospect.company}
        </div>
        {closed && (
          <StatusPill
            variant={prospect.stage === "gagne" ? "success" : "danger"}
            uppercase
          >
            {stageMeta.label}
          </StatusPill>
        )}
      </div>
      <div className="text-muted mt-1 text-[11.5px] font-semibold">
        {prospect.need}
      </div>
      <div className="text-accent tnum mt-2 text-[13px] font-extrabold">
        {formatFCFA(prospect.estimatedMonthly)}
        <span className="text-muted text-[10.5px] font-semibold"> /mois</span>
      </div>
      <div className="border-border mt-2.5 flex items-center justify-between border-t pt-2.5">
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-active text-accent flex size-6 items-center justify-center rounded-full text-[10px] font-bold">
            {prospect.ownerInitials}
          </span>
          <span className="text-muted text-[11px] font-semibold">
            {prospect.owner}
          </span>
        </span>
        {prospect.nextFollowUp && (
          <span className="text-muted inline-flex items-center gap-1 text-[11px] font-semibold">
            <CalendarClock className="size-3.5" />
            {formatDateFR(prospect.nextFollowUp, "d MMM")}
          </span>
        )}
      </div>
    </div>
  );
}
