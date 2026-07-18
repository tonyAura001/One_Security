"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { useSession } from "@/lib/store/session";
import { getTasks, type TaskPriority } from "@/lib/api/workspace";
import { cn } from "@/lib/utils";

const PRIO: Record<TaskPriority, { label: string; chip: string }> = {
  haute: { label: "Haute", chip: "bg-red/10 text-red" },
  moyenne: { label: "Moyenne", chip: "bg-amber/10 text-amber" },
  basse: { label: "Basse", chip: "bg-blue/10 text-blue" },
};

export function MesTachesScreen() {
  const { role } = useSession();
  const base = useMemo(() => getTasks(role), [role]);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const key = (id: string) => `${role}:${id}`;
  const tasks = base.map((t) => ({
    ...t,
    done: overrides[key(t.id)] ?? t.done,
  }));
  const toggle = (id: string, current: boolean) =>
    setOverrides((o) => ({ ...o, [key(id)]: !current }));

  const todo = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mes tâches</h1>
          <p className="page-subtitle">
            {todo.length} à faire · {done.length} terminées aujourd’hui
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {todo.map((t) => (
          <Row key={t.id} task={t} onToggle={() => toggle(t.id, t.done)} />
        ))}
      </div>

      {done.length > 0 && (
        <>
          <p className="text-text-muted mt-6 mb-2 text-[11px] font-semibold tracking-widest uppercase">
            Terminées
          </p>
          <div className="space-y-2">
            {done.map((t) => (
              <Row key={t.id} task={t} onToggle={() => toggle(t.id, t.done)} />
            ))}
          </div>
        </>
      )}

      {todo.length === 0 && done.length === 0 && (
        <div className="text-text-muted py-16 text-center text-sm">
          Aucune tâche
        </div>
      )}
    </ScreenContainer>
  );
}

function Row({
  task,
  onToggle,
}: {
  task: {
    title: string;
    context: string;
    priority: TaskPriority;
    done: boolean;
  };
  onToggle: () => void;
}) {
  const prio = PRIO[task.priority];
  return (
    <div className="border-surface-border bg-surface flex items-center gap-3 rounded-xl border p-3.5">
      <button
        onClick={onToggle}
        role="checkbox"
        aria-checked={task.done}
        aria-label={
          task.done ? "Marquer comme à faire" : "Marquer comme terminée"
        }
        className={cn(
          "flex size-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors",
          task.done
            ? "border-green bg-green text-white"
            : "border-surface-border hover:border-blue",
        )}
      >
        {task.done && <Check size={13} strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium",
            task.done ? "text-text-muted line-through" : "text-text-primary",
          )}
        >
          {task.title}
        </p>
        <p className="text-2xs text-text-muted">{task.context}</p>
      </div>
      <span
        className={cn(
          "text-2xs rounded-full px-2 py-0.5 font-semibold",
          task.done ? "bg-surface-hover text-text-muted" : prio.chip,
        )}
      >
        {prio.label}
      </span>
    </div>
  );
}
