"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, Layers, User } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { getProject, STATUT_META } from "@/lib/api/projects";
import { formatDateFR, formatFCFA } from "@/lib/format";

/**
 * Vue détail d'un déploiement. Phase 1 : en-tête + synthèse.
 * (Onglets Aperçu/Tâches/Kanban… ajoutés en phase 2.)
 */
export function ProjectDetail({ id }: { id: string }) {
  const router = useRouter();
  const project = getProject(id);

  if (!project) {
    return (
      <ScreenContainer>
        <EmptyState
          icon={Layers}
          title="Déploiement introuvable"
          description="Ce projet n’existe pas ou a été archivé."
        />
      </ScreenContainer>
    );
  }

  const m = STATUT_META[project.statut];

  return (
    <ScreenContainer>
      <button
        onClick={() => router.push("/projets")}
        className="text-muted hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold transition-colors"
      >
        <ArrowLeft className="size-4" /> Retour aux projets
      </button>

      <Card className="p-[18px_20px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="bg-active text-accent flex size-10 flex-none items-center justify-center rounded-xl">
              <Layers className="size-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h1 className="text-foreground text-[18px] font-extrabold tracking-[-0.3px]">
                {project.nom}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusPill variant="info">{project.siteClient}</StatusPill>
                <StatusPill variant={m.variant}>{m.label}</StatusPill>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px]">
          <span className="text-muted inline-flex items-center gap-1.5 font-semibold">
            <User className="size-3.5" /> Responsable ·{" "}
            <span className="text-foreground">{project.responsable.nom}</span>
          </span>
          <span className="text-muted inline-flex items-center gap-1.5 font-semibold">
            <CalendarClock className="size-3.5" /> Échéance ·{" "}
            <span className="text-foreground">
              {formatDateFR(project.echeance)}
            </span>
          </span>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-[15px] sm:grid-cols-2">
        <Card className="p-[18px_20px]">
          <div className="text-muted text-[11px] font-bold tracking-[0.4px] uppercase">
            Avancement
          </div>
          <div className="text-foreground mt-1 text-[22px] font-extrabold">
            {project.avancementPct}%
          </div>
          <ProgressBar
            value={project.avancementPct}
            tone="accent"
            height={6}
            className="mt-2"
          />
        </Card>
        <Card className="p-[18px_20px]">
          <div className="text-muted text-[11px] font-bold tracking-[0.4px] uppercase">
            Budget engagé · {project.budgetPct}%
          </div>
          <div className="text-foreground mt-1 text-[22px] font-extrabold">
            {formatFCFA(project.budgetEngage)}
          </div>
          <div className="text-muted mt-0.5 text-[11.5px] font-semibold">
            sur {formatFCFA(project.budgetTotal)}
          </div>
        </Card>
      </div>

      <Card className="text-muted mt-4 p-6 text-center text-[13px] font-semibold">
        Onglets (Aperçu · Tâches · Kanban · Documents · Finance · Réunions ·
        Décisions · Journal) — en préparation.
      </Card>
    </ScreenContainer>
  );
}
