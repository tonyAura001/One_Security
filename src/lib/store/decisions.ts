"use client";

import { create } from "zustand";

export type DecisionCategory =
  "financiere" | "rh" | "contrat" | "operationnelle";
export type DecisionPriority = "urgente" | "normale";
export type DecisionStatus = "en_attente" | "validee" | "refusee";

export interface DecisionStep {
  label: string;
  at: string; // ISO
  done: boolean;
}

export interface Decision {
  id: string;
  title: string;
  category: DecisionCategory;
  priority: DecisionPriority;
  entity: string;
  requester: string;
  requestedAt: string; // ISO
  amount?: number;
  context: string;
  attachment?: string; // nom du justificatif PDF
  history: DecisionStep[];
  status: DecisionStatus;
}

const hoursAgo = (h: number) =>
  new Date(Date.now() - h * 3_600_000).toISOString();

const SEED: Decision[] = [
  {
    id: "d-paie",
    title: "Valider la masse salariale — juin 2026",
    category: "financiere",
    priority: "urgente",
    entity: "Dakar Sécurité · 52 agents",
    requester: "Ndèye Fall · Responsable Paie",
    requestedAt: hoursAgo(2),
    amount: 8_920_000,
    context:
      "Masse salariale de juin, présences validées au Niveau 2 par le Chef de contrôle. En attente de l'approbation finale du DG (Niveau 3) avant génération des virements.",
    attachment: "Bordereau_paie_juin_2026.pdf",
    history: [
      {
        label: "Soumise par la Responsable Paie (Niveau 1)",
        at: hoursAgo(28),
        done: true,
      },
      {
        label: "Présences validées — Chef de contrôle (Niveau 2)",
        at: hoursAgo(6),
        done: true,
      },
      {
        label: "En attente d'approbation finale — Directeur Général",
        at: hoursAgo(2),
        done: false,
      },
    ],
    status: "en_attente",
  },
  {
    id: "d-devis",
    title: "Approuver le devis — Ambassade des USA",
    category: "contrat",
    priority: "normale",
    entity: "Ambassade des USA · Almadies",
    requester: "Aïda Ba · Secrétaire",
    requestedAt: hoursAgo(5),
    amount: 2_400_000,
    context:
      "Devis DEV-2026-031 pour une prestation de gardiennage 24/7 sur 12 mois. En négociation, remise de 5 % accordée.",
    attachment: "DEV-2026-031.pdf",
    history: [
      { label: "Devis créé par la Secrétaire", at: hoursAgo(30), done: true },
      { label: "En attente de validation DG", at: hoursAgo(5), done: false },
    ],
    status: "en_attente",
  },
  {
    id: "d-recrut",
    title: "Valider le recrutement — agent cynophile",
    category: "rh",
    priority: "normale",
    entity: "Aéroport AIBD · zone fret",
    requester: "Moussa Diop · Recruteur",
    requestedAt: hoursAgo(8),
    context:
      "Candidat Ibou Sarr (4 ans d'expérience, aptitude cynophile validée). Poste ouvert depuis 3 semaines, entretien noté 82/100.",
    attachment: "Dossier_Ibou_Sarr.pdf",
    history: [
      {
        label: "Entretien réalisé — grille d'évaluation",
        at: hoursAgo(26),
        done: true,
      },
      { label: "En attente de validation DG", at: hoursAgo(8), done: false },
    ],
    status: "en_attente",
  },
  {
    id: "d-achat",
    title: "Autoriser l'achat d'équipement",
    category: "operationnelle",
    priority: "urgente",
    entity: "Boutique · équipements",
    requester: "Awa N’Diaye · Caissière",
    requestedAt: hoursAgo(27),
    amount: 1_800_000,
    context:
      "Réapprovisionnement urgent de 10 gilets pare-balles niveau III (rupture de stock) auprès du fournisseur habituel.",
    attachment: "Bon_de_commande_gilets.pdf",
    history: [
      {
        label: "Demande créée — stock en rupture",
        at: hoursAgo(30),
        done: true,
      },
      { label: "En attente d'autorisation DG", at: hoursAgo(27), done: false },
    ],
    status: "en_attente",
  },
  {
    id: "d-contrat",
    title: "Renouveler le contrat — Port Autonome",
    category: "contrat",
    priority: "urgente",
    entity: "Port Autonome de Dakar",
    requester: "Aïda Ba · Secrétaire",
    requestedAt: hoursAgo(3),
    amount: 4_200_000,
    context:
      "Contrat CTR-2025-007 expirant dans 12 jours. Reconduction 12 mois aux mêmes conditions, avec révision annuelle +3 %.",
    attachment: "CTR-2025-007_renouvellement.pdf",
    history: [
      { label: "Alerte d'expiration déclenchée", at: hoursAgo(50), done: true },
      {
        label: "Projet de renouvellement préparé",
        at: hoursAgo(4),
        done: true,
      },
      { label: "En attente de validation DG", at: hoursAgo(3), done: false },
    ],
    status: "en_attente",
  },
  {
    id: "d-budget",
    title: "Valider le budget maintenance — T3",
    category: "financiere",
    priority: "normale",
    entity: "Maintenance · tous sites",
    requester: "Ibrahima Sow · Mainteneur",
    requestedAt: hoursAgo(30),
    amount: 1_500_000,
    context:
      "Enveloppe trimestrielle pour la maintenance des portiques, caméras et barrières. Prévisionnel basé sur les tickets ouverts.",
    attachment: "Budget_maintenance_T3.pdf",
    history: [
      { label: "Budget prévisionnel soumis", at: hoursAgo(34), done: true },
      { label: "En attente de validation DG", at: hoursAgo(30), done: false },
    ],
    status: "en_attente",
  },
];

