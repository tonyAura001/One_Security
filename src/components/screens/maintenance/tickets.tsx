"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { KanbanBoard, type KanbanColumn } from "@/components/ui/kanban-board";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { TICKETS } from "@/lib/api/data";
import { fetchTickets, updateTicketStage } from "@/lib/supabase/data/maintenance";
import type { Ticket, TicketCriticality, TicketStage } from "@/lib/api/types";

const COLUMNS: KanbanColumn[] = [
  { id: "ouvert", title: "OUVERT", tone: "accent" },
  { id: "encours", title: "EN COURS", tone: "warning" },
  { id: "attente", title: "EN ATTENTE", tone: "violet" },
  { id: "resolu", title: "RÉSOLU", tone: "success" },
];

const CRITICALITY_META: Record<
  TicketCriticality,
  { variant: PillVariant; label: string }
> = {
  critique: { variant: "danger", label: "Critique" },
  haute: { variant: "warning", label: "Haute" },
  normale: { variant: "info", label: "Normale" },
  basse: { variant: "neutral", label: "Basse" },
};

export function MaintenanceTickets() {
  const [tickets, setTickets] = useState<Ticket[]>(TICKETS);
  const { data, isSuccess } = useQuery({ queryKey: ["tickets"], queryFn: fetchTickets });
  useEffect(() => {
    if (isSuccess && data.length > 0) setTickets(data);
  }, [isSuccess, data]);
  const live = isSuccess && data.length > 0;

  function handleMove(id: string, toColumn: string) {
    const stage = toColumn as TicketStage;
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, stage } : t)));
    if (live) {
      updateTicketStage(id, stage).catch(() =>
        toast.error("Déplacement non enregistré (accès requis)"),
      );
    }
    const ticket = tickets.find((t) => t.id === id);
    if (ticket) {
      const col = COLUMNS.find((c) => c.id === stage);
      toast.success(`${ticket.ref} déplacé vers « ${col?.title ?? stage} »`);
    }
  }

  return (
    <ScreenContainer>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-muted text-[11px] font-bold tracking-[0.7px]">
          TICKETS DE MAINTENANCE · PAR CRITICITÉ
        </div>
        <Button onClick={() => toast.info("Création d'un nouveau ticket")}>
          <Plus strokeWidth={2.4} />
          Nouveau ticket
        </Button>
      </div>

      <KanbanBoard<Ticket>
        columns={COLUMNS}
        items={tickets}
        getId={(t) => t.id}
        getColumn={(t) => t.stage}
        onMove={handleMove}
        renderCard={(t) => {
          const meta = CRITICALITY_META[t.criticality];
          return (
            <div className="border-border bg-surface shadow-card rounded-xl border p-3">
              <StatusPill variant={meta.variant} uppercase>
                {meta.label}
              </StatusPill>
              <div className="text-foreground mt-2 text-[12px] font-bold">
                {t.title}
              </div>
              <div className="text-muted mt-1 text-[10.5px] font-semibold">
                {t.ref} · {t.site}
              </div>
              <div className="text-muted mt-0.5 text-[10.5px] font-semibold">
                {t.equipment}
              </div>
            </div>
          );
        }}
      />
    </ScreenContainer>
  );
}
