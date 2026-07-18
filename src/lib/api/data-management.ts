/**
 * Administration → Données : sauvegardes, exports, rétention & conformité APDP.
 * Données démo « Dakar Sécurité ».
 */
import type { PillVariant } from "@/components/ui/status-pill";

export type BackupStatus = "reussie" | "en_cours" | "echouee";

export interface Backup {
  id: string;
  at: string; // ISO datetime
  size: string; // ex. "142 Mo"
  type: "Automatique" | "Manuelle";
  status: BackupStatus;
}

export type ExportFormat = "CSV" | "Excel" | "PDF";
export type ExportStatus = "termine" | "en_cours" | "echoue";

export interface ExportRecord {
  id: string;
  type: string; // ex. "Agents", "Contrats", "Paie"
  requester: string;
  at: string; // ISO datetime
  format: ExportFormat;
  status: ExportStatus;
}

export interface RetentionPolicy {
  dataType: string;
  duration: string;
  basis: string;
}

const BACKUPS: Backup[] = [
  {
    id: "bk1",
    at: "2026-07-14T03:00:00",
    size: "148 Mo",
    type: "Automatique",
    status: "reussie",
  },
  {
    id: "bk2",
    at: "2026-07-13T03:00:00",
    size: "146 Mo",
    type: "Automatique",
    status: "reussie",
  },
  {
    id: "bk3",
    at: "2026-07-12T03:00:00",
    size: "145 Mo",
    type: "Automatique",
    status: "reussie",
  },
  {
    id: "bk4",
    at: "2026-07-11T16:20:00",
    size: "144 Mo",
    type: "Manuelle",
    status: "reussie",
  },
  {
    id: "bk5",
    at: "2026-07-11T03:00:00",
    size: "143 Mo",
    type: "Automatique",
    status: "echouee",
  },
];

const EXPORTS: ExportRecord[] = [
  {
    id: "ex1",
    type: "Paie — bulletins juin",
    requester: "M. Diallo",
    at: "2026-07-14T15:02:00",
    format: "Excel",
    status: "termine",
  },
  {
    id: "ex2",
    type: "Annuaire agents",
    requester: "Cheikh Guèye",
    at: "2026-07-12T08:30:00",
    format: "CSV",
    status: "termine",
  },
  {
    id: "ex3",
    type: "Contrats actifs",
    requester: "Aïda Ba",
    at: "2026-07-10T11:12:00",
    format: "PDF",
    status: "termine",
  },
  {
    id: "ex4",
    type: "Factures Q2 2026",
    requester: "Fatou Sarr",
    at: "2026-07-08T14:45:00",
    format: "Excel",
    status: "termine",
  },
  {
    id: "ex5",
    type: "Présences — juin",
    requester: "Ndèye Fall",
    at: "2026-07-05T09:20:00",
    format: "CSV",
    status: "en_cours",
  },
];

const RETENTION: RetentionPolicy[] = [
  {
    dataType: "Données de paie & bulletins",
    duration: "10 ans",
    basis: "Obligation légale (comptabilité)",
  },
  {
    dataType: "Contrats clients & devis",
    duration: "5 ans",
    basis: "Prescription commerciale",
  },
  {
    dataType: "Cartes pro & certifications agents",
    duration: "Durée d'emploi + 5 ans",
    basis: "Décret 2018-671",
  },
  {
    dataType: "Géolocalisation & pointage terrain",
    duration: "3 mois",
    basis: "Recommandation APDP",
  },
  {
    dataType: "Journaux d'audit / connexions",
    duration: "12 mois",
    basis: "Traçabilité APDP",
  },
];

export function getBackups(): Backup[] {
  return BACKUPS;
}

export function getExports(): ExportRecord[] {
  return EXPORTS;
}

export function getRetentionPolicies(): RetentionPolicy[] {
  return RETENTION;
}

export interface DataStats {
  volume: string;
  lastBackup: string; // ISO
  exportsThisMonth: number;
}

export function getDataStats(): DataStats {
  const lastOk = BACKUPS.filter((b) => b.status === "reussie").sort((a, b) =>
    b.at.localeCompare(a.at),
  )[0];
  return {
    volume: "1,4 Go",
    lastBackup: lastOk?.at ?? BACKUPS[0].at,
    exportsThisMonth: EXPORTS.length,
  };
}

export const BACKUP_STATUS_META: Record<
  BackupStatus,
  { label: string; variant: PillVariant }
> = {
  reussie: { label: "Réussie", variant: "success" },
  en_cours: { label: "En cours", variant: "info" },
  echouee: { label: "Échouée", variant: "danger" },
};

export const EXPORT_STATUS_META: Record<
  ExportStatus,
  { label: string; variant: PillVariant }
> = {
  termine: { label: "Terminé", variant: "success" },
  en_cours: { label: "En cours", variant: "info" },
  echoue: { label: "Échoué", variant: "danger" },
};
