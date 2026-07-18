import type { RoleId } from "@/lib/rbac";

/** Membre de l'équipe projet (déploiement). */
export interface Membre {
  id: string;
  nom: string;
  initials: string;
  fonction?: string;
}

export type ProjectStatut =
  "planifie" | "en_cours" | "a_risque" | "en_avance" | "termine";

export type TaskCategorie =
  "recrutement" | "materiel" | "planning" | "contrat" | "formation";
export type TaskPriorite = "haute" | "moyenne" | "basse";
export type TaskColonne = "a_faire" | "en_cours" | "bloque" | "termine";

export interface ProjectTask {
  id: string;
  projectId: string;
  titre: string;
  assigne?: Membre;
  echeance: string; // ISO
  categorie: TaskCategorie;
  priorite: TaskPriorite;
  colonne: TaskColonne;
}

/** Données brutes d'un déploiement de dispositif. */
export interface ProjectInput {
  id: string;
  nom: string;
  siteClient: string;
  responsable: Membre;
  budgetTotal: number;
  budgetEngage: number;
  echeance: string; // ISO
  statut: ProjectStatut;
  equipe: Membre[];
  alerte?: string;
}

/** Déploiement avec avancement % et budget % dérivés des tâches. */
export interface Project extends ProjectInput {
  avancementPct: number;
  budgetPct: number;
}

/* ── Équipe (personas Dakar Sécurité) ── */
const M = {
  cg: {
    id: "u-cg",
    nom: "Cheikh Guèye",
    initials: "CG",
    fonction: "Chef de contrôle",
  },
  ab: { id: "u-ab", nom: "Aïda Ba", initials: "AB", fonction: "Secrétaire" },
  md: { id: "u-md", nom: "Moussa Diop", initials: "MD", fonction: "Recruteur" },
  is: {
    id: "u-is",
    nom: "Ibrahima Sow",
    initials: "IS",
    fonction: "Mainteneur",
  },
  fs: { id: "u-fs", nom: "Fatou Sarr", initials: "FS", fonction: "Comptable" },
  an: { id: "u-an", nom: "Awa N’Diaye", initials: "AN", fonction: "Caissière" },
} satisfies Record<string, Membre>;

const PROJECTS: ProjectInput[] = [
  {
    id: "p-pad",
    nom: "Déploiement Port Autonome de Dakar",
    siteClient: "Port Autonome de Dakar",
    responsable: M.cg,
    budgetTotal: 6_500_000,
    budgetEngage: 4_200_000,
    echeance: "2026-07-20",
    statut: "en_cours",
    equipe: [M.cg, M.md, M.is, M.ab],
  },
  {
    id: "p-amb",
    nom: "Sécurisation Ambassade de France",
    siteClient: "Ambassade de France · Almadies",
    responsable: M.ab,
    budgetTotal: 4_800_000,
    budgetEngage: 4_600_000,
    echeance: "2026-07-10",
    statut: "a_risque",
    equipe: [M.ab, M.cg, M.md],
    alerte: "Retard livraison uniformes +4 j",
  },
  {
    id: "p-seaplaza",
    nom: "Gardiennage Centre commercial Sea Plaza",
    siteClient: "Sea Plaza · Corniche",
    responsable: M.cg,
    budgetTotal: 3_900_000,
    budgetEngage: 1_400_000,
    echeance: "2026-08-15",
    statut: "planifie",
    equipe: [M.cg, M.md],
  },
  {
    id: "p-aibd",
    nom: "Dispositif AIBD terminal 2",
    siteClient: "Aéroport AIBD · terminal 2",
    responsable: M.cg,
    budgetTotal: 7_200_000,
    budgetEngage: 6_900_000,
    echeance: "2026-07-05",
    statut: "en_avance",
    equipe: [M.cg, M.md, M.is, M.fs, M.ab],
  },
  {
    id: "p-sonatel",
    nom: "Télésurveillance Siège Sonatel",
    siteClient: "Siège Sonatel · Médina",
    responsable: M.ab,
    budgetTotal: 2_600_000,
    budgetEngage: 1_950_000,
    echeance: "2026-07-28",
    statut: "en_cours",
    equipe: [M.ab, M.is],
    alerte: "Dépassement budget matériel +6,4 %",
  },
  {
    id: "p-rondes",
    nom: "Rondes nocturnes zone industrielle",
    siteClient: "Zone industrielle · Diamniadio",
    responsable: M.cg,
    budgetTotal: 3_100_000,
    budgetEngage: 3_050_000,
    echeance: "2026-06-30",
    statut: "termine",
    equipe: [M.cg, M.md],
  },
];

