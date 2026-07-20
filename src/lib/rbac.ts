import type { IconName } from "./icons";

/**
 * RBAC + role configuration — single source of truth for the sidebar,
 * routes, home screen and demo profile of each of the 10 PilotePME profiles
 * (entreprise de sécurité privée).
 * Today it feeds the demo session; tomorrow the same shape can be
 * hydrated from the auth backend without touching any screen.
 */

export type ScreenKey =
  | "dashboard"
  | "finance"
  | "crm"
  | "planning"
  | "paie"
  | "recrutement"
  | "pos"
  | "taches"
  | "rapports"
  | "documents"
  | "parametres"
  | "home"
  | "relances"
  | "budget"
  | "exportpaie"
  | "devisform"
  | "contratedit"
  | "reclamations"
  | "entretiens"
  | "contrattravail"
  | "onboarding"
  | "prepaie"
  | "presences"
  | "soumission"
  | "pointage"
  | "validpresences"
  | "tickets"
  | "interventions"
  | "histsite"
  | "calendrier"
  | "composer"
  | "veille"
  | "notifications"
  | "stock"
  | "recus"
  | "cloture"
  | "membres"
  | "tresorerie"
  | "contrats"
  | "fournisseurs"
  | "acces"
  | "prospects"
  | "satisfaction"
  | "agents"
  | "approbation"
  | "catalogue"
  | "securite"
  | "donnees"
  | "bibliotheque"
  | "notes"
  | "decision"
  | "alertes"
  | "diffusion"
  | "reunions"
  | "mestaches"
  | "analytics"
  | "messagerie"
  | "rentabilite"
  | "projets"
  // Écrans spécifiques métier sécurité (ajoutés pour PilotePME)
  | "sites"
  | "rondes"
  | "incidents"
  | "conformite"
  | "contentieux";

/**
 * Les 10 profils métier de PilotePME (entreprise de sécurité privée).
 */
export type RoleId =
  | "dg" // Directeur Général
  | "rp" // Responsable des Prestations (planning / opérations)
  | "rf" // Responsable Financier
  | "rh" // Ressources Humaines
  | "manager" // Manager de secteur
  | "controleur" // Contrôleur
  | "surveillant" // Surveillant (chef de poste)
  | "juriste" // Juriste
  | "comptable" // Comptable
  | "agent"; // Agent de sécurité (terrain, mobile)

export type KpiColor =
  "success" | "accent" | "danger" | "warning" | "violet" | "foreground";

/**
 * Item de navigation en ARBRE.
 * - Feuille : possède `key` (→ route `/${key}`), pas de `children`.
 * - Groupe dépliable : possède `children`, PAS de `key` (aucune navigation
 *   directe ; en rail replié il pointe vers sa 1re feuille, cf. l'adaptateur).
 */
export interface MenuItem {
  key?: ScreenKey;
  label: string;
  icon: IconName;
  children?: MenuItem[];
}

export interface HomeKpi {
  label: string;
  value: string;
  color: KpiColor;
}

export interface HomeLink {
  label: string;
  key: ScreenKey;
  icon: IconName;
}

export interface RoleConfig {
  id: RoleId;
  /** Display name of the demo persona. */
  name: string;
  /** Job title. */
  fonction: string;
  initials: string;
  /** Avatar gradient stops (from → to). */
  gradient: [string, string];
  /** Sidebar section label. */
  section: string;
  /** Landing screen for this role. */
  home: ScreenKey;
  menu: MenuItem[];
  /** Generic role dashboard (used when home === "home"). */
  homeTitle?: string;
  kpis?: HomeKpi[];
  links?: HomeLink[];
}

export const ORG = {
  name: "One Security",
  tagline: "PILOTEPME · SÉCURITÉ PRIVÉE",
} as const;

// ── Groupes de menu réutilisés par plusieurs rôles ────────────────────────

