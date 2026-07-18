import type { RoleId } from "@/lib/rbac";

export type FileKind = "pdf" | "doc" | "xls" | "img" | "autre";

export interface LibraryFile {
  id: string;
  name: string;
  kind: FileKind;
  size: number; // octets
  uploader: string;
  date: string; // ISO
}

export interface LibraryFolder {
  id: string;
  name: string;
  description: string;
  /** Rôles autorisés (moindre privilège ; le DG figure partout). */
  roles: RoleId[];
  protege?: boolean;
  files: LibraryFile[];
}

const MB = 1024 * 1024;
const KB = 1024;

const FOLDERS: LibraryFolder[] = [
  {
    id: "d-contrats",
    name: "Contrats & agréments",
    description: "Contrats de prestation, agréments et autorisations",
    roles: ["dg", "comptable", "rp", "dg"],
    protege: true,
    files: [
      {
        id: "f1",
        name: "Contrat Port Autonome 2025.pdf",
        kind: "pdf",
        size: 2.4 * MB,
        uploader: "Aïda Ba",
        date: "2025-07-15T09:00:00",
      },
      {
        id: "f2",
        name: "Agrément Ministère Intérieur.pdf",
        kind: "pdf",
        size: 880 * KB,
        uploader: "M. Diallo",
        date: "2024-02-01T10:30:00",
      },
      {
        id: "f3",
        name: "Contrat Ambassade de France.pdf",
        kind: "pdf",
        size: 1.8 * MB,
        uploader: "Aïda Ba",
        date: "2022-11-20T14:00:00",
      },
      {
        id: "f4",
        name: "Contrat Aéroport AIBD.pdf",
        kind: "pdf",
        size: 2.1 * MB,
        uploader: "Aïda Ba",
        date: "2024-01-01T08:00:00",
      },
    ],
  },
  {
    id: "d-procedures",
    name: "Procédures & consignes de poste",
    description: "Consignes permanentes, modes opératoires, sûreté",
    roles: ["dg", "controleur", "manager", "agent", "manager"],
    files: [
      {
        id: "f5",
        name: "Consignes générales de poste.pdf",
        kind: "pdf",
        size: 620 * KB,
        uploader: "Cheikh Guèye",
        date: "2026-05-12T11:00:00",
      },
      {
        id: "f6",
        name: "Procédure incident & intrusion.pdf",
        kind: "pdf",
        size: 1.1 * MB,
        uploader: "Cheikh Guèye",
        date: "2026-06-02T16:20:00",
      },
      {
        id: "f7",
        name: "Check-list ronde de nuit.docx",
        kind: "doc",
        size: 48 * KB,
        uploader: "Cheikh Guèye",
        date: "2026-06-28T07:45:00",
      },
      {
        id: "f8",
        name: "Plan de sûreté — Port Autonome.pdf",
        kind: "pdf",
        size: 3.2 * MB,
        uploader: "M. Diallo",
        date: "2026-03-10T09:00:00",
      },
    ],
  },
  {
    id: "d-modeles",
    name: "Modèles de documents",
    description: "Devis, contrats, rapports et courriers types",
    roles: [
      "dg",
      "rp",
      "comptable",
      "rh",
      "rh",
      "manager",
      "agent",
      "controleur",
      "manager",
      "dg",
    ],
    files: [
      {
        id: "f9",
        name: "Modèle de devis.docx",
        kind: "doc",
        size: 62 * KB,
        uploader: "Aïda Ba",
        date: "2026-01-08T10:00:00",
      },
      {
        id: "f10",
        name: "Modèle contrat de travail (CDD).docx",
        kind: "doc",
        size: 74 * KB,
        uploader: "Moussa Diop",
        date: "2026-02-14T09:30:00",
      },
      {
        id: "f11",
        name: "Trame rapport d'intervention.xlsx",
        kind: "xls",
        size: 96 * KB,
        uploader: "Ibrahima Sow",
        date: "2026-04-01T15:00:00",
      },
      {
        id: "f12",
        name: "Modèle main courante.pdf",
        kind: "pdf",
        size: 210 * KB,
        uploader: "Cheikh Guèye",
        date: "2026-03-22T08:15:00",
      },
    ],
  },
  {
    id: "d-formations",
    name: "Formations & certifications",
    description: "Supports de formation et attestations agents",
    roles: ["dg", "rh", "rh", "controleur"],
    files: [
      {
        id: "f13",
        name: "Support formation SST.pdf",
        kind: "pdf",
        size: 4.6 * MB,
        uploader: "Moussa Diop",
        date: "2026-05-03T13:00:00",
      },
      {
        id: "f14",
        name: "Attestations aptitude cynophile.pdf",
        kind: "pdf",
        size: 1.3 * MB,
        uploader: "Moussa Diop",
        date: "2026-06-11T10:00:00",
      },
      {
        id: "f15",
        name: "Fiche évaluation stagiaire.xlsx",
        kind: "xls",
        size: 55 * KB,
        uploader: "Moussa Diop",
        date: "2026-06-20T09:00:00",
      },
    ],
  },
  {
    id: "d-rh",
    name: "RH — dossiers agents",
    description: "Dossiers individuels, pièces et habilitations",
    roles: ["dg", "rh", "rh"],
    protege: true,
    files: [
      {
        id: "f16",
        name: "Dossier — Modou Faye.pdf",
        kind: "pdf",
        size: 1.9 * MB,
        uploader: "Ndèye Fall",
        date: "2026-04-18T11:30:00",
      },
      {
        id: "f17",
        name: "Registre du personnel.xlsx",
        kind: "xls",
        size: 340 * KB,
        uploader: "Ndèye Fall",
        date: "2026-06-30T17:00:00",
      },
      {
        id: "f18",
        name: "Habilitations & badges.pdf",
        kind: "pdf",
        size: 720 * KB,
        uploader: "Moussa Diop",
        date: "2026-05-25T08:45:00",
      },
    ],
  },
  {
    id: "d-rapports",
    name: "Rapports d'intervention",
    description: "Comptes rendus d'intervention et photos",
    roles: ["dg", "manager", "controleur"],
    files: [
      {
        id: "f19",
        name: "INT-0142 — Siège Sonatel.pdf",
        kind: "pdf",
        size: 1.2 * MB,
        uploader: "Ibrahima Sow",
        date: "2026-06-26T12:00:00",
      },
      {
        id: "f20",
        name: "INT-0141 — Résidence Almadies.pdf",
        kind: "pdf",
        size: 980 * KB,
        uploader: "Ibrahima Sow",
        date: "2026-06-24T15:30:00",
      },
      {
        id: "f21",
        name: "Photos portique AIBD.jpg",
        kind: "img",
        size: 3.8 * MB,
        uploader: "Ibrahima Sow",
        date: "2026-07-02T09:10:00",
      },
    ],
  },
];

/** Bibliothèque scopée par rôle (le DG voit tous les dossiers). */
export function getLibrary(role: RoleId): LibraryFolder[] {
  return FOLDERS.filter((f) => f.roles.includes(role));
}

export function formatFileSize(bytes: number): string {
  if (bytes < KB) return `${bytes} o`;
  if (bytes < MB) return `${(bytes / KB).toFixed(0)} Ko`;
  return `${(bytes / MB).toFixed(1)} Mo`;
}
