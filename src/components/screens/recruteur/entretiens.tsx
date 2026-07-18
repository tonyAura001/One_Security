"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { formatDateFR } from "@/lib/format";
import { INTERVIEWS } from "@/lib/api/data";
import type { Interview } from "@/lib/api/types";

interface Criterion {
  label: string;
  score: number; // 0–5
}

const CRITERIA: Criterion[] = [
  { label: "Présentation & attitude", score: 4 },
  { label: "Expérience sécurité", score: 5 },
  { label: "Vigilance & réactivité", score: 3 },
  { label: "Condition physique", score: 4 },
  { label: "Références vérifiées", score: 4 },
];

const GLOBAL_SCORE = 82;

function dayPart(date: string) {
  return formatDateFR(date, "dd");
}

function monthPart(date: string) {
  return formatDateFR(date, "MMM").replace(".", "").toUpperCase();
}

function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={
            i < score
              ? "bg-success size-4 rounded-full"
              : "border-border bg-surface2 size-4 rounded-full border"
          }
        />
      ))}
    </div>
  );
}

export function RecruteurEntretiens() {
  const [selected, setSelected] = useState<Interview>(INTERVIEWS[0]);

  return (
    <ScreenContainer>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* Entretiens planifiés */}
        <Card className="p-[18px_20px]">
          <div className="text-foreground mb-3.5 text-[15px] font-extrabold tracking-[-0.3px]">
            Entretiens planifiés
          </div>
          <div className="flex flex-col gap-2.5">
            {INTERVIEWS.map((it) => {
              const active = it.id === selected.id;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setSelected(it)}
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
          <button
            type="button"
            onClick={() => toast.info("Planification d'entretien à venir")}
            className="border-border text-accent hover:bg-active mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed py-[11px] text-[12.5px] font-bold"
          >
            <Plus size={15} strokeWidth={2.2} />
            Planifier un entretien
          </button>
        </Card>

        {/* Grille d'évaluation */}
        <Card className="p-[18px_20px]">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
              Grille d&apos;évaluation
            </div>
            <span className="text-muted text-[12px] font-bold">
              {selected.candidate}
            </span>
          </div>
          <div className="flex flex-col gap-3.5">
            {CRITERIA.map((c) => (
              <div
                key={c.label}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-foreground text-[12.5px] font-bold">
                  {c.label}
                </span>
                <ScoreDots score={c.score} />
              </div>
            ))}
          </div>
          <div className="border-border mt-4 flex items-center justify-between border-t pt-3.5">
            <span className="text-muted text-[12.5px] font-bold">
              Score global
            </span>
            <span className="text-success text-[18px] font-extrabold">
              {GLOBAL_SCORE}
              <span className="text-muted text-[12px] font-bold">/100</span>
            </span>
          </div>
          <div className="mt-3.5 flex gap-2.5">
            <Button
              className="bg-success flex-1 text-white hover:brightness-110"
              onClick={() => toast.success(`${selected.candidate} retenu·e`)}
            >
              Retenir
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => toast.info(`${selected.candidate} écarté·e`)}
            >
              Écarter
            </Button>
          </div>
        </Card>
      </div>
    </ScreenContainer>
  );
}