const GRP_FINANCE: MenuItem = {
  label: "Finance & Facturation",
  icon: "receipt",
  children: [
    { key: "tresorerie", label: "Trésorerie", icon: "cash" },
    { key: "rentabilite", label: "Rentabilité par site", icon: "chart" },
    { key: "budget", label: "Budget", icon: "chart" },
    { key: "finance", label: "Factures", icon: "receipt" },
    { key: "devisform", label: "Devis", icon: "doc" },
    { key: "contratedit", label: "Éditeur de contrat", icon: "doc" },
    { key: "relances", label: "Paiements & Relances", icon: "bell" },
    { key: "fournisseurs", label: "Fournisseurs", icon: "box" },
    { key: "exportpaie", label: "Export paie bancaire", icon: "upload" },
  ],
};

const GRP_CRM: MenuItem = {
  label: "CRM Clients",
  icon: "users",
  children: [
    { key: "crm", label: "Clients (sites gardés)", icon: "building" },
    { key: "acces", label: "Accès clients", icon: "users" },
    { key: "prospects", label: "Prospects", icon: "chart" },
    { key: "contrats", label: "Contrats", icon: "doc" },
    { key: "satisfaction", label: "Satisfaction & audits", icon: "chart" },
  ],
};

const GRP_OPERATIONS: MenuItem = {
  label: "Planning & Agents",
  icon: "calendar",
  children: [
    { key: "planning", label: "Planning hebdo", icon: "calendar" },
    { key: "pointage", label: "Pointage & Présences", icon: "check" },
    { key: "presences", label: "Présences", icon: "calendar" },
    { key: "validpresences", label: "Validation présences", icon: "shield" },
    { key: "agents", label: "Agents", icon: "users" },
    { key: "sites", label: "Sites gardés", icon: "building" },
    { key: "rondes", label: "Rondes & patrouilles", icon: "pin" },
  ],
};

const GRP_RH: MenuItem = {
  label: "RH & Paie",
  icon: "userplus",
  children: [
    { key: "recrutement", label: "Pipeline candidats", icon: "userplus" },
    { key: "entretiens", label: "Entretiens", icon: "calendar" },
    { key: "contrattravail", label: "Contrats de travail", icon: "doc" },
    { key: "onboarding", label: "Onboarding", icon: "check" },
    { key: "prepaie", label: "Préparer la paie", icon: "cash" },
    { key: "paie", label: "Bulletins", icon: "receipt" },
  ],
};

const GRP_JURIDIQUE: MenuItem = {
  label: "Juridique & Conformité",
  icon: "gavel",
  children: [
    { key: "contrats", label: "Contrats de prestation", icon: "doc" },
    { key: "contrattravail", label: "Contrats de travail", icon: "doc" },
    { key: "conformite", label: "Conformité CNAPS", icon: "shield" },
    { key: "contentieux", label: "Contentieux", icon: "gavel" },
    { key: "reclamations", label: "Réclamations", icon: "alert" },
  ],
};

const GRP_ADMIN: MenuItem = {
  label: "Administration",
  icon: "shield",
  children: [
    { key: "membres", label: "Membres & habilitations", icon: "shield" },
    { key: "securite", label: "Sécurité — Audit", icon: "lock" },
    { key: "donnees", label: "Données", icon: "database" },
  ],
};

