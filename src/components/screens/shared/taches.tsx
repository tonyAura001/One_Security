"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Trash2 } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { KanbanBoard, type KanbanColumn } from "@/components/ui/kanban-board";
import {
  Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatDateFR } from "@/lib/format";
import { fetchTaches, updateTacheStatut, updateTache, deleteTache } from "@/lib/supabase/data/taches";
import { fetchUserOptions } from "@/lib/supabase/data/options";
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
  return name.replace(/[’'.]/g, " ").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const taskColumn = (t: Task): TaskStatus => t.status ?? (t.done ? "termine" : "a_faire");
const QK = ["taches"] as const;

const field =
  "w-full rounded-[10px] border border-border bg-surface2 px-3 py-2 text-[13px] font-semibold text-foreground outline-none focus:border-accent/50";
const label = "text-muted mb-1 block text-[11px] font-bold tracking-[0.4px] uppercase";

export function SharedTaches() {
  const qc = useQueryClient();
  const { data: tasks = [] } = useQuery({ queryKey: QK, queryFn: fetchTaches });
  const [selected, setSelected] = useState<Task | null>(null);

  const move = useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: TaskStatus }) => updateTacheStatut(id, statut),
    onMutate: async ({ id, statut }) => {
      await qc.cancelQueries({ queryKey: QK });
      const prev = qc.getQueryData<Task[]>(QK);
      qc.setQueryData<Task[]>(QK, (old) => (old ?? []).map((t) => (t.id === id ? { ...t, status: statut, done: statut === "termine" } : t)));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(QK, ctx.prev); toast.error("Déplacement refusé (accès requis)."); },
    onSuccess: (_d, { statut }) => {
      const l = COLUMNS.find((c) => c.id === statut)?.title ?? statut;
      toast.success(`Tâche déplacée vers « ${l} »`);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QK }),
  });

  const active = tasks.filter((t) => taskColumn(t) !== "termine").length;
  // Fiche vivante : reflète la donnée à jour après édition/déplacement.
  const detail = selected ? tasks.find((t) => t.id === selected.id) ?? selected : null;

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-foreground text-[19px] font-extrabold tracking-[-0.4px]">Tâches &amp; Projets</h1>
          <div className="text-muted mt-0.5 text-[12px] font-semibold">
            {active} tâche{active !== 1 ? "s" : ""} active{active !== 1 ? "s" : ""} · cliquez une carte pour la voir/modifier · glissez pour changer d&apos;étape
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
        renderCard={(t) => <TaskCard task={t} onClick={() => setSelected(t)} />}
      />

      {detail && <TaskDetailDialog task={detail} onClose={() => setSelected(null)} />}
    </ScreenContainer>
  );
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const meta = PRIORITY_META[task.priority];
  const tone = AVATAR_TONES[(task.title.length + task.owner.length) % AVATAR_TONES.length];
  return (
    <Card className="hover:shadow-card-hover cursor-pointer p-[12px] transition-shadow" onClick={onClick}>
      <div className="text-foreground text-[13px] font-bold">{task.title}</div>
      <div className="mt-2.5 flex items-center gap-2">
        <span className={cn("flex size-[22px] flex-none items-center justify-center rounded-md text-[9px] font-extrabold", toneTint[tone], toneText[tone])}>{initials(task.owner)}</span>
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

function TaskDetailDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: users = [] } = useQuery({ queryKey: ["user-options"], queryFn: fetchUserOptions });
  const [titre, setTitre] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priorite, setPriorite] = useState<Priority>(task.priority);
  const [echeance, setEcheance] = useState(task.due ?? "");
  const [assigneAId, setAssigneAId] = useState(task.assigneAId ?? "");

  useEffect(() => {
    setTitre(task.title); setDescription(task.description ?? ""); setPriorite(task.priority);
    setEcheance(task.due ?? ""); setAssigneAId(task.assigneAId ?? "");
  }, [task]);

  const stageLabel = COLUMNS.find((c) => c.id === taskColumn(task))?.title ?? "—";

  const save = useMutation({
    mutationFn: () => updateTache(task.id, { titre, description, priorite, echeance: echeance || null, assigneAId: assigneAId || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK }); toast.success("Tâche modifiée"); onClose(); },
    onError: () => toast.error("Modification refusée (accès requis)."),
  });
  const remove = useMutation({
    mutationFn: () => deleteTache(task.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK }); toast.success("Tâche supprimée"); onClose(); },
    onError: () => toast.error("Suppression refusée (accès requis)."),
  });

  const valid = titre.trim().length > 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Détail de la tâche
            <StatusPill variant="info" uppercase>{stageLabel}</StatusPill>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (valid) save.mutate(); }} className="flex flex-col gap-3.5">
          <div>
            <label className={label}>Titre *</label>
            <input className={field} value={titre} onChange={(e) => setTitre(e.target.value)} autoFocus />
          </div>
          <div>
            <label className={label}>Description</label>
            <textarea className={`${field} min-h-[90px] resize-y`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails de la tâche…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Priorité</label>
              <select className={field} value={priorite} onChange={(e) => setPriorite(e.target.value as Priority)}>
                <option value="haute">Haute</option>
                <option value="moyenne">Moyenne</option>
                <option value="basse">Basse</option>
              </select>
            </div>
            <div>
              <label className={label}>Échéance</label>
              <input type="date" className={field} value={echeance} onChange={(e) => setEcheance(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={label}>Assignée à</label>
            <select className={field} value={assigneAId} onChange={(e) => setAssigneAId(e.target.value)}>
              <option value="">— Non assignée —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </div>
          <DialogFooter className="mt-1 items-center justify-between">
            <Button type="button" variant="destructive" size="sm" disabled={remove.isPending} onClick={() => remove.mutate()}>
              <Trash2 className="size-3.5" /> Supprimer
            </Button>
            <div className="flex gap-2">
              <DialogClose asChild><Button type="button" variant="outline" size="sm">Fermer</Button></DialogClose>
              <Button type="submit" size="sm" disabled={!valid || save.isPending}>{save.isPending ? "Enregistrement…" : "Enregistrer"}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
