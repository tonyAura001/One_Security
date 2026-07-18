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
import { toneBar } from "@/lib/colors";
import { cn } from "@/lib/utils";

export interface KanbanColumn {
  id: string;
  title: string;
  tone: Tone;
}

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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
  });
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
    <div className="flex min-w-[260px] flex-1 flex-col">
      <div className="mb-2.5 flex items-center gap-2">
        <span className={cn("size-2.5 rounded-full", toneBar[column.tone])} />
        <span className="text-foreground text-[12.5px] font-extrabold">
          {column.title}
        </span>
        <span className="bg-surface2 text-muted ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold">
          {count}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-2.5 rounded-xl border border-transparent p-1 transition-colors",
          isOver && "border-accent bg-active border-dashed",
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
      <div className="flex gap-4 overflow-x-auto pb-2">
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
        {activeItem ? (
          <div className="rotate-2 opacity-95">{renderCard(activeItem)}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
