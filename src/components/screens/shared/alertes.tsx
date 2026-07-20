"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bell, Box, FileWarning, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { fetchAlertes, type AlertSeverity } from "@/lib/supabase/data/alertes";

const SEV: Record<AlertSeverity, { label: string; dot: string; text: string }> = {
  critique: { label: "Critique", dot: "bg-danger", text: "text-danger" },
  attention: { label: "Attention", dot: "bg-warning", text: "text-warning" },
  info: { label: "Info", dot: "bg-accent", text: "text-accent" },
};

const KIND_ICON: Record<string, LucideIcon> = {
  facture: FileWarning,
  contrat: ShieldAlert,
  stock: Box,
};

type Filtre = "toutes" | AlertSeverity;

export function AlertesScreen() {
  const { data: alerts = [] } = useQuery({ queryKey: ["alertes"], queryFn: fetchAlertes });
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [treated, setTreated] = useState<Set<string>>(new Set());

  const active = alerts.filter((a) => !treated.has(a.id));
  const counts = useMemo(
    () => ({
      critique: active.filter((a) => a.severity === "critique").length,
      attention: active.filter((a) => a.severity === "attention").length,
      info: active.filter((a) => a.severity === "info").length,
    }),
    [active],
  );
  const shown = active.filter((a) => filtre === "toutes" || a.severity === filtre);

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted flex items-center gap-2 text-[11px] font-bold tracking-[0.7px]">
          <Bell className="size-4" /> ALERTES ACTIVES · {active.length}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["toutes", "critique", "attention", "info"] as Filtre[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={cn(
                "rounded-[9px] px-3 py-1.5 text-[12px] font-bold transition-colors",
                filtre === f ? "bg-accent/14 text-accent" : "text-muted hover:bg-hover",
              )}
            >
              {f === "toutes" ? "Toutes" : SEV[f].label}
              {f !== "toutes" ? ` · ${counts[f]}` : ""}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Aucune alerte"
          description="Aucune facture en retard, contrat expirant ou stock bas."
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {shown.map((a) => {
            const sev = SEV[a.severity];
            const Icon = KIND_ICON[a.kind] ?? AlertTriangle;
            return (
              <Card key={a.id} className="flex flex-wrap items-center gap-3.5 p-[15px_18px]">
                <span className={cn("flex size-10 flex-none items-center justify-center rounded-xl bg-surface2", sev.text)}>
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("size-2 flex-none rounded-full", sev.dot)} />
                    <span className="text-foreground text-[13px] font-bold">{a.title}</span>
                  </div>
                  <div className="text-muted mt-0.5 text-[11.5px] font-semibold">{a.description}</div>
                </div>
                <Button size="xs" variant="outline" onClick={() => setTreated((s) => new Set(s).add(a.id))}>
                  {a.action}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </ScreenContainer>
  );
}
