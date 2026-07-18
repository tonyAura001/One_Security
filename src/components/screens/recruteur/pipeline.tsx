"use client";

import { useState } from "react";
import { Plus, Star } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KanbanBoard, type KanbanColumn } from "@/components/ui/kanban-board";
import { toast } from "@/lib/toast";
import { CANDIDATES } from "@/lib/api/data";
import type { Candidate, CandidateStage } from "@/lib/api/types";

const COLUMNS: KanbanColumn[] = [
  { id: "recus", title: "Candidature", tone: "accent" },
  { id: "preselection", title: "Présélection", tone: "violet" },
  { id: "entretien", title: "Entretien", tone: "warning" },
  { id: "test", title: "Vérification", tone: "accent" },
  { id: "embauche", title: "Décision", tone: "success" },
];

function CandidateCard({ candidate }: { candidate: Candidate }) {
  const ratingTone =
    candidate.rating >= 5
      ? "text-success"
      : candidate.rating >= 4
        ? "text-warning"
        : "text-muted";
  return (
    <Card className="p-[11px]">
      <div className="flex items-center gap-2.5">
        <div className="bg-accent/14 text-accent flex size-9 flex-none items-center justify-center rounded-lg text-[11px] font-extrabold">
          {candidate.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-foreground truncate text-[12.5px] font-bold">
            {candidate.name}
          </div>
          <div className="text-muted mt-0.5 truncate text-[10.5px] font-semibold">
            {candidate.role}
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={i < candidate.rating ? ratingTone : "text-border"}
            size={12}
            strokeWidth={1.8}
            fill={i < candidate.rating ? "currentColor" : "none"}
          />
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="bg-surface2 text-muted rounded-full px-2 py-[3px] text-[10px] font-extrabold">
          {candidate.source}
        </span>
        <span className="text-muted text-[10.5px] font-semibold">
          {candidate.experience}
        </span>
      </div>
    </Card>
  );
}

export function RecruteurPipeline() {
  const [candidates, setCandidates] = useState<Candidate[]>(CANDIDATES);

  function handleMove(id: string, toColumn: string) {
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, stage: toColumn as CandidateStage } : c,
      ),
    );
    const label = COLUMNS.find((col) => col.id === toColumn)?.title ?? toColumn;
    toast.success(`Candidat déplacé vers « ${label} »`);
  }

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted text-[11px] font-bold tracking-[0.7px]">
          PIPELINE CANDIDATS · {candidates.length} EN COURS · POSTE : AGENT DE
          SÉCURITÉ
        </div>
        <Button
          size="sm"
          onClick={() => toast.info("Formulaire de candidature à venir")}
        >
          <Plus size={15} strokeWidth={2.2} />
          Nouveau candidat
        </Button>
      </div>

      <KanbanBoard<Candidate>
        columns={COLUMNS}
        items={candidates}
        getId={(c) => c.id}
        getColumn={(c) => c.stage}
        renderCard={(c) => <CandidateCard candidate={c} />}
        onMove={handleMove}
      />
    </ScreenContainer>
  );
}
