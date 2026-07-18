"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { formatDateFR } from "@/lib/format";
import { TASKS } from "@/lib/api/data";
import type { Task } from "@/lib/api/types";
import type { Tone } from "@/lib/colors";
import { toneText, toneTint } from "@/lib/colors";
import { cn } from "@/lib/utils";

type Priority = Task["priority"];

const PRIORITY_META: Record<Priority, { variant: PillVariant; label: string }> =
  {
    haute: { variant: "danger", label: "Haute" },
    moyenne: { variant: "warning", label: "Moyenne" },
    basse: { variant: "neutral", label: "Basse" },
  };

const AVATAR_TONES: Tone[] = [
  "accent",
  "success",
  "violet",
  "warning",
  "danger",
];

interface Meeting {
  day: string;
  month: string;
  title: string;
  detail: string;
}

const MEETINGS: Meeting[] = [
  {
    day: "06",
    month: "JUIL",
    title: "Réunion direction hebdo",
    detail: "Lundi · 09:00 · Salle A",
  },
  {
    day: "07",
    month: "JUIL",
    title: "Point recouvrement",
    detail: "Mardi · 11:00 · Visio",
  },
  {
    day: "08",
    month: "JUIL",
    title: "Entretiens candidats (Khadija, Pape)",
    detail: "Mercredi · 14:00 · Bureau RH",
  },
  {
    day: "09",
    month: "JUIL",
    title: "Négociation contrat Eiffage",
    detail: "Jeudi · 10:30 · Chez le client",
  },
];

function initials(name: string): string {
  return name
    .replace(/[’'.]/g, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function SharedTaches() {
  const [done, setDone] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TASKS.map((t) => [t.id, t.done])),
  );

  const toggle = (id: string) =>
    setDone((prev) => ({ ...prev, [id]: !prev[id] }));

  const remaining = TASKS.filter((t) => !done[t.id]).length;

  return (
    <ScreenContainer>
      {/* Task list */}
      <Card className="p-[18px_20px]">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
            Tâches en cours
          </div>
          <StatusPill variant="info" uppercase>
            {remaining} à faire
          </StatusPill>
        </div>

        <div className="flex flex-col">
          {TASKS.map((task, i) => {
            const isDone = done[task.id];
            const meta = PRIORITY_META[task.priority];
            const tone = AVATAR_TONES[i % AVATAR_TONES.length];
            return (
              <div
                key={task.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 py-3.5",
                  i < TASKS.length - 1 && "border-border border-b",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle(task.id)}
                  role="checkbox"
                  aria-checked={isDone}
                  aria-label={`Marquer « ${task.title} » comme ${isDone ? "à faire" : "terminée"}`}
                  className={cn(
                    "flex size-[22px] flex-none items-center justify-center rounded-[7px] border transition-colors",
                    isDone
                      ? "bg-success border-transparent text-white"
                      : "border-border bg-surface2 hover:border-accent text-transparent",
                  )}
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </button>

                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "text-[13px] font-bold",
                      isDone
                        ? "text-muted decoration-muted line-through"
                        : "text-foreground",
                    )}
                  >
                    {task.title}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={cn(
                        "flex size-[22px] flex-none items-center justify-center rounded-md text-[9px] font-extrabold",
                        toneTint[tone],
                        toneText[tone],
                      )}
                    >
                      {initials(task.owner)}
                    </span>
                    <span className="text-muted text-[11px] font-semibold">
                      {task.owner}
                    </span>
                  </div>
                </div>

                <StatusPill variant={meta.variant} uppercase>
                  {meta.label}
                </StatusPill>
                <div className="text-muted w-[120px] text-right text-[11.5px] font-semibold">
                  {formatDateFR(task.due)}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Meetings */}
      <Card className="mt-[15px] p-[18px_20px]">
        <div className="text-foreground mb-3.5 text-[15px] font-extrabold tracking-[-0.3px]">
          Réunions à venir
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MEETINGS.map((m) => (
            <div
              key={m.title}
              className="border-border bg-surface2 flex items-center gap-3.5 rounded-xl border px-4 py-3"
            >
              <div className="bg-accent/14 flex size-[46px] flex-none flex-col items-center justify-center rounded-[11px]">
                <span className="text-accent text-[15px] leading-none font-extrabold">
                  {m.day}
                </span>
                <span className="text-accent text-[9px] font-bold">
                  {m.month}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-foreground text-[13px] font-bold">
                  {m.title}
                </div>
                <div className="text-muted mt-0.5 text-[11px] font-semibold">
                  {m.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </ScreenContainer>
  );
}