/* ── Tâches par déploiement (alimentent le Kanban + l'avancement) ── */
const T = (
  id: string,
  projectId: string,
  titre: string,
  categorie: TaskCategorie,
  priorite: TaskPriorite,
  colonne: TaskColonne,
  echeance: string,
  assigne?: Membre,
): ProjectTask => ({
  id,
  projectId,
  titre,
  categorie,
  priorite,
  colonne,
  echeance,
  assigne,
});

const TASKS: ProjectTask[] = [
  // Port Autonome (en_cours) → 3/6 terminées = 50 %
  T(
    "t1",
    "p-pad",
    "Recruter 8 agents de sécurité",
    "recrutement",
    "haute",
    "termine",
    "2026-06-20",
    M.md,
  ),
  T(
    "t2",
    "p-pad",
    "Commander 8 uniformes + équipement",
    "materiel",
    "haute",
    "termine",
    "2026-06-25",
    M.is,
  ),
  T(
    "t3",
    "p-pad",
    "Signer le contrat de prestation",
    "contrat",
    "haute",
    "termine",
    "2026-06-18",
    M.ab,
  ),
  T(
    "t4",
    "p-pad",
    "Établir le planning des postes",
    "planning",
    "moyenne",
    "en_cours",
    "2026-07-08",
    M.cg,
  ),
  T(
    "t5",
    "p-pad",
    "Formation sûreté portuaire",
    "formation",
    "moyenne",
    "en_cours",
    "2026-07-12",
    M.cg,
  ),
  T(
    "t6",
    "p-pad",
    "Installer la pointeuse de ronde",
    "materiel",
    "basse",
    "a_faire",
    "2026-07-16",
    M.is,
  ),
  // Ambassade (a_risque) → 2/5 = 40 %
  T(
    "t7",
    "p-amb",
    "Habilitations agents (enquête)",
    "recrutement",
    "haute",
    "termine",
    "2026-06-22",
    M.md,
  ),
  T(
    "t8",
    "p-amb",
    "Contrat & clauses de confidentialité",
    "contrat",
    "haute",
    "termine",
    "2026-06-15",
    M.ab,
  ),
  T(
    "t9",
    "p-amb",
    "Livraison uniformes (retard fournisseur)",
    "materiel",
    "haute",
    "bloque",
    "2026-07-02",
    M.is,
  ),
  T(
    "t10",
    "p-amb",
    "Planning 24/7 filtrage véhicules",
    "planning",
    "moyenne",
    "en_cours",
    "2026-07-06",
    M.cg,
  ),
  T(
    "t11",
    "p-amb",
    "Briefing consignes ambassade",
    "formation",
    "moyenne",
    "a_faire",
    "2026-07-09",
    M.cg,
  ),
  // Sea Plaza (planifie) → 0/4 = 0 %
  T(
    "t12",
    "p-seaplaza",
    "Étude de sûreté du site",
    "planning",
    "moyenne",
    "a_faire",
    "2026-07-30",
    M.cg,
  ),
  T(
    "t13",
    "p-seaplaza",
    "Devis & signature contrat",
    "contrat",
    "haute",
    "a_faire",
    "2026-08-01",
    M.ab,
  ),
  T(
    "t14",
    "p-seaplaza",
    "Recrutement 6 agents",
    "recrutement",
    "haute",
    "a_faire",
    "2026-08-05",
    M.md,
  ),
  T(
    "t15",
    "p-seaplaza",
    "Commande équipement",
    "materiel",
    "basse",
    "a_faire",
    "2026-08-10",
    M.is,
  ),
  // AIBD (en_avance) → 4/5 = 80 %
  T(
    "t16",
    "p-aibd",
    "Recrutement 12 agents zone fret",
    "recrutement",
    "haute",
    "termine",
    "2026-06-10",
    M.md,
  ),
  T(
    "t17",
    "p-aibd",
    "Contrat aéroportuaire signé",
    "contrat",
    "haute",
    "termine",
    "2026-06-08",
    M.ab,
  ),
  T(
    "t18",
    "p-aibd",
    "Équipement + détecteurs livrés",
    "materiel",
    "haute",
    "termine",
    "2026-06-20",
    M.is,
  ),
  T(
    "t19",
    "p-aibd",
    "Formation sûreté aéroportuaire",
    "formation",
    "moyenne",
    "termine",
    "2026-06-28",
    M.cg,
  ),
  T(
    "t20",
    "p-aibd",
    "Planning terminal 2 finalisé",
    "planning",
    "moyenne",
    "en_cours",
    "2026-07-03",
    M.cg,
  ),
  // Sonatel (en_cours) → 2/5 = 40 %
  T(
    "t21",
    "p-sonatel",
    "Contrat télésurveillance",
    "contrat",
    "haute",
    "termine",
    "2026-06-25",
    M.ab,
  ),
  T(
    "t22",
    "p-sonatel",
    "Installation caméras + NVR",
    "materiel",
    "haute",
    "termine",
    "2026-07-01",
    M.is,
  ),
  T(
    "t23",
    "p-sonatel",
    "Recruter 2 opérateurs PC",
    "recrutement",
    "moyenne",
    "en_cours",
    "2026-07-15",
    M.md,
  ),
  T(
    "t24",
    "p-sonatel",
    "Planning surveillance 24/7",
    "planning",
    "moyenne",
    "en_cours",
    "2026-07-20",
    M.cg,
  ),
  T(
    "t25",
    "p-sonatel",
    "Formation logiciel supervision",
    "formation",
    "basse",
    "a_faire",
    "2026-07-25",
    M.cg,
  ),
  // Rondes (termine) → 4/4 = 100 %
  T(
    "t26",
    "p-rondes",
    "Recrutement 4 agents mobiles",
    "recrutement",
    "moyenne",
    "termine",
    "2026-06-05",
    M.md,
  ),
  T(
    "t27",
    "p-rondes",
    "Véhicule + matériel de ronde",
    "materiel",
    "moyenne",
    "termine",
    "2026-06-10",
    M.is,
  ),
  T(
    "t28",
    "p-rondes",
    "Contrat zone industrielle",
    "contrat",
    "haute",
    "termine",
    "2026-06-02",
    M.ab,
  ),
  T(
    "t29",
    "p-rondes",
    "Planning des rondes nocturnes",
    "planning",
    "moyenne",
    "termine",
    "2026-06-12",
    M.cg,
  ),
];

