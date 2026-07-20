"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScreenContainer } from "@/components/screens/screen-container";
import { NewClientDialog } from "@/components/screens/crm/new-client-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ClientsTable } from "@/components/screens/crm/clients-table";
import { Client360 } from "@/components/screens/crm/client-360";
import { fetchClients } from "@/lib/supabase/data/clients";
import type { Client } from "@/lib/api/types";

/** CRM Clients : portefeuille en tableau + fiche 360° (bouton Détails). */
export function CrmClients() {
  const { data } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const clients: Client[] = data ?? [];
  const [detail, setDetail] = useState<Client | null>(null);
  const activeCount = clients.filter((c) => c.status === "actif").length;

  // Fiche 360° plein écran.
  if (detail) {
    return <Client360 client={detail} onClose={() => setDetail(null)} />;
  }

  return (
    <ScreenContainer>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="text-muted text-[11px] font-bold tracking-[0.7px] uppercase">
          Portefeuille clients · {activeCount} compte{activeCount !== 1 ? "s" : ""} actif
          {activeCount !== 1 ? "s" : ""}
        </div>
        <NewClientDialog />
      </div>

      {clients.length === 0 ? (
        <EmptyState title="Aucun client pour le moment" />
      ) : (
        <ClientsTable clients={clients} onDetails={setDetail} />
      )}
    </ScreenContainer>
  );
}
