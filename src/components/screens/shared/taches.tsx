"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { formatDateFR } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchTaches, toggleTacheDone } from "@/lib/supabase/data/taches";
import { NewTacheDialog } from "./new-tache-dialog";
import { toast } from "@/lib/toast";
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
  // Tâches réelles via Supabase (RLS) ; repli démo si accès refusé.
  const { data, isSuccess } = useQuery({ queryKey: ["taches"], queryFn: fetchTaches });
  const tasks = useMemo(() => data ?? [], [data]);
  const live = isSuccess;

  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setDone(Object.fromEntries(tasks.map((t) => [t.id, t.done])));
  }, [tasks]);

  const toggle = (id: string) => {
    const next = !done[id];
    setDone((prev) => ({ ...prev, [id]: next }));
    if (live) {
      toggleTacheDone(id, next).catch(() =>
        toast.error("Modification refusée (accès requis)"),
      );
    }
  };

  const remaining = tasks.filter((t) => !done[t.id]).length;

  return (
    <ScreenContainer>
      {/* Task list */}
      <Card className="p-[18px_20px]">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
            Tâches en cours
          </div>
          <div className="flex items-center gap-2.5">
            <StatusPill variant="info" uppercase>
              {remaining} à faire
            </StatusPill>
            <NewTacheDialog />
          </div>
        </div>

        <div className="flex flex-col">
          {tasks.length === 0 && (
            <EmptyState title="Aucune donnée pour le moment" />
          )}
          {tasks.map((task, i) => {
            const isDone = done[task.id];
            const meta = PRIORITY_META[task.priority];
            const tone = AVATAR_TONES[i % AVATAR_TONES.length];
            return (
              <div
                key={task.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 py-3.5",
                  i < tasks.length - 1 && "border-border border-b",
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
    </ScreenContainer>
  );
}