/** Avancement = tâches terminées / total (dérivé, jamais codé en dur). */
export function computeAvancement(tasks: ProjectTask[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.colonne === "termine").length;
  return Math.round((done / tasks.length) * 100);
}

function toProject(input: ProjectInput): Project {
  const tasks = TASKS.filter((t) => t.projectId === input.id);
  return {
    ...input,
    avancementPct: computeAvancement(tasks),
    budgetPct:
      input.budgetTotal > 0
        ? Math.round((input.budgetEngage / input.budgetTotal) * 100)
        : 0,
  };
}

/** Liste des déploiements — accès DG + Secrétaire + Chef de contrôle. */
export function getProjects(_role: RoleId): Project[] {
  return PROJECTS.map(toProject);
}

export function getProject(id: string): Project | undefined {
  const input = PROJECTS.find((p) => p.id === id);
  return input ? toProject(input) : undefined;
}

export function getProjectTasks(projectId: string): ProjectTask[] {
  return TASKS.filter((t) => t.projectId === projectId);
}

/** Ids de tous les déploiements (prérendu des routes détail). */
export function allProjectIds(): string[] {
  return PROJECTS.map((p) => p.id);
}

/* ── Métadonnées d'affichage (tokens sémantiques du kit) ── */
export const STATUT_META: Record<
  ProjectStatut,
  {
    label: string;
    variant: "info" | "danger" | "success" | "warning" | "neutral";
  }
> = {
  planifie: { label: "Planifié", variant: "warning" },
  en_cours: { label: "En cours", variant: "info" },
  a_risque: { label: "À risque", variant: "danger" },
  en_avance: { label: "En avance", variant: "success" },
  termine: { label: "Terminé", variant: "neutral" },
};
