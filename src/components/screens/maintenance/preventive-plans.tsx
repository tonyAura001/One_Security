"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { toast } from "@/lib/toast";
import { formatDateFR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NewPlanDialog } from "./new-plan-dialog";
import {
  fetchPlans,
  genererTicketPlan,
  type PlanMaintenance,
} from "@/lib/supabase/data/plans-maintenance";

const PERIODE_LABEL: Record<string, string> = {
  mensuelle: "Mensuel",
  trimestrielle: "Trimestriel",
  semestrielle: "Semestriel",
  annuelle: "Annuel",
};

function isDue(dateISO: string): boolean {
  const d = new Date(dateISO);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d <= today;
}

/** Panneau des plans de maintenance préventive (au-dessus du kanban tickets). */
export function PreventivePlans() {
  const qc = useQueryClient();
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["plans-maintenance"],
    queryFn: fetchPlans,
  });

  const generate = useMutation({
    mutationFn: (id: string) => genererTicketPlan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans-maintenance"] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket préventif généré", "Échéance repoussée d'une période");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /accès refusé|row-level|42501/i.test(msg)
          ? "Accès refusé pour générer un ticket."
          : `Échec : ${msg}`,
      );
    },
  });

  const actifs = plans.filter((p) => p.actif);

  return (
    <Card className="mb-4 p-[16px_18px]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-foreground flex items-center gap-2 text-[13px] font-extrabold tracking-[-0.2px]">
          <CalendarClock className="size-4" />
          Maintenance préventive
          <span className="text-muted text-[12px] font-bold">{actifs.length}</span>
        </div>
        <NewPlanDialog />
      </div>

      {isLoading ? (
        <p className="text-muted text-[12.5px] font-semibold">Chargement…</p>
      ) : actifs.length === 0 ? (
        <p className="text-muted text-[12.5px] font-semibold">
          Aucun plan préventif actif. Créez-en un pour planifier des contrôles récurrents.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--border)]">
          {actifs.map((p: PlanMaintenance) => {
            const due = isDue(p.prochaineEcheance);
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="bg-active text-accent flex size-8 flex-none items-center justify-center rounded-lg">
                  <Wrench className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-foreground truncate text-[12.5px] font-bold">
                    {p.titre}
                  </div>
                  <div className="text-muted mt-0.5 text-[10.5px] font-semibold">
                    {PERIODE_LABEL[p.periodicite] ?? p.periodicite}
                    {p.site ? ` · ${p.site}` : ""}
                    {p.equipement ? ` · ${p.equipement}` : ""}
                  </div>
                </div>
                <StatusPill variant={due ? "danger" : "neutral"}>
                  {due ? "À échéance" : formatDateFR(p.prochaineEcheance)}
                </StatusPill>
                <Button
                  size="sm"
                  variant={due ? "default" : "outline"}
                  className={cn(!due && "opacity-90")}
                  disabled={generate.isPending}
                  onClick={() => generate.mutate(p.id)}
                >
                  Générer le ticket
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
