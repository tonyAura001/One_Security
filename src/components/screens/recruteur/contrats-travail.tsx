"use client";

import { FileText, Plus } from "lucide-react";
import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { toast } from "@/lib/toast";
import { formatFCFA, formatDateFR } from "@/lib/format";
import { CANDIDATES } from "@/lib/api/data";

type ContractType = "CDI" | "CDD";
type ContractStatus = "signe" | "attente" | "brouillon";

interface WorkContract {
  ref: string;
  employee: string;
  initials: string;
  role: string;
  type: ContractType;
  site: string;
  salary: number;
  start: string;
  status: ContractStatus;
}

const STATUS_META: Record<
  ContractStatus,
  { label: string; variant: PillVariant }
> = {
  signe: { label: "Signé", variant: "success" },
  attente: { label: "En attente", variant: "warning" },
  brouillon: { label: "Brouillon", variant: "neutral" },
};

const CONTRACT_DETAILS: Array<
  Omit<WorkContract, "employee" | "initials" | "role">
> = [
  {
    ref: "CTR-2026-031",
    type: "CDI",
    site: "CBAO Indépendance",
    salary: 165000,
    start: "2026-07-14",
    status: "signe",
  },
  {
    ref: "CTR-2026-032",
    type: "CDD",
    site: "Sonatel — Siège",
    salary: 155000,
    start: "2026-07-21",
    status: "attente",
  },
  {
    ref: "CTR-2026-033",
    type: "CDI",
    site: "Résidence Almadies",
    salary: 175000,
    start: "2026-07-28",
    status: "brouillon",
  },
];

// Rows built from the candidates who reached the "embauche" stage.
const HIRED = CANDIDATES.filter((c) => c.stage === "embauche");

const CONTRACTS: WorkContract[] = HIRED.map((candidate, i) => {
  const details = CONTRACT_DETAILS[i % CONTRACT_DETAILS.length];
  return {
    ...details,
    employee: candidate.name,
    initials: candidate.initials,
    role: candidate.role,
  };
});

export function RecruteurContratsTravail() {
  const masseSalariale = CONTRACTS.reduce((sum, c) => sum + c.salary, 0);

  return (
    <ScreenContainer>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted text-[11px] font-bold tracking-[0.7px]">
          CONTRATS DE TRAVAIL · {CONTRACTS.length} DOCUMENTS · MASSE SALARIALE{" "}
          {formatFCFA(masseSalariale)}
        </div>
        <Button
          size="sm"
          onClick={() => toast.info("Génération de contrat à venir")}
        >
          <Plus size={15} strokeWidth={2.2} />
          Nouveau contrat
        </Button>
      </div>

      <Card className="p-[18px_20px]">
        <div className="text-foreground mb-3.5 text-[15px] font-extrabold tracking-[-0.3px]">
          Contrats de travail
        </div>

        {/* Header row */}
        <div className="border-border text-muted hidden items-center gap-3.5 border-b px-1 pb-2.5 text-[10.5px] font-bold tracking-[0.4px] sm:flex">
          <div className="w-[100px]">RÉFÉRENCE</div>
          <div className="flex-1">EMPLOYÉ · POSTE</div>
          <div className="w-[70px] text-center">TYPE</div>
          <div className="w-[150px]">SITE AFFECTÉ</div>
          <div className="w-[120px] text-right">SALAIRE BRUT</div>
          <div className="w-[110px] text-center">STATUT</div>
        </div>

        <div className="flex flex-col">
          {CONTRACTS.map((c) => (
            <div
              key={c.ref}
              className="border-border flex flex-wrap items-center gap-3.5 border-b px-1 py-3 last:border-b-0"
            >
              <div className="hidden w-[100px] sm:block">
                <IconTile icon={FileText} tone="accent" size={34} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <div className="bg-accent/14 text-accent flex size-9 flex-none items-center justify-center rounded-lg text-[11px] font-extrabold">
                    {c.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-foreground truncate text-[13px] font-bold">
                      {c.employee}
                    </div>
                    <div className="text-muted mt-0.5 truncate text-[11px] font-semibold">
                      {c.role} · dès le {formatDateFR(c.start, "d MMM yyyy")}
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-[70px] text-center">
                <StatusPill
                  variant={c.type === "CDI" ? "info" : "violet"}
                  uppercase
                >
                  {c.type}
                </StatusPill>
              </div>
              <div className="text-muted w-[150px] truncate text-[12px] font-semibold">
                {c.site}
              </div>
              <div className="text-foreground w-[120px] text-right text-[13px] font-extrabold">
                {formatFCFA(c.salary)}
              </div>
              <div className="flex w-[110px] justify-center">
                <StatusPill variant={STATUS_META[c.status].variant} uppercase>
                  {STATUS_META[c.status].label}
                </StatusPill>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </ScreenContainer>
  );
}
