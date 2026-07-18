"use client";

import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import type { PillVariant } from "@/components/ui/status-pill";
import { IMAGE_ALERTS } from "@/lib/api/data";
import type { ImageAlert } from "@/lib/api/types";
import { formatDateFR } from "@/lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Sentiment = ImageAlert["sentiment"];

const sentimentMeta: Record<
  Sentiment,
  { variant: PillVariant; border: string; label: string }
> = {
  négatif: { variant: "danger", border: "border-l-danger", label: "Négatif" },
  neutre: { variant: "neutral", border: "border-l-muted", label: "Neutre" },
  positif: { variant: "success", border: "border-l-success", label: "Positif" },
};

const STATS = [
  { label: "Mentions ce mois", value: "38", tone: "text-foreground" },
  { label: "Sentiment positif", value: "76 %", tone: "text-success" },
  { label: "Alertes à traiter", value: "2", tone: "text-danger" },
];

export function CmVeille() {
  return (
    <ScreenContainer>
      <div className="mb-4 grid grid-cols-1 gap-[15px] sm:grid-cols-3">
        {STATS.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-muted text-[11px] font-semibold">
              {s.label}
            </div>
            <div className={cn("mt-[5px] text-[20px] font-extrabold", s.tone)}>
              {s.value}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-[18px_20px]">
        <div className="text-foreground mb-3.5 text-[15px] font-extrabold tracking-[-0.3px]">
          Veille réputation
        </div>
        <div className="flex flex-col gap-2.5">
          {IMAGE_ALERTS.map((alert) => {
            const meta = sentimentMeta[alert.sentiment];
            return (
              <div
                key={alert.id}
                className={cn(
                  "border-border bg-surface2 flex flex-wrap items-center gap-3.5 rounded-xl border border-l-[3px] px-3.5 py-3",
                  meta.border,
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-foreground text-[12.5px] font-bold">
                    {alert.excerpt}
                  </div>
                  <div className="text-muted mt-0.5 text-[11px] font-semibold">
                    {alert.source} · {formatDateFR(alert.date)}
                  </div>
                </div>
                <StatusPill variant={meta.variant} uppercase>
                  {meta.label}
                </StatusPill>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast.success("Alerte prise en charge — « Traiter »")
                  }
                >
                  Traiter
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </ScreenContainer>
  );
}