export const ROLES: Record<RoleId, RoleConfig> = {
  // ─────────────────────────── Direction ───────────────────────────
  dg: {
    id: "dg",
    name: "M. Diallo",
    fonction: "Directeur Général",
    initials: "MD",
    gradient: ["#8B5CF6", "#2D6BFF"],
    section: "PILOTAGE",
    home: "dashboard",
    menu: [
      { key: "dashboard", label: "Tableau de bord 360°", icon: "grid" },
      { key: "decision", label: "Centre de Décision", icon: "gavel" },
      { key: "projets", label: "Déploiements", icon: "layers" },
      GRP_FINANCE,
      GRP_CRM,
      GRP_OPERATIONS,
      GRP_RH,
      GRP_JURIDIQUE,
      { key: "analytics", label: "Analytics", icon: "analytics" },
      { key: "rapports", label: "Rapports", icon: "chart" },
      {
        label: "Communication",
        icon: "megaphone",
        children: [
          { key: "calendrier", label: "Calendrier éditorial", icon: "calendar" },
          { key: "composer", label: "Composer", icon: "edit" },
          { key: "diffusion", label: "Diffusion", icon: "megaphone" },
          { key: "veille", label: "Veille réputation", icon: "alert" },
          { key: "notifications", label: "Notifications", icon: "bell" },
        ],
      },
      {
        label: "Boutique & Caisse",
        icon: "box",
        children: [
          { key: "catalogue", label: "Catalogue équipements", icon: "box" },
          { key: "stock", label: "Gestion du stock", icon: "box" },
          { key: "recus", label: "Reçus", icon: "receipt" },
          { key: "cloture", label: "Clôture journalière", icon: "lock" },
        ],
      },
      GRP_ADMIN,
    ],
  },

  // ────────────────── Responsable des Prestations ───────────────────
  rp: {
    id: "rp",
    name: "Cheikh Guèye",
    fonction: "Responsable des Prestations",
    initials: "CG",
    gradient: ["#2D6BFF", "#10B981"],
    section: "OPÉRATIONS",
    home: "home",
    menu: [
      { key: "home", label: "Tableau de bord opérations", icon: "grid" },
      GRP_OPERATIONS,
      { key: "incidents", label: "Incidents & main courante", icon: "alert" },
      { key: "projets", label: "Déploiements", icon: "layers" },
      {
        label: "CRM & Contrats",
        icon: "users",
        children: [
          { key: "crm", label: "Clients (sites gardés)", icon: "building" },
          { key: "contrats", label: "Contrats", icon: "doc" },
          { key: "satisfaction", label: "Satisfaction & audits", icon: "chart" },
        ],
      },
      { key: "rapports", label: "Rapports", icon: "chart" },
    ],
    homeTitle: "Tableau de bord opérations",
    kpis: [
      { label: "Agents en service", value: "47/52", color: "accent" },
      { label: "Sites couverts", value: "18/19", color: "success" },
      { label: "Sites sous-dotés", value: "3", color: "warning" },
      { label: "Incidents ouverts", value: "5", color: "danger" },
    ],
    links: [
      { label: "Planning hebdo", key: "planning", icon: "calendar" },
      { label: "Incidents", key: "incidents", icon: "alert" },
      { label: "Agents", key: "agents", icon: "users" },
    ],
  },

  // ─────────────────── Responsable Financier ────────────────────────
  rf: {
    id: "rf",
    name: "Awa N’Diaye",
    fonction: "Responsable Financier",
    initials: "AN",
    gradient: ["#10B981", "#2D6BFF"],
    section: "FINANCE",
    home: "home",
    menu: [
      { key: "home", label: "Tableau de bord financier", icon: "grid" },
      GRP_FINANCE,
      {
        label: "CRM & Contrats",
        icon: "users",
        children: [
          { key: "crm", label: "Clients", icon: "building" },
          { key: "contrats", label: "Contrats", icon: "doc" },
          { key: "prospects", label: "Prospects", icon: "chart" },
        ],
      },
      { key: "analytics", label: "Analytics", icon: "analytics" },
      { key: "rapports", label: "Rapports", icon: "chart" },
    ],
    homeTitle: "Tableau de bord financier",
    kpis: [
      { label: "CA encaissé", value: "10 575 000 FCFA", color: "success" },
      { label: "En attente", value: "3 420 000 FCFA", color: "accent" },
      { label: "En retard", value: "1 875 000 FCFA", color: "danger" },
      { label: "Trésorerie", value: "6 240 000 FCFA", color: "foreground" },
    ],
    links: [
      { label: "Trésorerie", key: "tresorerie", icon: "cash" },
      { label: "Facturation", key: "finance", icon: "receipt" },
      { label: "Relances", key: "relances", icon: "bell" },
      { label: "Rentabilité/site", key: "rentabilite", icon: "chart" },
    ],
  },

  // ───────────────────── Ressources Humaines ────────────────────────
  rh: {
    id: "rh",
    name: "Ndèye Fall",
    fonction: "Responsable RH",
    initials: "NF",
    gradient: ["#2D6BFF", "#8B5CF6"],
    section: "RESSOURCES HUMAINES",
    home: "home",
    menu: [
      { key: "home", label: "Tableau de bord RH", icon: "grid" },
      {
        label: "Recrutement",
        icon: "userplus",
        children: [
          { key: "recrutement", label: "Pipeline candidats", icon: "userplus" },
          { key: "entretiens", label: "Entretiens", icon: "calendar" },
          { key: "contrattravail", label: "Contrats de travail", icon: "doc" },
          { key: "onboarding", label: "Onboarding", icon: "check" },
        ],
      },
      {
        label: "Personnel",
        icon: "users",
        children: [
          { key: "agents", label: "Agents", icon: "users" },
          { key: "presences", label: "Présences", icon: "calendar" },
          { key: "conformite", label: "Conformité CNAPS", icon: "shield" },
        ],
      },
      {
        label: "Paie",
        icon: "cash",
        children: [
          { key: "exportpaie", label: "Bulletins & paie", icon: "receipt" },
          { key: "prepaie", label: "Préparer la paie", icon: "cash" },
          { key: "paie", label: "Bulletins", icon: "receipt" },
          { key: "soumission", label: "Soumission", icon: "upload" },
        ],
      },
      { key: "rapports", label: "Rapports", icon: "chart" },
    ],
    homeTitle: "Tableau de bord RH",
    kpis: [
      { label: "Effectif", value: "52 agents", color: "accent" },
      { label: "Candidats pipeline", value: "12", color: "violet" },
      { label: "Cartes CNAPS à renouveler", value: "4", color: "warning" },
      { label: "Recrutés ce mois", value: "5", color: "success" },
    ],
    links: [
      { label: "Pipeline", key: "recrutement", icon: "userplus" },
      { label: "Agents", key: "agents", icon: "users" },
      { label: "Conformité CNAPS", key: "conformite", icon: "shield" },
      { label: "Bulletins", key: "paie", icon: "receipt" },
    ],
  },

  // ───────────────────── Manager de secteur ─────────────────────────
  manager: {
    id: "manager",
    name: "Moussa Diop",
    fonction: "Manager de secteur",
    initials: "MO",
    gradient: ["#F59E0B", "#2D6BFF"],
    section: "OPÉRATIONS",
    home: "home",
    menu: [
      { key: "home", label: "Tableau de bord secteur", icon: "grid" },
      {
        label: "Planning secteur",
        icon: "calendar",
        children: [
          { key: "planning", label: "Planning hebdo", icon: "calendar" },
          { key: "pointage", label: "Pointage", icon: "check" },
          { key: "presences", label: "Présences", icon: "calendar" },
          { key: "agents", label: "Agents", icon: "users" },
          { key: "sites", label: "Sites gardés", icon: "building" },
        ],
      },
      { key: "incidents", label: "Incidents", icon: "alert" },
      { key: "rondes", label: "Rondes", icon: "pin" },
      { key: "rapports", label: "Rapports", icon: "chart" },
    ],
    homeTitle: "Tableau de bord secteur",
    kpis: [
      { label: "Agents du secteur", value: "18", color: "accent" },
      { label: "En poste", value: "16", color: "success" },
      { label: "Sites du secteur", value: "6", color: "foreground" },
      { label: "Incidents 24h", value: "2", color: "warning" },
    ],
    links: [
      { label: "Planning", key: "planning", icon: "calendar" },
      { label: "Incidents", key: "incidents", icon: "alert" },
      { label: "Sites", key: "sites", icon: "building" },
    ],
  },

  // ────────────────────────── Contrôleur ────────────────────────────
  controleur: {
    id: "controleur",
    name: "Ibrahima Sow",
    fonction: "Contrôleur",
    initials: "IS",
    gradient: ["#F59E0B", "#EF4444"],
    section: "CONTRÔLE",
    home: "home",
    menu: [
      { key: "home", label: "Tableau de bord contrôle", icon: "grid" },
      {
        label: "Rondes & Contrôles",
        icon: "shield",
        children: [
          { key: "rondes", label: "Rondes & patrouilles", icon: "pin" },
          { key: "pointage", label: "Pointage", icon: "check" },
          { key: "presences", label: "Présences", icon: "calendar" },
          { key: "validpresences", label: "Validation présences", icon: "shield" },
        ],
      },
      { key: "incidents", label: "Incidents", icon: "alert" },
      { key: "rapports", label: "Rapports", icon: "chart" },
    ],
    homeTitle: "Tableau de bord contrôle",
    kpis: [
      { label: "Rondes du jour", value: "9/12", color: "accent" },
      { label: "Sites contrôlés", value: "7", color: "success" },
      { label: "Anomalies relevées", value: "3", color: "warning" },
      { label: "Incidents à traiter", value: "2", color: "danger" },
    ],
    links: [
      { label: "Rondes", key: "rondes", icon: "pin" },
      { label: "Validation présences", key: "validpresences", icon: "shield" },
      { label: "Incidents", key: "incidents", icon: "alert" },
    ],
  },

  // ───────────────── Surveillant (chef de poste) ────────────────────
  surveillant: {
    id: "surveillant",
    name: "Fatou Sarr",
    fonction: "Surveillant — chef de poste",
    initials: "FS",
    gradient: ["#2D6BFF", "#10B981"],
    section: "POSTE",
    home: "home",
    menu: [
      { key: "home", label: "Tableau de bord poste", icon: "grid" },
      { key: "planning", label: "Planning du site", icon: "calendar" },
      { key: "pointage", label: "Pointage", icon: "check" },
      { key: "presences", label: "Présences", icon: "calendar" },
      { key: "incidents", label: "Main courante", icon: "alert" },
      { key: "agents", label: "Agents du site", icon: "users" },
    ],
    homeTitle: "Tableau de bord poste",
    kpis: [
      { label: "Agents du poste", value: "8", color: "accent" },
      { label: "Présents", value: "7", color: "success" },
      { label: "Retards", value: "1", color: "warning" },
      { label: "Événements 24h", value: "3", color: "foreground" },
    ],
    links: [
      { label: "Planning", key: "planning", icon: "calendar" },
      { label: "Pointage", key: "pointage", icon: "check" },
      { label: "Main courante", key: "incidents", icon: "alert" },
      { label: "Agents", key: "agents", icon: "users" },
    ],
  },

  // ─────────────────────────── Juriste ──────────────────────────────
  juriste: {
    id: "juriste",
    name: "Aïda Ba",
    fonction: "Juriste",
    initials: "AB",
    gradient: ["#8B5CF6", "#2D6BFF"],
    section: "JURIDIQUE",
    home: "home",
    menu: [
      { key: "home", label: "Tableau de bord juridique", icon: "grid" },
      GRP_JURIDIQUE,
      { key: "bibliotheque", label: "Bibliothèque réglementaire", icon: "book" },
      { key: "rapports", label: "Rapports", icon: "chart" },
    ],
    homeTitle: "Tableau de bord juridique",
    kpis: [
      { label: "Contrats actifs", value: "23", color: "success" },
      { label: "À renouveler", value: "5", color: "warning" },
      { label: "Contentieux ouverts", value: "2", color: "danger" },
      { label: "Réclamations", value: "4", color: "accent" },
    ],
    links: [
      { label: "Contrats de prestation", key: "contrats", icon: "doc" },
      { label: "Conformité CNAPS", key: "conformite", icon: "shield" },
      { label: "Contentieux", key: "contentieux", icon: "gavel" },
      { label: "Réclamations", key: "reclamations", icon: "alert" },
    ],
  },

  // ────────────────────────── Comptable ─────────────────────────────
  comptable: {
    id: "comptable",
    name: "Sophie Mendy",
    fonction: "Comptable",
    initials: "SM",
    gradient: ["#10B981", "#2D6BFF"],
    section: "COMPTABILITÉ",
    home: "home",
    menu: [
      { key: "home", label: "Tableau de bord financier", icon: "grid" },
      {
        label: "Finance",
        icon: "receipt",
        children: [
          { key: "tresorerie", label: "Trésorerie", icon: "cash" },
          { key: "rentabilite", label: "Rentabilité par site", icon: "chart" },
          { key: "budget", label: "Budget", icon: "chart" },
          { key: "finance", label: "Factures", icon: "receipt" },
          { key: "devisform", label: "Devis", icon: "doc" },
          { key: "contratedit", label: "Éditeur de contrat", icon: "doc" },
          { key: "relances", label: "Paiements & Relances", icon: "bell" },
          { key: "exportpaie", label: "Export paie bancaire", icon: "upload" },
          { key: "fournisseurs", label: "Fournisseurs", icon: "box" },
        ],
      },
      { key: "rapports", label: "Rapports", icon: "chart" },
    ],
    homeTitle: "Tableau de bord financier",
    kpis: [
      { label: "CA encaissé", value: "10 575 000 FCFA", color: "success" },
      { label: "En attente", value: "3 420 000 FCFA", color: "accent" },
      { label: "En retard", value: "1 875 000 FCFA", color: "danger" },
      { label: "Trésorerie", value: "6 240 000 FCFA", color: "foreground" },
    ],
    links: [
      { label: "Facturation", key: "finance", icon: "receipt" },
      { label: "Relances", key: "relances", icon: "bell" },
      { label: "Budget", key: "budget", icon: "chart" },
      { label: "Export Paie", key: "exportpaie", icon: "cash" },
    ],
  },

  // ─────────────────── Agent de sécurité (terrain) ──────────────────
  agent: {
    id: "agent",
    name: "Lamine Faye",
    fonction: "Agent de sécurité",
    initials: "LF",
    gradient: ["#2D6BFF", "#1E5AE6"],
    section: "TERRAIN",
    home: "home",
    menu: [
      { key: "home", label: "Mon tableau de bord", icon: "grid" },
      { key: "planning", label: "Mon planning", icon: "calendar" },
      { key: "pointage", label: "Pointage", icon: "check" },
      { key: "incidents", label: "Main courante", icon: "alert" },
      { key: "histsite", label: "Mes rapports", icon: "report" },
      { key: "bibliotheque", label: "Mes documents", icon: "book" },
    ],
    homeTitle: "Mon tableau de bord",
    kpis: [
      { label: "Prochaine vacation", value: "14:00 — Tour Cristal", color: "accent" },
      { label: "Heures ce mois", value: "142 h", color: "foreground" },
      { label: "Rondes à faire", value: "3", color: "warning" },
      { label: "Rapports en attente", value: "1", color: "danger" },
    ],
    links: [
      { label: "Mon planning", key: "planning", icon: "calendar" },
      { label: "Pointer", key: "pointage", icon: "check" },
      { label: "Main courante", key: "incidents", icon: "alert" },
      { label: "Mes rapports", key: "histsite", icon: "report" },
    ],
  },
};

