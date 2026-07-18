/**
 * Journal d'audit — traçabilité des actions sensibles (conformité APDP).
 * Données démo « Dakar Sécurité ».
 */
import type { PillVariant } from "@/components/ui/status-pill";

export type AuditAction =
  | "connexion"
  | "modif_contrat"
  | "export_donnees"
  | "changement_role"
  | "suppression"
  | "validation_paie";

export type AuditModule =
  | "Finance"
  | "RH / Paie"
  | "Commercial"
  | "Opérations"
  | "Administration";

export type AuditOutcome = "succes" | "echec";

export interface AuditEvent {
  id: string;
  at: string; // ISO datetime
  user: string;
  role: string;
  action: AuditAction;
  detail: string;
  module: AuditModule;
  ip: string;
  outcome: AuditOutcome;
}

const EVENTS: AuditEvent[] = [
  {
    id: "ev1",
    at: "2026-07-14T15:02:00",
    user: "M. Diallo",
    role: "DG",
    action: "export_donnees",
    detail: "Export paie bancaire — juin",
    module: "Finance",
    ip: "41.82.14.x",
    outcome: "succes",
  },
  {
    id: "ev2",
    at: "2026-07-14T14:41:00",
    user: "Fatou Sarr",
    role: "Comptable",
    action: "modif_contrat",
    detail: "Mise à jour montant CTR-2026-014 (CBAO)",
    module: "Commercial",
    ip: "41.82.14.x",
    outcome: "succes",
  },
  {
    id: "ev3",
    at: "2026-07-14T11:20:00",
    user: "inconnu",
    role: "—",
    action: "connexion",
    detail: "Tentative de connexion — mot de passe invalide",
    module: "Administration",
    ip: "197.14.203.x",
    outcome: "echec",
  },
  {
    id: "ev4",
    at: "2026-07-14T09:15:00",
    user: "Aïda Ba",
    role: "Secrétaire",
    action: "modif_contrat",
    detail: "Création devis DEV-2026-031 (Ambassade USA)",
    module: "Commercial",
    ip: "41.82.17.x",
    outcome: "succes",
  },
  {
    id: "ev5",
    at: "2026-07-13T18:47:00",
    user: "Ndèye Fall",
    role: "Responsable Paie",
    action: "validation_paie",
    detail: "Soumission paie juin — Niveau 1",
    module: "RH / Paie",
    ip: "41.82.19.x",
    outcome: "succes",
  },
  {
    id: "ev6",
    at: "2026-07-13T16:33:00",
    user: "M. Diallo",
    role: "DG",
    action: "changement_role",
    detail: "Attribution rôle « Chef de contrôle » à Cheikh Guèye",
    module: "Administration",
    ip: "41.82.14.x",
    outcome: "succes",
  },
  {
    id: "ev7",
    at: "2026-07-13T10:05:00",
    user: "Cheikh Guèye",
    role: "Chef de contrôle",
    action: "connexion",
    detail: "Connexion espace opérations",
    module: "Opérations",
    ip: "41.82.22.x",
    outcome: "succes",
  },
  {
    id: "ev8",
    at: "2026-07-12T22:14:00",
    user: "inconnu",
    role: "—",
    action: "connexion",
    detail: "Tentative de connexion hors plage horaire",
    module: "Administration",
    ip: "102.64.88.x",
    outcome: "echec",
  },
  {
    id: "ev9",
    at: "2026-07-12T15:50:00",
    user: "Fatou Sarr",
    role: "Comptable",
    action: "suppression",
    detail: "Suppression brouillon FAC-2026-060",
    module: "Finance",
    ip: "41.82.14.x",
    outcome: "succes",
  },
  {
    id: "ev10",
    at: "2026-07-12T08:30:00",
    user: "M. Diallo",
    role: "DG",
    action: "export_donnees",
    detail: "Export annuaire agents (CSV)",
    module: "Opérations",
    ip: "41.82.14.x",
    outcome: "succes",
  },
];

export function getAuditTrail(): AuditEvent[] {
  return [...EVENTS].sort((a, b) => b.at.localeCompare(a.at));
}

export interface AuditStats {
  today: number;
  activeSessions: number;
  failedAttempts: number;
  sensitiveThisMonth: number;
}

const SENSITIVE: AuditAction[] = [
  "export_donnees",
  "changement_role",
  "suppression",
  "validation_paie",
];

export function getAuditStats(): AuditStats {
  const today = EVENTS.filter((e) => e.at.startsWith("2026-07-14")).length;
  const failedAttempts = EVENTS.filter((e) => e.outcome === "echec").length;
  const sensitiveThisMonth = EVENTS.filter((e) =>
    SENSITIVE.includes(e.action),
  ).length;
  return {
    today,
    activeSessions: 7,
    failedAttempts,
    sensitiveThisMonth,
  };
}

export const ACTION_META: Record<
  AuditAction,
  { label: string; tone: "accent" | "warning" | "violet" | "danger" | "success" }
> = {
  connexion: { label: "Connexion", tone: "accent" },
  modif_contrat: { label: "Modification", tone: "warning" },
  export_donnees: { label: "Export données", tone: "violet" },
  changement_role: { label: "Changement de rôle", tone: "warning" },
  suppression: { label: "Suppression", tone: "danger" },
  validation_paie: { label: "Validation paie", tone: "success" },
};

export const OUTCOME_META: Record<
  AuditOutcome,
  { label: string; variant: PillVariant }
> = {
  succes: { label: "Succès", variant: "success" },
  echec: { label: "Échec", variant: "danger" },
};
