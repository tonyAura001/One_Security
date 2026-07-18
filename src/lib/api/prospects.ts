/**
 * Prospects — pipeline commercial (kanban). Données démo « Dakar Sécurité ».
 */
import type { Tone } from "@/lib/colors";

export type PipelineStage =
  | "nouveau"
  | "qualifie"
  | "devis"
  | "negociation"
  | "gagne"
  | "perdu";

export interface Prospect {
  id: string;
  company: string;
  need: string;
  /** Valeur mensuelle estimée (FCFA). */
  estimatedMonthly: number;
  owner: string;
  ownerInitials: string;
  nextFollowUp: string; // ISO
  stage: PipelineStage;
}

const PROSPECTS: Prospect[] = [
  {
    id: "pr1",
    company: "Résidence Les Almadies",
    need: "4 agents · rondes de nuit",
    estimatedMonthly: 1_100_000,
    owner: "Aïda Ba",
    ownerInitials: "AB",
    nextFollowUp: "2026-07-16",
    stage: "negociation",
  },
  {
    id: "pr2",
    company: "Pullman Dakar Teranga",
    need: "8 agents · gardiennage statique 24/7",
    estimatedMonthly: 2_300_000,
    owner: "Aïda Ba",
    ownerInitials: "AB",
    nextFollowUp: "2026-07-18",
    stage: "devis",
  },
  {
    id: "pr3",
    company: "Ecobank — Point E",
    need: "3 agents · agence bancaire",
    estimatedMonthly: 950_000,
    owner: "Moussa Cissé",
    ownerInitials: "MC",
    nextFollowUp: "2026-07-15",
    stage: "qualifie",
  },
  {
    id: "pr4",
    company: "Carrefour Market Mermoz",
    need: "5 agents · surveillance jour",
    estimatedMonthly: 1_250_000,
    owner: "Moussa Cissé",
    ownerInitials: "MC",
    nextFollowUp: "2026-07-20",
    stage: "nouveau",
  },
  {
    id: "pr5",
    company: "Ambassade des USA",
    need: "Renfort cynophile · zone sensible",
    estimatedMonthly: 2_400_000,
    owner: "Aïda Ba",
    ownerInitials: "AB",
    nextFollowUp: "2026-07-17",
    stage: "negociation",
  },
  {
    id: "pr6",
    company: "SGBS Almadies",
    need: "4 agents · rondes + télésurveillance",
    estimatedMonthly: 1_400_000,
    owner: "Moussa Cissé",
    ownerInitials: "MC",
    nextFollowUp: "2026-07-14",
    stage: "devis",
  },
  {
    id: "pr7",
    company: "Chantier Diamniadio Lot 4",
    need: "6 agents · sécurité de chantier",
    estimatedMonthly: 1_600_000,
    owner: "Aïda Ba",
    ownerInitials: "AB",
    nextFollowUp: "2026-07-22",
    stage: "qualifie",
  },
  {
    id: "pr8",
    company: "Clinique du Cap",
    need: "3 agents · accueil & filtrage",
    estimatedMonthly: 1_200_000,
    owner: "Moussa Cissé",
    ownerInitials: "MC",
    nextFollowUp: "2026-07-19",
    stage: "gagne",
  },
  {
    id: "pr9",
    company: "BOA Yoff",
    need: "2 agents · agence bancaire",
    estimatedMonthly: 780_000,
    owner: "Aïda Ba",
    ownerInitials: "AB",
    nextFollowUp: "2026-07-21",
    stage: "nouveau",
  },
  {
    id: "pr10",
    company: "Sacré-Cœur 3 — Copropriété",
    need: "4 agents · gardiennage résidentiel",
    estimatedMonthly: 900_000,
    owner: "Moussa Cissé",
    ownerInitials: "MC",
    nextFollowUp: "2026-07-13",
    stage: "perdu",
  },
  {
    id: "pr11",
    company: "Sea Plaza — Événement corporate",
    need: "12 agents · sécurité événementielle",
    estimatedMonthly: 1_950_000,
    owner: "Aïda Ba",
    ownerInitials: "AB",
    nextFollowUp: "2026-07-24",
    stage: "negociation",
  },
];

export function getProspects(): Prospect[] {
  return PROSPECTS;
}

export interface ProspectStats {
  inPipeline: number;
  pipelineValue: number;
  conversionRate: number;
  toFollowUp: number;
}

const OPEN_STAGES: PipelineStage[] = [
  "nouveau",
  "qualifie",
  "devis",
  "negociation",
];

export function getProspectStats(): ProspectStats {
  const open = PROSPECTS.filter((p) => OPEN_STAGES.includes(p.stage));
  const pipelineValue = open.reduce((s, p) => s + p.estimatedMonthly, 0);
  const closed = PROSPECTS.filter(
    (p) => p.stage === "gagne" || p.stage === "perdu",
  );
  const won = PROSPECTS.filter((p) => p.stage === "gagne").length;
  const conversionRate = closed.length
    ? Math.round((won / closed.length) * 100)
    : 0;
  const toFollowUp = open.filter((p) => p.nextFollowUp <= "2026-07-16").length;
  return {
    inPipeline: open.length,
    pipelineValue,
    conversionRate,
    toFollowUp,
  };
}

export const STAGE_META: Record<
  PipelineStage,
  { label: string; tone: Tone }
> = {
  nouveau: { label: "Nouveau", tone: "muted" },
  qualifie: { label: "Qualifié", tone: "accent" },
  devis: { label: "Devis envoyé", tone: "violet" },
  negociation: { label: "Négociation", tone: "warning" },
  gagne: { label: "Gagné", tone: "success" },
  perdu: { label: "Perdu", tone: "danger" },
};