export const ROLE_ORDER: RoleId[] = [
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

/** Breadcrumb + title per screen (the generic "home" is resolved per role). */
export const SCREEN_META: Record<
  Exclude<ScreenKey, "home">,
  { crumb: string; title: string }
> = {
  dashboard: { crumb: "Pilotage", title: "Tableau de bord 360°" },
  finance: { crumb: "Finance", title: "Finance & Facturation" },
  crm: { crumb: "Commercial", title: "CRM Clients" },
  planning: { crumb: "Opérations", title: "Planning & Agents" },
  paie: { crumb: "Ressources humaines", title: "Paie & Bulletins" },
  recrutement: { crumb: "Ressources humaines", title: "Recrutement" },
  pos: { crumb: "Ventes", title: "Point de vente" },
  taches: { crumb: "Organisation", title: "Tâches & Réunions" },
  rapports: { crumb: "Analyse", title: "Rapports" },
  documents: { crumb: "Documents", title: "Éditeur de documents" },
  parametres: { crumb: "Système", title: "Paramètres" },
  relances: { crumb: "Comptabilité", title: "Paiements & Relances" },
  budget: { crumb: "Comptabilité", title: "Budget & Trésorerie" },
  exportpaie: {
    crumb: "Comptabilité",
    title: "Export Paie — virements bancaires",
  },
  devisform: { crumb: "Commercial", title: "Création de devis" },
  contratedit: { crumb: "Commercial", title: "Éditeur de contrat" },
  reclamations: { crumb: "Juridique", title: "Réclamations clients" },
  entretiens: { crumb: "Ressources humaines", title: "Entretiens" },
  contrattravail: {
    crumb: "Ressources humaines",
    title: "Contrats de travail",
  },
  onboarding: { crumb: "Ressources humaines", title: "Onboarding agent" },
  prepaie: { crumb: "Paie", title: "Préparer la paie" },
  presences: { crumb: "Opérations", title: "Présences du mois" },
  soumission: { crumb: "Paie", title: "Soumission de la paie" },
  pointage: { crumb: "Opérations", title: "Pointage & Présences" },
  validpresences: { crumb: "Opérations", title: "Validation des présences" },
  tickets: { crumb: "Maintenance", title: "Tickets de maintenance" },
  interventions: { crumb: "Maintenance", title: "Interventions" },
  histsite: { crumb: "Terrain", title: "Rapports d'intervention" },
  calendrier: { crumb: "Communication", title: "Calendrier éditorial" },
  composer: { crumb: "Communication", title: "Composer une publication" },
  veille: { crumb: "Communication", title: "Veille & alertes image" },
  notifications: { crumb: "Espace de travail", title: "Notifications" },
  stock: { crumb: "Boutique", title: "Gestion du stock" },
  recus: { crumb: "Boutique", title: "Reçus" },
  cloture: { crumb: "Boutique", title: "Clôture journalière" },
  membres: { crumb: "Administration", title: "Membres & habilitations" },
  tresorerie: { crumb: "Finance", title: "Trésorerie" },
  contrats: { crumb: "Juridique", title: "Contrats de prestation" },
  fournisseurs: { crumb: "Finance", title: "Fournisseurs" },
  acces: { crumb: "CRM", title: "Accès clients" },
  prospects: { crumb: "CRM", title: "Prospects" },
  satisfaction: { crumb: "CRM", title: "Satisfaction & audits" },
  agents: { crumb: "Opérations", title: "Agents" },
  approbation: { crumb: "Paie", title: "Approbation masse salariale" },
  catalogue: { crumb: "Boutique", title: "Catalogue équipements" },
  securite: { crumb: "Administration", title: "Sécurité — Audit trail" },
  donnees: { crumb: "Administration", title: "Données" },
  bibliotheque: { crumb: "Ressources", title: "Bibliothèque" },
  notes: { crumb: "Ressources", title: "Notes" },
  decision: { crumb: "Pilotage", title: "Centre de Décision" },
  alertes: { crumb: "Espace de travail", title: "Alertes" },
  diffusion: { crumb: "Pilotage", title: "Diffusion interne" },
  reunions: { crumb: "Espace de travail", title: "Réunions" },
  mestaches: { crumb: "Espace de travail", title: "Mes tâches" },
  analytics: { crumb: "Pilotage", title: "Analytics" },
  messagerie: { crumb: "Espace de travail", title: "Messagerie" },
  rentabilite: { crumb: "Finance", title: "Rentabilité par site" },
  projets: { crumb: "Déploiements", title: "Déploiements" },
  // Écrans métier sécurité
  sites: { crumb: "Opérations", title: "Sites gardés" },
  rondes: { crumb: "Opérations", title: "Rondes & patrouilles" },
  incidents: { crumb: "Opérations", title: "Incidents & main courante" },
  conformite: { crumb: "Juridique", title: "Conformité CNAPS" },
  contentieux: { crumb: "Juridique", title: "Contentieux" },
};

/** Every screen key that has a route. */
export const ALL_SCREENS: ScreenKey[] = [
  ...(Object.keys(SCREEN_META) as ScreenKey[]),
  "home",
];

/** Utilitaires accessibles à tous les rôles (raccourci de pied de sidebar). */
const UNIVERSAL: ScreenKey[] = ["parametres"];

/**
 * Modules COMMUNS (Espace de travail + Ressources) — ajoutés en bas de nav
 * pour TOUS les rôles.
 */
const COMMON_MENU: MenuItem[] = [
  { key: "documents", label: "Documents", icon: "doc" },
  { key: "taches", label: "Tâches", icon: "check" },
  { key: "notes", label: "Notes", icon: "doc" },
  { key: "reunions", label: "Réunions", icon: "calendar" },
  { key: "alertes", label: "Alertes", icon: "bell" },
  { key: "messagerie", label: "Messagerie", icon: "message" },
  // Notifications & Paramètres restent dans le pied de sidebar (footer du kit).
];

/**
 * Écrans réellement CÂBLÉS sur les données Supabase (source de vérité).
 * Seuls ces écrans apparaissent dans la navigation (et sont accessibles par
 * URL, cf. `canAccess`). Les autres modules — encore en démo/placeholder —
 * sont masqués tant qu'ils ne sont pas branchés sur des données réelles.
 */
export const FUNCTIONAL_SCREENS = new Set<ScreenKey>([
  "dashboard",
  "home",
  // CRM
  "crm",
  "prospects",
  "satisfaction",
  "fournisseurs",
  // Finance
  "finance",
  "tresorerie",
  "rentabilite",
  "budget",
  "relances",
  "exportpaie",
  // Opérations
  "agents",
  "planning",
  "pointage",
  "presences",
  "incidents",
  // Secrétariat commercial
  "devisform",
  "contratedit",
  // RH / Recrutement
  "recrutement",
  "entretiens",
  "contrattravail",
  "onboarding",
  // Paie (circuit d'approbation à 3 niveaux)
  "prepaie",
  "soumission",
  "validpresences",
  "paie",
  "approbation",
  // Boutique / caisse
  "catalogue",
  "stock",
  "recus",
  "cloture",
  // Communication
  "veille",
  // Communication
  "calendrier",
  "composer",
  "notifications",
  // Maintenance
  "tickets",
  "interventions",
  // Communs
  "taches",
  "projets",
  "reclamations",
  "messagerie",
  // Espace de travail / direction (contenu interne)
  "notes",
  "reunions",
  "alertes",
  "decision",
  "diffusion",
  // Documents
  "documents",
  // Administration / système
  "membres",
  "parametres",
  "securite",
  "donnees",
  // Pilotage / direction
  "analytics",
  "rapports",
  "acces",
]);

/**
 * Élague un arbre de menu : ne garde que les feuilles dont la clé est
 * fonctionnelle, et supprime récursivement les groupes devenus vides.
 */
function pruneMenu(items: MenuItem[]): MenuItem[] {
  const out: MenuItem[] = [];
  for (const item of items) {
    if (item.children) {
      const kids = pruneMenu(item.children);
      if (kids.length > 0) out.push({ ...item, children: kids });
    } else if (item.key && FUNCTIONAL_SCREENS.has(item.key)) {
      out.push(item);
    }
  }
  return out;
}

/**
 * Nav complète d'un rôle = ses modules métier + les modules communs,
 * élaguée aux seuls écrans fonctionnels.
 */
export function roleMenu(role: RoleId): MenuItem[] {
  return pruneMenu([...ROLES[role].menu, ...COMMON_MENU]);
}

function collectKeys(items: MenuItem[], acc: Set<ScreenKey>): void {
  for (const item of items) {
    if (item.key) acc.add(item.key);
    if (item.children) collectKeys(item.children, acc);
  }
}

export function allowedScreens(role: RoleId): Set<ScreenKey> {
  const keys = new Set<ScreenKey>(UNIVERSAL);
  collectKeys(roleMenu(role), keys);
  return keys;
}

export function canAccess(role: RoleId, screen: ScreenKey): boolean {
  return allowedScreens(role).has(screen);
}

export function homeScreen(role: RoleId): ScreenKey {
  return ROLES[role].home;
}

export function isScreenKey(value: string): value is ScreenKey {
  return (
    value === "home" || Object.prototype.hasOwnProperty.call(SCREEN_META, value)
  );
}

/** Title/crumb for a screen, resolving the per-role generic "home". */
export function screenMeta(
  role: RoleId,
  screen: ScreenKey,
): { crumb: string; title: string } {
  if (screen === "home") {
    const cfg = ROLES[role];
    return { crumb: cfg.section, title: cfg.homeTitle ?? "Tableau de bord" };
  }
  return SCREEN_META[screen];
}