interface DecisionsState {
  decisions: Decision[];
  /** Décisions déjà résolues ce mois-ci (base démo). */
  resolvedBase: number;
  validate: (id: string) => void;
  refuse: (id: string) => void;
  requestInfo: (id: string) => void;
}

function resolve(
  list: Decision[],
  id: string,
  status: DecisionStatus,
  stepLabel: string,
): Decision[] {
  return list.map((d) =>
    d.id === id
      ? {
          ...d,
          status,
          history: [
            ...d.history.map((h) => ({ ...h, done: true })),
            { label: stepLabel, at: new Date().toISOString(), done: true },
          ],
        }
      : d,
  );
}

export const useDecisionsStore = create<DecisionsState>((set) => ({
  decisions: SEED,
  resolvedBase: 14,
  validate: (id) =>
    set((s) => ({
      decisions: resolve(
        s.decisions,
        id,
        "validee",
        "Validée par le Directeur Général",
      ),
    })),
  refuse: (id) =>
    set((s) => ({
      decisions: resolve(
        s.decisions,
        id,
        "refusee",
        "Refusée par le Directeur Général",
      ),
    })),
  requestInfo: (id) =>
    set((s) => ({
      decisions: s.decisions.map((d) =>
        d.id === id
          ? {
              ...d,
              history: [
                ...d.history,
                {
                  label: "Complément d'information demandé",
                  at: new Date().toISOString(),
                  done: true,
                },
              ],
            }
          : d,
      ),
    })),
}));

export const CATEGORY_META: Record<
  DecisionCategory,
  { label: string; variant: "info" | "violet" | "success" | "warning" }
> = {
  financiere: { label: "Financière", variant: "success" },
  rh: { label: "RH", variant: "violet" },
  contrat: { label: "Contrat", variant: "info" },
  operationnelle: { label: "Opérationnelle", variant: "warning" },
};

/** Nombre de décisions en attente (badge sidebar). */
export function pendingDecisionsCount(decisions: Decision[]): number {
  return decisions.filter((d) => d.status === "en_attente").length;
}
