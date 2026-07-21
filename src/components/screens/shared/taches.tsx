"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { KanbanBoard, type KanbanColumn } from "@/components/ui/kanban-board";
import { formatDateFR } from "@/lib/format";
import { fetchTaches, updateTacheStatut } from "@/lib/supabase/data/taches";
import { NewTacheDialog } from "./new-tache-dialog";
import { toast } from "@/lib/toast";
import type { Task, TaskStatus } from "@/lib/api/types";
import type { Tone } from "@/lib/colors";
import { toneText, toneTint } from "@/lib/colors";
import { cn } from "@/lib/utils";

type Priority = Task["priority"];

const PRIORITY_META: Record<Priority, { variant: PillVariant; label: string }> = {
  haute: { variant: "danger", label: "Haute" },
  moyenne: { variant: "warning", label: "Moyenne" },
  basse: { variant: "neutral", label: "Basse" },
};

const COLUMNS: KanbanColumn[] = [
  { id: "a_faire", title: "À faire", tone: "muted" },
  { id: "en_cours", title: "En cours", tone: "accent" },
  { id: "en_revision", title: "En révision", tone: "warning" },
  { id: "termine", title: "Terminé", tone: "success" },
];

const AVATAR_TONES: Tone[] = ["accent", "success", "violet", "warning", "danger"];

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

const taskColumn = (t: Task): TaskStatus => t.status ?? (t.done ? "termine" : "a_faire");
const QK = ["taches"] as const;

export function SharedTaches() {
  const qc = useQueryClient();
  const { data: tasks = [] } = useQuery({ queryKey: QK, queryFn: fetchTaches });

  const move = useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: TaskStatus }) =>
      updateTacheStatut(id, statut),
    onMutate: async ({ id, statut }) => {
      await qc.cancelQueries({ queryKey: QK });
      const prev = qc.getQueryData<Task[]>(QK);
      qc.setQueryData<Task[]>(QK, (old) =>
        (old ?? []).map((t) =>
          t.id === id ? { ...t, status: statut, done: statut === "termine" } : t,
        ),
      );
      return { prev };
    },
    onError: (e: unknown, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(QK, ctx.prev);
      toast.error("Déplacement refusé (accès requis).");
    },
    onSuccess: (_d, { statut }) => {
      const label = COLUMNS.find((c) => c.id === statut)?.title ?? statut;
      toast.success(`Tâche déplacée vers « ${label} »`);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QK }),
  });

  const active = tasks.filter((t) => taskColumn(t) !== "termine").length;

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-[19px] font-extrabold tracking-[-0.4px]">
            Tâches &amp; Projets
          </h1>
          <div className="text-muted mt-0.5 text-[12px] font-semibold">
            {active} tâche{active !== 1 ? "s" : ""} active{active !== 1 ? "s" : ""} · glissez une carte pour changer d&apos;étape
          </div>
        </div>
        <NewTacheDialog />
      </div>

      <KanbanBoard<Task>
        columns={COLUMNS}
        items={tasks}
        getId={(t) => t.id}
        getColumn={taskColumn}
        onMove={(id, toColumn) => move.mutate({ id, statut: toColumn as TaskStatus })}
        renderCard={(t) => <TaskCard task={t} />}
      />
    </ScreenContainer>
  );
}

function TaskCard({ task }: { task: Task }) {
  const meta = PRIORITY_META[task.priority];
  const tone = AVATAR_TONES[(task.title.length + task.owner.length) % AVATAR_TONES.length];
  return (
    <Card className="p-[12px]">
      <div className="text-foreground text-[13px] font-bold">{task.title}</div>
      <div className="mt-2.5 flex items-center gap-2">
        <span
          className={cn(
            "flex size-[22px] flex-none items-center justify-center rounded-md text-[9px] font-extrabold",
            toneTint[tone],
            toneText[tone],
          )}
        >
          {initials(task.owner)}
        </span>
        <span className="text-muted truncate text-[11px] font-semibold">{task.owner}</span>
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <StatusPill variant={meta.variant} uppercase>{meta.label}</StatusPill>
        {task.due && (
          <span className="text-muted inline-flex items-center gap-1 text-[10.5px] font-semibold">
            <CalendarDays className="size-3" /> {formatDateFR(task.due, "dd/MM/yy")}
          </span>
        )}
      </div>
    </Card>
  );
}
