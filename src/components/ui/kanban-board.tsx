"use client";

import { useId, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Tone } from "@/lib/colors";
import { cn } from "@/lib/utils";

export interface KanbanColumn {
  id: string;
  title: string;
  tone: Tone;
}

/** Couleur pleine des en-têtes de colonne (façon référence). */
const TONE_SOLID: Record<Tone, string> = {
  accent: "var(--accent)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  violet: "var(--violet)",
  muted: "#64748b",
  foreground: "#475569",
};

interface KanbanBoardProps<T> {
  columns: KanbanColumn[];
  items: T[];
  getId: (item: T) => string;
  getColumn: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  /** Called when a card is dropped on a different column. */
  onMove: (id: string, toColumn: string) => void;
}

function DraggableCard({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab touch-none rounded-xl active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      {children}
    </div>
  );
}

function Column({
  column,
  count,
  children,
}: {
  column: KanbanColumn;
  count: number;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div className="flex min-w-[240px] flex-1 flex-col">
      {/* En-tête coloré pleine largeur */}
      <div
        className="flex items-center justify-between rounded-t-xl px-3.5 py-2.5 text-white"
        style={{ background: TONE_SOLID[column.tone] }}
      >
        <span className="text-[12.5px] font-extrabold tracking-[-0.2px]">{column.title}</span>
        <span className="rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-extrabold">
          {count}
        </span>
      </div>
      {/* Corps visible (colonnes vides incluses) */}
      <div
        ref={setNodeRef}
        className={cn(
          "border-border bg-surface2/40 flex min-h-[320px] flex-1 flex-col gap-2.5 rounded-b-xl border border-t-0 p-2 transition-colors",
          isOver && "border-accent bg-accent/10 border-dashed",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Configurable Kanban board with cross-column drag & drop. */
export function KanbanBoard<T>({
  columns,
  items,
  getId,
  getColumn,
  renderCard,
  onMove,
}: KanbanBoardProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const activeItem = items.find((i) => getId(i) === activeId) ?? null;

  function handleStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function handleEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const id = String(active.id);
    const toColumn = String(over.id);
    const item = items.find((i) => getId(i) === id);
    if (item && getColumn(item) !== toColumn) onMove(id, toColumn);
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      onDragStart={handleStart}
      onDragEnd={handleEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((col) => {
          const colItems = items.filter((i) => getColumn(i) === col.id);
          return (
            <Column key={col.id} column={col} count={colItems.length}>
              {colItems.map((item) => (
                <DraggableCard key={getId(item)} id={getId(item)}>
                  {renderCard(item)}
                </DraggableCard>
              ))}
            </Column>
          );
        })}
      </div>
      <DragOverlay>
        {activeItem ? <div className="rotate-2 opacity-95">{renderCard(activeItem)}</div> : null}
      </DragOverlay>
    </DndContext>
  );
}
