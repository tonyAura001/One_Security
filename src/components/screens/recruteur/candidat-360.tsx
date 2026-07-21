"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, Loader2, Mail, Phone, Briefcase } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateFR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/colors";
import {
  fetchEntretiens,
  type CandidatureCard,
  type CandidatureStatut,
} from "@/lib/supabase/data/recrutement";

/** Étapes du pipeline de recrutement (partagées board ↔ fiche). */
export const RECRUIT_STAGES: { id: CandidatureStatut; title: string; tone: Tone }[] = [
  { id: "nouveau", title: "Nouveau", tone: "muted" },
  { id: "preselection", title: "Pré-sélection", tone: "violet" },
  { id: "entretien", title: "Entretien", tone: "warning" },
  { id: "offre", title: "Offre / Décision", tone: "accent" },
  { id: "embauche", title: "Embauché", tone: "success" },
  { id: "refuse", title: "Refusé", tone: "danger" },
];

const STAGE_PILL: Record<CandidatureStatut, PillVariant> = {
  nouveau: "neutral",
  preselection: "violet",
  entretien: "warning",
  offre: "info",
  embauche: "success",
  refuse: "danger",
};

const ENT_PILL: Record<string, PillVariant> = {
  planifie: "info",
  realise: "success",
  annule: "danger",
};

function initials(prenom: string, nom: string) {
  return ((prenom[0] ?? "") + (nom[0] ?? "")).toUpperCase() || "··";
}

export function Candidat360({
  candidature,
  onClose,
  onStatut,
  busy,
}: {
  candidature: CandidatureCard;
  onClose: () => void;
  onStatut: (statut: CandidatureStatut) => void;
  busy?: boolean;
}) {
  const c = candidature.candidat;
  const { data: entretiens, isLoading } = useQuery({
    queryKey: ["entretiens", candidature.id],
    queryFn: () => fetchEntretiens(candidature.id),
  });
  const stage = RECRUIT_STAGES.find((s) => s.id === candidature.statut);

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" onClick={onClose}>
          <ArrowLeft className="size-4" /> Retour au pipeline
        </Button>
        <span className="bg-accent/14 text-accent flex size-11 flex-none items-center justify-center rounded-[13px] text-[15px] font-extrabold">
          {initials(c.prenom, c.nom)}
        </span>
        <div className="min-w-0">
          <div className="text-foreground text-[17px] font-extrabold tracking-[-0.3px]">
            {`${c.prenom} ${c.nom}`.trim() || "—"}
          </div>
          <div className="text-muted text-[12px] font-semibold">
            Candidat · postulé le {formatDateFR(candidature.datePostulation)}
          </div>
        </div>
        <StatusPill variant={STAGE_PILL[candidature.statut]} uppercase className="ml-auto">
          {stage?.title ?? candidature.statut}
        </StatusPill>
      </div>

      <div className="grid grid-cols-1 gap-[15px] lg:grid-cols-2 lg:items-start">
        {/* Coordonnées + poste */}
        <Card className="p-[20px]">
          <div className="text-foreground mb-4 text-[15px] font-extrabold tracking-[-0.3px]">
            Informations candidat
          </div>
          <div className="flex flex-col gap-3">
            <Row icon={Briefcase} label="Poste visé" value={candidature.posteTitre} />
            <Row icon={Mail} label="E-mail" value={c.email || "—"} />
            <Row icon={Phone} label="Téléphone" value={c.telephone || "—"} />
          </div>
          {candidature.messageMotivation && (
            <div className="border-border bg-surface2 mt-4 rounded-xl border p-3.5">
              <div className="text-muted mb-1 text-[10.5px] font-bold tracking-[0.4px] uppercase">
                Message de motivation
              </div>
              <div className="text-foreground text-[12.5px] font-medium">
                {candidature.messageMotivation}
              </div>
            </div>
          )}
        </Card>

        {/* Étape du pipeline */}
        <Card className="p-[20px]">
          <div className="text-foreground mb-1 text-[15px] font-extrabold tracking-[-0.3px]">
            Étape du recrutement
          </div>
          <p className="text-muted mb-3 text-[12px] font-semibold">
            Faites avancer le candidat dans le pipeline.
          </p>
          <div className="flex flex-wrap gap-2">
            {RECRUIT_STAGES.map((s) => {
              const active = s.id === candidature.statut;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={busy || active}
                  onClick={() => onStatut(s.id)}
                  className={cn(
                    "rounded-[10px] border px-3 py-2 text-[12.5px] font-bold transition-colors disabled:opacity-60",
                    active
                      ? "border-accent bg-accent/14 text-accent"
                      : "border-border bg-surface2 text-muted hover:bg-hover hover:text-foreground",
                  )}
                >
                  {s.title}
                  {active ? " · actuel" : ""}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Entretiens */}
        <Card className="p-[20px] lg:col-span-2">
          <div className="text-foreground mb-4 flex items-center gap-2 text-[15px] font-extrabold tracking-[-0.3px]">
            <CalendarClock className="size-4" /> Entretiens
          </div>
          {isLoading ? (
            <div className="text-muted flex items-center gap-2 py-6 text-[12.5px] font-semibold">
              <Loader2 className="size-4 animate-spin" /> Chargement…
            </div>
          ) : !entretiens || entretiens.length === 0 ? (
            <EmptyState title="Aucun entretien planifié pour ce candidat." />
          ) : (
            <div className="flex flex-col">
              {entretiens.map((e, i) => (
                <div
                  key={e.id}
                  className={cn(
                    "flex flex-wrap items-center gap-3 py-3",
                    i < entretiens.length - 1 && "border-border border-b",
                  )}
                >
                  <div className="min-w-0 flex-[1.4]">
                    <div className="text-foreground text-[12.5px] font-bold">
                      {formatDateFR(e.dateHeure, "dd/MM/yyyy · HH:mm")}
                    </div>
                    <div className="text-muted text-[11px] font-semibold capitalize">{e.type}</div>
                  </div>
                  <StatusPill variant={ENT_PILL[e.statut] ?? "neutral"} uppercase>
                    {e.statut}
                  </StatusPill>
                  {e.compteRendu && (
                    <div className="text-muted min-w-0 flex-[2] truncate text-[11.5px] font-medium">
                      {e.compteRendu}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </ScreenContainer>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted flex items-center gap-2 text-[12px] font-semibold">
        <Icon className="text-muted size-4" strokeWidth={1.8} />
        {label}
      </span>
      <span className="text-foreground min-w-0 truncate text-right text-[12.5px] font-bold">{value}</span>
    </div>
  );
}
