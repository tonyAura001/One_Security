"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { formatDateFR } from "@/lib/format";
import { INTERVENTIONS } from "@/lib/api/data";
import type { Intervention } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Status = Intervention["status"];

const STATUS_META: Record<Status, { variant: PillVariant; label: string }> = {
  planifiee: { variant: "warning", label: "Planifiée" },
  terminee: { variant: "success", label: "Terminée" },
};

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted mb-1.5 text-[11px] font-bold tracking-[0.3px] uppercase">
        {label}
      </div>
      <div className="border-border bg-surface2 text-foreground rounded-[10px] border px-3.5 py-2.5 text-[12.5px] font-semibold">
        {value}
      </div>
    </div>
  );
}

export function MaintenanceInterventions() {
  const [selectedId, setSelectedId] = useState<string>(INTERVENTIONS[0].id);
  const selected =
    INTERVENTIONS.find((i) => i.id === selectedId) ?? INTERVENTIONS[0];
  const selectedMeta = STATUS_META[selected.status];

  return (
    <ScreenContainer>
      {/* Detail report card */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
            Rapport d&apos;intervention — {selected.ref}
          </div>
          <StatusPill variant={selectedMeta.variant} uppercase>
            {selectedMeta.label}
          </StatusPill>
        </div>

        <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Site" value={selected.site} />
          <Field label="Technicien" value={selected.agent} />
        </div>

        <div className="mb-3.5">
          <div className="text-muted mb-1.5 text-[11px] font-bold tracking-[0.3px] uppercase">
            Résumé de l&apos;intervention
          </div>
          <div className="border-border bg-surface2 text-foreground min-h-[52px] rounded-[10px] border px-3.5 py-2.5 text-[12.5px] leading-relaxed font-semibold">
            {selected.summary}
          </div>
        </div>

        <div className="mb-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Date" value={formatDateFR(selected.date)} />
          <Field label="Durée" value={formatDuration(selected.durationMin)} />
        </div>

        <div className="text-muted mb-2 text-[11px] font-bold tracking-[0.3px] uppercase">
          Photos avant / après
        </div>
        <div className="mb-[18px] grid grid-cols-2 gap-3">
          {["Avant", "Après"].map((label) => (
            <div
              key={label}
              className="border-border bg-surface2 text-muted flex aspect-video flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed"
            >
              <ImageIcon className="size-6" strokeWidth={1.6} aria-hidden />
              <span className="text-[11px] font-bold">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2.5">
          <Button
            className="bg-success flex-1 text-white hover:brightness-110"
            onClick={() =>
              toast.success(`Intervention ${selected.ref} clôturée`)
            }
          >
            Clôturer l&apos;intervention
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info("Rapport enregistré")}
          >
            Enregistrer
          </Button>
        </div>
      </Card>

      {/* Intervention list */}
      <Card className="mt-4 p-[18px_20px]">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
            Historique des interventions
          </div>
          <span className="text-muted text-[12px] font-bold">
            {INTERVENTIONS.length} au total
          </span>
        </div>

        {/* Header */}
        <div className="border-border text-muted flex items-center gap-3.5 border-b px-1 pb-2.5 text-[10.5px] font-bold tracking-[0.4px] uppercase">
          <div className="w-[100px]">Date</div>
          <div className="w-[150px]">Site</div>
          <div className="flex-1">Intervention</div>
          <div className="w-[130px]">Technicien</div>
          <div className="w-[80px] text-center">Durée</div>
          <div className="w-[110px] text-right">Statut</div>
        </div>

        {/* Rows */}
        {INTERVENTIONS.map((it, i) => {
          const meta = STATUS_META[it.status];
          const active = it.id === selectedId;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => setSelectedId(it.id)}
              className={cn(
                "hover:bg-hover flex w-full items-center gap-3.5 px-1 py-3 text-left transition-colors",
                i < INTERVENTIONS.length - 1 && "border-border border-b",
                active && "bg-active",
              )}
            >
              <div className="tnum text-muted w-[100px] text-[11.5px] font-bold">
                {formatDateFR(it.date, "dd/MM")}
              </div>
              <div className="text-foreground w-[150px] truncate text-[12px] font-bold">
                {it.site}
              </div>
              <div className="text-muted flex-1 truncate text-[12px] font-semibold">
                {it.summary}
              </div>
              <div className="text-muted w-[130px] truncate text-[11.5px] font-semibold">
                {it.agent}
              </div>
              <div className="tnum text-muted w-[80px] text-center text-[11.5px] font-semibold">
                {formatDuration(it.durationMin)}
              </div>
              <div className="flex w-[110px] justify-end">
                <StatusPill variant={meta.variant} uppercase>
                  {meta.label}
                </StatusPill>
              </div>
            </button>
          );
        })}
      </Card>
    </ScreenContainer>
  );
}
