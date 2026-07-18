"use client";

import { MapPin } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { formatDateFR } from "@/lib/format";
import { SITES, TICKETS, INTERVENTIONS } from "@/lib/api/data";

interface SiteReport {
  id: string;
  name: string;
  zone: string;
  open: number;
  resolved: number;
  lastIntervention: string | null;
}

function buildReports(): SiteReport[] {
  return SITES.map((site) => {
    const tickets = TICKETS.filter((t) => t.site === site.name);
    const interventions = INTERVENTIONS.filter((i) => i.site === site.name);
    const last = interventions
      .map((i) => i.date)
      .sort((a, b) => (a < b ? 1 : -1))[0];
    return {
      id: site.id,
      name: site.name,
      zone: site.zone,
      open: tickets.filter((t) => t.stage !== "resolu").length,
      resolved: tickets.filter((t) => t.stage === "resolu").length,
      lastIntervention: last ?? null,
    };
  });
}

export function MaintenanceRapportsSite() {
  const reports = buildReports();

  return (
    <ScreenContainer>
      <div className="text-muted mb-4 text-[11px] font-bold tracking-[0.7px]">
        RAPPORTS DE MAINTENANCE PAR SITE · {reports.length} SITES
      </div>

      <div className="grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <Card key={r.id} className="flex flex-col gap-3.5 p-[18px_20px]">
            <div className="flex items-start gap-2.5">
              <div className="bg-accent/14 text-accent flex size-9 flex-none items-center justify-center rounded-[10px]">
                <MapPin className="size-[18px]" strokeWidth={1.8} aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="text-foreground truncate text-[14px] font-extrabold tracking-[-0.2px]">
                  {r.name}
                </div>
                <div className="text-muted text-[11.5px] font-semibold">
                  {r.zone}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="border-border bg-surface2 rounded-xl border p-3">
                <div className="text-muted text-[11px] font-semibold">
                  Tickets ouverts
                </div>
                <div
                  className={`tnum mt-1 text-[18px] font-extrabold ${
                    r.open > 0 ? "text-warning" : "text-foreground"
                  }`}
                >
                  {r.open}
                </div>
              </div>
              <div className="border-border bg-surface2 rounded-xl border p-3">
                <div className="text-muted text-[11px] font-semibold">
                  Tickets résolus
                </div>
                <div className="tnum text-success mt-1 text-[18px] font-extrabold">
                  {r.resolved}
                </div>
              </div>
            </div>

            <div className="border-border flex items-baseline justify-between border-t pt-3">
              <span className="text-muted text-[11.5px] font-semibold">
                Dernière intervention
              </span>
              <span className="text-foreground text-[12px] font-bold">
                {r.lastIntervention
                  ? formatDateFR(r.lastIntervention)
                  : "Aucune"}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </ScreenContainer>
  );
}
