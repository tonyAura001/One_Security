"use client";

import { useQuery } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { fetchClients } from "@/lib/supabase/data/clients";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Record<string, PillVariant> = {
  actif: "success",
  a_risque: "danger",
  prospect: "warning",
  inactif: "neutral",
};

export function AccesClientsScreen() {
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const actifs = clients.filter((c) => c.status === "actif").length;

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Accès clients</h1>
          <p className="page-subtitle">Comptes clients et interlocuteurs des sites gardés</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-[15px] sm:grid-cols-3">
        <Stat label="Clients" value={String(clients.length)} />
        <Stat label="Comptes actifs" value={String(actifs)} tone="text-success" />
        <Stat label="Sites gardés" value={String(clients.reduce((s, c) => s + c.sites, 0))} />
      </div>

      <Card className="mt-4 p-[18px_20px]">
        <div className="text-foreground mb-3.5 flex items-center gap-2 text-[15px] font-extrabold tracking-[-0.3px]">
          <KeyRound className="size-4" /> Comptes d&apos;accès client
        </div>
        {clients.length === 0 ? (
          <EmptyState title="Aucun client" description="Les clients apparaîtront ici." />
        ) : (
          <div className="flex flex-col">
            {clients.map((c, i) => (
              <div key={c.id} className={cn("flex flex-wrap items-center gap-3.5 py-3", i < clients.length - 1 && "border-border border-b")}>
                <span className="bg-active text-accent flex size-9 flex-none items-center justify-center rounded-full text-[11px] font-bold">
                  {c.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-[1.4]">
                  <div className="text-foreground truncate text-[12.5px] font-bold">{c.name}</div>
                  <div className="text-muted truncate text-[11px] font-semibold">{c.contact} · {c.phone}</div>
                </div>
                <div className="text-muted flex-1 text-[12px] font-semibold">{c.sector}</div>
                <div className="text-muted w-[70px] text-center text-[12px] font-semibold">{c.sites} site{c.sites !== 1 ? "s" : ""}</div>
                <StatusPill variant={STATUS_VARIANT[c.status] ?? "neutral"} uppercase>{c.status}</StatusPill>
              </div>
            ))}
          </div>
        )}
      </Card>
    </ScreenContainer>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="text-muted text-[11px] font-semibold">{label}</div>
      <div className={cn("mt-1 text-[22px] font-extrabold", tone ?? "text-foreground")}>{value}</div>
    </Card>
  );
}
