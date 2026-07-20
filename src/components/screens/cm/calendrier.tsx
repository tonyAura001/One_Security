"use client";

import { useQuery } from "@tanstack/react-query";

import { NewPublicationDialog } from "./new-publication-dialog";
import { PlateformesPanel } from "./plateformes-panel";
import { EngagementDialog } from "./engagement-dialog";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { PillVariant } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { fetchPublications } from "@/lib/supabase/data/publications";
import type { Publication, PublicationStatus } from "@/lib/api/types";
import { formatDateFR } from "@/lib/format";
import { cn } from "@/lib/utils";

type Channel = Publication["channel"];

const channelBorder: Record<Channel, string> = {
  LinkedIn: "border-l-accent",
  Facebook: "border-l-violet",
  Instagram: "border-l-danger",
  "Site web": "border-l-success",
};

const channelBadge: Record<Channel, string> = {
  LinkedIn: "bg-accent/14 text-accent",
  Facebook: "bg-violet/14 text-violet",
  Instagram: "bg-danger/12 text-danger",
  "Site web": "bg-success/12 text-success",
};

const statusMeta: Record<
  PublicationStatus,
  { variant: PillVariant; label: string }
> = {
  planifie: { variant: "info", label: "Planifié" },
  publie: { variant: "success", label: "Publié" },
  brouillon: { variant: "warning", label: "Brouillon" },
};

export function CmCalendrier() {
  const { data } = useQuery({ queryKey: ["publications"], queryFn: fetchPublications });
  const publications = data ?? [];
  const orderedPublications = [...publications].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  return (
    <ScreenContainer>
      <PlateformesPanel />

      <div className="mb-4 flex items-center justify-between">
        <div className="text-muted text-[11px] font-bold tracking-[0.7px]">
          CALENDRIER ÉDITORIAL
        </div>
        <NewPublicationDialog />
      </div>

      {orderedPublications.length === 0 && (
        <EmptyState title="Aucune donnée pour le moment" />
      )}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {orderedPublications.map((p) => {
          const status = statusMeta[p.status];
          return (
            <Card key={p.id} className="p-[15px]">
              <div className="text-muted mb-2.5 text-[12px] font-extrabold">
                {formatDateFR(p.date, "EEE d MMM")}
              </div>
              <div
                className={cn(
                  "border-border bg-surface2 rounded-[10px] border border-l-[3px] p-[11px]",
                  channelBorder[p.channel],
                )}
              >
                <div className="text-foreground text-[12px] font-bold">
                  {p.title}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-[3px] text-[8px] font-extrabold tracking-[0.3px] uppercase",
                      channelBadge[p.channel],
                    )}
                  >
                    {p.channel}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <StatusPill variant={status.variant} dot uppercase>
                    {status.label}
                  </StatusPill>
                  {typeof p.engagement === "number" && p.engagement > 0 && (
                    <span className="text-muted text-[10px] font-bold">
                      {p.engagement} interactions
                    </span>
                  )}
                </div>
                <div className="mt-2 flex justify-end">
                  <EngagementDialog publicationId={p.id} title={p.title} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </ScreenContainer>
  );
}
