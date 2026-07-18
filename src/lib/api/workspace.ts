import {
  Banknote,
  Calendar,
  Clock,
  Database,
  FileWarning,
  MapPin,
  Package,
  ReceiptText,
  ShieldAlert,
  UserPlus,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { RoleId } from "@/lib/rbac";

/* ─────────────────────────── ALERTES ─────────────────────────── */

export type AlertSeverity = "critique" | "attention" | "info";

export interface WorkAlert {
  id: string;
  severity: AlertSeverity;
  icon: LucideIcon;
  title: string;
  description: string;
  entity: string;
  at: string; // ISO
  action: string;
  roles: RoleId[] | "all";
}

const hoursAgo = (h: number) =>
  new Date(Date.now() - h * 3_600_000).toISOString();

const ALERTS: WorkAlert[] = [
  {
    id: "a1",
    severity: "critique",
    icon: MapPin,
    title: "Site non couvert — Ambassade des USA",
    description: "Aucun agent pointé sur le poste depuis le début du service.",
    entity: "Ambassade des USA · Almadies",
    at: hoursAgo(0.4),
    action: "Analyser",
    roles: ["dg", "controleur"],
  },
  {
    id: "a2",
    severity: "critique",
    icon: Clock,
    title: "Agent immobile 25 min — Port Autonome",
    description:
      "Aucun mouvement détecté sur le badge de ronde. Vérification requise.",
    entity: "Port Autonome · Môle 3",
    at: hoursAgo(0.5),
    action: "Analyser",
    roles: ["dg", "controleur", "manager"],
  },
  {
    id: "a3",
    severity: "critique",
    icon: Wrench,
    title: "Portique AIBD hors service",
    description: "Ticket maintenance critique — zone fret non sécurisée.",
    entity: "Aéroport AIBD · zone fret",
    at: hoursAgo(2),
    action: "Traiter",
    roles: ["dg", "manager", "controleur"],
  },
  {
    id: "a4",
    severity: "attention",
    icon: FileWarning,
    title: "Contrat expiré sans renouvellement — CBAO",
    description: "Le contrat de gardiennage a expiré il y a 3 jours.",
    entity: "CBAO · Plateau",
    at: hoursAgo(6),
    action: "Traiter",
    roles: ["dg", "rp", "comptable"],
  },
  {
    id: "a5",
    severity: "attention",
    icon: Package,
    title: "Stock gilet pare-balles en rupture",
    description: "0 gilet niveau III disponible. Réapprovisionnement requis.",
    entity: "Boutique · équipements",
    at: hoursAgo(5),
    action: "Traiter",
    roles: ["dg", "agent"],
  },
  {
    id: "a6",
    severity: "attention",
    icon: ReceiptText,
    title: "Facture impayée > 30 jours — Ambassade",
    description: "FAC-2025-041 impayée depuis 32 jours. Mise en demeure prête.",
    entity: "Ambassade de France",
    at: hoursAgo(8),
    action: "Voir",
    roles: ["dg", "comptable"],
  },
  {
    id: "a7",
    severity: "attention",
    icon: Banknote,
    title: "Masse salariale en attente de validation",
    description: "Circuit paie bloqué au Niveau 3 — approbation DG requise.",
    entity: "Dakar Sécurité · 52 agents",
    at: hoursAgo(2),
    action: "Traiter",
    roles: ["dg", "rh"],
  },
  {
    id: "a8",
    severity: "info",
    icon: UserPlus,
    title: "Nouveau candidat à valider",
    description: "Ibou Sarr — agent cynophile, entretien noté 82/100.",
    entity: "Recrutement · AIBD",
    at: hoursAgo(9),
    action: "Voir",
    roles: ["dg", "rh"],
  },
  {
    id: "a9",
    severity: "info",
    icon: Calendar,
    title: "Publication programmée dans 1 h",
    description: "LinkedIn · campagne de recrutement de 10 agents.",
    entity: "Communication",
    at: hoursAgo(0.8),
    action: "Voir",
    roles: ["dg", "manager"],
  },
  {
    id: "a10",
    severity: "info",
    icon: Database,
    title: "Sauvegarde des données effectuée",
    description: "Export quotidien terminé avec succès (SICA-UEMOA).",
    entity: "Plateforme",
    at: hoursAgo(12),
    action: "Voir",
    roles: ["dg", "dg"],
  },
  {
    id: "a11",
    severity: "info",
    icon: ShieldAlert,
    title: "Nouvel appareil connecté",
    description:
      "Connexion depuis un nouvel appareil — vérifiez si c'est vous.",
    entity: "Sécurité du compte",
    at: hoursAgo(20),
    action: "Voir",
    roles: "all",
  },
];

export function getAlerts(role: RoleId): WorkAlert[] {
  return ALERTS.filter((a) => a.roles === "all" || a.roles.includes(role));
}

/* ─────────────────────────── MES TÂCHES ─────────────────────────── */

export type TaskPriority = "haute" | "moyenne" | "basse";

export interface WorkTask {
  id: string;
  title: string;
  context: string;
  priority: TaskPriority;
  done: boolean;
}

const TASKS: Record<RoleId, WorkTask[]> = {
  dg: [
    { id: "t1", title: "Approuver la masse salariale", context: "Paie · aujourd'hui", priority: "haute", done: false },
    { id: "t2", title: "Valider le renouvellement Port Autonome", context: "Contrats · demain", priority: "moyenne", done: false },
    { id: "t3", title: "Revue des 3 sites non couverts", context: "Opérations", priority: "basse", done: false },
  ],
  rp: [
    { id: "t1", title: "Réaffecter un agent — AIBD zone fret", context: "Planning · maintenant", priority: "haute", done: false },
    { id: "t2", title: "Publier le planning semaine 30", context: "Planning · demain", priority: "moyenne", done: false },
    { id: "t3", title: "Débrief de la couverture matinale", context: "Opérations", priority: "basse", done: true },
  ],
  rf: [
    { id: "t1", title: "Relancer l'Ambassade (J+32)", context: "Recouvrement · aujourd'hui", priority: "haute", done: false },
    { id: "t2", title: "Valider le budget T3", context: "Budget · cette semaine", priority: "moyenne", done: false },
    { id: "t3", title: "Analyser la rentabilité par site", context: "Finance", priority: "basse", done: false },
  ],
  rh: [
    { id: "t1", title: "Planifier les entretiens cynophiles", context: "Recrutement · aujourd'hui", priority: "haute", done: false },
    { id: "t2", title: "Renouveler 4 cartes CNAPS", context: "Conformité · cette semaine", priority: "moyenne", done: false },
    { id: "t3", title: "Générer les bulletins de juin", context: "Paie · vendredi", priority: "moyenne", done: false },
  ],
  manager: [
    { id: "t1", title: "Contrôler le pointage du secteur", context: "Opérations · aujourd'hui", priority: "haute", done: false },
    { id: "t2", title: "Organiser la relève Sea Plaza", context: "Planning · demain", priority: "moyenne", done: false },
    { id: "t3", title: "Rapport de secteur hebdomadaire", context: "Rapports", priority: "basse", done: true },
  ],
  controleur: [
    { id: "t1", title: "Ronde de contrôle Port Autonome", context: "Contrôle · aujourd'hui", priority: "haute", done: false },
    { id: "t2", title: "Valider les présences (Niveau 2)", context: "Présences · aujourd'hui", priority: "haute", done: false },
    { id: "t3", title: "Traiter l'écart de pointage CBAO", context: "Incidents", priority: "moyenne", done: false },
  ],
  surveillant: [
    { id: "t1", title: "Assurer la relève de 14h", context: "Poste · aujourd'hui", priority: "haute", done: false },
    { id: "t2", title: "Mettre à jour la main courante", context: "Poste", priority: "moyenne", done: false },
    { id: "t3", title: "Vérifier les présences du poste", context: "Présences", priority: "basse", done: true },
  ],
  juriste: [
    { id: "t1", title: "Rédiger l'avenant Port Autonome", context: "Contrats · aujourd'hui", priority: "haute", done: false },
    { id: "t2", title: "Suivre le contentieux Ambassade", context: "Contentieux · cette semaine", priority: "moyenne", done: false },
    { id: "t3", title: "Répondre à la réclamation Sea Plaza", context: "Réclamations", priority: "basse", done: false },
  ],
  comptable: [
    { id: "t1", title: "Relancer l'Ambassade (J+32)", context: "Recouvrement · aujourd'hui", priority: "haute", done: false },
    { id: "t2", title: "Rapprochement bancaire de juin", context: "Trésorerie · demain", priority: "moyenne", done: false },
    { id: "t3", title: "Générer l'export de paie", context: "Paie · vendredi", priority: "haute", done: false },
  ],
  agent: [
    { id: "t1", title: "Prise de poste 14h — Tour Cristal", context: "Vacation · aujourd'hui", priority: "haute", done: false },
    { id: "t2", title: "Effectuer les rondes de 30 min", context: "Ronde", priority: "moyenne", done: false },
    { id: "t3", title: "Consigner la main courante", context: "Rapport", priority: "basse", done: true },
  ],
};

export function getTasks(role: RoleId): WorkTask[] {
  return TASKS[role];
}

/* ─────────────────────────── RÉUNIONS ─────────────────────────── */

export type MeetingMode = "visio" | "salle" | "terrain";

export interface Meeting {
  id: string;
  time: string; // HH:MM
  durationMin: number;
  title: string;
  location: string;
  mode: MeetingMode;
  category: string;
  catColor: "blue" | "green" | "amber" | "violet" | "red";
  participants: string[]; // initiales
}

const MEETINGS: Meeting[] = [
  {
    id: "m1",
    time: "09:00",
    durationMin: 30,
    title: "Briefing superviseurs",
    location: "Salle de crise",
    mode: "salle",
    category: "Opérations",
    catColor: "blue",
    participants: ["CG", "IS", "MD"],
  },
  {
    id: "m2",
    time: "11:00",
    durationMin: 45,
    title: "Point client — Port Autonome",
    location: "Visioconférence",
    mode: "visio",
    category: "Client",
    catColor: "green",
    participants: ["AB", "MD", "FS"],
  },
  {
    id: "m3",
    time: "14:30",
    durationMin: 60,
    title: "Revue mensuelle — Direction",
    location: "Salle du conseil",
    mode: "salle",
    category: "Direction",
    catColor: "violet",
    participants: ["MD", "FS", "NF", "CG"],
  },
  {
    id: "m4",
    time: "17:00",
    durationMin: 30,
    title: "Débriefing incident — AIBD",
    location: "Terrain · zone fret",
    mode: "terrain",
    category: "Incident",
    catColor: "red",
    participants: ["CG", "IS"],
  },
  {
    id: "m5",
    time: "18:30",
    durationMin: 20,
    title: "Passation d'équipe — nuit",
    location: "Poste de garde central",
    mode: "salle",
    category: "Opérations",
    catColor: "amber",
    participants: ["CG", "AN"],
  },
];

export function getMeetings(_role: RoleId): Meeting[] {
  return MEETINGS;
}
