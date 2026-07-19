"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useState } from "react";
import { CalendarClock, Clock, User } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/lib/toast";
import { formatDateFR } from "@/lib/format";
import {
  fetchAgenda,
  updateCandidatureStatut,
  type CandidatureStatut,
} from "@/lib/supabase/data/recrutement";
import { NewEntretienDialog } from "./new-entretien-dialog";

function dayPart(date: string) {
  return formatDateFR(date, "dd");
}
function monthPart(date: string) {
  return formatDateFR(date, "MMM").replace(".", "").toUpperCase();
}

export function RecruteurEntretiens() {
  // Agenda réel via Supabase (RLS : le recruteur ne voit que ses entretiens).
  const { data } = useQuery({ queryKey: ["agenda"], queryFn: fetchAgenda });
  const interviews = data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = interviews.find((i) => i.id === selectedId) ?? interviews[0];

  const qc = useQueryClient();
  const decisionMut = useMutation({
    mutationFn: (v: { candidatureId: string; statut: CandidatureStatut }) =>
      updateCandidatureStatut(v.candidatureId, v.statut),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["agenda"] });
      qc.invalidateQueries({ queryKey: ["candidatures"] });
      toast.success(
        v.statut === "embauche"
          ? "Candidat·e retenu·e (embauche)"
          : "Candidat·e écarté·e",
      );
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /row-level security|policy|permission/i.test(msg)
          ? "Accès refusé pour modifier cette candidature."
          : `Échec : ${msg}`,
      );
    },
  });

  return (
    <ScreenContainer>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* Entretiens planifiés */}
        <Card className="p-[18px_20px]">
          <div className="text-foreground mb-3.5 text-[15px] font-extrabold tracking-[-0.3px]">
            Entretiens planifiés
          </div>
          {interviews.length === 0 ? (
            <EmptyState
              title="Aucun entretien planifié"
              description="Planifiez un entretien pour une candidature."
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {interviews.map((it) => {
                const active = it.id === selected?.id;
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => setSelectedId(it.id)}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                      active
                        ? "border-accent bg-active"
                        : "border-border bg-surface2 hover:bg-active"
                    }`}
                  >
                    <div className="bg-active flex size-11 flex-none flex-col items-center justify-center rounded-[11px]">
                      <span className="text-accent text-[14px] leading-none font-extrabold">
                        {dayPart(it.date)}
                      </span>
                      <span className="text-accent text-[8px] font-bold">
                        {monthPart(it.date)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground truncate text-[13px] font-bold">
                        {it.candidate}
                      </div>
                      <div className="text-muted mt-0.5 truncate text-[11px] font-semibold">
                        {it.role} · {it.time} · {it.interviewer}
                      </div>
                    </div>
                    {it.mode === "présentiel" ? (
                      <StatusPill variant="info" uppercase>
                        En personne
                      </StatusPill>
                    ) : (
                      <StatusPill variant="violet" uppercase>
                        Téléphone
                      </StatusPill>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <NewEntretienDialog />
        </Card>

        {/* Détail + décision */}
        {selected && (
          <Card className="p-[18px_20px]">
            <div className="mb-3.5 flex items-center justify-between">
              <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
                Décision
              </div>
              <span className="text-muted text-[12px] font-bold">
                {selected.candidate}
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              <DetailLine icon={User} label="Candidat" value={selected.candidate} />
              <DetailLine icon={User} label="Poste" value={selected.role} />
              <DetailLine
                icon={CalendarClock}
                label="Date"
                value={`${formatDateFR(selected.date)} · ${selected.time}`}
              />
              <DetailLine icon={User} label="Recruteur" value={selected.interviewer} />
              <DetailLine
                icon={Clock}
                label="Mode"
                value={selected.mode === "présentiel" ? "Présentiel" : "Téléphone"}
              />
            </div>

            <div className="border-border mt-4 border-t pt-3.5">
              <p className="text-muted mb-3 text-[12px] font-semibold">
                À l'issue de l'entretien, tranchez la candidature :
              </p>
              <div className="flex gap-2.5">
                <Button
                  className="bg-success flex-1 text-white hover:brightness-110"
                  disabled={decisionMut.isPending || !selected.candidatureId}
                  onClick={() =>
                    decisionMut.mutate({
                      candidatureId: selected.candidatureId,
                      statut: "embauche",
                    })
                  }
                >
                  Retenir
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={decisionMut.isPending || !selected.candidatureId}
                  onClick={() =>
                    decisionMut.mutate({
                      candidatureId: selected.candidatureId,
                      statut: "refuse",
                    })
                  }
                >
                  Écarter
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </ScreenContainer>
  );
}

function DetailLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted inline-flex items-center gap-2 text-[12px] font-bold">
        <Icon className="size-3.5" strokeWidth={1.9} />
        {label}
      </span>
      <span className="text-foreground truncate text-[12.5px] font-bold">
        {value}
      </span>
    </div>
  );
}
