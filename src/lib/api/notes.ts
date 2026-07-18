import type { RoleId } from "@/lib/rbac";

export type NoteColor =
  "accent" | "success" | "warning" | "danger" | "violet" | "neutral";

export interface DemoNote {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  pinned: boolean;
  archived: boolean;
  /** "equipe" = partagée (scope `roles`) ; "privee" = personnelle à un rôle. */
  scope: "equipe" | "privee";
  roles: RoleId[];
  authorRole: RoleId;
  authorName: string;
  updatedAt: string; // ISO
}

const ALL: RoleId[] = [
  "dg",
  "rp",
  "rf",
  "rh",
  "manager",
  "controleur",
  "surveillant",
  "juriste",
  "comptable",
  "agent",
];

const AUTHOR: Record<RoleId, string> = {
  dg: "M. Diallo",
  rp: "Cheikh Guèye",
  rf: "Awa N’Diaye",
  rh: "Ndèye Fall",
  manager: "Moussa Diop",
  controleur: "Ibrahima Sow",
  surveillant: "Fatou Sarr",
  juriste: "Aïda Ba",
  comptable: "Sophie Mendy",
  agent: "Lamine Faye",
};

/** Notes d'ÉQUIPE (partagées) — visibles selon `roles`. */
const TEAM_NOTES: DemoNote[] = [
  {
    id: "n1",
    title: "Consignes poste — Ambassade de France",
    content:
      "Contrôle d'accès strict, filtrage véhicules, rondes toutes les 30 min. Signaler tout colis suspect au superviseur.",
    color: "warning",
    pinned: true,
    archived: false,
    scope: "equipe",
    roles: ["dg", "controleur", "rp"],
    authorRole: "controleur",
    authorName: "Cheikh Guèye",
    updatedAt: "2026-06-28T09:00:00",
  },
  {
    id: "n2",
    title: "Procédure incident & intrusion",
    content:
      "1. Sécuriser la zone. 2. Alerter le PC. 3. Prévenir les forces de l'ordre. 4. Rédiger la main courante avant la fin du service.",
    color: "danger",
    pinned: false,
    archived: false,
    scope: "equipe",
    roles: ["dg", "controleur", "manager", "agent", "manager"],
    authorRole: "controleur",
    authorName: "Cheikh Guèye",
    updatedAt: "2026-06-15T14:30:00",
  },
  {
    id: "n3",
    title: "Check-list ronde de nuit",
    content:
      "Portes/issues, éclairages, caméras, badges, registre de passage. Photo horodatée à chaque point de contrôle.",
    color: "accent",
    pinned: true,
    archived: false,
    scope: "equipe",
    roles: ["dg", "controleur", "manager"],
    authorRole: "controleur",
    authorName: "Cheikh Guèye",
    updatedAt: "2026-06-30T22:10:00",
  },
  {
    id: "n4",
    title: "Contacts d'urgence — sites",
    content:
      "Police 17 · Pompiers 18 · PC Dakar Sécurité +221 33 800 00 00 · Astreinte DG +221 77 512 40 01.",
    color: "success",
    pinned: true,
    archived: false,
    scope: "equipe",
    roles: ALL,
    authorRole: "dg",
    authorName: "M. Diallo",
    updatedAt: "2026-05-02T08:00:00",
  },
  {
    id: "n5",
    title: "Mémo passation d'équipe",
    content:
      "Faire le point sur les incidents, le matériel manquant, les consignes temporaires et les agents en retard.",
    color: "neutral",
    pinned: false,
    archived: false,
    scope: "equipe",
    roles: ["dg", "controleur"],
    authorRole: "controleur",
    authorName: "Cheikh Guèye",
    updatedAt: "2026-06-25T06:45:00",
  },
  {
    id: "n6",
    title: "Ouverture de caisse — rappels",
    content:
      "Fond de caisse 50 000 FCFA. Vérifier le stock d'équipements. Reçu obligatoire pour chaque vente (Espèces / Wave / Orange Money).",
    color: "accent",
    pinned: false,
    archived: false,
    scope: "equipe",
    roles: ["dg", "agent"],
    authorRole: "agent",
    authorName: "Awa N’Diaye",
    updatedAt: "2026-06-18T08:20:00",
  },
  {
    id: "n7",
    title: "Export paie SICA-UEMOA",
    content:
      "Vérifier les IBAN, générer le fichier de virements après approbation DG (Niveau 3), archiver le bordereau.",
    color: "violet",
    pinned: false,
    archived: false,
    scope: "equipe",
    roles: ["dg", "comptable", "rh"],
    authorRole: "comptable",
    authorName: "Fatou Sarr",
    updatedAt: "2026-07-01T16:00:00",
  },
  {
    id: "n8",
    title: "Ancienne consigne — Sea Plaza (archivée)",
    content:
      "Remplacée par la nouvelle procédure d'accès. Conservée pour historique.",
    color: "neutral",
    pinned: false,
    archived: true,
    scope: "equipe",
    roles: ALL,
    authorRole: "controleur",
    authorName: "Cheikh Guèye",
    updatedAt: "2026-04-10T10:00:00",
  },
];

/** Note PERSONNELLE de démo par rôle (pour peupler « Mes notes »). */
function personalFor(role: RoleId): DemoNote {
  const map: Partial<Record<RoleId, { title: string; content: string }>> = {
    dg: {
      title: "Points comité de direction",
      content:
        "Masse salariale à approuver, renouvellement Port Autonome, couverture des 3 sites.",
    },
    rp: {
      title: "Sites à surveiller",
      content:
        "Résidence Almadies, CBAO, Eiffage chantier — postes non couverts.",
    },
    rf: {
      title: "Relances à suivre",
      content:
        "Ambassade (J+32), CBAO (J+12), Auchan (J+44). Préparer mises en demeure.",
    },
    rh: {
      title: "Entretiens & CNAPS",
      content:
        "Ibou Sarr (cynophile), Ndeye Gueye ; 4 cartes CNAPS à renouveler < 30 j.",
    },
    manager: {
      title: "Secteur — points du jour",
      content:
        "Almadies : relève 14h. Sea Plaza : retard agent. Contrôle pointage secteur.",
    },
    controleur: {
      title: "Contrôles à mener",
      content:
        "Ronde Port Autonome, validation présences N2, écart de pointage CBAO.",
    },
    surveillant: {
      title: "Poste — consignes",
      content:
        "Relève 06h/14h/22h, main courante à jour, filtrage strict des accès.",
    },
    juriste: {
      title: "Dossiers juridiques",
      content:
        "Renouvellement Port Autonome, contentieux impayé Ambassade, réclamation Sea Plaza.",
    },
    comptable: {
      title: "Relances & clôture",
      content:
        "Ambassade (J+32), export paie SICA-UEMOA, rapprochement bancaire du mois.",
    },
    agent: {
      title: "Ma vacation",
      content:
        "Tour Cristal 14h, ronde toutes les 30 min, signaler tout colis suspect.",
    },
  };
  const p = map[role] ?? { title: "Mes notes", content: "" };
  return {
    id: `np-${role}`,
    title: p.title,
    content: p.content,
    color: "accent",
    pinned: false,
    archived: false,
    scope: "privee",
    roles: [role],
    authorRole: role,
    authorName: AUTHOR[role],
    updatedAt: "2026-07-03T18:00:00",
  };
}

/** Notes visibles par un rôle : notes d'équipe de son périmètre + sa note perso. */
export function getNotes(role: RoleId): DemoNote[] {
  const team = TEAM_NOTES.filter((n) => n.roles.includes(role));
  return [...team, personalFor(role)];
}
