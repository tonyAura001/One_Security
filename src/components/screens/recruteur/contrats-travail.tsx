"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Pencil, Plus } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconTile } from "@/components/ui/icon-tile";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { toast } from "@/lib/toast";
import { formatFCFA, formatDateFR } from "@/lib/format";
import {
  fetchContratsTravail,
  updateContratTravailStatut,
  type ContratTravail,
  type ContractStatus,
} from "@/lib/supabase/data/rh-emploi";
import { ContratTravailEditor } from "./contrat-travail-editor";

const STATUS_META: Record<ContractStatus, { label: string; variant: PillVariant }> = {
  signe: { label: "Signé", variant: "success" },
  attente: { label: "En attente", variant: "warning" },
  brouillon: { label: "Brouillon", variant: "neutral" },
};
const NEXT: Record<ContractStatus, ContractStatus | null> = {
  brouillon: "attente",
  attente: "signe",
  signe: null,
};

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function RecruteurContratsTravail() {
  const qc = useQueryClient();
  const { data: contracts = [] } = useQuery({ queryKey: ["contrats-travail"], queryFn: fetchContratsTravail });
  const masseSalariale = contracts.reduce((s, c) => s + c.salaire, 0);
  // `null` = liste ; { contract } = éditeur (contract=null → nouveau).
  const [editing, setEditing] = useState<{ contract: ContratTravail | null } | null>(null);

  const advance = useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: ContractStatus }) => updateContratTravailStatut(id, statut),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contrats-travail"] }); toast.success("Statut du contrat mis à jour"); },
    onError: () => toast.error("Modification refusée (accès requis)."),
  });

  if (editing) {
    return <ContratTravailEditor contract={editing.contract} onClose={() => setEditing(null)} />;
  }

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-muted text-[11px] font-bold tracking-[0.7px] uppercase">Ressources humaines</div>
          <h1 className="text-foreground text-[19px] font-extrabold tracking-[-0.4px]">Contrats de travail</h1>
          <div className="text-muted mt-0.5 text-[12px] font-semibold">
            {contracts.length} document{contracts.length !== 1 ? "s" : ""} · masse salariale {formatFCFA(masseSalariale)}
          </div>
        </div>
        <Button size="sm" onClick={() => setEditing({ contract: null })}>
          <Plus size={15} strokeWidth={2.2} /> Nouveau contrat
        </Button>
      </div>

      <Card className="p-[18px_20px]">
        {contracts.length === 0 ? (
          <EmptyState title="Aucun contrat de travail" description="Créez le contrat d'un agent recruté." />
        ) : (
          <>
            <div className="border-border text-muted hidden items-center gap-3.5 border-b px-1 pb-2.5 text-[10.5px] font-bold tracking-[0.4px] uppercase sm:flex">
              <div className="w-[60px]" />
              <div className="flex-1">Employé · poste</div>
              <div className="w-[70px] text-center">Type</div>
              <div className="w-[150px]">Site affecté</div>
              <div className="w-[120px] text-right">Salaire brut</div>
              <div className="w-[190px] text-center">Statut · action</div>
            </div>

            <div className="flex flex-col">
              {contracts.map((c) => {
                const next = NEXT[c.statut];
                return (
                  <div key={c.id} className="border-border flex flex-wrap items-center gap-3.5 border-b px-1 py-3 last:border-b-0">
                    <div className="hidden w-[60px] sm:block"><IconTile icon={FileText} tone="accent" size={34} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-accent/14 text-accent flex size-9 flex-none items-center justify-center rounded-lg text-[11px] font-extrabold">{initials(c.employe)}</div>
                        <div className="min-w-0">
                          <div className="text-foreground truncate text-[13px] font-bold">{c.employe}</div>
                          <div className="text-muted mt-0.5 truncate text-[11px] font-semibold">
                            {c.poste ?? "—"}{c.dateDebut ? ` · dès le ${formatDateFR(c.dateDebut, "d MMM yyyy")}` : ""}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-[70px] text-center"><StatusPill variant={c.type === "CDI" ? "info" : "violet"} uppercase>{c.type}</StatusPill></div>
                    <div className="text-muted w-[150px] truncate text-[12px] font-semibold">{c.site ?? "—"}</div>
                    <div className="text-foreground w-[120px] text-right text-[13px] font-extrabold">{formatFCFA(c.salaire)}</div>
                    <div className="flex w-[190px] items-center justify-center gap-2">
                      <StatusPill variant={STATUS_META[c.statut].variant} uppercase>{STATUS_META[c.statut].label}</StatusPill>
                      <Button size="xs" variant="outline" aria-label="Éditer" onClick={() => setEditing({ contract: c })}><Pencil className="size-3.5" /></Button>
                      {next && (
                        <Button size="xs" disabled={advance.isPending} onClick={() => advance.mutate({ id: c.id, statut: next })}>
                          {next === "attente" ? "Soumettre" : "Signer"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </ScreenContainer>
  );
}
