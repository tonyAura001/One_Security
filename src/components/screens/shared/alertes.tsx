"use client";

import { useMemo, useState } from "react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Button } from "@/aurantir-front-kit";
import { formatRelativeTime } from "@/aurantir-front-kit/lib/utils";
import { useSession } from "@/lib/store/session";
import { getAlerts, type AlertSeverity } from "@/lib/api/workspace";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const SEV: Record<
  AlertSeverity,
  { label: string; border: string; tile: string; chip: string }
> = {
  critique: {
    label: "Critique",
    border: "border-l-red",
    tile: "bg-red/10 text-red",
    chip: "bg-red/10 text-red",
  },
  attention: {
    label: "Attention",
    border: "border-l-amber",
    tile: "bg-amber/10 text-amber",
    chip: "bg-amber/10 text-amber",
  },
  info: {
    label: "Information",
    border: "border-l-blue",
    tile: "bg-blue/10 text-blue",
    chip: "bg-blue/10 text-blue",
  },
};

type Filtre = "toutes" | AlertSeverity;

export function AlertesScreen() {
  const { role } = useSession();
  const alerts = useMemo(() => getAlerts(role), [role]);
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [treated, setTreated] = useState<Set<string>>(new Set());

  const active = alerts.filter((a) => !treated.has(a.id));
  const counts = {
    critique: active.filter((a) => a.severity === "critique").length,
    attention: active.filter((a) => a.severity === "attention").length,
    info: active.filter((a) => a.severity === "info").length,
  };
  const list = active.filter(
    (a) => filtre === "toutes" || a.severity === filtre,
  );

  const FILTERS: [Filtre, string][] = [
    ["toutes", "Toutes"],
    ["critique", `Critiques · ${counts.critique}`],
    ["attention", `Attention · ${counts.attention}`],
    ["info", `Information · ${counts.info}`],
  ];

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Alertes</h1>
          <p className="page-subtitle">
            {counts.critique} critiques · {counts.attention} attention ·{" "}
            {counts.info} information
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {FILTERS.map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFiltre(v)}
            aria-pressed={filtre === v}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filtre === v
                ? "bg-blue/10 text-blue"
                : "text-text-muted hover:bg-surface-hover",
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2.5">
        {list.length === 0 ? (
          <div className="text-text-muted py-16 text-center text-sm">
            Aucune alerte à afficher
          </div>
        ) : (
          list.map((a) => {
            const sev = SEV[a.severity];
            const Icon = a.icon;
            return (
              <div
                key={a.id}
                className={cn(
                  "border-surface-border bg-surface flex flex-wrap items-center gap-3.5 rounded-xl border border-l-[3px] p-4",
                  sev.border,
                )}
              >
                <div
                  className={cn(
                    "flex size-10 flex-shrink-0 items-center justify-center rounded-lg",
                    sev.tile,
                  )}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-text-primary text-sm font-semibold">
                      {a.title}
                    </p>
                    <span
                      className={cn(
                        "text-2xs rounded-full px-2 py-0.5 font-semibold",
                        sev.chip,
                      )}
                    >
                      {sev.label}
                    </span>
                  </div>
                  <p className="text-text-secondary mt-0.5 text-xs">
                    {a.description}
                  </p>
                  <p
                    className="text-2xs text-text-muted mt-1"
                    suppressHydrationWarning
                  >
                    {a.entity} · {formatRelativeTime(a.at)}
                  </p>
                </div>
                <Button
                  variant={a.severity === "critique" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => {
                    setTreated((s) => new Set(s).add(a.id));
                    toast.success(`« ${a.action} » — ${a.title}`);
                  }}
                >
                  {a.action}
                </Button>
              </div>
            );
          })
        )}
      </div>
    </ScreenContainer>
  );
}
