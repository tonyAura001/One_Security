"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, KeyRound, MapPin } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ClientsTable } from "@/components/screens/crm/clients-table";
import { Client360 } from "@/components/screens/crm/client-360";
import { fetchClients } from "@/lib/supabase/data/clients";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/api/types";

/** Accès clients : annuaire des comptes clients + fiche 360° (Détails). */
export function AccesClientsScreen() {
  const { data } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const clients: Client[] = data ?? [];
  const [detail, setDetail] = useState<Client | null>(null);

  const actifs = clients.filter((c) => c.status === "actif").length;
  const totalSites = clients.reduce((s, c) => s + c.sites, 0);

  if (detail) {
    return <Client360 client={detail} onClose={() => setDetail(null)} />;
  }

  return (
    <ScreenContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">Accès clients</h1>
          <p className="page-subtitle">Comptes clients et interlocuteurs des sites gardés</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-[15px] sm:grid-cols-3">
        <Stat icon={KeyRound} label="Clients" value={String(clients.length)} />
        <Stat icon={Building2} label="Comptes actifs" value={String(actifs)} tone="text-success" />
        <Stat icon={MapPin} label="Sites gardés" value={String(totalSites)} />
      </div>

      <div className="mt-4">
        <div className="text-muted mb-2.5 flex items-center gap-2 text-[11px] font-bold tracking-[0.7px] uppercase">
          <KeyRound className="size-3.5" /> Comptes d&apos;accès client
        </div>
        {clients.length === 0 ? (
          <Card className="p-[18px_20px]">
            <EmptyState title="Aucun client" description="Les clients apparaîtront ici." />
          </Card>
        ) : (
          <ClientsTable clients={clients} onDetails={setDetail} />
        )}
      </div>
    </ScreenContainer>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="bg-accent/14 text-accent flex size-10 flex-none items-center justify-center rounded-[12px]">
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <div>
        <div className="text-muted text-[11px] font-semibold">{label}</div>
        <div className={cn("mt-0.5 text-[22px] font-extrabold", tone ?? "text-foreground")}>{value}</div>
      </div>
    </Card>
  );
}
