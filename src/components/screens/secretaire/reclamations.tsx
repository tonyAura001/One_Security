"use client";

import { ScreenContainer } from "@/components/screens/screen-container";
import { Card } from "@/components/ui/card";
import { StatusPill, type PillVariant } from "@/components/ui/status-pill";

type Severity = "elevee" | "moyenne" | "faible";
type Status = "ouverte" | "en_cours" | "resolue";

interface Reclamation {
  ref: string;
  client: string;
  objet: string;
  severity: Severity;
  status: Status;
  date: string;
}

const SEVERITY_LABEL: Record<Severity, string> = {
  elevee: "ÉLEVÉE",
  moyenne: "MOYENNE",
  faible: "FAIBLE",
};

const SEVERITY_VARIANT: Record<Severity, PillVariant> = {
  elevee: "danger",
  moyenne: "warning",
  faible: "neutral",
};

const STATUS_LABEL: Record<Status, string> = {
  ouverte: "OUVERTE",
  en_cours: "EN COURS",
  resolue: "RÉSOLUE",
};

const STATUS_VARIANT: Record<Status, PillVariant> = {
  ouverte: "danger",
  en_cours: "warning",
  resolue: "success",
};

const RECLAMATIONS: Reclamation[] = [
  {
    ref: "REC-2026-018",
    client: "Résidence Almadies",
    objet: "Agent absent au poste de nuit",
    severity: "elevee",
    status: "ouverte",
    date: "01/07",
  },
  {
    ref: "REC-2026-017",
    client: "BICIS Plateau",
    objet: "Retard de facturation mensuelle",
    severity: "moyenne",
    status: "en_cours",
    date: "28/06",
  },
  {
    ref: "REC-2026-016",
    client: "Sonatel (Siège)",
    objet: "Demande de remplacement d'agent",
    severity: "faible",
    status: "ouverte",
    date: "25/06",
  },
  {
    ref: "REC-2026-015",
    client: "Sea Plaza",
    objet: "Comportement inapproprié signalé à l'accueil",
    severity: "moyenne",
    status: "ouverte",
    date: "23/06",
  },
  {
    ref: "REC-2026-014",
    client: "Ambassade des USA",
    objet: "Réclamation traitée — badge d'accès",
    severity: "faible",
    status: "resolue",
    date: "20/06",
  },
  {
    ref: "REC-2026-011",
    client: "Port Autonome de Dakar",
    objet: "Ronde de nuit non effectuée au Môle 8",
    severity: "elevee",
    status: "resolue",
    date: "12/06",
  },
];

export function SecretaireReclamations() {
  const openCount = RECLAMATIONS.filter((r) => r.status === "ouverte").length;

  return (
    <ScreenContainer>
      <Card className="rounded-2xl px-5 py-[18px]">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="text-foreground text-[15px] font-extrabold tracking-[-0.3px]">
            Réclamations clients
          </div>
          <StatusPill variant="warning" uppercase>
            {openCount} ouvertes
          </StatusPill>
        </div>

        {/* Column header */}
        <div className="border-border text-muted flex items-center gap-3.5 border-b px-1 pb-2.5 text-[10.5px] font-bold tracking-[0.4px]">
          <div className="w-[110px]">RÉFÉRENCE</div>
          <div className="flex-1">CLIENT · OBJET</div>
          <div className="w-[100px] text-center">GRAVITÉ</div>
          <div className="w-[110px] text-center">STATUT</div>
          <div className="w-[90px] text-right">DATE</div>
        </div>

        {/* Rows */}
        {RECLAMATIONS.map((r, i) => (
          <div
            key={r.ref}
            className={`flex items-center gap-3.5 px-1 py-[13px] ${
              i < RECLAMATIONS.length - 1 ? "border-border border-b" : ""
            }`}
          >
            <div className="text-foreground w-[110px] text-[12px] font-extrabold">
              {r.ref}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-foreground truncate text-[12.5px] font-bold">
                {r.client}
              </div>
              <div className="text-muted truncate text-[11px] font-semibold">
                {r.objet}
              </div>
            </div>
            <div className="flex w-[100px] justify-center">
              <StatusPill variant={SEVERITY_VARIANT[r.severity]} uppercase>
                {SEVERITY_LABEL[r.severity]}
              </StatusPill>
            </div>
            <div className="flex w-[110px] justify-center">
              <StatusPill variant={STATUS_VARIANT[r.status]} uppercase>
                {STATUS_LABEL[r.status]}
              </StatusPill>
            </div>
            <div className="text-muted w-[90px] text-right text-[11px] font-semibold">
              {r.date}
            </div>
          </div>
        ))}
      </Card>
    </ScreenContainer>
  );
}
