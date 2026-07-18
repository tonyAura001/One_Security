/**
 * Satisfaction & audits — score client, audits de sites et incidents.
 * Données démo « Dakar Sécurité ».
 */
import type { PillVariant } from "@/components/ui/status-pill";

export interface SatisfactionPoint {
  month: string;
  /** Score moyen sur 5. */
  score: number;
}

export type AuditStatus = "conforme" | "a_corriger" | "non_conforme";

export interface SiteAudit {
  id: string;
  site: string;
  date: string; // ISO
  auditor: string;
  /** Score sur 100. */
  score: number;
  nonConformities: string[];
  status: AuditStatus;
}

export type IncidentType =
  | "intrusion"
  | "absence_agent"
  | "materiel"
  | "retard_ronde";
export type IncidentSeverity = "faible" | "moyenne" | "elevee";
export type IncidentStatus = "ouvert" | "en_cours" | "resolu";

export interface Incident {
  id: string;
  site: string;
  type: IncidentType;
  severity: IncidentSeverity;
  date: string; // ISO
  status: IncidentStatus;
}

const SATISFACTION_SERIES: SatisfactionPoint[] = [
  { month: "Fév", score: 3.9 },
  { month: "Mar", score: 4.0 },
  { month: "Avr", score: 4.1 },
  { month: "Mai", score: 3.8 },
  { month: "Juin", score: 4.2 },
  { month: "Juil", score: 4.3 },
];

const AUDITS: SiteAudit[] = [
  {
    id: "au1",
    site: "Terrou-Bi",
    date: "2026-07-12",
    auditor: "Cheikh Guèye",
    score: 88,
    nonConformities: ["Badge agent illisible", "Ronde de 02h manquée"],
    status: "a_corriger",
  },
  {
    id: "au2",
    site: "CBAO Plateau",
    date: "2026-07-10",
    auditor: "Cheikh Guèye",
    score: 95,
    nonConformities: [],
    status: "conforme",
  },
  {
    id: "au3",
    site: "Radisson Blu",
    date: "2026-07-08",
    auditor: "Aïssatou Diop",
    score: 91,
    nonConformities: ["Registre de main courante incomplet"],
    status: "a_corriger",
  },
  {
    id: "au4",
    site: "King Fahd Palace",
    date: "2026-07-05",
    auditor: "Cheikh Guèye",
    score: 72,
    nonConformities: [
      "2 agents sans carte pro à jour",
      "Extincteur poste non contrôlé",
      "Éclairage périmètre défaillant",
    ],
    status: "non_conforme",
  },
  {
    id: "au5",
    site: "Port Autonome de Dakar",
    date: "2026-07-02",
    auditor: "Aïssatou Diop",
    score: 93,
    nonConformities: [],
    status: "conforme",
  },
  {
    id: "au6",
    site: "Résidence Les Almadies",
    date: "2026-06-28",
    auditor: "Cheikh Guèye",
    score: 85,
    nonConformities: ["Pointeuse de ronde hors service"],
    status: "a_corriger",
  },
];

const INCIDENTS: Incident[] = [
  {
    id: "inc1",
    site: "Auchan Sea Plaza",
    type: "retard_ronde",
    severity: "faible",
    date: "2026-07-13",
    status: "resolu",
  },
  {
    id: "inc2",
    site: "King Fahd Palace",
    type: "materiel",
    severity: "moyenne",
    date: "2026-07-11",
    status: "en_cours",
  },
  {
    id: "inc3",
    site: "Terrou-Bi",
    type: "absence_agent",
    severity: "elevee",
    date: "2026-07-09",
    status: "ouvert",
  },
  {
    id: "inc4",
    site: "Port Autonome de Dakar",
    type: "intrusion",
    severity: "elevee",
    date: "2026-07-07",
    status: "resolu",
  },
  {
    id: "inc5",
    site: "Résidence Les Almadies",
    type: "materiel",
    severity: "faible",
    date: "2026-07-04",
    status: "en_cours",
  },
];

export function getSatisfactionSeries(): SatisfactionPoint[] {
  return SATISFACTION_SERIES;
}

export function getAudits(): SiteAudit[] {
  return AUDITS;
}

export function getIncidents(): Incident[] {
  return INCIDENTS;
}

export interface SatisfactionStats {
  avgScore: number;
  auditsThisMonth: number;
  openIncidents: number;
  resolutionRate: number;
}

export function getSatisfactionStats(): SatisfactionStats {
  const avgScore =
    SATISFACTION_SERIES[SATISFACTION_SERIES.length - 1]?.score ?? 0;
  const auditsThisMonth = AUDITS.filter((a) => a.date >= "2026-07-01").length;
  const openIncidents = INCIDENTS.filter((i) => i.status !== "resolu").length;
  const resolved = INCIDENTS.filter((i) => i.status === "resolu").length;
  const resolutionRate = INCIDENTS.length
    ? Math.round((resolved / INCIDENTS.length) * 100)
    : 0;
  return { avgScore, auditsThisMonth, openIncidents, resolutionRate };
}

export function auditTone(score: number): "success" | "warning" | "danger" {
  if (score >= 90) return "success";
  if (score >= 80) return "warning";
  return "danger";
}

export const AUDIT_STATUS_META: Record<
  AuditStatus,
  { label: string; variant: PillVariant }
> = {
  conforme: { label: "Conforme", variant: "success" },
  a_corriger: { label: "À corriger", variant: "warning" },
  non_conforme: { label: "Non conforme", variant: "danger" },
};

export const INCIDENT_TYPE_META: Record<IncidentType, string> = {
  intrusion: "Intrusion",
  absence_agent: "Absence agent",
  materiel: "Matériel défectueux",
  retard_ronde: "Ronde en retard",
};

export const INCIDENT_SEVERITY_META: Record<
  IncidentSeverity,
  { label: string; variant: PillVariant }
> = {
  faible: { label: "Faible", variant: "neutral" },
  moyenne: { label: "Moyenne", variant: "warning" },
  elevee: { label: "Élevée", variant: "danger" },
};

export const INCIDENT_STATUS_META: Record<
  IncidentStatus,
  { label: string; variant: PillVariant }
> = {
  ouvert: { label: "Ouvert", variant: "danger" },
  en_cours: { label: "En cours", variant: "info" },
  resolu: { label: "Résolu", variant: "success" },
};
