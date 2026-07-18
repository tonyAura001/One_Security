import type { RoleId } from "@/lib/rbac";

/**
 * Catalogue des permissions (miroir du seed backend `pilotepme-api`).
 * En mode démo, les permissions de l'utilisateur sont dérivées de son rôle via
 * `ROLE_PERMISSIONS`. En mode connecté, elles proviennent de `/moi/permissions`.
 */
export const ALL_PERMISSIONS = [
  "consulterClient",
  "creerClient",
  "modifierClient",
  "creerContrat",
  "validerContrat",
  "consulterFinance",
  "creerFacture",
  "validerFacture",
  "consulterPlanning",
  "gererPlanning",
  "pointer",
  "declarerIncident",
  "consulterIncident",
  "cloturerIncident",
  "consulterRapports",
  "gererUtilisateurs",
  "gererRoles",
  "gererPermissions",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  consulterClient: "Consulter les clients",
  creerClient: "Créer un client",
  modifierClient: "Modifier un client",
  creerContrat: "Créer un contrat",
  validerContrat: "Valider un contrat",
  consulterFinance: "Consulter la finance",
  creerFacture: "Créer une facture",
  validerFacture: "Valider une facture",
  consulterPlanning: "Consulter le planning",
  gererPlanning: "Gérer le planning",
  pointer: "Effectuer un pointage",
  declarerIncident: "Déclarer un incident",
  consulterIncident: "Consulter les incidents",
  cloturerIncident: "Clôturer un incident",
  consulterRapports: "Consulter les rapports",
  gererUtilisateurs: "Gérer les utilisateurs",
  gererRoles: "Gérer les rôles",
  gererPermissions: "Gérer les permissions",
};

/** Rôle → permissions (DG hérite de tout). Aligné sur `prisma/seed.ts`. */
export const ROLE_PERMISSIONS: Record<RoleId, Permission[]> = {
  dg: [...ALL_PERMISSIONS],
  rp: [
    "consulterClient",
    "consulterPlanning",
    "gererPlanning",
    "consulterIncident",
    "consulterRapports",
  ],
  rf: [
    "consulterClient",
    "consulterFinance",
    "creerFacture",
    "validerFacture",
    "consulterRapports",
  ],
  rh: ["consulterPlanning", "consulterRapports"],
  manager: ["consulterClient", "consulterPlanning", "consulterIncident"],
  controleur: ["consulterPlanning", "consulterIncident", "cloturerIncident"],
  surveillant: [
    "consulterPlanning",
    "pointer",
    "declarerIncident",
    "consulterIncident",
  ],
  juriste: [
    "consulterClient",
    "creerContrat",
    "validerContrat",
    "consulterRapports",
  ],
  comptable: ["consulterClient", "consulterFinance", "creerFacture"],
  agent: ["pointer", "declarerIncident", "consulterPlanning"],
};
